import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {CommonActions, StackActions} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import {Keyboard, Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import TabIcon from '../components/TabIcon';
import {getDashboard} from '../services/orderService';
import {subscribeShopChanges} from '../services/shopEvents';
import type {TabRouteName} from '../types';
import {colors} from '../theme/colors';
import {useColors} from '../theme/ThemeProvider';
import {spacing} from '../theme/spacing';
import {display, important, regular, text, face} from '../theme/type';
import {capped, contentMax, radius} from '../theme/layout';

const FORM_SCREENS = new Set([
  'AddEditOrder',
  'AddEditCustomer',
  'AddEditInquiry',
  'AddEditRepair',
  'AddEditJangad',
]);

function focusedScreenName(state: BottomTabBarProps['state']): string {
  const tab = state.routes[state.index];
  const nested = tab?.state;
  if (!nested || typeof nested.index !== 'number') {
    return tab?.name ?? '';
  }
  return nested.routes[nested.index]?.name ?? tab?.name ?? '';
}

function isTabRoute(name: string): name is TabRouteName {
  return (
    name === 'Dashboard' ||
    name === 'Calendar' ||
    name === 'Customers' ||
    name === 'Manage'
  );
}

export default function ShopTabBar({state, descriptors, navigation}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const palette = useColors();
  const [readyCount, setReadyCount] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const onForm = FORM_SCREENS.has(focusedScreenName(state));

  useEffect(() => {
    const read = () => {
      try {
        setReadyCount(getDashboard().counts.ready);
      } catch {
        setReadyCount(0);
      }
    };
    read();
    return subscribeShopChanges(read);
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (onForm || keyboardOpen) {
    return null;
  }

  return (
    <View style={[styles.safe, {backgroundColor: palette.white, paddingBottom: Math.max(insets.bottom, 8)}]}>
      <View style={[styles.row, {backgroundColor: palette.white}]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options;
          const label =
            typeof options?.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options?.title ?? route.name;
          const tabName: TabRouteName = isTabRoute(route.name) ? route.name : 'Dashboard';
          const waiting = tabName === 'Manage' ? readyCount : 0;
          const tint = focused ? colors.green : colors.muted;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
              data: {
                behavior: {
                  scrollToTop: focused,
                  popToTop: focused,
                },
              },
            });
            if (event.defaultPrevented) {
              return;
            }
            if (focused) {
              const nested = route.state;
              const nestedIndex = nested?.index ?? 0;
              const nestedName = nested?.routes?.[nestedIndex]?.name;
              if (nested?.key && nestedIndex > 0) {
                navigation.dispatch({
                  ...StackActions.popToTop(),
                  target: nested.key,
                });
              } else if (tabName === 'Manage' && nestedName && nestedName !== 'ManageHome') {
                navigation.dispatch({
                  ...CommonActions.navigate('Manage', {screen: 'ManageHome'}),
                  target: state.key,
                });
              }
              return;
            }
            navigation.dispatch({
              type: 'NAVIGATE',
              target: state.key,
              payload: {name: route.name},
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? {selected: true} : {}}
              accessibilityLabel={
                waiting > 0 ? `${label}, ${waiting} ready for collection` : label
              }
              onPress={onPress}
              android_ripple={{color: 'transparent'}}
              style={({pressed}) => [
                styles.button,
                focused && {backgroundColor: palette.greenSoft},
                pressed && styles.pressed,
              ]}>
              <View style={styles.iconWrap}>
                <TabIcon name={tabName} color={tint} />
                {waiting > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{waiting > 99 ? '99+' : waiting}</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[styles.label, {color: tint}, focused ? null : styles.labelQuiet]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.white,
    borderTopColor: colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
  },
  row: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    ...capped(contentMax),
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  button: {
    alignItems: 'center',
    borderRadius: radius,
    flex: 1,
    flexBasis: 0,
    justifyContent: 'center',
    minWidth: 0,
    marginHorizontal: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.72,
  },
  iconWrap: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: radius,
    justifyContent: 'center',
    minWidth: 16,
    paddingHorizontal: spacing.xs,
    position: 'absolute',
    right: -6,
    top: -6,
  },
  badgeText: {
    color: colors.white,
    fontSize: text.tiny,
    fontFamily: face.display, fontWeight: '400',
  },
  label: {
    fontSize: text.small,
    fontFamily: face.important, fontWeight: '400',
    marginTop: spacing.xs,
    textAlign: 'center',
    width: '100%',
  },
  labelQuiet: {
    fontFamily: face.regular, fontWeight: '400',
  },
});
