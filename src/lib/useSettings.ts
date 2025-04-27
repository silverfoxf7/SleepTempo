'use client';

import { useSettingsContext } from '@/context/SettingsContext';

// The only purpose of this file now is to provide the simplified hook name
// if desired, or components can import useSettingsContext directly.
export const useSettings = useSettingsContext; 