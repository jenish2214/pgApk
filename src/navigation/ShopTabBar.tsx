import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import React, {useEffect, useState} from 'react';
import {Keyboard, Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import TabIcon from '../components/TabIcon';
import {getDashboard} from '../services/orderService';
import {subscribeShopChanges} from '../services/shopEvents';
import type {TabRouteName} from '../types';
import {colors} from '../theme/colors';
import {padX, spacing} from '../theme/spacing';
import {important} from '../theme/type';
import {radius} from '../theme/layout';

const FORM_SCREENS = new Set([
  'AddEditOrder',
  'AddEditCustomer',
  'AddEditInquiry',
  'AddEditRepair',
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
    name === 'Ready' ||
    name === 'Inquiry' ||
    name === 'Repair'
  );
}

export default function ShopTabBar({state, descriptors, navigation}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
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
    <View style={[styles.safe, {paddingBottom: Math.max(insets.bottom, 8)}]}>
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options;
          const label =
            typeof options?.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options?.title ?? route.name;
          const tabName: TabRouteName = isTabRoute(route.name) ? route.name : 'Dashboard';
          const waiting = tabName === 'Ready' ? readyCount : 0;
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
            if (focused || event.defaultPrevented) {
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
              style={styles.button}>
              <View style={styles.iconWrap}>
                <TabIcon name={tabName} color={tint} />
                {waiting > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{waiting > 99 ? '99+' : waiting}</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[styles.label, {color: tint}]}
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
    backgroundColor: colors.ivory,
    paddingHorizontal: padX,
    paddingTop: spacing.sm,
  },
  row: {
    backgroundColor: colors.white,
    borderRadius: 28,
    elevation: 8,
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    shadowColor: colors.ink,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  button: {
    alignItems: 'center',
    borderRadius: radius,
    flex: 1,
    flexBasis: 0,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
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
    fontSize: 10,
    fontWeight: '800',
  },
  label: {
    fontSize: 11,
    fontWeight: important,
    marginTop: spacing.xs,
    textAlign: 'center',
    width: '100%',
  },
});
