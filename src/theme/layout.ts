import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

export {hp, wp};

/** Shared corner radius for cards, fields, and buttons. */
export const radius = 12;

/** Widest a screen column grows on tablets, landscape, and split screen. */
export const contentMax = 720;

/** Widest a sheet or dialog grows. */
export const sheetMax = 560;

/** Fills the width up to a cap and stays centred. */
export function capped(maxWidth: number) {
  return {alignSelf: 'center' as const, maxWidth, width: '100%' as const};
}

/** Space that must stay between any two buttons. */
export const gap = 12;

/** Cards use a border. The shadow stays too light to compete with it. */
export const cardLift = {
  elevation: 0,
  shadowColor: '#202124',
  shadowOffset: {width: 0, height: 1},
  shadowOpacity: 0.04,
  shadowRadius: 2,
};
