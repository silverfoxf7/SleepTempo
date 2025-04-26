import { audioEngine, TempoStep } from './audioEngine';
import { DEFAULT_TEMPO_LADDER } from './constants';

export class SequencerManager {
  private ladder: TempoStep[];
  private currentStepIndex: number;
  private isRunning: boolean;

  public onSequenceEnd?: () => void;

  constructor(initialLadder: TempoStep[] = DEFAULT_TEMPO_LADDER) {
    this.ladder = initialLadder;
    this.currentStepIndex = -1; // Not started
    this.isRunning = false;
  }

  private handleAudioEngineEnd = () => {
    if (!this.isRunning) {
      return; // Sequence was stopped externally
    }

    this.currentStepIndex++;

    if (this.currentStepIndex < this.ladder.length) {
      this.startCurrentStep();
    } else {
      // End of sequence
      this.isRunning = false;
      this.currentStepIndex = -1;
      audioEngine.onEnded = undefined; // Clean up listener
      if (this.onSequenceEnd) {
        this.onSequenceEnd();
      }
    }
  };

  private startCurrentStep() {
    const step = this.ladder[this.currentStepIndex];
    if (step) {
      // Pass only the current step as a single-element array
      audioEngine.start([step]);
    } else {
      // Should not happen if logic is correct, but handle defensively
      console.error('SequencerManager: Invalid step index', this.currentStepIndex);
      this.stop();
    }
  }

  start(ladder: TempoStep[] = this.ladder): void {
    if (this.isRunning) {
      console.warn('SequencerManager: Already running.');
      return;
    }

    this.ladder = ladder; // Use provided ladder or the constructor default
    if (this.ladder.length === 0) {
      console.warn('SequencerManager: Cannot start with an empty ladder.');
      return;
    }

    console.log('SequencerManager: Starting sequence...');
    this.isRunning = true;
    this.currentStepIndex = 0;
    // Assign the bound method as the handler
    audioEngine.onEnded = this.handleAudioEngineEnd;
    this.startCurrentStep();
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }
    console.log('SequencerManager: Stopping sequence...');
    this.isRunning = false;
    this.currentStepIndex = -1;
    audioEngine.stop();
    audioEngine.onEnded = undefined; // Clean up listener immediately
  }
} 