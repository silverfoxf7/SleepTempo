'use client';

import React, { useEffect, useState } from 'react';
import { usePlayer } from '@/lib/usePlayer'; // Import the hook
import SettingsDrawer from '@/components/SettingsDrawer'; // Import SettingsDrawer component

// Placeholder Settings Icon SVG
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 5.855a.75.75 0 0 0 .357.84.75.75 0 0 1 .296.92l-.202.68a.75.75 0 0 0 .21.86l.56.56a.75.75 0 0 0 .86.21l.68-.202a.75.75 0 0 1 .92.296.75.75 0 0 0 .84.357l2.038-.175c.904-.078 1.567-.85 1.567-1.754V4.043a.75.75 0 0 0-.724-.75C13.66 3.28 12.39 2.25 11.078 2.25ZM12.75 4.5a.75.75 0 0 0-.75-.75H11.08c-.522 0-.99.31-1.2.77L8.94 6.11a2.25 2.25 0 0 1-.89 1.15l-.01.005-.01.006a2.25 2.25 0 0 0-1.15.89L5.29 8.94a1.496 1.496 0 0 0-.77 1.2v.942c0 .521.31.99.77 1.2l1.6.94a2.25 2.25 0 0 0 1.15.89l.005.01.006.01a2.25 2.25 0 0 1 .89 1.15l.94 1.603c.27.46.74.77 1.2.77h.942c.521 0 .99-.31 1.2-.77l.94-1.6a2.25 2.25 0 0 1 .89-1.15l.01-.005.01-.006a2.25 2.25 0 0 0 1.15-.89l1.6-.94c.46-.27.77-.74.77-1.2v-.942c0-.521-.31-.99-.77-1.2l-1.6-.94a2.25 2.25 0 0 0-1.15-.89l-.005-.01-.006-.01a2.25 2.25 0 0 1-.89-1.15l-.94-1.603a1.496 1.496 0 0 0-1.2-.77Zm-4.52 6.118a.75.75 0 0 0-.897.445l-.445.897a.75.75 0 0 1-1.342 0l-.445-.897a.75.75 0 0 0-.897-.445l-.897.445a.75.75 0 0 1 0 1.342l.897.445a.75.75 0 0 0 .445.897l.445.897a.75.75 0 0 1 0 1.342l-.445.897a.75.75 0 0 0-.445.897l-.897.445a.75.75 0 0 1-1.342 0l-.897-.445a.75.75 0 0 0-.897.445l-.445.897a.75.75 0 0 1-1.342 0l-.445-.897a.75.75 0 0 0-.897-.445L.94 15.198a.75.75 0 0 1 0-1.342l.445-.897a.75.75 0 0 0 .897-.445l.445-.897a.75.75 0 0 1 1.342 0l.445.897a.75.75 0 0 0 .897.445l.897-.445a.75.75 0 0 1 1.342 0l.897.445a.75.75 0 0 0 .445.897l.445.897a.75.75 0 0 1 0 1.342l-.445.897a.75.75 0 0 0-.445.897l-.897.445a.75.75 0 0 1-1.342 0L.94 17.27a.75.75 0 0 0-.897.445l-.445.897a.75.75 0 0 1-1.342 0l-.445-.897a.75.75 0 0 0-.897-.445l-.897.445a.75.75 0 0 1 0 1.342l.897.445a.75.75 0 0 0 .445.897l.445.897a.75.75 0 0 1 0 1.342l-.445.897a.75.75 0 0 0-.445.897l-.897.445a.75.75 0 0 1-1.342 0l-.897-.445a.75.75 0 0 0-.897.445L.103 21.8a.75.75 0 0 1-1.342 0l-.445-.897a.75.75 0 0 0-.897-.445l-.897.445a.75.75 0 0 1 0 1.342l.897.445a.75.75 0 0 0 .445.897l.445.897a.75.75 0 0 1 0 1.342l-.445.897a.75.75 0 0 0-.445.897l-.897.445a.75.75 0 0 1-1.342 0L0 21.77Z" clipRule="evenodd" />
  </svg>
);

export default function HomePage() {
  // Get needed state from usePlayer
  const { 
    isPlaying, 
    togglePlay, 
    isEngineReady, 
    isSettingsLoaded 
  } = usePlayer();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Add keyboard listener for Spacebar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !event.repeat && isEngineReady) { // Only toggle if engine is ready
        event.preventDefault(); // Prevent scrolling if page is long
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlay, isEngineReady]); // Add isEngineReady dependency

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-zinc-900 text-white">
      {/* Settings Button - Positioned top-right */}
      <button 
        onClick={() => setIsSettingsOpen(true)}
        className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-teal-500 rounded-full"
        aria-label="Open Settings"
      >
        <SettingsIcon />
      </button>

      <main className="flex flex-col items-center">
        <button
          onClick={togglePlay}
          disabled={!isEngineReady} // Disable button until engine is ready
          className="w-40 h-40 rounded-full bg-zinc-800/90 flex items-center justify-center text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-teal-500 transition-colors duration-200 ease-in-out hover:bg-zinc-700/90 active:bg-zinc-600/90 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={isEngineReady ? (isPlaying ? 'Stop tempo sequence' : 'Start tempo sequence') : 'Loading audio engine...'}
        >
          {!isEngineReady || !isSettingsLoaded ? (
             <span className="text-sm">Loading...</span> // Show loading state
          ) : isPlaying ? (
            // Pulsing dot when playing
            <span className="w-4 h-4 bg-teal-400 rounded-full animate-pulse"></span>
          ) : (
            // "Start" text when stopped
            'Start'
          )}
        </button>
      </main>

      {/* Settings Drawer - Conditionally rendered */}
      <SettingsDrawer 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
