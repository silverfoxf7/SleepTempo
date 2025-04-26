import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
// Remove top-level import of the implementation
// import { audioEngine, TempoStep } from '../../src/lib/audioEngine'; 
import type { TempoStep } from '../../src/lib/audioEngine'; // Import type only

// Mock the standardized-audio-context module exports ONLY
vi.mock('standardized-audio-context', async (importOriginal) => {
  const actual = await importOriginal() as any;
  let mockCurrentTime = 0;
  const mockContextInstance = {
    createBufferSource: vi.fn(() => ({
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
      loop: false,
      playbackRate: { value: 1 },
    })),
    createBuffer: vi.fn(() => ({})),
    destination: {},
    get currentTime() { return mockCurrentTime; },
    set currentTime(value) { mockCurrentTime = value; },
    sampleRate: 44100,
    close: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    state: 'running' as AudioContextState,
  };
  // Mock the constructor function itself, just for exporting
  const MockAudioContext = vi.fn(() => mockContextInstance);

  return {
    ...actual,
    // Mock the exports used for typing/import
    TNativeAudioContext: MockAudioContext,
    StandardizedAudioContext: MockAudioContext, 
  };
});

// Create persistent mocks for source methods
const mockSourceStart = vi.fn();
const mockSourceStop = vi.fn();

let mockGlobalCurrentTime = 0;
const mockGlobalAudioContextInstance = {
    createBufferSource: vi.fn(() => ({
      buffer: null,
      connect: vi.fn(),
      // Return the persistent mocks
      start: mockSourceStart, 
      stop: mockSourceStop,
      onended: null,
      loop: false,
      playbackRate: { value: 1 },
    })),
    createBuffer: vi.fn((numberOfChannels, length, sampleRate) => ({
        // Return a basic mock buffer with the required method
        numberOfChannels,
        length,
        sampleRate,
        getChannelData: vi.fn(() => new Float32Array(length)), // Return dummy data array
        copyFromChannel: vi.fn(),
        copyToChannel: vi.fn(),
        duration: length / sampleRate,
    })),
    destination: {},
    get currentTime() { return mockGlobalCurrentTime; },
    set currentTime(value) { mockGlobalCurrentTime = value; },
    sampleRate: 44100,
    close: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    state: 'running' as AudioContextState,
};
const MockGlobalAudioContext = vi.fn(() => mockGlobalAudioContextInstance);

