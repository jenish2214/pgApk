import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {OrderStatus} from '../types';
import {colors} from '../theme/colors';
import {radius} from '../theme/layout';
import {spacing} from '../theme/spacing';
import {important} from '../theme/type';

const TONES = {
  Pending: {background: colors.pendingBg, text: colors.pendingText},
  'In Preparation': {background: colors.preparingBg, text: colors.preparingText},
  'Ready for Collection': {background: colors.readyBg, text: colors.readyText},
  Delivered: {background: colors.deliveredBg, text: colors.deliveredText},
  Cancelled: {background: colors.cancelledBg, text: colors.cancelledText},
};

export default function StatusBadge({status}: {status: OrderStatus | string}) {
  const tone = TONES[status as OrderStatus] || TONES.Pending;
  return (
    <View style={[styles.badge, {backgroundColor: tone.background}]}>
      <Text style={[styles.text, {color: tone.text}]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  text: {
    fontSize: 12,
    fontWeight: important,
  },
});
