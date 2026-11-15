import { useEffect } from 'react';
import type { TradingState } from './useTradingState';
type Options = Pick<TradingState, 'isDarkMode' | 'setIsDarkMode'>;

export function useTheme({ isDarkMode, setIsDarkMode }: Options) {
  // Handle dark mode HTML class & persist theme preference
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('niftylens_theme_v1', isDarkMode ? 'dark' : 'light');
    } catch {}
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  return { toggleTheme };
}
