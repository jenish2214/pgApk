import React, {type ReactNode} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import type {Order} from '../types';
import {categoryImage} from '../utils/categories';
import {formatDay} from '../utils/dates';
import {colors} from '../theme/colors';
import {cardLift, radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important, regular, text, face} from '../theme/type';
import {useLanguage} from '../i18n/LanguageProvider';
import StatusBadge from './StatusBadge';

function OrderCard({
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
            <Text style={styles.number} numberOfLines={1}>
              {order.orderNumber}
            </Text>
            <StatusBadge status={order.status} />
          </View>
          <Text style={styles.item} numberOfLines={2}>
            {order.itemName}
          </Text>
          <Text style={styles.category}>{t(order.category || 'Other')}</Text>
          <Text style={styles.customer} numberOfLines={2}>
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

export default React.memo(OrderCard);

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
    minWidth: 0,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  category: {
    color: colors.gold,
    fontSize: text.small,
    fontFamily: face.regular, fontWeight: '400',
    marginTop: spacing.xs,
  },
  number: {
    color: colors.gold,
    flexShrink: 1,
    fontSize: text.meta,
    fontFamily: face.important, fontWeight: '400',
  },
  item: {
    color: colors.ink,
    fontSize: text.body,
    fontFamily: face.important, fontWeight: '400',
    marginTop: spacing.xs,
  },
  customer: {
    color: colors.green,
    fontSize: text.label,
    fontFamily: face.important, fontWeight: '400',
    marginTop: spacing.xs,
  },
  meta: {
    color: colors.muted,
    fontSize: text.meta,
    marginTop: spacing.xs,
  },
  actions: {
    marginTop: padY,
  },
});
