import React, {createContext, useContext} from 'react';
import {Appearance} from 'react-native';
import {colors} from './colors';
import type {Palette} from './palette';

Appearance.setColorScheme('light');

const ThemeContext = createContext<Palette>(colors);

export function ThemeProvider({children}: {ready?: boolean; children: React.ReactNode}) {
  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
}

export function useColors(): Palette {
  return useContext(ThemeContext);
}
