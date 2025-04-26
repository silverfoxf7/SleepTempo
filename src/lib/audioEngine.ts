import { TNativeAudioContext } from 'standardized-audio-context';

export interface TempoStep {
  bpm: number;
  beats: number;
}

class AudioEngineImpl {
  private static instance: AudioEngineImpl | null = null;
  private audioContext: TNativeAudioContext | null = null;
  private _isPlaying: boolean = false;
  private clickBuffer: AudioBuffer | null = null;
  private schedulerTimer: ReturnType<typeof setTimeout> | null = null;
  private nextClickTime: number = 0; // Absolute time based on audioContext.currentTime
  private currentSequence: TempoStep[] = [];
  private currentStepIndex: number = 0;
  private beatsInCurrentStep: number = 0;
  private scheduledSources: AudioBufferSourceNode[] = [];
  private scheduleAheadTime: number = 0.1; // 100ms look-ahead
  private scheduleIntervalMs: number = 25; // Check every 25ms

  public onEnded?: () => void;

  private constructor() {
    // Private constructor for singleton
    if (typeof window !== 'undefined') {
      try {
        // Use the constructor directly if available, otherwise check types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!ContextClass) {
            console.error("Web Audio API is not supported in this browser.");
            return;
        }
        // Cast to TNativeAudioContext for type safety with standardized-audio-context types
        this.audioContext = new ContextClass() as TNativeAudioContext;
        this.createClickBuffer();
      } catch (error) {
          console.error("Error initializing AudioContext:", error);
      }
    }
  }

  public static getInstance(): AudioEngineImpl {
    if (!AudioEngineImpl.instance) {
      AudioEngineImpl.instance = new AudioEngineImpl();
    }
    return AudioEngineImpl.instance;
  }

  public get isPlaying(): boolean {
    return this._isPlaying;
  }

  public start(sequence: TempoStep[]): void {
    if (!this.audioContext || !this.clickBuffer) {
      console.error("Audio engine not initialized or click buffer missing.");
      return;
    }
    if (this._isPlaying) {
      console.warn("AudioEngine already playing. Call stop() first.");
      return;
    }
    if (sequence.length === 0) {
        console.warn("Cannot start with an empty sequence.");
        return;
    }

    // Resume AudioContext if suspended (important for mobile browsers)
    if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
    }

    console.log("Starting sequence:", sequence);
    this._isPlaying = true;
    this.currentSequence = sequence;
    this.currentStepIndex = 0;
    this.beatsInCurrentStep = 0;
    this.nextClickTime = this.audioContext.currentTime + 0.05; // Start scheduling shortly after start call
    this.scheduledSources = [];

    // Clear any previous timer
    if (this.schedulerTimer) {
        clearTimeout(this.schedulerTimer);
    }

    this.scheduler(); // Start the scheduling loop
  }

  private scheduler(): void {
    if (!this._isPlaying || !this.audioContext) return;

    // Schedule clicks until scheduleAheadTime reached
    while (this.nextClickTime < this.audioContext.currentTime + this.scheduleAheadTime) {
        this.scheduleClick(this.nextClickTime);
        this.advanceBeat();

        // Check if sequence finished
        if (this.currentStepIndex >= this.currentSequence.length) {
            // Schedule the final onEnded call slightly after the last beat
            const finalBeatDuration = 60.0 / this.currentSequence[this.currentSequence.length - 1].bpm;
            const onEndedTime = this.nextClickTime + finalBeatDuration; // Time for onEnded callback
            
            // Use setTimeout for the callback, relative to audio context time
            const delayMs = (onEndedTime - this.audioContext.currentTime) * 1000;
            
            setTimeout(() => {
                 // Check if still playing, could have been stopped manually
                if(this._isPlaying) {
                    console.log("Sequence finished naturally.")
                    this.stop(false); // Stop without calling onEnded here
                    if (this.onEnded) {
                        this.onEnded(); // Call the actual callback
                    }
                }
            }, Math.max(0, delayMs)); // Ensure delay isn't negative
            
            return; // Stop scheduling loop
        }
    }

    // Setup next scheduler call
    this.schedulerTimer = setTimeout(() => this.scheduler(), this.scheduleIntervalMs);
  }

  private scheduleClick(time: number): void {
    if (!this.audioContext || !this.clickBuffer) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = this.clickBuffer;
    source.connect(this.audioContext.destination);
    source.start(time);
    
    // Keep track of sources to stop them later if needed
    this.scheduledSources.push(source);

    // Clean up finished sources (optional but good practice)
    source.onended = () => {
        this.scheduledSources = this.scheduledSources.filter(s => s !== source);
    };
  }

  private advanceBeat(): void {
    const currentStep = this.currentSequence[this.currentStepIndex];
    const secondsPerBeat = 60.0 / currentStep.bpm;
    this.nextClickTime += secondsPerBeat;

    this.beatsInCurrentStep++;
    if (this.beatsInCurrentStep >= currentStep.beats) {
        this.currentStepIndex++;
        this.beatsInCurrentStep = 0;
        // If moving to a new step, log it (optional)
        if (this.currentStepIndex < this.currentSequence.length) {
            console.log(`Moving to step ${this.currentStepIndex + 1}: ${this.currentSequence[this.currentStepIndex].bpm} BPM`);
        }
    }
  }

  public stop(callOnEnded: boolean = false): void { // Add parameter to control onEnded
    if (!this.audioContext) return;
    if (!this._isPlaying) return; // Already stopped

    console.log("Stopping sequence.");
    this._isPlaying = false;

    // Clear the scheduler timeout
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }

    // Stop all scheduled sources that haven't played yet
    const currentTime = this.audioContext.currentTime;
    this.scheduledSources.forEach(source => {
        // Attempt to stop. This might throw if the source already finished, ignore errors.
        try {
             source.stop(currentTime);
        } catch {
           // ignore error, source might have finished already
        }
    });
    this.scheduledSources = []; // Clear the array

    // Reset sequence progress
    this.currentSequence = [];
    this.currentStepIndex = 0;
    this.beatsInCurrentStep = 0;

    // Call onEnded ONLY if explicitly requested (e.g., manual stop)
    // Natural completion handles its own onEnded call in the scheduler.
    if (callOnEnded && this.onEnded) {
      console.log("onEnded called due to manual stop.");
      this.onEnded();
    }
  }

  // --- Internal methods for scheduling and buffer creation will go here --- 
  private createClickBuffer(): void {
    if (!this.audioContext) return;
    const sampleRate = this.audioContext.sampleRate;
    const durationSeconds = 0.005; // 5ms click
    const frameCount = sampleRate * durationSeconds;
    this.clickBuffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
    const bufferData = this.clickBuffer.getChannelData(0);
    // Simple square wave (or noise burst)
    for (let i = 0; i < frameCount; i++) {
        // bufferData[i] = Math.random() * 2 - 1; // White noise
        bufferData[i] = i < frameCount / 2 ? 1.0 : -1.0; // Square wave
    }
    console.log("Click buffer created.");
  }
}

// Export the singleton instance
export const audioEngine = AudioEngineImpl.getInstance(); 