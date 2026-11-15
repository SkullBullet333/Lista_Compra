import { ThemePreferences } from '@/types/grocery';

const THEME_KEY = 'fresh_market_theme_v1';

export const DEFAULT_THEME: ThemePreferences = {
  mode: 'light',
  primaryColor: '#059669',
  travelColor: '#0284c7',
  showImages: true,
};

export function getThemePreferences(): ThemePreferences {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    return { ...DEFAULT_THEME, ...JSON.parse(localStorage.getItem(THEME_KEY) || '{}') };
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(preferences: ThemePreferences): void {
  if (typeof document === 'undefined') return;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = preferences.mode === 'system' ? (prefersDark ? 'dark' : 'light') : preferences.mode;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.setProperty('--app-primary', preferences.primaryColor);
  document.documentElement.style.setProperty('--app-market-color', preferences.primaryColor);
  document.documentElement.style.setProperty('--app-travel-color', preferences.travelColor);
}

export function saveThemePreferences(preferences: ThemePreferences): void {
  localStorage.setItem(THEME_KEY, JSON.stringify(preferences));
  applyTheme(preferences);
}
