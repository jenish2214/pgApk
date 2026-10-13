import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {DeskAlertTone} from '../utils/deskAlerts';
import {colors} from '../theme/colors';
import {radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important} from '../theme/type';

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
  const paint = TONE[tone];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, {backgroundColor: paint.background}]}>
      <View style={[styles.bar, {backgroundColor: paint.bar}]} />
      <View style={styles.copy}>
        <Text style={[styles.title, {color: paint.label}]}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
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
  copy: {
    flex: 1,
    paddingHorizontal: padX,
    paddingVertical: padY,
  },
  title: {
    fontSize: 14,
    fontWeight: important,
  },
  detail: {
    color: colors.ink,
    fontSize: 13,
    marginTop: spacing.xs,
  },
});
