import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

export {hp, wp};

/** Equal radius on every corner, so controls stay square rather than pill-shaped. */
export const radius = Math.min(wp('2.4%'), 12);

/** Space that must stay between any two buttons. */
export const gap = 12;
