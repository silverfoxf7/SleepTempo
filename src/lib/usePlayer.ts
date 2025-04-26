'use client';

import { useState, useEffect, useCallback } from 'react';
import { SequencerManager } from './sequencerManager'; // Assuming SequencerManager is exported
import { DEFAULT_TEMPO_LADDER } from './constants';

// Create a single instance of the sequencer
// IMPORTANT: This assumes SequencerManager itself handles singleton logic or
// that recreating it is acceptable. If SequencerManager relies on audioEngine
// which IS a singleton, this should be fine.
const sequencer = new SequencerManager(DEFAULT_TEMPO_LADDER);

export function usePlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  // Add state for current step if needed for UI feedback, otherwise keep it internal
  // const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  // Callback for when the sequence finishes naturally
  const handleSequenceEnd = useCallback(() => {
    console.log('usePlayer: Sequence ended.');
    setIsPlaying(false);
    // Reset step index if tracking
    // setCurrentStepIndex(-1);
  }, []);

  // Setup sequencer event listener on mount
  useEffect(() => {
    sequencer.onSequenceEnd = handleSequenceEnd;

    // Cleanup on unmount
    return () => {
      sequencer.stop(); // Ensure sequencer stops if component unmounts while playing
      sequencer.onSequenceEnd = undefined; // Remove listener
    };
  }, [handleSequenceEnd]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      sequencer.stop();
      setIsPlaying(false);
      console.log('usePlayer: Stopped sequence.');
      // setCurrentStepIndex(-1);
    } else {
      // TODO: Allow passing custom ladder if settings are implemented
      sequencer.start(DEFAULT_TEMPO_LADDER);
      setIsPlaying(true);
      console.log('usePlayer: Started sequence.');
      // setCurrentStepIndex(0); // Set initial step if tracking
    }
  }, [isPlaying]);

  return {
    isPlaying,
    // currentStepIndex, // Expose if needed
    togglePlay,
  };
} 