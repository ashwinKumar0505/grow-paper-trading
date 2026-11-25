import { Moon,Sun } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { Button } from '../ui/button';

export function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTrading();
  const label = isDarkMode ? 'Switch to light mode' : 'Switch to dark mode';
  return <Button variant="unstyled" size="unstyled" type="button" onClick={toggleTheme} aria-label={label} title={label} className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
  </Button>;
}
