'use client';

import React, { useEffect, useState } from 'react';
import { usePlayer } from '@/lib/usePlayer'; // Import the hook
import SettingsDrawer from '@/components/SettingsDrawer'; // Import SettingsDrawer component

// Drawer handle icon
const DrawerHandleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 12" fill="currentColor" className="w-12 h-3">
    <g strokeDasharray="4 2" stroke="currentColor" strokeWidth="2">
      <line x1="2" y1="2" x2="22" y2="2" strokeLinecap="round" />
      <line x1="2" y1="6" x2="22" y2="6" strokeLinecap="round" />
      <line x1="2" y1="10" x2="22" y2="10" strokeLinecap="round" />
    </g>
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

  // iOS/Safari audio context unlock - required for audio to work on iOS
  useEffect(() => {
    // Check if iOS or Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isIOS || isSafari) {
      console.log('DEBUG: iOS/Safari detected, setting up audio context unlock');
      
      // Create a silent audio buffer
      const unlockAudio = () => {
        const audioContext = new (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
        source.onended = () => {
          source.disconnect();
          console.log('DEBUG: iOS/Safari audio context unlocked');
        };
        
        // Remove the event listeners after first touch
        document.removeEventListener('touchstart', unlockAudio, true);
        document.removeEventListener('touchend', unlockAudio, true);
        document.removeEventListener('click', unlockAudio, true);
      };
      
      // Add event listeners to unlock audio
      document.addEventListener('touchstart', unlockAudio, true);
      document.addEventListener('touchend', unlockAudio, true);
      document.addEventListener('click', unlockAudio, true);
      
      return () => {
        document.removeEventListener('touchstart', unlockAudio, true);
        document.removeEventListener('touchend', unlockAudio, true);
        document.removeEventListener('click', unlockAudio, true);
      };
    }
  }, []);

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-zinc-900 text-white">
      {/* Main content */}
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

      {/* Drawer handle at bottom of screen */}
      <button 
        onClick={() => setIsSettingsOpen(true)}
        className="fixed bottom-0 left-0 right-0 mx-auto w-20 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-t-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all duration-200 transform hover:translate-y-1"
        aria-label="Open Settings"
      >
        <DrawerHandleIcon />
      </button>

      {/* Settings Drawer - Conditionally rendered */}
      <SettingsDrawer 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
