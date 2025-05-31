
import { useEffect, useState } from 'react';

export const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');

  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    const root = window.document.documentElement;
    
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.remove('light', 'dark');
      root.classList.add(systemTheme);
      
      // Apply dimmed effect for system theme
      if (systemTheme === 'dark') {
        root.style.filter = 'brightness(0.9)';
      } else {
        root.style.filter = 'brightness(0.95)';
      }
    } else {
      root.style.filter = '';
      root.classList.remove('light', 'dark');
      root.classList.add(newTheme);
    }
    
    setTheme(newTheme);
  };

  useEffect(() => {
    // Listen for system theme changes when using system theme
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  return { theme, applyTheme };
};
