import { Moon, Sun } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTrading();
  const label = isDarkMode ? 'Switch to light mode' : 'Switch to dark mode';
  return <button type="button" onClick={toggleTheme} aria-label={label} title={label} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
  </button>;
}
