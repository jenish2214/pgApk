import type {CompositeScreenProps} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {Jangad, Order, OrderStatus, ShopStackParamList, TabParamList} from '../types';
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
import {jangadQuantity, listJangads, returnJangad} from '../services/jangadService';
import {listInquiries} from '../services/inquiryService';
import {changeOrderStatus, getDashboard, listOrders} from '../services/orderService';
import {deskAlerts, ordersToUpdate, type DeskAlert} from '../utils/deskAlerts';
import {confirmAction} from '../utils/confirm';
import {formatDay} from '../utils/dates';
import {useLanguage} from '../i18n/LanguageProvider';
import {timeGreeting} from '../utils/greeting';
import {nextOrderStatus, nextStatusLabel} from '../utils/orderStatus';
import {colors} from '../theme/colors';
import {cardLift, radius} from '../theme/layout';
import {padX, spacing} from '../theme/spacing';
import {text, face} from '../theme/type';

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
  const [jangads, setJangads] = useState<Jangad[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(0);
  const [savingJangadId, setSavingJangadId] = useState(0);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    try {
      const dashboard = getDashboard();
      const orders = listOrders();
      const inquiries = listInquiries();
      setCounts(dashboard.counts);
      setAlerts(deskAlerts(orders, inquiries));
      setUpdates(ordersToUpdate(orders));
      setJangads(listJangads('', 'Given'));
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
    navigation.getParent()?.navigate('Manage', {screen: tile.target, initial: false});
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
    navigation.getParent()?.navigate('Manage', {screen: 'ReadyHome', initial: false});
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

  const openJangad = (jangadId?: number) => {
    navigation.getParent()?.navigate('Manage', {
      screen: jangadId ? 'AddEditJangad' : 'JangadHome',
      params: jangadId ? {jangadId} : undefined,
      initial: false,
    });
  };

  const recordReturn = (jangad: Jangad) => {
    if (savingJangadId) {
      return;
    }
    confirmAction({
      title: 'Return jangad',
      confirmLabel: 'Return',
      lines: [
        jangad.shopName,
        ...jangad.pieces.map(piece => `${piece.itemName} · ${piece.tagNumber} · ${piece.quantity}`),
        t('Total {count}', {count: jangadQuantity(jangad)}),
      ],
      onConfirm: () => {
        setSavingJangadId(jangad.id);
        returnJangad(jangad.id)
          .then(() => {
            setError('');
            load();
          })
          .catch((returnError: unknown) => {
            setError(errorMessage(returnError, 'The jangad could not be saved.'));
          })
          .finally(() => setSavingJangadId(0));
      },
    });
  };

  const openCount = counts.pending + counts.preparing + counts.ready;

  return (
    <Screen>
      <View style={styles.screen}>
        <ShopHeader title="Home" menu />
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
                style={({pressed}) => [styles.tile, pressed && styles.pressed]}>
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
                style={({pressed}) => [styles.tile, pressed && styles.pressed]}>
                <Text style={styles.count}>{counts[tile.key]}</Text>
                <Text style={styles.tileLabel}>{t(tile.label)}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.sectionRow}>
            <Text style={styles.section}>{t('Jangad')}</Text>
            <PlusButton label="Jangad" onPress={() => openJangad()} />
          </View>
          {jangads.length === 0 && !loading ? (
            <Text style={styles.empty}>{t('No data')}</Text>
          ) : null}
          {jangads.map(jangad => (
            <Pressable
              key={jangad.id}
              accessibilityRole="button"
              onPress={() => openJangad(jangad.id)}
              style={({pressed}) => [styles.jangadCard, pressed && styles.pressed]}>
              <View style={styles.jangadRow}>
                <Text style={styles.jangadName}>{jangad.shopName}</Text>
                <Text style={styles.jangadPending}>{t('Pending')}</Text>
              </View>
              {jangad.pieces.map(piece => (
                <Text key={piece.id} style={styles.jangadLine}>
                  {piece.itemName}
                  {piece.tagNumber ? ` · ${piece.tagNumber}` : ''} · {piece.quantity}
                </Text>
              ))}
              <Text style={styles.jangadLine}>{t('Total {count}', {count: jangadQuantity(jangad)})}</Text>
              {jangad.moves.map(move => (
                <Text key={move.id} style={styles.jangadWhen}>
                  {t(move.direction)} · {move.quantity} · {formatDay(move.movedAt)}
                </Text>
              ))}
              <Pressable
                accessibilityRole="button"
                disabled={savingJangadId === jangad.id}
                onPress={() => recordReturn(jangad)}
                style={styles.update}>
                <Text style={styles.updateText}>
                  {savingJangadId === jangad.id ? t('Saving…') : t('Return')}
                </Text>
              </Pressable>
            </Pressable>
          ))}
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
    paddingTop: spacing.md,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  tile: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    flex: 1,
    padding: spacing.lg,
    ...cardLift,
  },
  pressed: {
    opacity: 0.86,
  },
  count: {
    color: colors.green,
    fontSize: text.count,
    fontFamily: face.display, fontWeight: '400',
  },
  tileLabel: {
    color: colors.muted,
    fontSize: text.meta,
    fontFamily: face.regular, fontWeight: '400',
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
    fontSize: text.section,
    fontFamily: face.important, fontWeight: '400',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  empty: {
    color: colors.muted,
    fontSize: text.label,
    marginBottom: spacing.md,
  },
  update: {
    alignSelf: 'flex-start',
    backgroundColor: colors.green,
    borderRadius: radius,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  updateText: {
    color: colors.cream,
    fontSize: text.meta,
    fontFamily: face.important, fontWeight: '400',
  },
  jangadCard: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.lg,
    ...cardLift,
  },
  jangadRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  jangadName: {
    color: colors.ink,
    flex: 1,
    fontSize: text.section,
    fontFamily: face.important, fontWeight: '400',
    marginRight: spacing.sm,
  },
  jangadPending: {
    color: colors.green,
    fontSize: text.small,
    fontFamily: face.important, fontWeight: '400',
  },
  jangadLine: {
    color: colors.ink,
    fontSize: text.label,
    fontFamily: face.important, fontWeight: '400',
    marginTop: spacing.xs,
  },
  jangadWhen: {
    color: colors.muted,
    fontSize: text.meta,
    marginTop: spacing.xs,
  },
});
