import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createTranslator, getStoredLocale, normalizeLocale, storeLocale } from './core.js';
import messages from './messages/index.js';

const I18nContext = createContext(null);

/** Houdt de gekozen taal bij, bewaart hem, en zet lang op <html>. */
export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => getStoredLocale(window.localStorage));

  useEffect(() => { document.documentElement.lang = locale; }, [locale]);

  const setLocale = useCallback((next) => {
    const lang = normalizeLocale(next);
    storeLocale(lang, window.localStorage);
    setLocaleState(lang);
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale, t: createTranslator(messages, locale) }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n moet binnen I18nProvider gebruikt worden');
  return ctx;
}
