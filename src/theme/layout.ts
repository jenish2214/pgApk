import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

export {hp, wp};

/** Shared corner radius for cards, fields, and buttons. */
export const radius = 12;

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
