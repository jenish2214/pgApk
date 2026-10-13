import {Platform} from 'react-native';

/** Weight for names, counts, titles, and other text the shop reads first. */
export const important = '700' as const;

export const fonts = {
  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'serif',
  }),
};
