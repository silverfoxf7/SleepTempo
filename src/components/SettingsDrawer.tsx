'use client';

import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useSettings } from '@/lib/useSettings';
import { AVAILABLE_SOUNDS, SoundKey } from '@/context/SettingsContext';
import type { TempoStep } from '@/lib/audioEngine';
import { MIN_BPM, MAX_BPM, MIN_BEATS, MAX_BEATS } from '@/lib/constants';
import { getAudioEngine } from '@/lib/audioEngine';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const { settings, setSound, setVoiceCountEnabled, setLadder, isLoaded } = useSettings();
  // Local state for editing the ladder
  const [editableLadder, setEditableLadder] = useState<TempoStep[]>([]);

  // Sync global settings ladder to local state when drawer opens or settings load
  useEffect(() => {
    if (isOpen && isLoaded) {
      setEditableLadder([...settings.ladder]); // Create a copy for editing
    }
  }, [isOpen, isLoaded, settings.ladder]);

  if (!isLoaded) {
    // Optionally return null or a loading indicator until settings are loaded
    return null; 
  }

  // --- Event Handlers --- 
  const handleSoundChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSound(event.target.value as SoundKey);
  };

  const handleVoiceToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVoiceCountEnabled(event.target.checked);
  };

  // New function to test voice count
  const handleTestVoiceCount = async () => {
    try {
      const engine = await getAudioEngine();
      console.log("Testing voice count playback");
      engine.testVoiceCount();
    } catch (error) {
      console.error("Error testing voice count:", error);
    }
  };

  // --- Ladder Editing Handlers ---
  const handleStepChange = (index: number, field: keyof TempoStep, value: string) => {
    const numValue = parseInt(value, 10);
    
    // Allow empty string temporarily during typing (don't immediately revert to min)
    if (value === "" || isNaN(numValue)) {
      const newLadder = [...editableLadder];
      newLadder[index] = { ...newLadder[index], [field]: value === "" ? "" : newLadder[index][field] };
      setEditableLadder(newLadder);
      return;
    }
    
    // Validate only when we have a number - use the constant limits
    let validatedValue = numValue;
    if (field === 'bpm') {
        validatedValue = Math.max(MIN_BPM, Math.min(MAX_BPM, numValue));
    } else if (field === 'beats') {
        validatedValue = Math.max(MIN_BEATS, Math.min(MAX_BEATS, numValue));
    }

    const newLadder = [...editableLadder];
    newLadder[index] = { ...newLadder[index], [field]: validatedValue };
    setEditableLadder(newLadder);
  };

  const handleAddStep = () => {
    // Add a default step (e.g., 60bpm, 8 beats)
    setEditableLadder([...editableLadder, { bpm: 60, beats: 8 }]);
  };

  const handleRemoveStep = (index: number) => {
    if (editableLadder.length <= 1) return; // Don't allow removing the last step
    const newLadder = editableLadder.filter((_, i) => i !== index);
    setEditableLadder(newLadder);
  };

  const handleSaveChanges = () => {
    // Validate all values before saving
    const validatedLadder = editableLadder.map(step => {
      // Convert any string values to numbers and validate
      const bpm = typeof step.bpm === 'string' ? parseInt(step.bpm as string, 10) : step.bpm;
      const beats = typeof step.beats === 'string' ? parseInt(step.beats as string, 10) : step.beats;

      return {
        bpm: isNaN(bpm) ? MIN_BPM : Math.max(MIN_BPM, Math.min(MAX_BPM, bpm)),
        beats: isNaN(beats) ? MIN_BEATS : Math.max(MIN_BEATS, Math.min(MAX_BEATS, beats))
      };
    });

    setLadder(validatedLadder); 
    onClose(); // Close drawer after saving
  };

  const handleDiscardChanges = () => {
    // Reset local state to match global settings and close
    setEditableLadder([...settings.ladder]);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-overlayShow" />
        <Dialog.Content 
          className="fixed bottom-0 left-0 right-0 max-h-[85vh] w-full rounded-t-lg bg-zinc-800 p-6 text-white shadow-lg focus:outline-none animate-contentShow overflow-y-auto flex flex-col"
          onOpenAutoFocus={(e) => e.preventDefault()} // Prevent auto-focus on first element
        >
          {/* Drawer handle visual at the top of the drawer */}
          <div className="absolute top-2 left-0 right-0 flex justify-center">
            <div className="w-16 h-1 bg-zinc-600 rounded-full"></div>
          </div>
          
          <div className="flex justify-center items-center mb-6 mt-4">
            <Dialog.Title className="text-lg font-medium">Settings</Dialog.Title>
          </div>
          
          {/* --- Settings Controls Scrollable Area --- */}
          <div className="flex-grow overflow-y-auto pr-2 space-y-6"> 
            {/* Sound Selection */}
            <div>
              <label htmlFor="sound-select" className="block text-sm font-medium mb-1">Click Sound</label>
              <select 
                id="sound-select" value={settings.sound} onChange={handleSoundChange}
                className="w-full rounded border-zinc-600 bg-zinc-700 p-2 focus:ring-teal-500 focus:border-teal-500"
              >
                {(Object.keys(AVAILABLE_SOUNDS) as SoundKey[]).map((key) => (
                  <option key={key} value={key}>{AVAILABLE_SOUNDS[key]}</option>
                ))}
              </select>
            </div>

            {/* Voice Count Toggle with Test Button */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="voice-toggle" className="text-sm font-medium">Voice Count (10, 20...)</label>
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" id="voice-toggle" checked={settings.voiceCountEnabled} onChange={handleVoiceToggle}
                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <button
                    onClick={handleTestVoiceCount}
                    className="text-xs bg-zinc-600 hover:bg-zinc-500 px-2 py-1 rounded"
                    title="Test if voice counting is working"
                  >
                    Test
                  </button>
                </div>
              </div>
              <div className="text-xs text-zinc-400 italic">
                Plays voice counts at 10, 20, 30... beats
              </div>
            </div>

            {/* Ladder Editor */}
            <div>
              <h3 className="text-sm font-medium mb-2">Tempo Ladder</h3>
              <div className="space-y-2">
                {editableLadder.map((step, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-zinc-700/50 rounded">
                    <span className="text-xs text-zinc-400 w-6 text-right">{index + 1}.</span>
                    <input 
                      type="number" 
                      aria-label={`BPM for step ${index + 1}`}
                      value={step.bpm}
                      onChange={(e) => handleStepChange(index, 'bpm', e.target.value)}
                      className="w-20 rounded border-zinc-600 bg-zinc-900 p-1 text-center focus:ring-teal-500 focus:border-teal-500"
                      min={MIN_BPM} max={MAX_BPM}
                    />
                    <span className="text-sm">BPM for</span>
                    <input 
                      type="number" 
                      aria-label={`Beats for step ${index + 1}`}
                      value={step.beats}
                      onChange={(e) => handleStepChange(index, 'beats', e.target.value)}
                      className="w-16 rounded border-zinc-600 bg-zinc-900 p-1 text-center focus:ring-teal-500 focus:border-teal-500"
                      min={MIN_BEATS} max={MAX_BEATS}
                    />
                    <span className="text-sm">beats</span>
                    <button 
                      onClick={() => handleRemoveStep(index)}
                      disabled={editableLadder.length <= 1}
                      className="ml-auto p-1 text-red-400 hover:text-red-300 disabled:text-zinc-600 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-red-500 rounded"
                      aria-label={`Remove step ${index + 1}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.326.419C2.675 4.793 2 5.515 2 6.417v2.188a.75.75 0 0 0 .75.75h14.5a.75.75 0 0 0 .75-.75V6.417c0-.902-.675-1.624-1.674-1.805a48.09 48.09 0 0 0-2.326-.419v-.443A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.5.66 1.5 1.5v1.5c0 .84-.66 1.5-1.5 1.5S8.5 7.84 8.5 7V5.5C8.5 4.66 9.16 4 10 4ZM4.182 5.404a.75.75 0 0 0-.774.859 48.188 48.188 0 0 0 1.164 4.706c.08.193.274.311.48.311h8.896c.206 0 .4-.118.48-.311a48.19 48.19 0 0 0 1.164-4.706.75.75 0 0 0-.774-.86c-1.984.2-4.006.304-6.07.304s-4.086-.104-6.07-.304Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <button 
                onClick={handleAddStep}
                className="mt-2 w-full text-sm text-teal-400 hover:text-teal-300 py-1 px-2 border border-dashed border-teal-500/50 hover:border-teal-500 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                + Add Step
              </button>
            </div>
          </div>

          {/* --- Action Buttons --- */}
          <div className="mt-6 flex justify-end space-x-3 border-t border-zinc-700 pt-4">
            <button 
              onClick={handleDiscardChanges}
              className="px-4 py-2 text-sm rounded bg-zinc-600 hover:bg-zinc-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-zinc-400"
            >
              Discard
            </button>
            <button 
              onClick={handleSaveChanges}
              className="px-4 py-2 text-sm rounded bg-teal-600 hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-teal-400"
            >
              Save Changes
            </button>
          </div>

          {/* Bottom handle - visible when drawer is collapsed */}
          <div className="fixed bottom-0 left-0 right-0 h-2 bg-zinc-800 flex justify-center items-center">
            <div className="w-16 h-1 bg-zinc-600 rounded-full"></div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
} 