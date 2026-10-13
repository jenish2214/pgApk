import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {getMeta, setMeta} from '../database/database';
import {refreshOrderReminder} from '../services/orderReminders';
import {getActiveLanguage, isLanguage, setActiveLanguage, type Language} from './active';
import {translate} from './translate';
import LanguageSheet from '../components/LanguageSheet';

type LanguageContextValue = {
  language: Language;
  t: (source: string, values?: Record<string, string | number>) => string;
  openLanguage: () => void;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  t: source => source,
  openLanguage: () => undefined,
});

export function LanguageProvider({
  ready,
  children,
}: {
  ready: boolean;
  children: React.ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>(getActiveLanguage());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const saved = getMeta('language', 'en');
    if (isLanguage(saved)) {
      setActiveLanguage(saved);
      setLanguageState(saved);
    }
  }, [ready]);

  const choose = useCallback((next: Language) => {
    setActiveLanguage(next);
    setLanguageState(next);
    setOpen(false);
    try {
      setMeta('language', next);
    } catch {
      return;
    }
    refreshOrderReminder().catch(() => undefined);
  }, []);

  const t = useCallback(
    (source: string, values?: Record<string, string | number>) =>
      translate(language, source, values),
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      t,
      openLanguage: () => setOpen(true),
    }),
    [language, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
      <LanguageSheet
        visible={open}
        language={language}
        t={t}
        onClose={() => setOpen(false)}
        onChoose={choose}
      />
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
