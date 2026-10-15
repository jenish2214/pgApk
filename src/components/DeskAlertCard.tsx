import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useLanguage} from '../i18n/LanguageProvider';
import type {DeskAlertTone} from '../utils/deskAlerts';
import {colors} from '../theme/colors';
import {radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important, text, face} from '../theme/type';

const TONE = {
  late: {bar: colors.danger, background: colors.cancelledBg, label: colors.danger},
  due: {bar: colors.gold, background: colors.pendingBg, label: colors.pendingText},
  inquiry: {bar: colors.green, background: colors.cream, label: colors.green},
  ready: {bar: colors.readyText, background: colors.readyBg, label: colors.readyText},
} as const;

export default function DeskAlertCard({
  tone,
  title,
  detail,
  onPress,
}: {
  tone: DeskAlertTone;
  title: string;
  detail: string;
  onPress: () => void;
}) {
  const {t} = useLanguage();
  const readyCount = title.match(/^(\d+) ready for collection$/);
  const heading = readyCount
    ? t('{count} ready for collection', {count: readyCount[1]})
    : t(title);
  const paint = TONE[tone];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [
        styles.card,
        {backgroundColor: paint.background},
        pressed && styles.pressed,
      ]}>
      <View style={[styles.bar, {backgroundColor: paint.bar}]} />
      <View style={styles.copy}>
        <Text style={[styles.title, {color: paint.label}]}>{heading}</Text>
        <Text style={styles.detail}>{t(detail)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius,
    flexDirection: 'row',
    marginBottom: padY,
    overflow: 'hidden',
  },
  bar: {
    width: 4,
  },
  pressed: {
    opacity: 0.86,
  },
  copy: {
    flex: 1,
    paddingHorizontal: padX,
    paddingVertical: padY,
  },
  title: {
    fontSize: text.label,
    fontFamily: face.important, fontWeight: '400',
  },
  detail: {
    color: colors.ink,
    fontSize: text.meta,
    marginTop: spacing.xs,
  },
});
