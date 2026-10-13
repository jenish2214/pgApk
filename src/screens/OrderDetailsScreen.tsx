import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {Order, OrderEvent, OrderStatus, ShopStackParamList} from '../types';
import {errorMessage} from '../types';
import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AppButton from '../components/AppButton';
import EmptyState from '../components/EmptyState';
import OrderFlow from '../components/OrderFlow';
import Screen from '../components/Screen';
import StatusBadge from '../components/StatusBadge';
import {changeOrderStatus, getOrder, orderEvents} from '../services/orderService';
import {categoryImage} from '../utils/categories';
import {employeeAlerts} from '../utils/orderAlerts';
import {confirmAction, showNotice} from '../utils/confirm';
import {formatDay, formatWhen} from '../utils/dates';
import {ORDER_STATUSES, READY_STATUS} from '../utils/orderStatus';
import {buildReadyMessage, callCustomer, openWhatsApp} from '../utils/whatsappUtils';
import {colors} from '../theme/colors';
import {gap, radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important} from '../theme/type';

type Props = NativeStackScreenProps<ShopStackParamList, 'OrderDetails'>;

export default function OrderDetailsScreen({navigation, route}: Props) {
  const orderId = route.params?.orderId;
  const [order, setOrder] = useState<Order | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    try {
      const current = getOrder(orderId);
      setOrder(current);
      setEvents(current ? orderEvents(current.id) : []);
      setError('');
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, 'This order could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const confirmStatus = (status: OrderStatus) => {
    if (saving || !order || order.status === status) {
      return;
    }
    confirmAction({
      title: 'Update status',
      confirmLabel: 'Update',
      lines: [
        order.orderNumber,
        order.customerName || 'Customer record is missing',
        order.customerPhone || 'No phone number',
        order.itemName,
        `From: ${order.status}`,
        `To: ${status}`,
        `Ordered: ${formatDay(order.orderDate)}`,
        `Delivery: ${order.expectedDeliveryDate ? formatDay(order.expectedDeliveryDate) : 'not set'}`,
      ],
      onConfirm: () => {
        updateStatus(status);
      },
    });
  };

  const updateStatus = async (status: OrderStatus) => {
    if (saving || !order || order.status === status) {
      return;
    }
    setSaving(true);
    try {
      const updated = await changeOrderStatus(order.id, status);
      setOrder(updated);
      setEvents(updated ? orderEvents(updated.id) : []);
      setError('');
    } catch (statusError: unknown) {
      setError(errorMessage(statusError, 'The status could not be updated.'));
    } finally {
      setSaving(false);
    }
  };

  const contact = async (action: 'call' | 'whatsapp') => {
    if (!order) {
      return;
    }
    try {
      if (!order.customerPhone) {
        throw new Error('This order has no customer phone number.');
      }
      if (action === 'call') {
        await callCustomer(order.customerPhone);
        return;
      }
      await openWhatsApp(
        order.customerPhone,
        order.status === READY_STATUS
          ? buildReadyMessage(order.customerName || 'Customer', order.orderNumber)
          : `Hello ${order.customerName || 'Customer'}, this is Pragati Gold about order #${order.orderNumber}.`,
      );
    } catch (contactError: unknown) {
      showNotice({
        title: 'Pragati Gold',
        message: errorMessage(contactError, 'The customer could not be contacted.'),
      });
    }
  };

  const markDelivered = () => {
    confirmStatus('Delivered');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  if (!order) {
    return (
      <EmptyState
        title="No data"
        message={error || 'This order is not in the shop database.'}
        actionLabel="Back"
        onAction={() => navigation.goBack()}
      />
    );
  }

  const pieces = order.pieces.length
    ? order.pieces
    : [
        {
          id: 0,
          orderId: order.id,
          itemName: order.itemName,
          category: order.category,
          description: order.description,
        },
      ];

  return (
    <Screen>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Order flow</Text>
      <OrderFlow status={order.status} />
      <Text style={styles.section}>Jewellery</Text>
      {pieces.map(piece => (
        <View key={`${piece.id}-${piece.itemName}`} style={styles.piece}>
          <Image source={categoryImage(piece.category)} style={styles.thumb} />
          <View style={styles.pieceCopy}>
            <Text style={styles.pieceName}>{piece.itemName}</Text>
            <Text style={styles.pieceCategory}>{piece.category}</Text>
            {piece.description ? <Text style={styles.pieceNote}>{piece.description}</Text> : null}
          </View>
        </View>
      ))}
      {employeeAlerts([order]).map(alert => (
        <View key={alert.title} style={styles.alert}>
          <Text style={styles.alertTitle}>{alert.title}</Text>
          <Text style={styles.alertDetail}>{alert.detail}</Text>
        </View>
      ))}
      <Text style={styles.number}>{order.orderNumber}</Text>
      <Text style={styles.item}>{order.itemName}</Text>
      <Detail label="Category" value={order.category || 'Other'} />
      <StatusBadge status={order.status} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Detail label="Customer" value={order.customerName || 'Customer record is missing'} />
      <Detail label="Phone" value={order.customerPhone || '—'} />
      <Detail label="Design" value={order.description || '—'} />
      <Detail label="Order date" value={formatDay(order.orderDate)} />
      <Detail
        label="Expected delivery"
        value={order.expectedDeliveryDate ? formatDay(order.expectedDeliveryDate) : '—'}
      />
      <Detail label="Marked ready" value={formatWhen(order.readyAt)} />
      <Detail label="Employee notes" value={order.employeeNotes || '—'} />
      <Text style={styles.section}>Tracking</Text>
      {events.map(event => (
        <View key={event.id} style={styles.event}>
          <Text style={styles.eventLabel}>{event.label}</Text>
          <Text style={styles.eventDetail}>{event.detail || '—'}</Text>
          <Text style={styles.eventWhen}>{formatWhen(event.happenedAt)}</Text>
        </View>
      ))}
      <Text style={styles.section}>Status</Text>
      <View style={styles.statuses}>
        {ORDER_STATUSES.map(status => {
          const selected = order.status === status;
          return (
            <Pressable
              key={status}
              disabled={saving}
              onPress={() => confirmStatus(status)}
              style={[styles.chip, selected && styles.chipSelected]}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {status}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.stack}>
        {order.customerPhone ? (
          <>
            <AppButton label="Call customer" onPress={() => contact('call')} />
            <AppButton
              label="Open WhatsApp"
              variant="secondary"
              onPress={() => contact('whatsapp')}
            />
          </>
        ) : null}
        {order.status === READY_STATUS ? (
          <AppButton
            label={saving ? 'Saving…' : 'Mark as delivered'}
            variant="secondary"
            onPress={markDelivered}
            disabled={saving}
          />
        ) : null}
        <AppButton
          label="Edit order"
          variant="secondary"
          onPress={() => navigation.navigate('AddEditOrder', {orderId: order.id})}
        />
      {order.customerId ? (
        <AppButton
          label="View customer"
          variant="ghost"
          onPress={() =>
            navigation.navigate('CustomerDetails', {customerId: order.customerId})
          }
        />
      ) : null}
      </View>
    </ScrollView>
    </Screen>
  );
}

function Detail({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.ivory,
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
    paddingHorizontal: padX,
    paddingTop: padY,
  },
  center: {
    alignItems: 'center',
    backgroundColor: colors.ivory,
    flex: 1,
    justifyContent: 'center',
  },
  alert: {
    backgroundColor: colors.white,
    borderColor: colors.gold,
    borderRadius: radius,
    borderWidth: 1,
    marginBottom: padY,
    paddingHorizontal: padX,
    paddingVertical: padY,
  },
  alertTitle: {
    color: colors.green,
    fontSize: 15,
    fontWeight: important,
  },
  alertDetail: {
    color: colors.ink,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  piece: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    flexDirection: 'row',
    gap: padY,
    marginBottom: padY,
    padding: padY,
  },
  thumb: {
    borderRadius: radius,
    height: 64,
    width: 64,
  },
  pieceCopy: {
    flex: 1,
  },
  pieceName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: important,
  },
  pieceCategory: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: important,
    marginTop: spacing.xs,
  },
  pieceNote: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  photo: {
    borderRadius: radius,
    height: 180,
    marginBottom: padY,
    width: '100%',
  },
  number: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: important,
  },
  event: {
    borderLeftColor: colors.gold,
    borderLeftWidth: 2,
    marginTop: padY,
    paddingLeft: padY,
  },
  eventLabel: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: important,
  },
  eventDetail: {
    color: colors.green,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  eventWhen: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  item: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: important,
    marginBottom: padY,
    marginTop: spacing.xs,
  },
  error: {
    color: colors.danger,
    marginTop: padY,
  },
  detail: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    marginTop: padY,
    paddingTop: spacing.sm,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: important,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: important,
    marginTop: spacing.xs,
  },
  section: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: important,
    marginTop: spacing.lg,
  },
  statuses: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap,
    marginBottom: padY,
    marginTop: padY,
  },
  chip: {
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    paddingHorizontal: padY,
    paddingVertical: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  chipText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: important,
  },
  chipTextSelected: {
    color: colors.cream,
  },
  stack: {
    gap,
    marginTop: gap,
  },
});
