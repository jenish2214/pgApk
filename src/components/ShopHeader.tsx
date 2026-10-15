import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useLanguage} from '../i18n/LanguageProvider';
import BackIcon from './BackIcon';
import {ManageMenu} from './ManageDrawer';
import {colors} from '../theme/colors';
import {padX, padY, spacing} from '../theme/spacing';
import {text, face} from '../theme/type';

export default function ShopHeader({
  title,
  onBack,
  menu = false,
}: {
  title: string;
  onBack?: () => void;
  menu?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const {t} = useLanguage();

  return (
    <View style={[styles.header, {paddingTop: insets.top + padY}]}>
      <View style={styles.row}>
        {menu ? <ManageMenu color={colors.ink} /> : null}
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Back')}
            onPress={onBack}
            hitSlop={6}
            style={styles.back}>
            <BackIcon color={colors.ink} />
          </Pressable>
        ) : null}
        <Text style={styles.title} numberOfLines={1}>
          {t(title)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.white,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.md,
    paddingHorizontal: padX,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 44,
  },
  back: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    minHeight: 36,
    minWidth: 36,
  },
  title: {
    color: colors.ink,
    flex: 1,
    fontSize: text.title,
    fontFamily: face.display, fontWeight: '400',
  },
});
