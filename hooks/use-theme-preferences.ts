'use client';

import { useEffect, useState } from 'react';
import { applyTheme, getThemePreferences, THEME_UPDATED } from '@/lib/preferences';

export function useThemePreferences() {
  const [preferences, setPreferences] = useState(getThemePreferences);
  useEffect(() => {
    const refresh = () => { const next = getThemePreferences(); setPreferences(next); applyTheme(next); };
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    window.addEventListener(THEME_UPDATED, refresh);
    window.addEventListener('storage', refresh);
    media.addEventListener('change', refresh);
    refresh();
    return () => {
      window.removeEventListener(THEME_UPDATED, refresh);
      window.removeEventListener('storage', refresh);
      media.removeEventListener('change', refresh);
    };
  }, []);
  return preferences;
}
