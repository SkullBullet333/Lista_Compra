import { ThemePreferences } from '@/types/grocery';
import { accessibleAccent, accentForeground, hexToRgb, mixColor, normalizeHex } from '@/lib/colors';

const THEME_KEY = 'fresh_market_theme_v1';
let activeUser: string | null = null;
let revision = 0;
let memory: ThemePreferences | undefined;
export const THEME_UPDATED = 'theme-preferences-updated';
const storageKey = () => activeUser ? `${THEME_KEY}:${activeUser}` : THEME_KEY;

export const DEFAULT_THEME: ThemePreferences = {
  mode: 'light',
  primaryColor: '#059669',
  travelColor: '#0284c7',
  showImages: true,
};

export function getThemePreferences(): ThemePreferences {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    return sanitize(JSON.parse(localStorage.getItem(storageKey()) || '{}'));
  } catch {
    return memory || DEFAULT_THEME;
  }
}

function sanitize(value: Partial<ThemePreferences> | null): ThemePreferences {
  return {
    mode: ['light', 'dark', 'black', 'system'].includes(value?.mode || '') ? value!.mode! : DEFAULT_THEME.mode,
    primaryColor: normalizeHex(value?.primaryColor || '') || DEFAULT_THEME.primaryColor,
    travelColor: normalizeHex(value?.travelColor || '') || DEFAULT_THEME.travelColor,
    showImages: typeof value?.showImages === 'boolean' ? value.showImages : DEFAULT_THEME.showImages,
  };
}

export function setThemeUser(userId: string | null): void {
  if (activeUser === userId) return;
  activeUser = userId;
  memory = undefined;
  revision++;
  // Migrate the previous device-wide preference only to its first account.
  try {
    if (userId && !localStorage.getItem(storageKey()) && !localStorage.getItem(`${THEME_KEY}:owner`)) {
      const previous = localStorage.getItem(THEME_KEY);
      if (previous) localStorage.setItem(storageKey(), previous);
    }
    if (userId && !localStorage.getItem(`${THEME_KEY}:owner`)) localStorage.setItem(`${THEME_KEY}:owner`, userId);
  } catch { /* Keep appearance usable when storage is unavailable. */ }
  applyTheme(getThemePreferences());
  window.dispatchEvent(new Event(THEME_UPDATED));
}

// A late profile response must never replace an edit made while it was loading.
export function themeRestoreGuard(): () => boolean {
  const user = activeUser, version = revision;
  return () => activeUser === user && revision === version;
}

export function hasSavedTheme(): boolean {
  try { return Boolean(localStorage.getItem(storageKey())); } catch { return Boolean(memory); }
}

export function applyTheme(preferences: ThemePreferences): void {
  if (typeof document === 'undefined') return;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = preferences.mode === 'system' ? (prefersDark ? 'dark' : 'light') : preferences.mode;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.setProperty('--app-primary', preferences.primaryColor);
  document.documentElement.style.setProperty('--app-market-color', preferences.primaryColor);
  document.documentElement.style.setProperty('--app-travel-color', preferences.travelColor);
  const background = resolved === 'black' ? '#090909' : resolved === 'dark' ? '#1E293B' : '#FFFFFF';
  for (const [name, color] of [['market', preferences.primaryColor], ['travel', preferences.travelColor]]) {
    const root = document.documentElement.style;
    const { r, g, b } = hexToRgb(color);
    root.setProperty(`--${name}-hover`, mixColor(color, '#000000', 0.14));
    root.setProperty(`--${name}-hover-foreground`, accentForeground(mixColor(color, '#000000', 0.14)));
    root.setProperty(`--${name}-foreground`, accentForeground(color));
    root.setProperty(`--${name}-text`, accessibleAccent(color, background));
    root.setProperty(`--${name}-rgb`, `${r}, ${g}, ${b}`);
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', preferences.primaryColor);
}

export function saveThemePreferences(preferences: ThemePreferences): void {
  const next = sanitize(preferences);
  memory = next;
  revision++;
  try { localStorage.setItem(storageKey(), JSON.stringify(next)); } catch { /* Session-only fallback. */ }
  applyTheme(next);
  window.dispatchEvent(new Event(THEME_UPDATED));
}
