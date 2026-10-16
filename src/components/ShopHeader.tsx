import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useLanguage} from '../i18n/LanguageProvider';
import {ManageMenu} from './ManageDrawer';
import {colors} from '../theme/colors';
import {padX, padY, spacing} from '../theme/spacing';
import {text, face} from '../theme/type';

export default function ShopHeader({
  title,
  menu = false,
}: {
  title: string;
  menu?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const {t} = useLanguage();

  return (
    <View style={[styles.header, {paddingTop: insets.top + padY}]}>
      <View style={styles.row}>
        {menu ? <ManageMenu color={colors.ink} /> : null}
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
  title: {
    color: colors.ink,
    flex: 1,
    fontSize: text.title,
    fontFamily: face.display, fontWeight: '400',
  },
});
