import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {Order, ShopStackParamList} from '../types';
import {errorMessage} from '../types';
import React, {useCallback, useState} from 'react';
import {ActivityIndicator, FlatList, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AppButton from '../components/AppButton';
import EmptyState from '../components/EmptyState';
import Screen from '../components/Screen';
import OrderCard from '../components/OrderCard';
import ShopHeader from '../components/ShopHeader';
import {changeOrderStatus, listReady} from '../services/orderService';
import {listWindow} from '../utils/listWindow';
import {confirmAction, showNotice} from '../utils/confirm';
import {formatDay, formatWhen} from '../utils/dates';
import {buildReadyMessage, callCustomer, openWhatsApp} from '../utils/whatsappUtils';
import {useLanguage} from '../i18n/LanguageProvider';
import {colors} from '../theme/colors';
import {gap} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';

type Props = NativeStackScreenProps<ShopStackParamList, 'ReadyHome'>;

export default function ReadyOrdersScreen({navigation}: Props) {
  const {t} = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(0);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    try {
      setOrders(listReady());
      setError('');
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, 'Ready orders could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const contact = async (order: Order, action: 'call' | 'whatsapp') => {
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
        buildReadyMessage(order.customerName || 'Customer', order.orderNumber),
      );
    } catch (contactError: unknown) {
      showNotice({
        title: 'Pragati Gold',
        message: errorMessage(contactError, 'The customer could not be contacted.'),
      });
    }
  };

  const markDelivered = (order: Order) => {
    confirmAction({
      title: 'Update to delivered',
      confirmLabel: 'Update',
      lines: [
        order.orderNumber,
        order.customerName || 'Customer record is missing',
        order.customerPhone || 'No phone number',
        order.itemName,
        `From: ${order.status}`,
        'To: Delivered',
        `Ordered: ${formatDay(order.orderDate)}`,
        `Ready: ${formatWhen(order.readyAt)}`,
        'This order will leave the ready list.',
      ],
      onConfirm: async () => {
        setBusyId(order.id);
        try {
          await changeOrderStatus(order.id, 'Delivered');
          setOrders(current => current.filter(item => item.id !== order.id));
          setError('');
        } catch (statusError: unknown) {
          setError(errorMessage(statusError, 'The order could not be updated.'));
        } finally {
          setBusyId(0);
        }
      },
    });
  };

  return (
    <Screen>
    <View style={styles.screen}>
      <ShopHeader
        title="Ready"
        menu
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />
      <FlatList
        data={orders}
        keyExtractor={item => String(item.id)}
        {...listWindow}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          error ? <Text style={styles.error}>{t(error)}</Text> : undefined
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.green} />
          ) : (
            <EmptyState
              title="No data"
              message="No data"
            />
          )
        }
        renderItem={({item}) => (
          <OrderCard
            order={item}
            meta={`Marked ready ${formatWhen(item.readyAt)}`}
            onPress={() => navigation.navigate('OrderDetails', {orderId: item.id})}>
            <View style={styles.actions}>
              <AppButton
                label="Call"
                variant="secondary"
                onPress={() => contact(item, 'call')}
                style={styles.action}
              />
              <AppButton
                label="WhatsApp"
                variant="secondary"
                onPress={() => contact(item, 'whatsapp')}
                style={styles.action}
              />
            </View>
            <View style={styles.actions}>
              <AppButton
                label="View details"
                variant="ghost"
                onPress={() =>
                  navigation.navigate('OrderDetails', {orderId: item.id})
                }
                style={styles.action}
              />
              <AppButton
                label={busyId === item.id ? 'Saving…' : 'Delivered'}
                onPress={() => markDelivered(item)}
                disabled={busyId === item.id}
                style={styles.action}
              />
            </View>
          </OrderCard>
        )}
      />
    </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.ivory,
    flex: 1,
  },
  list: {
    paddingBottom: spacing.xl,
    paddingHorizontal: padX,
    paddingTop: padY,
  },
  error: {
    color: colors.danger,
    marginBottom: padY,
  },
  actions: {
    flexDirection: 'row',
    gap,
    marginTop: gap,
  },
  action: {
    flex: 1,
  },
});
