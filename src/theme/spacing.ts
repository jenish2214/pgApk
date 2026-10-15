import {widthPercentageToDP as wp} from 'react-native-responsive-screen';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

function band(percent: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, wp(`${percent}%`))));
}

/** Same space on the left and right of every screen. Wider phones get a little more. */
export const padX = band(4.6, 16, 24);

/** Same space above and below a block. */
export const padY = band(3.4, 12, 18);
