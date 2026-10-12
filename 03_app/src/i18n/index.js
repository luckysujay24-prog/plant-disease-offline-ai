/**
 * i18n/index.js
 * Lightweight internationalization helper.
 * Ready for extension with Telugu (te.json), Hindi (hi.json), and Tamil (ta.json).
 */

import en from './en.json';

const translations = {
  en,
};

let currentLang = 'en';

export function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
  }
}

export function t(keyPath, fallback = '') {
  const keys = keyPath.split('.');
  let current = translations[currentLang] || translations.en;

  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return fallback || keyPath;
    }
  }
  return typeof current === 'string' ? current : fallback || keyPath;
}
