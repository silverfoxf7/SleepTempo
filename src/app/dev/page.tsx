'use client';

import React, { useState, useEffect } from 'react';
import { getAudioEngine } from '@/lib/audioEngine';
import type { TempoStep, AudioEngineImpl } from '@/lib/audioEngine';

const defaultSequence: TempoStep[] = [
  { bpm: 120, beats: 4 },
  { bpm: 60, beats: 4 },
];

export default function DevPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [engine, setEngine] = useState<AudioEngineImpl | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAudioEngine().then(resolvedEngine => {
        if (resolvedEngine) {
            setEngine(resolvedEngine);
        } else {
            console.error("DevPage: Failed to get audio engine instance.");
        }
        setIsLoading(false);
    });
  }, []);

  const handleStart = () => {
    if (!engine) return; 

    console.log('DevPage: Starting audio engine...');
    engine.onEnded = () => {
      console.log('DevPage: Audio engine finished.');
      setIsPlaying(false);
    };
    engine.start(defaultSequence); 
    setIsPlaying(true);
  };

  const handleStop = () => {
    if (!engine) return; 

    console.log('DevPage: Stopping audio engine...');
    engine.stop();
    setIsPlaying(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-2xl mb-4">Audio Engine Test (Manual Dev Page)</h1>
      {isLoading ? (
          <p>Loading Audio Engine...</p>
      ) : !engine ? (
          <p className='text-red-500'>Error loading Audio Engine!</p>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
} 