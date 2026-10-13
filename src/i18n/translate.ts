import type {Language} from './active';
import {gu} from './gu';
import {hi} from './hi';

const TABLES: Record<Language, Record<string, string> | null> = {
  en: null,
  hi,
  gu,
};

export function translate(
  language: Language,
  source: string,
  values?: Record<string, string | number>,
): string {
  const table = TABLES[language];
  let text = table?.[source] ?? source;
  if (values) {
    Object.entries(values).forEach(([key, value]) => {
      text = text.replaceAll(`{${key}}`, String(value));
    });
  }
  return text;
}
