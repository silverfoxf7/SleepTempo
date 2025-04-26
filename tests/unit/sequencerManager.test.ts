import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SequencerManager } from '@/lib/sequencerManager'; // Assuming path
import { audioEngine, TempoStep } from '@/lib/audioEngine';
import { DEFAULT_TEMPO_LADDER } from '@/lib/constants';

// Mock the audioEngine
vi.mock('@/lib/audioEngine', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/audioEngine')>();
  return {
    ...original,
    audioEngine: {
      start: vi.fn(),
      stop: vi.fn(),
      onEnded: undefined, // Ensure it can be set
      // Add other methods/properties if SequencerManager uses them
    },
  };
});

describe('SequencerManager', () => {
  let sequencer: SequencerManager;
  const mockLadder: TempoStep[] = [
    { bpm: 100, beats: 4 },
    { bpm: 80, beats: 4 },
  ];

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // Reset the onEnded handler potentially set by the sequencer
    audioEngine.onEnded = undefined;
    sequencer = new SequencerManager();
  });

  it('should be defined', () => {
    expect(SequencerManager).toBeDefined();
  });

  it('should initialize with default ladder if none provided', () => {
    // This test requires access to internal state or specific behavior observation
    // For now, we'll assume it uses the default, implementation will confirm.
    // Placeholder assertion:
    expect(sequencer).toBeInstanceOf(SequencerManager);
  });

  it('should accept a custom ladder during initialization', () => {
    const customSequencer = new SequencerManager(mockLadder);
    // Again, requires internal state access or behavioral observation.
    // Placeholder assertion:
    expect(customSequencer).toBeInstanceOf(SequencerManager);
  });

  it('should start the first step of the ladder when start() is called', () => {
    sequencer.start(mockLadder);
    expect(audioEngine.start).toHaveBeenCalledOnce();
    expect(audioEngine.start).toHaveBeenCalledWith([mockLadder[0]]);
  });

  it('should call audioEngine.start for the next step when the current step ends', () => {
    sequencer.start(mockLadder);
    // Simulate the audioEngine finishing the first step
    // We need to capture the assigned onEnded callback
    const engineOnEnded = (audioEngine as any).onEnded;
    expect(engineOnEnded).toBeDefined();
    expect(typeof engineOnEnded).toBe('function');

    // Trigger the callback as if the first step finished
    engineOnEnded();

    // Verify the second step was started
    expect(audioEngine.start).toHaveBeenCalledTimes(2);
    expect(audioEngine.start).toHaveBeenNthCalledWith(2, [mockLadder[1]]);
  });

  it('should call its own onSequenceEnd callback when the last step finishes', () => {
    const onSequenceEndMock = vi.fn();
    sequencer.onSequenceEnd = onSequenceEndMock;
    sequencer.start(mockLadder);

    // Simulate first step ending
    let engineOnEnded = (audioEngine as any).onEnded;
    expect(engineOnEnded).toBeDefined();
    engineOnEnded();

    // Simulate second (last) step ending
    engineOnEnded = (audioEngine as any).onEnded; // Re-capture as it might be reassigned
    expect(engineOnEnded).toBeDefined();
    engineOnEnded();

    // Verify sequencer's callback was triggered
    expect(onSequenceEndMock).toHaveBeenCalledOnce();
    expect(audioEngine.start).toHaveBeenCalledTimes(2); // Ensure it didn't try to start another step
  });

  it('should call audioEngine.stop() when stop() is called', () => {
    sequencer.start(mockLadder);
    sequencer.stop();
    expect(audioEngine.stop).toHaveBeenCalledOnce();
  });

  it('should not proceed to the next step if stop() was called', () => {
    sequencer.start(mockLadder);

    const engineOnEnded = (audioEngine as any).onEnded;
    expect(engineOnEnded).toBeDefined();

    sequencer.stop(); // Stop before the first step ends
    engineOnEnded();  // Simulate the first step ending *after* stop was called

    expect(audioEngine.stop).toHaveBeenCalledOnce();
    expect(audioEngine.start).toHaveBeenCalledOnce(); // Only the initial start call
  });
}); 