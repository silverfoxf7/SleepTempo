'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SequencerManager } from './sequencerManager';
import { getAudioEngine } from './audioEngine';
import type { AudioEngineImpl } from './audioEngine';
import { useSettings } from './useSettings';

export function usePlayer() {
  const { settings, isLoaded: isSettingsLoaded } = useSettings();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const sequencerRef = useRef<SequencerManager | null>(null);
  const engineRef = useRef<AudioEngineImpl | null>(null);

  const handleSequenceEnd = useCallback(() => {
    console.log('usePlayer: Sequence ended.');
    setIsPlaying(false);
  }, []);

  // Initialize engine and sequencer
  useEffect(() => {
    let isMounted = true;
    getAudioEngine().then(resolvedEngineInstance => {
      if (isMounted && resolvedEngineInstance) {
        console.log('usePlayer: Audio engine instance obtained.');
        engineRef.current = resolvedEngineInstance;
        // Initial sync depends on isSettingsLoaded and the settings object itself
        if (isSettingsLoaded) {
            console.log('usePlayer: Syncing initial settings to engine', settings);
            engineRef.current.updateSettings({
                sound: settings.sound,
                voiceCountEnabled: settings.voiceCountEnabled
            });
        }
        // Sequencer creation depends on the resolved engine and the ladder from settings
        sequencerRef.current = new SequencerManager(resolvedEngineInstance, settings.ladder);
        sequencerRef.current.onSequenceEnd = handleSequenceEnd;
        setIsEngineReady(true);
      } else if (isMounted) {
          console.error("usePlayer: Failed to initialize audio engine.");
      }
    });
    return () => {
      isMounted = false;
      if (sequencerRef.current) {
          sequencerRef.current.stop();
          sequencerRef.current.onSequenceEnd = undefined;
      }
    };
  // This effect correctly depends on when settings are loaded and the settings object identity
  // to perform the *initial* setup and sync.
  }, [handleSequenceEnd, isSettingsLoaded, settings]); 

  // Effect to push subsequent setting changes to the engine AFTER initial load
  useEffect(() => {
      console.log(`DEBUG: Settings update effect triggered. Settings sound: ${settings.sound}, EngineReady: ${isEngineReady}, SettingsLoaded: ${isSettingsLoaded}`);
      // This effect depends on the settings having changed AND the engine being ready.
      if (isEngineReady && isSettingsLoaded && engineRef.current) {
          console.log('usePlayer: Syncing updated settings to engine', settings);
          engineRef.current.updateSettings({ 
              sound: settings.sound, 
              voiceCountEnabled: settings.voiceCountEnabled 
          });
      }
      else {
          console.log(`DEBUG: Settings update effect skipped sync. Conditions: EngineReady=${isEngineReady}, SettingsLoaded=${isSettingsLoaded}, EngineRef=${!!engineRef.current}`);
      }
  // Reacting specifically to settings changes AFTER the engine is ready.
  }, [settings, isEngineReady, isSettingsLoaded]); 

  // togglePlay depends on isPlaying, isEngineReady, and the settings (for the ladder)
  const togglePlay = useCallback(() => {
    if (!isEngineReady || !sequencerRef.current) {
        console.warn('usePlayer: Cannot toggle play, engine/sequencer not ready.')
        return;
    }
    const sequencer = sequencerRef.current;
    if (isPlaying) {
      sequencer.stop();
      setIsPlaying(false);
      console.log('usePlayer: Stopped sequence.');
    } else {
      sequencer.start(settings.ladder);
      setIsPlaying(true);
      console.log('usePlayer: Started sequence.');
    }
  }, [isPlaying, isEngineReady, settings]);

  return {
    isEngineReady,
    isPlaying,
    togglePlay,
    settings, 
    isSettingsLoaded,
  };
} 