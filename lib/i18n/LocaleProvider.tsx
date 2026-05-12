import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Locale } from './translations';
import { setCurrentLocale } from './currentLocale';

const STORAGE_KEY = '@nexora/locale';
const DEFAULT_LOCALE: Locale = 'uz';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: (typeof translations)[Locale];
  ready: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export default function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored && (stored === 'uz' || stored === 'ru' || stored === 'en')) {
          setLocaleState(stored);
          setCurrentLocale(stored);
        }
      })
      .finally(() => setReady(true));
  }, []);

  // Keep the module-level mirror in sync with the React state. The axios
  // request interceptor reads from there to set Accept-Language without
  // needing access to React context.
  useEffect(() => {
    setCurrentLocale(locale);
  }, [locale]);

  const setLocale = useCallback(async (next: Locale) => {
    setLocaleState(next);
    setCurrentLocale(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch (err) {
      // We can't depend on the toast bus from this provider (would
      // create a circular dep), so log instead. Current-session locale
      // is honoured — only persistence fails, which the user notices
      // on the next launch when it reverts to default. Logging beats
      // swallowing the error in silence (FE-M12).
      // eslint-disable-next-line no-console
      console.warn('[locale] failed to persist locale to AsyncStorage', err);
    }
  }, []);

  // Memoise so consumers depending on `t` don't re-render on every
  // LocaleProvider render. Pre-fix (FE-H14) the value object was a
  // fresh literal each render — every screen using `[t]` in deps
  // invalidated its memos / effects unnecessarily.
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: translations[locale],
      ready,
    }),
    [locale, ready, setLocale],
  );

  // Don't render children until the persisted locale is loaded — avoids
  // a flash of Uzbek for ru/en users on cold start (FE-H16). The 50–500
  // ms gap is short enough that no visible spinner is needed; the
  // splash already covers it.
  if (!ready) return null;

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}

export function useT() {
  return useLocale().t;
}