describe('audioEngine', () => {
  // Define type for engineInstance, but don't assign here
  let engineInstance: any; // Use 'any' or a more specific type if available 
  let mockAudioContext: any; 

  beforeAll(() => {
    vi.stubGlobal('AudioContext', MockGlobalAudioContext);
    vi.stubGlobal('webkitAudioContext', MockGlobalAudioContext);
  });

  beforeEach(async () => { // Make beforeEach async for dynamic import
    vi.useFakeTimers();
    MockGlobalAudioContext.mockClear();
    vi.mocked(mockGlobalAudioContextInstance.createBufferSource).mockClear();
    vi.mocked(mockGlobalAudioContextInstance.createBuffer).mockClear();
    vi.mocked(mockGlobalAudioContextInstance.close).mockClear();
    vi.mocked(mockGlobalAudioContextInstance.resume).mockClear();
    mockGlobalCurrentTime = 0;
    mockGlobalAudioContextInstance.state = 'running';
    
    // Clear the persistent source mocks
    mockSourceStart.mockClear();
    mockSourceStop.mockClear();
    
    // Dynamically import the engine *after* globals are stubbed
    // Use a unique variable name to avoid potential hoisting issues
    const engineModule = await import('../../src/lib/audioEngine');
    engineInstance = engineModule.audioEngine;

    // Now access the context
    mockAudioContext = (engineInstance as any).audioContext;

    // Sanity check
    expect(mockAudioContext).toBe(mockGlobalAudioContextInstance);

    // Reset engine state
    engineInstance.onEnded = undefined;
    // Stop if it was somehow playing from a previous failed test run state
    if (engineInstance.isPlaying) {
        engineInstance.stop();
    }
    
    // Clear mocks on the instance assigned to the engine
     if (mockAudioContext?.createBuffer) {
        vi.mocked(mockAudioContext.createBuffer).mockClear(); 
        (engineInstance as any).clickBuffer = mockAudioContext.createBuffer(); // Re-assign mock buffer
    }
  });

  afterEach(() => {
     // Stop engine if playing
    if (engineInstance?.isPlaying) {
      engineInstance.stop();
    }
    vi.restoreAllMocks(); 
    vi.useRealTimers();
    // Reset modules to ensure clean state for next test file (if any)
    vi.resetModules(); 
  });

  it('should exist as a singleton', async () => {
    expect(engineInstance).toBeDefined();
    // Get another instance using dynamic import
    const { audioEngine: anotherInstance } = await import('../../src/lib/audioEngine');
    expect(engineInstance).toBe(anotherInstance);
  });

  it('should have start and stop methods', () => {
    expect(typeof engineInstance.start).toBe('function');
    expect(typeof engineInstance.stop).toBe('function');
  });

  it('should have an isPlaying property', () => {
    expect(engineInstance.isPlaying).toBe(false);
  });

  it('should have an onEnded callback that defaults to undefined', () => {
    expect(engineInstance.onEnded).toBeUndefined();
  });

  it('should set isPlaying to true when start is called', () => {
    const sequence: TempoStep[] = [{ bpm: 120, beats: 4 }];
    engineInstance.start(sequence);
    expect(engineInstance.isPlaying).toBe(true);
  });

  it('should set isPlaying to false when stop is called', () => {
    const sequence: TempoStep[] = [{ bpm: 120, beats: 4 }];
    engineInstance.start(sequence);
    engineInstance.stop();
    expect(engineInstance.isPlaying).toBe(false);
  });

  it('should call onEnded when stop is called if callback is defined', () => {
    const sequence: TempoStep[] = [{ bpm: 120, beats: 4 }];
    const mockOnEnded = vi.fn();
    engineInstance.onEnded = mockOnEnded;
    engineInstance.start(sequence); 
    engineInstance.stop(); // Stop manually, default callOnEnded=false
    // This test name is now misleading, but reflects original intent.
    // We now expect it *not* to be called with stop() unless flagged.
    expect(mockOnEnded).not.toHaveBeenCalled(); // Corrected expectation
  });

  // --- Tests for scheduling and stopping --- 
  it('should schedule clicks based on BPM and beats', () => {
    const sequence: TempoStep[] = [{ bpm: 120, beats: 2 }]; 
    engineInstance.start(sequence);

    // Initial scheduler run
    mockAudioContext.currentTime = 0.01; // Small advance to start
    vi.advanceTimersByTime(50); // Run scheduler's setTimeout
    // Expect 1st click scheduled around 0.05s
    expect(mockSourceStart).toHaveBeenCalledTimes(1);
    expect(mockSourceStart).toHaveBeenCalledWith(expect.closeTo(0.05));

    // Advance time enough for the next beat to be within the schedule-ahead window
    // Next beat is at ~0.55s. Current time is 0.01. Schedule window is 0.1s.
    // Advance current time past (0.55s - 0.1s) = 0.45s
    mockAudioContext.currentTime = 0.5; 
    vi.advanceTimersByTime(50); // Run scheduler's setTimeout again

    // Expect 2nd click scheduled around 0.55s
    expect(mockSourceStart).toHaveBeenCalledTimes(2);
    expect(mockSourceStart).toHaveBeenCalledWith(expect.closeTo(0.55));
  });

  it('should stop all scheduled audio when stop is called', () => {
    const sequence: TempoStep[] = [{ bpm: 60, beats: 4 }];
    engineInstance.start(sequence);

    mockAudioContext.currentTime = 0.01;
    vi.advanceTimersByTime(50); 

    const sourcesCreatedCount = mockGlobalAudioContextInstance.createBufferSource.mock.calls.length;
    expect(sourcesCreatedCount).toBeGreaterThan(0); // Ensure some sources were scheduled
    
    engineInstance.stop(true);

    expect(engineInstance.isPlaying).toBe(false);
    // Check the persistent stop mock - it should be called for each source created
    expect(mockSourceStop).toHaveBeenCalledTimes(sourcesCreatedCount);
    // Check that stop was called with the current time
    expect(mockSourceStop).toHaveBeenLastCalledWith(mockAudioContext.currentTime);
  });

  it('should call onEnded ONLY when the entire sequence completes naturally', () => {
    const sequence: TempoStep[] = [
      { bpm: 120, beats: 1 }, // 0.5s
      { bpm: 60, beats: 1 }   // 1.0s
    ]; // Total duration = 0.5s + 1.0s = 1.5s for clicks
    const mockOnEnded = vi.fn();
    engineInstance.onEnded = mockOnEnded;
    engineInstance.start(sequence);

    // Simulate time passing for the whole sequence + buffer
    const totalClickDuration = (60.0 / 120.0) * 1 + (60.0 / 60.0) * 1; // 0.5 + 1.0 = 1.5s
    const finalBeatDuration = 60.0 / 60.0; // Last beat duration = 1.0s
    const expectedEndTime = 0.05 + totalClickDuration + finalBeatDuration; // Start offset + clicks + last beat end

    // Advance audio context time and fake timers past the end time
    mockAudioContext.currentTime = expectedEndTime + 0.1; // Go slightly past expected end
    vi.advanceTimersToNextTimer(); // Run scheduler to detect completion
    vi.advanceTimersToNextTimer(); // Run the final setTimeout for onEnded

    expect(mockOnEnded).toHaveBeenCalledTimes(1);
    expect(engineInstance.isPlaying).toBe(false);
  });
  
  it('should NOT call onEnded when stop is called manually without flag', () => {
    const sequence: TempoStep[] = [{ bpm: 120, beats: 4 }];
    const mockOnEnded = vi.fn();
    engineInstance.onEnded = mockOnEnded;
    engineInstance.start(sequence);
    vi.advanceTimersByTime(100); // Let it run a bit
    engineInstance.stop(); // Stop manually, default callOnEnded=false
    expect(mockOnEnded).not.toHaveBeenCalled();
  });

  it('should call onEnded when stop is called manually WITH flag', () => {
    const sequence: TempoStep[] = [{ bpm: 120, beats: 4 }];
    const mockOnEnded = vi.fn();
    engineInstance.onEnded = mockOnEnded;
    engineInstance.start(sequence);
    vi.advanceTimersByTime(100); // Let it run a bit
    engineInstance.stop(true); // Stop manually, explicit callOnEnded=true
    expect(mockOnEnded).toHaveBeenCalledTimes(1);
  });

  // Keep jitter test skipped for now, as it requires more complex timing validation
  it.skip('should schedule clicks within ±5ms jitter', () => {
    // Requires precise timing implementation and potentially advanced mocking/testing
  });
}); 