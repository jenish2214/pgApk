import {widthPercentageToDP as wp} from 'react-native-responsive-screen';

/** Type size follows the phone width and stays inside a readable band. */
export function textSize(size: number): number {
  const scaled = wp(`${(size / 390) * 100}%`);
  return Math.round(Math.min(size * 1.12, Math.max(size * 0.92, scaled)));
}

export const text = {
  tiny: textSize(10),
  small: textSize(12),
  meta: textSize(13),
  label: textSize(14),
  body: textSize(15),
  section: textSize(16),
  lead: textSize(18),
  title: textSize(20),
  count: textSize(22),
  display: textSize(26),
  hero: textSize(36),
};

/** Body copy, dates, and text inside fields. */
export const regular = '400' as const;

/** Names, labels, and buttons. Semibold stays readable without shouting. */
export const important = '600' as const;

/** Large desk numbers only. */
export const display = '700' as const;

/** Poppins files. Weight stays 400 so Android uses the file instead of a fake bold. */
export const face = {
  regular: 'Poppins-Regular',
  important: 'Poppins-SemiBold',
  display: 'Poppins-Bold',
} as const;

export const fonts = {
  serif: face.display,
};
