export type Language = 'en' | 'hi' | 'gu';

let current: Language = 'en';

export function isLanguage(value: string): value is Language {
  return value === 'en' || value === 'hi' || value === 'gu';
}

export function getActiveLanguage(): Language {
  return current;
}

export function setActiveLanguage(language: Language): void {
  current = language;
}
