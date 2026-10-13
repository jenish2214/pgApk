import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {useLanguage} from '../i18n/LanguageProvider';
import {colors} from '../theme/colors';
import {radius} from '../theme/layout';
import {important} from '../theme/type';

const MARK = {en: 'EN', hi: 'हिं', gu: 'ગુ'} as const;

export default function LanguageButton({light = true}: {light?: boolean}) {
  const {language, openLanguage, t} = useLanguage();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('Language')}
      onPress={openLanguage}
      hitSlop={6}
      style={styles.button}>
      <Text style={[styles.mark, light ? styles.light : styles.dark]}>{MARK[language]}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderColor: colors.gold,
    borderRadius: radius,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 40,
    paddingHorizontal: 8,
  },
  mark: {
    fontSize: 13,
    fontWeight: important,
  },
  light: {
    color: colors.cream,
  },
  dark: {
    color: colors.green,
  },
});
