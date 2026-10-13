import type {CompositeScreenProps} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {Order, OrderStatus, ShopStackParamList, TabParamList} from '../types';
import {errorMessage} from '../types';
import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import DeskAlertCard from '../components/DeskAlertCard';
import DeskHero from '../components/DeskHero';
import OrderCard from '../components/OrderCard';
import PlusButton from '../components/PlusButton';
import Screen from '../components/Screen';
import ShopHeader from '../components/ShopHeader';
import {listInquiries} from '../services/inquiryService';
import {changeOrderStatus, getDashboard, listOrders} from '../services/orderService';
import {deskAlerts, ordersToUpdate, type DeskAlert} from '../utils/deskAlerts';
import {confirmAction} from '../utils/confirm';
import {useLanguage} from '../i18n/LanguageProvider';
import {timeGreeting} from '../utils/greeting';
import {nextOrderStatus, nextStatusLabel} from '../utils/orderStatus';
import {colors} from '../theme/colors';
import {gap, radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important} from '../theme/type';

type Tile = {
  key: 'customers' | 'pending' | 'preparing' | 'ready';
  label: string;
  target: 'Customers' | 'Orders' | 'ReadyHome';
  status?: string;
};

const TILES: Tile[] = [
  {key: 'pending', label: 'Pending', target: 'Orders', status: 'Pending'},
  {key: 'preparing', label: 'Preparing', target: 'Orders', status: 'In Preparation'},
  {key: 'ready', label: 'Ready', target: 'ReadyHome'},
  {key: 'customers', label: 'Customers', target: 'Customers'},
];

type Props = CompositeScreenProps<
  NativeStackScreenProps<ShopStackParamList, 'DeskHome'>,
  BottomTabScreenProps<TabParamList>
>;

export default function DashboardScreen({navigation}: Props) {
  const {t} = useLanguage();
  const [counts, setCounts] = useState({
    customers: 0,
    pending: 0,
    preparing: 0,
    ready: 0,
  });
  const [alerts, setAlerts] = useState<DeskAlert[]>([]);
  const [updates, setUpdates] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(0);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    try {
      const dashboard = getDashboard();
      const orders = listOrders();
      const inquiries = listInquiries();
      setCounts(dashboard.counts);
      setAlerts(deskAlerts(orders, inquiries));
      setUpdates(ordersToUpdate(orders));
      setError('');
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, 'The shop desk could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openTile = (tile: Tile) => {
    if (tile.target === 'Orders') {
      navigation.navigate('Orders', {status: tile.status});
      return;
    }
    if (tile.target === 'Customers') {
      navigation.getParent()?.navigate('Customers');
      return;
    }
    navigation.getParent()?.navigate('Manage', {screen: tile.target});
  };

  const openAlert = (alert: DeskAlert) => {
    if (alert.orderId) {
      navigation.navigate('OrderDetails', {orderId: alert.orderId});
      return;
    }
    if (alert.inquiryId) {
      navigation.navigate('AddEditInquiry', {inquiryId: alert.inquiryId});
      return;
    }
    navigation.getParent()?.navigate('Manage', {screen: 'ReadyHome'});
  };

  const applyStatus = async (order: Order, status: OrderStatus) => {
    setSavingId(order.id);
    try {
      await changeOrderStatus(order.id, status);
      setError('');
      load();
    } catch (updateError: unknown) {
      setError(errorMessage(updateError, 'The order could not be updated.'));
    } finally {
      setSavingId(0);
    }
  };

  const updateOrder = (order: Order) => {
    const status = nextOrderStatus(order.status);
    if (!status || savingId) {
      return;
    }
    if (status === 'Delivered') {
      confirmAction({
        title: 'Mark delivered',
        confirmLabel: 'Delivered',
        lines: [order.orderNumber, order.customerName || 'Customer', order.itemName],
        onConfirm: () => {
          applyStatus(order, status);
        },
      });
      return;
    }
    applyStatus(order, status);
  };

  const openCount = counts.pending + counts.preparing + counts.ready;

  return (
    <Screen>
      <View style={styles.screen}>
        <ShopHeader title="Home" />
        <ScrollView contentContainerStyle={styles.content}>
          {loading ? <ActivityIndicator color={colors.gold} /> : null}
          {error ? <Text style={styles.error}>{t(error)}</Text> : null}
          <DeskHero
            kicker={t(timeGreeting())}
            value={String(openCount)}
            label={t('Open on the desk')}
            notes={[`${counts.pending} ${t('pending')}`, `${counts.ready} ${t('ready')}`]}
          />
          <View style={styles.metricRow}>
            {TILES.slice(0, 2).map(tile => (
              <Pressable
                key={tile.key}
                accessibilityRole="button"
                onPress={() => openTile(tile)}
                style={styles.tile}>
                <Text style={styles.count}>{counts[tile.key]}</Text>
                <Text style={styles.tileLabel}>{t(tile.label)}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.metricRow}>
            {TILES.slice(2).map(tile => (
              <Pressable
                key={tile.key}
                accessibilityRole="button"
                onPress={() => openTile(tile)}
                style={styles.tile}>
                <Text style={styles.count}>{counts[tile.key]}</Text>
                <Text style={styles.tileLabel}>{t(tile.label)}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.sectionRow}>
            <Text style={styles.section}>{t('Needs attention')}</Text>
            <PlusButton label="Order" onPress={() => navigation.navigate('AddEditOrder')} />
          </View>
          {alerts.length === 0 && !loading ? (
            <Text style={styles.empty}>{t('Nothing needs a call today.')}</Text>
          ) : null}
          {alerts.map(alert => (
            <DeskAlertCard
              key={alert.key}
              tone={alert.tone}
              title={alert.title}
              detail={alert.detail}
              onPress={() => openAlert(alert)}
            />
          ))}
          {updates.length > 0 ? <Text style={styles.section}>{t('Update an order')}</Text> : null}
          {updates.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() => navigation.navigate('OrderDetails', {orderId: order.id})}>
              <Pressable
                accessibilityRole="button"
                disabled={savingId === order.id}
                onPress={() => updateOrder(order)}
                style={styles.update}>
                <Text style={styles.updateText}>
                  {savingId === order.id ? t('Updating…') : t(nextStatusLabel(order.status))}
                </Text>
              </Pressable>
            </OrderCard>
          ))}
        </ScrollView>
      </View>
    </Screen>
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
  error: {
    color: colors.danger,
    marginBottom: padY,
  },
  metricRow: {
    flexDirection: 'row',
    gap,
    marginBottom: gap,
  },
  tile: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: padY,
    paddingVertical: padY,
  },
  count: {
    color: colors.green,
    fontSize: 22,
    fontWeight: important,
  },
  tileLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: important,
    marginTop: spacing.xs,
  },
  sectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  section: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: important,
    marginBottom: padY,
    marginTop: spacing.sm,
  },
  empty: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: padY,
  },
  update: {
    alignSelf: 'flex-start',
    backgroundColor: colors.green,
    borderRadius: radius,
    paddingHorizontal: padY,
    paddingVertical: spacing.sm,
  },
  updateText: {
    color: colors.cream,
    fontSize: 13,
    fontWeight: important,
  },
});
