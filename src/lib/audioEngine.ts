import { TNativeAudioContext } from 'standardized-audio-context';
// Import settings types from context
import type { SoundKey } from '@/context/SettingsContext'; 
// Import new click builders
import { buildRimshot } from './clicks/buildRimshot';
import { buildWoodblock } from './clicks/buildWoodblock';

export interface TempoStep {
  bpm: number;
  beats: number;
}

// Mapping from SoundKey to actual file paths (or null for default)
const SOUND_FILE_PATHS: Record<SoundKey, string | null> = {
    DEFAULT: null, // Triangle synth
    RIMSHOT: null, // Rimshot synth
    WOODBLOCK: null, // Woodblock synth
    AIRPOD: '/sounds/airpod-case-close.ogg',
    SNAP: '/sounds/finger-snap.ogg',
    HEARTBEAT: '/sounds/heart-beat.ogg',
    TONGUE: '/sounds/tongue-click.ogg',
    CAT_MEOW: '/sounds/catsMEOW.ogg',
    CAT_CHEWING: '/sounds/catsChewing.ogg',
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
        // Detect iOS for special handling
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
        console.log(`DEBUG: Initializing AudioEngine. User agent: ${navigator.userAgent}, iOS detected: ${isIOS}`);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!ContextClass) {
          console.error("Web Audio API not supported on this device/browser.");
          throw new Error("Web Audio API not supported.");
        }
        
        this.audioContext = new ContextClass() as TNativeAudioContext;
        console.log(`DEBUG: AudioContext created successfully. State: ${this.audioContext.state}`);
        
        // Don't wait for resume to succeed - it often requires user interaction
        // Just log and proceed anyway
        if (this.audioContext.state === 'suspended') {
          console.log('DEBUG: AudioContext is suspended. This is normal - will be resumed on user interaction.');
          try {
            // Try to resume, but don't await it
            this.audioContext.resume().then(() => {
              if (this.audioContext) {
                console.log(`DEBUG: AudioContext resumed successfully later. New state: ${this.audioContext.state}`);
              }
            }).catch(resumeErr => {
              console.warn('DEBUG: Could not resume AudioContext:', resumeErr);
            });
          } catch (resumeErr) {
            console.warn('DEBUG: Error attempting to resume AudioContext:', resumeErr);
          }
          // Continue anyway, we'll try to resume again when playing
        }
        
        // Load ALL potential click sounds and the voice counts concurrently
        try {
          console.log('DEBUG: Starting to load all audio resources...');
          await Promise.all([
              this.loadAllClickBuffers(isIOS), 
              this.loadVoiceCounts(isIOS)
          ]);
          console.log('DEBUG: Successfully loaded all audio resources');
        } catch (loadErr) {
          console.error('DEBUG: Error loading audio resources:', loadErr);
          throw loadErr; // Re-throw to be caught by outer catch
        }

        // Set the initial active buffer based on the default setting
        const bufferSet = this.setActiveClickBuffer(this.currentSoundSetting);
        console.log(`DEBUG: Initial active buffer set to ${this.currentSoundSetting}, success: ${bufferSet}`);

        console.log("AudioEngine initialized with all buffers.");

      } catch (error) {
        console.error("Error initializing AudioContext or buffers:", error);
        this.audioContext = null;
        this.clickBuffers.clear();
      }
    } else {
      console.log('DEBUG: Running in server-side context, skipping audio initialization');
    }
  }

  // Method to load all potential click sounds
  private async loadAllClickBuffers(isIOS = false): Promise<void> {
    if (!this.audioContext) throw new Error("AudioContext not available for loading buffers.");

    const loadPromises: Promise<void>[] = [];
    const sampleRate = this.audioContext.sampleRate;
    console.log(`DEBUG: Starting to load all click buffers. Sample rate: ${sampleRate}, iOS: ${isIOS}`);

    for (const key in SOUND_FILE_PATHS) {
        const soundKey = key as SoundKey;
        const path = SOUND_FILE_PATHS[soundKey];
        console.log(`DEBUG: Processing sound ${soundKey}, path: ${path || 'null (synthesized)'}`);

        if (path === null) { // Synthesize sound
            // On iOS, we'll use simpler synthesis methods that are more compatible
            let buildPromise: Promise<AudioBuffer | null>;
            if (isIOS) {
                console.log(`DEBUG: Using iOS-compatible synthesis for ${soundKey}`);
                // Use simple square wave for iOS - more reliable
                buildPromise = Promise.resolve(this.createSquareWaveBuffer());
            } else {
                // Choose the correct synthesis function based on the key
                switch (soundKey) {
                    case 'RIMSHOT':
                        console.log(`DEBUG: Using buildRimshot for ${soundKey}`);
                        buildPromise = buildRimshot(sampleRate);
                        break;
                    case 'WOODBLOCK':
                        console.log(`DEBUG: Using buildWoodblock for ${soundKey}`);
                        buildPromise = buildWoodblock(sampleRate);
                        break;
                    case 'DEFAULT': // Fallthrough intended for default triangle
                    default:
                        console.log(`DEBUG: Using createSynthesizedClickBuffer for ${soundKey}`);
                        buildPromise = this.createSynthesizedClickBuffer();
                        break;
                }
            }
            
            const promise = buildPromise.then(buffer => {
                if (buffer) {
                    this.clickBuffers.set(soundKey, buffer);
                    console.log(`DEBUG: Successfully synthesized click buffer for ${soundKey}, duration: ${buffer.duration.toFixed(3)}s`);
                } else {
                     console.error(`Failed to synthesize buffer for ${soundKey}.`);
                }
            }).catch(error => {
                console.error(`Error synthesizing buffer for ${soundKey}:`, error);
            });
            loadPromises.push(promise);

        } else { // Load sound from file
            // For iOS, try MP3 first as it's better supported
            loadPromises.push(this.loadSoundFile(soundKey, path, isIOS));
        }
    }
    
    await Promise.all(loadPromises);
    console.log(`DEBUG: Finished loading all click buffers. Total buffers loaded: ${this.clickBuffers.size}`);
  }

  // Helper method to load a sound file with proper iOS fallbacks
  private async loadSoundFile(soundKey: SoundKey, path: string, isIOS = false): Promise<void> {
    if (!this.audioContext) return;
    
    console.log(`DEBUG: Loading sound file for ${soundKey}, path: ${path}, iOS: ${isIOS}`);
    
    // Try formats in order of compatibility for the platform
    const formats = isIOS 
        ? [path.replace('.ogg', '.mp3'), path] // iOS: Try MP3 first, then OGG
        : [path, path.replace('.ogg', '.mp3')]; // Other: Try OGG first, then MP3
    
    let loaded = false;
    let lastError: Error | null = null;
    
    for (const formatPath of formats) {
        if (loaded) break;
        
        try {
            console.log(`DEBUG: Attempting to load audio from ${formatPath}`);
            const response = await fetch(formatPath);
            
            if (!response.ok) {
                console.error(`DEBUG: Failed to fetch ${formatPath}: ${response.status} ${response.statusText}`);
                continue; // Try next format
            }
            
            const arrayBuffer = await response.arrayBuffer();
            console.log(`DEBUG: Audio file fetched: ${formatPath}, size: ${arrayBuffer.byteLength} bytes`);
            
            try {
                // On iOS, we need to be extra careful with decoding
                if (isIOS) {
                    console.log(`DEBUG: Using iOS-specific decoding for ${formatPath}`);
                    // Some iOS versions need this approach
                    this.audioContext.decodeAudioData(
                        arrayBuffer,
                        (buffer) => {
                            this.clickBuffers.set(soundKey, buffer);
                            console.log(`DEBUG: Successfully decoded audio for ${soundKey} from ${formatPath}`);
                            loaded = true;
                        },
                        (error) => {
                            console.error("Error decoding iOS audio:", error);
                            lastError = error instanceof Error ? error : new Error(String(error));
                        }
                    );
                    
                    // Give it a moment to process
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    if (loaded) break;
                } else {
                    // Standard approach for other browsers
                    const buffer = await this.audioContext.decodeAudioData(arrayBuffer);
                    this.clickBuffers.set(soundKey, buffer);
                    console.log(`DEBUG: Successfully decoded audio for ${soundKey} from ${formatPath}`);
                    loaded = true;
                    break;
                }
            } catch (decodeError) {
                console.error(`DEBUG: Error decoding ${formatPath}:`, decodeError);
                lastError = decodeError instanceof Error ? decodeError : new Error(String(decodeError));
                // Continue to next format
            }
        } catch (fetchError) {
            console.error(`DEBUG: Error fetching ${formatPath}:`, fetchError);
            lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
            // Continue to next format
        }
    }
    
    // If all formats failed, fall back to synthesized sound
    if (!loaded) {
        console.warn(`DEBUG: All audio formats failed for ${soundKey}, falling back to synthesized sound. Last error:`, lastError);
        try {
            const fallbackBuffer = await this.createSynthesizedClickBuffer();
            if (fallbackBuffer) {
                this.clickBuffers.set(soundKey, fallbackBuffer);
                console.log(`DEBUG: Used synthesized fallback for ${soundKey}`);
            }
        } catch (synthError) {
            console.error(`DEBUG: Complete failure to load sound ${soundKey}, using square wave`, synthError);
            // Last resort - use simplest sound possible
            const squareBuffer = this.createSquareWaveBuffer();
            if (squareBuffer) {
                this.clickBuffers.set(soundKey, squareBuffer);
            }
        }
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
          const success = this.setActiveClickBuffer(settingsUpdate.sound);
          console.log(`DEBUG: setActiveClickBuffer result: ${success}, keys in clickBuffers: [${Array.from(this.clickBuffers.keys()).join(', ')}]`);
          
          // Mobile safeguard: If changing to a file-based sound fails, fall back to DEFAULT
          if (!success && SOUND_FILE_PATHS[settingsUpdate.sound] !== null) {
              console.log(`DEBUG: Mobile safeguard - Failed to set file-based sound ${settingsUpdate.sound}, falling back to DEFAULT`);
              // If the file-based sound failed, try falling back to default
              if (settingsUpdate.sound !== 'DEFAULT') {
                  this.setActiveClickBuffer('DEFAULT');
              }
          }
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
    // Check for AudioContext first
    if (!this.audioContext) {
      console.error("Audio engine not initialized.");
      return;
    }
    
    // Try to resume the context if it's suspended
    if (this.audioContext.state === 'suspended') {
      console.log(`AudioEngine: AudioContext suspended before start, attempting to resume`);
      this.resumeAudioContextIfNeeded();
    }
    
    // Check for active click buffer after potential resume
    if (!this.activeClickBuffer) {
      console.error("Active click buffer missing. Current sound setting:", this.currentSoundSetting);
      console.log(`AudioEngine: Available sounds: [${Array.from(this.clickBuffers.keys()).join(', ')}]`);
      
      // Try to set a default buffer as a fallback
      if (this.clickBuffers.size > 0) {
        const firstAvailableSound = Array.from(this.clickBuffers.keys())[0];
        console.log(`AudioEngine: Falling back to first available sound: ${firstAvailableSound}`);
        this.setActiveClickBuffer(firstAvailableSound);
      } else {
        return; // No sounds available, can't start
      }
    }
    
    if (this._isPlaying) {
      console.warn("AudioEngine already playing. Call stop() first.");
      return;
    }
    
    if (sequence.length !== 1) {
        console.error(`AudioEngine.start called with sequence length ${sequence.length}. Expected 1.`);
        return;
    }
    
    // Attempt to resume without checking result - we'll proceed anyway
    try {
      this.audioContext.resume();
    } catch (error) {
      console.warn("AudioEngine: Error attempting to resume:", error);
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
    if (!this.audioContext || !this.activeClickBuffer) {
      console.error("Audio engine not initialized or active click buffer missing. Current sound setting:", this.currentSoundSetting);
      return;
    }

    const clickSource = this.audioContext.createBufferSource();
    clickSource.buffer = this.activeClickBuffer; // Use the currently active buffer
    clickSource.connect(this.audioContext.destination);
    console.log(`DEBUG: Playing sound: ${this.currentSoundSetting}, buffer duration: ${this.activeClickBuffer.duration.toFixed(3)}s`);
    clickSource.start(time);
    
    this.scheduledSources.push(clickSource);
    clickSource.onended = () => {
        this.scheduledSources = this.scheduledSources.filter(s => s !== clickSource);
    };

    // Calculate the overall beat number (starting from 1)
    const overallBeatNumber = this.segmentStartBeatCount + this.segmentBeatCount + 1;
    
    // Debug to understand voice counting
    console.log(`DEBUG: Beat ${overallBeatNumber}, Voice counts enabled: ${this.voiceCountsEnabled}, Voice buffer: ${!!this.voiceCountBuffer}, Offsets: ${!!this.voiceCountOffsets}`);
    
    // Check if this beat should have a voice count
    if (this.voiceCountsEnabled && 
        this.voiceCountBuffer && 
        this.voiceCountOffsets && 
        overallBeatNumber % 10 === 0 && 
        overallBeatNumber <= 100) {
        
        const countKey = overallBeatNumber.toString();
        if (this.voiceCountOffsets[countKey]) {
            console.log(`DEBUG: Scheduling voice count for beat ${overallBeatNumber}`);
            
            try {
                const voiceSource = this.audioContext.createBufferSource();
                voiceSource.buffer = this.voiceCountBuffer;
                voiceSource.connect(this.audioContext.destination);
                
                const offsetData = this.voiceCountOffsets[countKey];
                console.log(`DEBUG: Voice count ${countKey} - start: ${offsetData.start}, duration: ${offsetData.duration}`);
                
                // Play 0.05s after the click for better timing
                const voiceTime = time + 0.05;
                voiceSource.start(voiceTime, offsetData.start, offsetData.duration);
                
                // Add to scheduled sources so it's stopped when needed
                this.scheduledSources.push(voiceSource);
                voiceSource.onended = () => {
                    console.log(`DEBUG: Voice count ${countKey} finished playing`);
                    this.scheduledSources = this.scheduledSources.filter(s => s !== voiceSource);
                };
            } catch (error) {
                console.error(`DEBUG: Error playing voice count for beat ${overallBeatNumber}:`, error);
            }
        } else {
            console.warn(`DEBUG: Missing voice offset for beat ${overallBeatNumber}`);
        }
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
  
  private async loadVoiceCounts(isIOS = false): Promise<void> {
      if (!this.audioContext) return;
      
      // Prefer MP3 for iOS
      const audioPath = isIOS ? '/sounds/voice_counts.mp3' : '/sounds/voice_counts.ogg';
      const jsonPath = '/sounds/voice_counts.json';
      
      try {
          // First load the JSON offset data
          const jsonResponse = await fetch(jsonPath);
          if (!jsonResponse.ok) throw new Error(`Failed to fetch JSON: ${jsonResponse.statusText}`);
          this.voiceCountOffsets = await jsonResponse.json();
          console.log("DEBUG: Voice count offsets loaded:", this.voiceCountOffsets);
          
          // iOS-specific loading approach
          if (isIOS) {
              console.log("DEBUG: Using iOS-specific approach for voice counts");
              try {
                  const audioResponse = await fetch(audioPath);
                  if (!audioResponse.ok) throw new Error(`Failed to fetch audio: ${audioResponse.statusText}`);
                  
                  const audioArrayBuffer = await audioResponse.arrayBuffer();
                  console.log(`DEBUG: Voice count audio fetched, size: ${audioArrayBuffer.byteLength} bytes`);
                  
                  // Try iOS callback-style decoding first
                  let iosDecodeSucceeded = false;
                  try {
                      await new Promise<void>((resolve, reject) => {
                          this.audioContext!.decodeAudioData(
                              audioArrayBuffer,
                              (buffer) => {
                                  this.voiceCountBuffer = buffer;
                                  iosDecodeSucceeded = true;
                                  console.log("DEBUG: iOS callback decoding succeeded for voice counts");
                                  resolve();
                              },
                              (error) => {
                                  console.error("DEBUG: iOS callback decoding failed:", error);
                                  reject(error);
                              }
                          );
                          
                          // Set a timeout in case the callbacks don't fire
                          setTimeout(() => {
                              if (!iosDecodeSucceeded) {
                                  reject(new Error("iOS decode timeout"));
                              }
                          }, 500);
                      });
                  } catch { // Remove the parameter entirely
                      console.warn("DEBUG: iOS callback decoding failed, trying promise-based approach");
                      // Fall back to promise-based approach
                      this.voiceCountBuffer = await this.audioContext.decodeAudioData(audioArrayBuffer);
                  }
                  
                  console.log("DEBUG: Voice count audio successfully decoded for iOS");
              } catch (error) {
                  console.error("DEBUG: All iOS approaches failed for voice counts:", error);
                  throw error;
              }
          } else {
              // Try OGG format first for non-iOS
              try {
                  console.log("DEBUG: Attempting to load voice counts from OGG format");
                  const audioResponse = await fetch(audioPath);
                  if (!audioResponse.ok) throw new Error(`Failed to fetch audio: ${audioResponse.statusText}`);
                  
                  const audioArrayBuffer = await audioResponse.arrayBuffer();
                  console.log(`DEBUG: Voice count OGG fetched, size: ${audioArrayBuffer.byteLength} bytes`);
                  
                  try {
                      this.voiceCountBuffer = await this.audioContext.decodeAudioData(audioArrayBuffer);
                      console.log("DEBUG: Voice count OGG audio successfully decoded");
                  } catch (error) {
                      console.error("DEBUG: Error decoding voice count OGG:", error);
                      throw new Error("Decoding OGG failed");
                  }
              } catch (error) {
                  console.error("Error with OGG file:", error);
                  throw new Error("Decoding OGG failed");
              }
          }
      } catch (error) {
          console.warn("Could not load voice count assets:", error);
          this.voiceCountsEnabled = false;
          this.voiceCountBuffer = null;
          this.voiceCountOffsets = null;
      }
  }

  // Public method to check and resume AudioContext if needed
  public resumeAudioContextIfNeeded(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      console.log('AudioEngine: Attempting to resume suspended audio context');
      this.audioContext.resume().then(() => {
        if (this.audioContext) {
          console.log(`AudioEngine: Audio context resumed, new state: ${this.audioContext.state}`);
        }
      }).catch(err => {
        console.warn('AudioEngine: Failed to resume audio context:', err);
      });
    }
  }

  public getAudioContextState(): string {
    return this.audioContext ? this.audioContext.state : 'unavailable';
  }

  // Public method to manually test voice count playback
  public testVoiceCount(): void {
    if (!this.audioContext) {
      console.error("AudioEngine: Cannot test voice count - audio context not available");
      return;
    }
    
    if (!this.voiceCountBuffer) {
      console.error("AudioEngine: Voice count buffer not loaded, attempting to reload");
      this.reloadVoiceCounts();
      return;
    }
    
    try {
      console.log("AudioEngine: Testing voice count playback");
      this.resumeAudioContextIfNeeded();
      
      // Try to play count "10" as a test
      const testSource = this.audioContext.createBufferSource();
      testSource.buffer = this.voiceCountBuffer;
      testSource.connect(this.audioContext.destination);
      
      if (this.voiceCountOffsets && this.voiceCountOffsets["10"]) {
        const offset = this.voiceCountOffsets["10"];
        console.log(`AudioEngine: Playing test voice count "10", start: ${offset.start}, duration: ${offset.duration}`);
        testSource.start(this.audioContext.currentTime, offset.start, offset.duration);
        testSource.onended = () => {
          console.log("AudioEngine: Test voice count finished");
        };
      } else {
        console.error("AudioEngine: Voice count offsets not available or missing data for count 10");
      }
    } catch (error) {
      console.error("AudioEngine: Error testing voice count:", error);
    }
  }
  
  // Public method to manually reload voice counts
  public async reloadVoiceCounts(): Promise<void> {
    console.log("AudioEngine: Manually reloading voice counts");
    
    // First clear any existing buffer
    this.voiceCountBuffer = null;
    this.voiceCountOffsets = null;
    
    // Then reload
    try {
      await this.loadVoiceCounts();
      if (this.voiceCountBuffer && this.voiceCountOffsets) {
        console.log("AudioEngine: Voice counts successfully reloaded");
      } else {
        console.error("AudioEngine: Voice counts reload failed");
      }
    } catch (error) {
      console.error("AudioEngine: Error reloading voice counts:", error);
    }
  }

  // Synthesize a click sound using triangle wave
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
}

export const getAudioEngine = (): Promise<AudioEngineImpl> => AudioEngineImpl.getInstance();
export const audioEngine = AudioEngineImpl.getInstance(); 