import { TempoStep } from './audioEngine';
import { DEFAULT_TEMPO_LADDER } from './constants';
import type { AudioEngineImpl } from './audioEngine';

export class SequencerManager {
  private ladder: TempoStep[];
  private currentStepIndex: number;
  private isRunning: boolean;
  private engine: AudioEngineImpl;
  private overallBeatCount: number = 0; // Track beats across the whole sequence

  public onSequenceEnd?: () => void;

  constructor(engine: AudioEngineImpl, initialLadder: TempoStep[] = DEFAULT_TEMPO_LADDER) {
    if (!engine) {
        throw new Error("SequencerManager requires a valid AudioEngine instance.");
    }
    this.engine = engine;
    this.ladder = initialLadder;
    this.currentStepIndex = -1;
    this.isRunning = false;
  }

  private handleAudioEngineEnd = () => {
    if (!this.isRunning) {
      return;
    }
    
    // Increment overall beat count by the number of beats in the step that JUST finished
    const completedStep = this.ladder[this.currentStepIndex];
    if (completedStep) {
        this.overallBeatCount += completedStep.beats;
        console.log(`SequencerManager: Step ${this.currentStepIndex + 1} ended. Overall beats: ${this.overallBeatCount}`);
    }

    // Now move to the next step index
    this.currentStepIndex++;

    if (this.currentStepIndex < this.ladder.length) {
      this.startCurrentStep();
    } else {
      console.log("SequencerManager: Full sequence finished.");
      this.isRunning = false;
      this.currentStepIndex = -1;
      this.overallBeatCount = 0; // Reset for next full sequence run
      this.engine.onEnded = undefined; // Stop listening to engine's step end
      if (this.onSequenceEnd) {
        this.onSequenceEnd(); // Notify UI hook
      }
    }
  };

  private startCurrentStep() {
    const step = this.ladder[this.currentStepIndex];
    if (step) {
      console.log(`SequencerManager: Starting step ${this.currentStepIndex + 1}/${this.ladder.length}, overall beat count starts at ${this.overallBeatCount}`);
      // Pass the current overall beat count to the engine
      this.engine.start([step], this.overallBeatCount);
    } else {
      console.error('SequencerManager: Invalid step index encountered in startCurrentStep', this.currentStepIndex);
      this.stop(); // Stop if something went wrong
    }
  }

  start(ladder: TempoStep[] = this.ladder): void {
    if (this.isRunning) {
      console.warn('SequencerManager: Already running.');
      return;
    }

    this.ladder = ladder;
    if (this.ladder.length === 0) {
      console.warn('SequencerManager: Cannot start with an empty ladder.');
      return;
    }

    console.log('SequencerManager: Starting sequence...');
    this.isRunning = true;
    this.currentStepIndex = 0;
    this.overallBeatCount = 0; // Reset overall count at the beginning of the sequence
    this.engine.onEnded = this.handleAudioEngineEnd; // Listen for engine step ends
    this.startCurrentStep();
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }
    console.log('SequencerManager: Stopping sequence manually...');
    this.isRunning = false;
    this.engine.stop(); // Tell engine to stop its current step
    // Clean up immediately on manual stop
    this.engine.onEnded = undefined;
    this.currentStepIndex = -1;
    this.overallBeatCount = 0;
  }
} 