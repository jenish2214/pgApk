import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useLanguage} from '../i18n/LanguageProvider';
import {colors} from '../theme/colors';
import {padX, padY, spacing} from '../theme/spacing';
import {important, text, face} from '../theme/type';
import AppButton from './AppButton';

export default function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const {t} = useLanguage();
  return (
    <View style={styles.wrap}>
      <View style={styles.gem} />
      <Text style={styles.title}>{t(title)}</Text>
      {message ? <Text style={styles.message}>{t(message)}</Text> : null}
      {actionLabel && onAction ? (
        <AppButton label={actionLabel} onPress={onAction} style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: padX,
    paddingVertical: spacing.xl,
  },
  gem: {
    backgroundColor: colors.gold,
    height: 12,
    marginBottom: spacing.lg,
    transform: [{rotate: '45deg'}],
    width: 12,
  },
  title: {
    color: colors.ink,
    fontSize: text.lead,
    fontFamily: face.important, fontWeight: '400',
    textAlign: 'center',
  },
  message: {
    color: colors.muted,
    fontSize: text.body,
    lineHeight: 22,
    marginTop: padY,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.lg,
  },
});
