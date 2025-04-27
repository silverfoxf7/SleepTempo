import { TNativeAudioContext } from 'standardized-audio-context';
// Import settings types from context
import type { SoundKey } from '@/context/SettingsContext'; 

export interface TempoStep {
  bpm: number;
  beats: number;
}

// Mapping from SoundKey to actual file paths (or null for default)
const SOUND_FILE_PATHS: Record<SoundKey, string | null> = {
    DEFAULT: null, // Indicates synthesized
    AIRPOD: '/sounds/airpod-case-close.ogg',
    SNAP: '/sounds/finger-snap.ogg',
    HEARTBEAT: '/sounds/heart-beat.ogg',
    TONGUE: '/sounds/tongue-click.ogg',
};

export class AudioEngineImpl {
  private static instance: AudioEngineImpl | null = null;
  private static initializing: Promise<void> | null = null;
  private audioContext: TNativeAudioContext | null = null;
  private _isPlaying: boolean = false;
  
  // Store all possible click buffers
  private clickBuffers: Map<SoundKey, AudioBuffer> = new Map();
  private activeClickBuffer: AudioBuffer | null = null;
  private currentSoundSetting: SoundKey = 'DEFAULT'; // Default sound

  private schedulerTimer: ReturnType<typeof setTimeout> | null = null;
  private nextClickTime: number = 0;
  private currentSequence: TempoStep[] = [];
  private currentStepIndex: number = 0;
  private beatsInCurrentStep: number = 0;
  private scheduledSources: AudioBufferSourceNode[] = [];
  private scheduleAheadTime: number = 0.1;
  private scheduleIntervalMs: number = 25;
  private voiceCountBuffer: AudioBuffer | null = null;
  private voiceCountOffsets: { [key: string]: { start: number; duration: number } } | null = null;
  private voiceCountsEnabled: boolean = true; // Default, will be updated by settings
  private segmentStartBeatCount: number = 0;
  private segmentBeatCount: number = 0;

  public onEnded?: () => void;

  private constructor() {}

