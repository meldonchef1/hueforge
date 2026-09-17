import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import cs from './locales/cs.json';
import en from './locales/en.json';
import type { Language } from '../store/types';

export const resources = {
  cs: { translation: cs },
  en: { translation: en },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: 'cs',
  fallbackLng: 'cs',
  interpolation: { escapeValue: false },
});

export const setLanguage = (language: Language) => {
  void i18n.changeLanguage(language);
  document.documentElement.lang = language;
};

export default i18n;
