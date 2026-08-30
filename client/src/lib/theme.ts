import { Theme } from '../types';

const THEME_KEY = 'sardor_os_theme';

type Listener = (theme: Theme) => void;
const listeners: Set<Listener> = new Set();

let currentTheme: Theme = ((): Theme => {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  return 'dark';
})();

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
    document.body.style.backgroundColor = '#f8fafc';
    document.body.style.color = '#0f172a';
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
    document.body.style.backgroundColor = '#0b1326';
    document.body.style.color = '#dae2fd';
  }
}

// Initial apply
if (typeof window !== 'undefined') {
  applyTheme(currentTheme);
}

export const themeManager = {
  getTheme(): Theme {
    return currentTheme;
  },

  setTheme(theme: Theme) {
    currentTheme = theme;
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_KEY, theme);
      applyTheme(theme);
    }
    listeners.forEach((fn) => fn(currentTheme));
  },

  toggleTheme(): Theme {
    const next: Theme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    return next;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
