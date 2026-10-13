import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {OrderStatus} from '../types';
import {colors} from '../theme/colors';
import {padY, spacing} from '../theme/spacing';
import {important} from '../theme/type';

const STEPS: {status: OrderStatus; label: string}[] = [
  {status: 'Pending', label: 'Order placed'},
  {status: 'In Preparation', label: 'Preparing'},
  {status: 'Ready for Collection', label: 'Ready for collection'},
  {status: 'Delivered', label: 'Delivered'},
];

export default function OrderFlow({status}: {status: OrderStatus}) {
  const current = STEPS.findIndex(step => step.status === status);
  const cancelled = status === 'Cancelled';

  return (
    <View>
      {STEPS.map((step, index) => {
        const reached = !cancelled && current >= index;
        const active = !cancelled && current === index;
        return (
          <View key={step.status} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, reached && styles.dotOn, active && styles.dotActive]} />
              {index < STEPS.length - 1 ? (
                <View style={[styles.line, reached && index < current && styles.lineOn]} />
              ) : null}
            </View>
            <Text style={[styles.label, reached && styles.labelOn, active && styles.labelActive]}>
              {step.label}
            </Text>
          </View>
        );
      })}
      {cancelled ? <Text style={styles.cancelled}>Cancelled</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    minHeight: 36,
  },
  rail: {
    alignItems: 'center',
    width: 22,
  },
  dot: {
    backgroundColor: colors.line,
    borderRadius: 6,
    height: 12,
    marginTop: 4,
    width: 12,
  },
  dotOn: {
    backgroundColor: colors.green,
  },
  dotActive: {
    backgroundColor: colors.gold,
    borderColor: colors.green,
    borderWidth: 2,
  },
  line: {
    backgroundColor: colors.line,
    flex: 1,
    width: 2,
  },
  lineOn: {
    backgroundColor: colors.green,
  },
  label: {
    color: colors.muted,
    flex: 1,
    fontSize: 15,
    marginLeft: padY,
    paddingBottom: spacing.sm,
  },
  labelOn: {
    color: colors.green,
    fontWeight: important,
  },
  labelActive: {
    color: colors.ink,
  },
  cancelled: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: important,
    marginTop: spacing.sm,
  },
});
