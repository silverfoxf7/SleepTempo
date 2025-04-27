'use client';

import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react';
import { DEFAULT_TEMPO_LADDER } from '@/lib/constants';
import type { TempoStep } from '@/lib/audioEngine';

// --- Types and Constants (copied from useSettings) ---
export const AVAILABLE_SOUNDS = {
  DEFAULT: 'Default (Triangle)',
  RIMSHOT: 'Soft Rimshot',
  WOODBLOCK: 'Muted Woodblock',
  KALIMBA: 'Kalimba Pluck',
  AIRPOD: 'Airpod Case Close',
  SNAP: 'Finger Snap',
  HEARTBEAT: 'Heart Beat',
  TONGUE: 'Tongue Click',
} as const;

export type SoundKey = keyof typeof AVAILABLE_SOUNDS;
export type SoundName = typeof AVAILABLE_SOUNDS[SoundKey];

interface Settings {
  sound: SoundKey;
  voiceCountEnabled: boolean;
  ladder: TempoStep[];
}

const SETTINGS_STORAGE_KEY = 'sleepTempoSettings';

const DEFAULT_SETTINGS: Settings = {
  sound: 'DEFAULT',
  voiceCountEnabled: true,
  ladder: DEFAULT_TEMPO_LADDER,
};

// --- Context Definition ---
interface SettingsContextProps {
  settings: Settings;
  isLoaded: boolean;
  setSound: (sound: SoundKey) => void;
  setVoiceCountEnabled: (enabled: boolean) => void;
  setLadder: (ladder: TempoStep[]) => void;
}

const SettingsContext = createContext<SettingsContextProps | undefined>(undefined);

// --- Provider Component ---
interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings(parsedSettings);
      } else {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      }
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
      setSettings(DEFAULT_SETTINGS);
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      console.log('SettingsContext: Settings saved to localStorage', settings);
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
  }, [settings, isLoaded]);

  // Memoized update functions
  const setSound = useCallback((sound: SoundKey) => {
    setSettings(prev => ({ ...prev, sound }));
  }, []);

  const setVoiceCountEnabled = useCallback((enabled: boolean) => {
    setSettings(prev => ({ ...prev, voiceCountEnabled: enabled }));
  }, []);

  const setLadder = useCallback((ladder: TempoStep[]) => {
    // TODO: Add validation
    setSettings(prev => ({ ...prev, ladder }));
  }, []);

  // Value provided by the context
  const value = {
    settings,
    isLoaded,
    setSound,
    setVoiceCountEnabled,
    setLadder,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

// --- Hook to consume the context ---
export function useSettingsContext(): SettingsContextProps {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
} 