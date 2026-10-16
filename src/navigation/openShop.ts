import type {NavigationProp, ParamListBase} from '@react-navigation/native';

type Nav = NavigationProp<ParamListBase>;

function tabNav(navigation: Nav): Nav {
  return navigation.getParent() ?? navigation;
}

/** Open a Manage-stack screen even if that tab was already showing something else. */
export function openShopScreen(navigation: Nav, screen: string, params?: object) {
  tabNav(navigation).navigate('Manage', {
    screen,
    params,
    initial: false,
  });
}

/** Always land on Settings, not the last Repair/Orders page. */
export function openSettings(navigation: Nav) {
  navigation.navigate('Manage', {screen: 'ManageHome', initial: false});
}
