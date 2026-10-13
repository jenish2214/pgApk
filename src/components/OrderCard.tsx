import React, {type ReactNode} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import type {Order} from '../types';
import {categoryImage} from '../utils/categories';
import {formatDay} from '../utils/dates';
import {colors} from '../theme/colors';
import {radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important} from '../theme/type';
import {useLanguage} from '../i18n/LanguageProvider';
import StatusBadge from './StatusBadge';

export default function OrderCard({
  order,
  onPress,
  meta,
  children,
}: {
  order: Order;
  onPress: () => void;
  meta?: string;
  children?: ReactNode;
}) {
  const {t} = useLanguage();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <Image source={categoryImage(order.category)} style={styles.photo} />
        <View style={styles.copy}>
          <View style={styles.row}>
            <Text style={styles.number}>{order.orderNumber}</Text>
            <StatusBadge status={order.status} />
          </View>
          <Text style={styles.item}>{order.itemName}</Text>
          <Text style={styles.category}>{t(order.category || 'Other')}</Text>
          <Text style={styles.customer}>
            {order.customerName || t('Customer')}
            {order.customerPhone ? ` · ${order.customerPhone}` : ''}
          </Text>
          <Text style={styles.meta}>
            {meta || t('Ordered {date}', {date: formatDay(order.orderDate)})}
          </Text>
        </View>
      </View>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    marginBottom: padY,
    paddingHorizontal: padX,
    paddingVertical: padY,
  },
  pressed: {
    opacity: 0.9,
  },
  top: {
    flexDirection: 'row',
    gap: padY,
  },
  photo: {
    borderRadius: radius,
    height: 72,
    width: 72,
  },
  copy: {
    flex: 1,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  category: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: important,
    marginTop: spacing.xs,
  },
  number: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: important,
  },
  item: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: important,
    marginTop: spacing.xs,
  },
  customer: {
    color: colors.green,
    fontSize: 14,
    fontWeight: important,
    marginTop: spacing.xs,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  actions: {
    marginTop: padY,
  },
});
