import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {Customer} from '../types';
import {formatDay} from '../utils/dates';
import {colors} from '../theme/colors';
import {cardLift, radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important, regular, text, face} from '../theme/type';

function CustomerCard({
  customer,
  onPress,
}: {
  customer: Customer;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.row}>
        <Text style={styles.name}>{customer.name}</Text>
        <Text style={styles.date}>{formatDay(customer.createdAt)}</Text>
      </View>
      <Text style={styles.phone}>{customer.phone}</Text>
      {customer.address ? (
        <Text style={styles.address} numberOfLines={1}>
          {customer.address}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default React.memo(CustomerCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    marginBottom: padY,
    ...cardLift,
    paddingHorizontal: padX,
    paddingVertical: padY,
  },
  pressed: {
    opacity: 0.86,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  name: {
    color: colors.ink,
    flex: 1,
    fontSize: text.body,
    fontFamily: face.important, fontWeight: '400',
    marginRight: spacing.sm,
  },
  date: {
    color: colors.muted,
    fontSize: text.small,
  },
  phone: {
    color: colors.green,
    fontSize: text.body,
    fontFamily: face.regular, fontWeight: '400',
    marginTop: spacing.xs,
  },
  address: {
    color: colors.muted,
    fontSize: text.label,
    marginTop: spacing.xs,
  },
});
