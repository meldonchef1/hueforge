import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';

/** Mirrors the stored theme onto <html data-theme>, which is what the tokens key off. */
export function useThemeSync() {
  const theme = useAppStore((s) => s.settings.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
}
