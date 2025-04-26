'use client';

import React, { useState } from 'react';
import { audioEngine, TempoStep } from '@/lib/audioEngine';

const defaultSequence: TempoStep[] = [
  { bpm: 120, beats: 4 },
  { bpm: 60, beats: 4 },
];

export default function DevPage() {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleStart = () => {
    console.log('DevPage: Starting audio engine...');
    audioEngine.onEnded = () => {
      console.log('DevPage: Audio engine finished.');
      setIsPlaying(false);
    };
    audioEngine.start(defaultSequence);
    setIsPlaying(true);
  };

  const handleStop = () => {
    console.log('DevPage: Stopping audio engine...');
    audioEngine.stop();
    setIsPlaying(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-2xl mb-4">Audio Engine Test</h1>
      <div className="space-x-4">
        <button
          onClick={handleStart}
          disabled={isPlaying}
          className="px-4 py-2 bg-green-600 rounded disabled:opacity-50"
        >
          Start
        </button>
        <button
          onClick={handleStop}
          disabled={!isPlaying}
          className="px-4 py-2 bg-red-600 rounded disabled:opacity-50"
        >
          Stop
        </button>
      </div>
      {isPlaying && <p className="mt-4">Status: Playing...</p>}
      {!isPlaying && <p className="mt-4">Status: Stopped</p>}
      <p className="mt-2 text-sm text-gray-400">Check console for logs.</p>
    </div>
  );
} 