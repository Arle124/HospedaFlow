export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'hospedaflow_theme';
const LEGACY_STORAGE_KEY = 'hospedasync_theme';

export const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  // Si no hay preferencia guardada, verificar preferencia del sistema operativo
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const applyTheme = (theme: ThemeMode) => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }
};

// Auto-aplicar de inmediato para evitar cualquier destello visual
if (typeof window !== 'undefined') {
  applyTheme(getInitialTheme());
}
