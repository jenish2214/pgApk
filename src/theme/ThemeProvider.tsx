import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {Appearance, useColorScheme, type ColorSchemeName} from 'react-native';
import {getMeta, setMeta} from '../database/database';
import {colors} from './colors';
import {darkPalette, type Palette} from './palette';

export type AppearanceChoice = 'auto' | 'light' | 'dark';

type ThemeContextValue = {
  choice: AppearanceChoice;
  scheme: 'light' | 'dark';
  palette: Palette;
  setAppearance: (choice: AppearanceChoice) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  choice: 'auto',
  scheme: 'light',
  palette: colors,
  setAppearance: () => undefined,
});

export function isAppearanceChoice(value: string): value is AppearanceChoice {
  return value === 'auto' || value === 'light' || value === 'dark';
}

function resolveScheme(
  choice: AppearanceChoice,
  system: ColorSchemeName | null | undefined,
): 'light' | 'dark' {
  if (choice === 'light' || choice === 'dark') {
    return choice;
  }
  return system === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({
  ready,
  children,
}: {
  ready: boolean;
  children: React.ReactNode;
}) {
  const system = useColorScheme();
  const [choice, setChoice] = useState<AppearanceChoice>('auto');

  useEffect(() => {
    if (!ready) {
      return;
    }
    const saved = getMeta('appearance', 'auto');
    if (isAppearanceChoice(saved)) {
      setChoice(saved);
    }
  }, [ready]);

  const scheme = resolveScheme(choice, system);
  const palette = scheme === 'dark' ? darkPalette : colors;

  useEffect(() => {
    Appearance.setColorScheme(choice);
  }, [choice]);

  const setAppearance = useCallback((next: AppearanceChoice) => {
    setChoice(next);
    try {
      setMeta('appearance', next);
    } catch {
      return;
    }
  }, []);

  const value = useMemo(
    () => ({
      choice,
      scheme,
      palette,
      setAppearance,
    }),
    [choice, palette, scheme, setAppearance],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function useColors(): Palette {
  return useContext(ThemeContext).palette;
}
