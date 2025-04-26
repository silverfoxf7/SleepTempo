'use client';

import React, { useEffect } from 'react';
import { usePlayer } from '@/lib/usePlayer'; // Import the hook

export default function HomePage() {
  // Use the hook to get state and the toggle function
  const { isPlaying, togglePlay } = usePlayer();

  // Add keyboard listener for Spacebar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !event.repeat) {
        event.preventDefault(); // Prevent scrolling if page is long
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlay]); // Add togglePlay to dependency array

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-900 text-white">
      <main className="flex flex-col items-center">
        <button
          onClick={togglePlay} // Use the toggle function from the hook
          className="w-40 h-40 rounded-full bg-zinc-800/90 flex items-center justify-center text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-teal-500 transition-colors duration-200 ease-in-out hover:bg-zinc-700/90 active:bg-zinc-600/90 disabled:opacity-50"
          aria-label={isPlaying ? 'Stop tempo sequence' : 'Start tempo sequence'}
        >
          {isPlaying ? (
            // Pulsing dot when playing
            <span className="w-4 h-4 bg-teal-400 rounded-full animate-pulse"></span>
          ) : (
            // "Start" text when stopped
            'Start'
          )}
        </button>
      </main>
    </div>
  );
}
