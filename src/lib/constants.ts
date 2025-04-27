import { TempoStep } from './audioEngine';

// Default tempo ladder: Ramp down from 120 BPM to 20 BPM
// PRD: Specify stages (e.g., 120 for 2min, 100 for 2min, ... 20 for 10min)
// For now, using a simpler placeholder structure.

// Example: 120 BPM for 100 beats, then ramp down
export const DEFAULT_TEMPO_LADDER: TempoStep[] = [
  { bpm: 120, beats: 100 }, // Initial phase: 100 beats at 120 BPM
  // Ramp down phase (optional, kept from previous version)
  { bpm: 100, beats: 8 },
  { bpm: 80, beats: 8 },
  { bpm: 60, beats: 8 },
  { bpm: 40, beats: 12 },
  { bpm: 20, beats: 16 }, // Longer hold at the end
];

export const INITIAL_BPM = DEFAULT_TEMPO_LADDER[0]?.bpm ?? 120;
export const MIN_BPM = 10;
export const MAX_BPM = 240;
export const DEFAULT_BEATS = 4;
export const MIN_BEATS = 1;
export const MAX_BEATS = 64; 