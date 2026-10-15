import {useNavigation} from '@react-navigation/native';
import type {NavigationProp, ParamListBase} from '@react-navigation/native';
import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useLanguage} from '../i18n/LanguageProvider';
import {
  DRAWER_SECTIONS,
  EMPTY_MANAGE_COUNTS,
  manageCounts,
  type DrawerTarget,
  type ManageOption,
} from '../utils/manageOptions';
import {subscribeShopChanges} from '../services/shopEvents';
import {colors} from '../theme/colors';
import {useColors} from '../theme/ThemeProvider';
import {radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important, face} from '../theme/type';
import TabIcon from './TabIcon';

function openDrawerTarget(navigation: NavigationProp<ParamListBase>, target: DrawerTarget) {
  const parent = navigation.getParent() ?? navigation;
  parent.navigate(target.tab, {screen: target.screen});
}

function currentScreen(navigation: NavigationProp<ParamListBase>): string {
  const state = navigation.getState();
  return state?.routes[state.index ?? 0]?.name ?? '';
}

export function ManageMenu({color = colors.cream}: {color?: string}) {
  const {t} = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('Menu')}
        onPress={() => setOpen(true)}
        hitSlop={6}
        style={styles.button}>
        <View style={[styles.bar, {backgroundColor: color}]} />
        <View style={[styles.bar, {backgroundColor: color}]} />
        <View style={[styles.bar, styles.barShort, {backgroundColor: color}]} />
      </Pressable>
      <ManageDrawer visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

function ManageDrawer({visible, onClose}: {visible: boolean; onClose: () => void}) {
  const {t} = useLanguage();
  const palette = useColors();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const {width} = useWindowDimensions();
  const drawerWidth = Math.min(Math.round(width * 0.82), 340);
  const translate = useRef(new Animated.Value(-drawerWidth)).current;
  const [shown, setShown] = useState(false);
  const [counts, setCounts] = useState(EMPTY_MANAGE_COUNTS);
  const current = currentScreen(navigation);

  const opened = useRef(false);

  useEffect(() => {
    if (visible) {
      opened.current = true;
      translate.setValue(-drawerWidth);
      setShown(true);
      Animated.timing(translate, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }).start();
      return;
    }
    if (!opened.current) {
      return;
    }
    Animated.timing(translate, {
      toValue: -drawerWidth,
      duration: 200,
      useNativeDriver: true,
    }).start(({finished}) => {
      if (finished) {
        setShown(false);
      }
    });
  }, [drawerWidth, translate, visible]);

  useEffect(() => {
    if (!shown) {
      return;
    }
    const read = () => {
      try {
        setCounts(manageCounts());
      } catch {
        setCounts(EMPTY_MANAGE_COUNTS);
      }
    };
    read();
    return subscribeShopChanges(read);
  }, [shown]);

  const choose = (target: DrawerTarget) => {
    onClose();
    openDrawerTarget(navigation, target);
  };

  return (
    <Modal visible={shown} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('Close')} />
        <Animated.View
          style={[
            styles.drawer,
            {
              width: drawerWidth,
              backgroundColor: palette.ivory,
              paddingTop: insets.top + padY,
              paddingBottom: Math.max(insets.bottom, padY),
              transform: [{translateX: translate}],
            },
          ]}>
          <View style={styles.drawerHead}>
            <Text style={[styles.drawerTitle, {color: palette.ink}]}>{t('Menu')}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('Close')} onPress={onClose} hitSlop={8}>
              <Text style={styles.close}>{t('Close')}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.list}>
            {DRAWER_SECTIONS.map(section => (
              <View key={section.title}>
                <Text style={[styles.section, {color: palette.muted}]}>{t(section.title)}</Text>
                {section.items.map(option => (
                  <DrawerRow
                    key={option.key}
                    option={option}
                    count={option.countKey ? counts[option.countKey] : undefined}
                    selected={option.match.includes(current)}
                    onPress={() => choose(option.target)}
                  />
                ))}
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function DrawerRow({
  option,
  count,
  selected,
  onPress,
}: {
  option: ManageOption;
  count?: number;
  selected: boolean;
  onPress: () => void;
}) {
  const {t} = useLanguage();
  const palette = useColors();
  const label = count != null && count > 0 ? `${option.title}, ${count}` : option.title;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={selected ? {selected: true} : {}}
      accessibilityLabel={label}
      onPress={onPress}
      style={({pressed}) => [
        styles.row,
        {backgroundColor: palette.white, borderColor: selected ? colors.green : palette.line},
        pressed && styles.rowPressed,
      ]}>
      <View style={styles.icon}>
        <TabIcon name={option.icon} color={colors.green} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, {color: palette.ink}]}>{t(option.title)}</Text>
        <Text style={[styles.detail, {color: palette.muted}]}>{t(option.detail)}</Text>
      </View>
      {count != null ? (
        <Text style={count > 0 ? styles.count : styles.countQuiet}>{count}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'flex-start',
    height: 36,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 36,
  },
  bar: {
    borderRadius: 1,
    height: 2,
    marginVertical: 2,
    width: 18,
  },
  barShort: {
    width: 12,
  },
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 58, 46, 0.45)',
  },
  drawer: {
    backgroundColor: colors.ivory,
    bottom: 0,
    elevation: 12,
    left: 0,
    position: 'absolute',
    shadowColor: colors.ink,
    shadowOffset: {width: 8, height: 0},
    shadowOpacity: 0.16,
    shadowRadius: 16,
    top: 0,
  },
  drawerHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: padY,
    paddingHorizontal: padX,
  },
  drawerTitle: {
    color: colors.ink,
    fontSize: 18,
    fontFamily: face.important, fontWeight: '400',
  },
  close: {
    color: colors.green,
    fontSize: 14,
    fontFamily: face.important, fontWeight: '400',
  },
  list: {
    paddingBottom: spacing.lg,
    paddingHorizontal: padX,
  },
  section: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: face.important, fontWeight: '400',
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.sm,
    paddingHorizontal: padY,
    paddingVertical: padY,
  },
  rowOn: {
    borderColor: colors.green,
  },
  rowPressed: {
    backgroundColor: colors.ivory,
  },
  icon: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  copy: {
    flex: 1,
    marginLeft: padY,
    minWidth: 0,
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontFamily: face.important, fontWeight: '400',
  },
  detail: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  count: {
    color: colors.green,
    fontSize: 18,
    fontFamily: face.important, fontWeight: '400',
    marginLeft: spacing.sm,
    minWidth: 24,
    textAlign: 'right',
  },
  countQuiet: {
    color: colors.muted,
    fontSize: 18,
    fontFamily: face.important, fontWeight: '400',
    marginLeft: spacing.sm,
    minWidth: 24,
    textAlign: 'right',
  },
});
