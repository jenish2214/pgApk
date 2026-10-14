import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useLanguage} from '../i18n/LanguageProvider';
import BackIcon from './BackIcon';
import {ManageMenu} from './ManageDrawer';
import {colors} from '../theme/colors';
import {padX, padY, spacing} from '../theme/spacing';
import {important} from '../theme/type';

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
        {menu ? <ManageMenu /> : null}
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Back')}
            onPress={onBack}
            hitSlop={6}
            style={styles.back}>
            <BackIcon color={colors.cream} />
          </Pressable>
        ) : null}
        <Text style={styles.title}>{t(title)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.green,
    paddingBottom: padY,
    paddingHorizontal: padX,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  back: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    minHeight: 36,
    minWidth: 36,
  },
  title: {
    color: colors.cream,
    flex: 1,
    fontSize: 20,
    fontWeight: important,
  },
});