  private async initialize(): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!ContextClass) throw new Error("Web Audio API not supported.");
        this.audioContext = new ContextClass() as TNativeAudioContext;
        
        // Load ALL potential click sounds and the voice counts concurrently
        await Promise.all([
            this.loadAllClickBuffers(), 
            this.loadVoiceCounts()
        ]);

        // Set the initial active buffer based on the default setting
        this.setActiveClickBuffer(this.currentSoundSetting);

        console.log("AudioEngine initialized with all buffers.");

      } catch (error) {
        console.error("Error initializing AudioContext or buffers:", error);
        this.audioContext = null;
        this.clickBuffers.clear();
      }
    }
  }

  // Method to load all potential click sounds
  private async loadAllClickBuffers(): Promise<void> {
    if (!this.audioContext) throw new Error("AudioContext not available for loading buffers.");

    const loadPromises: Promise<void>[] = [];

    for (const key in SOUND_FILE_PATHS) {
        const soundKey = key as SoundKey;
        const path = SOUND_FILE_PATHS[soundKey];

        if (path === null) { // Synthesize default sound
            const promise = this.createSynthesizedClickBuffer().then(buffer => {
                if (buffer) {
                    this.clickBuffers.set(soundKey, buffer);
                    console.log(`Synthesized click buffer created for ${soundKey}.`);
                }
            });
            loadPromises.push(promise);
        } else { // Load sound from file
            const promise = fetch(path)
                .then(response => {
                    if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
                    return response.arrayBuffer();
                })
                .then(arrayBuffer => this.audioContext!.decodeAudioData(arrayBuffer))
                .then(decodedBuffer => {
                    this.clickBuffers.set(soundKey, decodedBuffer);
                    console.log(`Loaded click buffer for ${soundKey} from ${path}.`);
                })
                .catch(error => {
                    console.error(`Error loading click buffer for ${soundKey} from ${path}:`, error);
                    // Optionally handle fallback? For now, just log error.
                });
            loadPromises.push(promise);
        }
    }
    
    await Promise.all(loadPromises);
    console.log("Finished loading all click buffers.");
  }

  // Renamed from createClickBuffer
  private async createSynthesizedClickBuffer(): Promise<AudioBuffer | null> {
      if (!this.audioContext) return null;
      try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const OfflineCtx = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
          if (!OfflineCtx) {
              console.error("OfflineAudioContext not supported for synthesis. Falling back to square wave.");
              return this.createSquareWaveBuffer(); 
          }
          const sampleRate = this.audioContext.sampleRate;
          const durationSeconds = 0.06;
          const frameCount = sampleRate * durationSeconds;
          const offlineContext = new OfflineCtx(1, frameCount, sampleRate) as OfflineAudioContext;
          const tone = offlineContext.createOscillator();
          tone.type = 'triangle';
          tone.frequency.value = 1000;
          const gain = offlineContext.createGain();
          gain.gain.setValueAtTime(1, 0);
          gain.gain.exponentialRampToValueAtTime(0.0001, offlineContext.currentTime + 0.05);
          const hp = offlineContext.createBiquadFilter();
          hp.type = 'highpass';
          hp.frequency.value = 700;
          tone.connect(gain).connect(hp).connect(offlineContext.destination);
          tone.start(0);
          tone.stop(offlineContext.currentTime + durationSeconds);
          const renderedBuffer = await offlineContext.startRendering();
          return renderedBuffer;
      } catch (error) {
          console.error("Error creating synthesized click buffer:", error);
          return this.createSquareWaveBuffer(); 
      }
  }
  
  // Updated setActiveClickBuffer - select from loaded buffers
  private setActiveClickBuffer(sound: SoundKey): boolean {
      const buffer = this.clickBuffers.get(sound);
      if (buffer) {
          this.activeClickBuffer = buffer;
          this.currentSoundSetting = sound;
          console.log(`AudioEngine: Active click sound set to ${sound}`);
          return true;
      }
      console.warn(`AudioEngine: Buffer for sound ${sound} not found. Keeping previous sound.`);
      return false;
  }

  // Public method to update settings (called by useSettings potentially)
  public updateSettings(settingsUpdate: { sound?: SoundKey; voiceCountEnabled?: boolean }): void {
      console.log(`DEBUG: updateSettings called with:`, settingsUpdate, `Current sound: ${this.currentSoundSetting}`);
      if (settingsUpdate.sound !== undefined && settingsUpdate.sound !== this.currentSoundSetting) {
          console.log(`DEBUG: Sound setting changed. Calling setActiveClickBuffer with ${settingsUpdate.sound}`);
          this.setActiveClickBuffer(settingsUpdate.sound);
      }
      if (settingsUpdate.voiceCountEnabled !== undefined) {
          if (settingsUpdate.voiceCountEnabled !== this.voiceCountsEnabled) {
              this.voiceCountsEnabled = settingsUpdate.voiceCountEnabled;
              console.log(`AudioEngine: Voice counts ${this.voiceCountsEnabled ? 'enabled' : 'disabled'}`);
          }
      }
  }

  // --- Rest of the methods (getInstance, isPlaying, start, scheduler, scheduleClick, etc.) ---
  // Minor change: scheduleClick uses this.activeClickBuffer
  public static getInstance(): Promise<AudioEngineImpl> {
      // ... (getInstance logic remains the same) ...
    return new Promise(async (resolve) => {
        if (AudioEngineImpl.instance) {
            resolve(AudioEngineImpl.instance);
            return;
        }
        if (!AudioEngineImpl.initializing) {
            const newInstance = new AudioEngineImpl();
            AudioEngineImpl.initializing = newInstance.initialize().then(() => {
                AudioEngineImpl.instance = newInstance;
                AudioEngineImpl.initializing = null;
            }).catch(err => {
                console.error("AudioEngine initialization failed:", err);
                AudioEngineImpl.initializing = null;
            });
        }
        await AudioEngineImpl.initializing;
        if (AudioEngineImpl.instance) {
             resolve(AudioEngineImpl.instance);
        } else {
             resolve(AudioEngineImpl.instance!); // Or handle error appropriately
        }
    });
  }

  public get isPlaying(): boolean {
    return this._isPlaying;
  }

  public start(sequence: TempoStep[], initialOverallBeatCount: number = 0): void {
    // Use activeClickBuffer here
    if (!this.audioContext || !this.activeClickBuffer) {
      console.error("Audio engine not initialized or active click buffer missing.");
      return;
    }
    if (this._isPlaying) {
      console.warn("AudioEngine already playing. Call stop() first.");
      return;
    }
    if (sequence.length !== 1) {
        console.error(`AudioEngine.start called with sequence length ${sequence.length}. Expected 1.`);
        return;
    }
    if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
    }
    console.log(`AudioEngine: Starting step: ${JSON.stringify(sequence[0])} at overall beat ${initialOverallBeatCount}`);
    this._isPlaying = true;
    this.currentSequence = sequence;
    this.currentStepIndex = 0;
    this.beatsInCurrentStep = 0;
    this.segmentStartBeatCount = initialOverallBeatCount;
    this.segmentBeatCount = 0;
    this.nextClickTime = this.audioContext.currentTime + 0.05;
    this.scheduledSources = [];
    if (this.schedulerTimer) {
        clearTimeout(this.schedulerTimer);
    }
    this.scheduler();
  }

  private scheduler(): void {
    if (!this._isPlaying || !this.audioContext) return;

    while (this.nextClickTime < this.audioContext.currentTime + this.scheduleAheadTime) {
        this.scheduleClick(this.nextClickTime);
        this.advanceBeat();

        const currentStep = this.currentSequence[this.currentStepIndex];
        if (!currentStep || this.segmentBeatCount >= currentStep.beats) {
            const finalBeatDuration = 60.0 / currentStep.bpm;
            const onEndedTime = this.nextClickTime + finalBeatDuration;
            const delayMs = (onEndedTime - this.audioContext.currentTime) * 1000;
            
            setTimeout(() => {
                if(this._isPlaying) {
                    console.log("AudioEngine: Segment finished naturally.")
                    this.stop(false);
                    if (this.onEnded) {
                        this.onEnded();
                    }
                }
            }, Math.max(0, delayMs));
            
            return;
        }
    }

    this.schedulerTimer = setTimeout(() => this.scheduler(), this.scheduleIntervalMs);
  }

  private scheduleClick(time: number): void {
    // Use activeClickBuffer here
    if (!this.audioContext || !this.activeClickBuffer) return;

    const clickSource = this.audioContext.createBufferSource();
    clickSource.buffer = this.activeClickBuffer; // Use the currently active buffer
    clickSource.connect(this.audioContext.destination);
    clickSource.start(time);
    
    this.scheduledSources.push(clickSource);
    clickSource.onended = () => {
        this.scheduledSources = this.scheduledSources.filter(s => s !== clickSource);
    };

    const overallBeatNumber = this.segmentStartBeatCount + this.segmentBeatCount + 1;
    
    if (this.voiceCountsEnabled && 
        this.voiceCountBuffer && 
        this.voiceCountOffsets && 
        overallBeatNumber % 10 === 0) {
        
        console.log(`AudioEngine: Scheduling voice count: ${overallBeatNumber}`);
        const voiceSource = this.audioContext.createBufferSource();
        voiceSource.buffer = this.voiceCountBuffer;
        voiceSource.connect(this.audioContext.destination);
        voiceSource.start(time, this.voiceCountOffsets[overallBeatNumber.toString()].start, this.voiceCountOffsets[overallBeatNumber.toString()].duration);
    }
    else if (overallBeatNumber <= 100) {
        console.warn(`AudioEngine: Missing voice offset for beat ${overallBeatNumber}`);
    }
  }

  private advanceBeat(): void {
    const currentStep = this.currentSequence[this.currentStepIndex];
    if (!currentStep) return;

    const secondsPerBeat = 60.0 / currentStep.bpm;
    this.nextClickTime += secondsPerBeat;
    this.segmentBeatCount++;
  }

  public stop(callOnEnded: boolean = false): void {
    if (!this.audioContext) return;
    if (!this._isPlaying) return;

    console.log("AudioEngine: Stopping.");
    this._isPlaying = false;

    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }

    const currentTime = this.audioContext.currentTime;
    this.scheduledSources.forEach(source => {
        try {
             source.stop(currentTime);
        } catch { /* ignore */ }
    });
    this.scheduledSources = [];

    this.currentSequence = [];
    this.currentStepIndex = 0;
    this.beatsInCurrentStep = 0;
    this.segmentBeatCount = 0;

    if (callOnEnded && this.onEnded) {
      console.log("AudioEngine: onEnded called due to manual stop.");
      this.onEnded();
    }
  }

  private createSquareWaveBuffer(): AudioBuffer | null {
      if (!this.audioContext) return null;
      const sampleRate = this.audioContext.sampleRate;
      const durationSeconds = 0.005;
      const frameCount = sampleRate * durationSeconds;
      const buffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
      const bufferData = buffer.getChannelData(0);
      for (let i = 0; i < frameCount; i++) {
          bufferData[i] = i < frameCount / 2 ? 0.8 : -0.8;
      }
      return buffer;
  }
  
  private async loadVoiceCounts(): Promise<void> {
      if (!this.audioContext) return;
      const audioPath = '/sounds/voice_counts.ogg';
      const jsonPath = '/sounds/voice_counts.json';
      try {
          const audioResponse = await fetch(audioPath);
          if (!audioResponse.ok) throw new Error(`Failed to fetch audio: ${audioResponse.statusText}`);
          const audioArrayBuffer = await audioResponse.arrayBuffer();
          this.voiceCountBuffer = await this.audioContext.decodeAudioData(audioArrayBuffer);
          console.log("Voice count audio loaded.");
          const jsonResponse = await fetch(jsonPath);
          if (!jsonResponse.ok) throw new Error(`Failed to fetch JSON: ${jsonResponse.statusText}`);
          this.voiceCountOffsets = await jsonResponse.json();
          console.log("Voice count offsets loaded:", this.voiceCountOffsets);
      } catch (error) {
          console.warn("Could not load voice count assets:", error);
          this.voiceCountsEnabled = false;
          this.voiceCountBuffer = null;
          this.voiceCountOffsets = null;
      }
  }
}

export const getAudioEngine = (): Promise<AudioEngineImpl> => AudioEngineImpl.getInstance();
export const audioEngine = AudioEngineImpl.getInstance(); 