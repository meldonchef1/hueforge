import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { setLanguage } from '../../i18n';

export function useLanguageSync() {
  const language = useAppStore((s) => s.settings.language);
  useEffect(() => {
    setLanguage(language);
  }, [language]);
}
