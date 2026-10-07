import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';

interface ThemeStoreState {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const safeGetStorage = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage) {
      return localStorage.getItem(key);
    }
  } catch {
    // fallback if security/mocking prevents access
  }
  return null;
};

const safeSetStorage = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage) {
      localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
};

const getInitialTheme = (): ThemeMode => {
  const saved = safeGetStorage('jiet_campus_theme');
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }
  return 'dark';
};

export const useThemeStore = create<ThemeStoreState>((set) => ({
  theme: getInitialTheme(),

  toggleTheme: () => {
    set((state) => {
      const nextTheme: ThemeMode = state.theme === 'dark' ? 'light' : 'dark';
      safeSetStorage('jiet_campus_theme', nextTheme);
      if (typeof document !== 'undefined' && document.documentElement) {
        if (nextTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      return { theme: nextTheme };
    });
  },

  setTheme: (theme: ThemeMode) => {
    safeSetStorage('jiet_campus_theme', theme);
    if (typeof document !== 'undefined' && document.documentElement) {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    set({ theme });
  },
}));
