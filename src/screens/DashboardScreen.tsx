import type {CompositeScreenProps} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {ShopCall} from '../utils/orderReminder';
import type {Order, ShopStackParamList, TabParamList} from '../types';
import {errorMessage} from '../types';
import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import OrderCard from '../components/OrderCard';
import PlusButton from '../components/PlusButton';
import Screen from '../components/Screen';
import ShopHeader from '../components/ShopHeader';
import {listInquiries} from '../services/inquiryService';
import {getDashboard, listOrders} from '../services/orderService';
import {formatWhen} from '../utils/dates';
import {shopCalls} from '../utils/orderReminder';
import {callCustomer} from '../utils/whatsappUtils';
import {showNotice} from '../utils/confirm';
import {colors} from '../theme/colors';
import {gap, radius, wp} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important} from '../theme/type';

type Tile = {
  key: 'customers' | 'pending' | 'preparing' | 'ready' | 'inquiries';
  label: string;
  target: 'Customers' | 'Orders' | 'Ready' | 'Inquiry';
  status?: string;
};

const TILES: Tile[] = [
  {key: 'customers', label: 'Customers', target: 'Customers'},
  {key: 'pending', label: 'Pending', target: 'Orders', status: 'Pending'},
  {key: 'preparing', label: 'In preparation', target: 'Orders', status: 'In Preparation'},
  {key: 'ready', label: 'Ready', target: 'Ready'},
  {key: 'inquiries', label: 'Inquiry', target: 'Inquiry'},
];

type Props = CompositeScreenProps<
  NativeStackScreenProps<ShopStackParamList, 'DeskHome'>,
  BottomTabScreenProps<TabParamList>
>;

export default function DashboardScreen({navigation}: Props) {
  const {width} = useWindowDimensions();
  const columns = width >= 760 ? 4 : 2;
  const [counts, setCounts] = useState({
    customers: 0,
    pending: 0,
    preparing: 0,
    ready: 0,
    inquiries: 0,
  });
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
  const [calls, setCalls] = useState<ShopCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    try {
      const dashboard = getDashboard();
      const waiting = listInquiries().filter(item => item.status === 'Waiting').length;
      setCounts({...dashboard.counts, inquiries: waiting});
      setReadyOrders(dashboard.readyOrders);
      setCalls(shopCalls(listOrders(), listInquiries()));
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
    navigation.getParent()?.navigate(tile.target);
  };

  const openCall = (call: ShopCall) => {
    if (call.orderId) {
      navigation.navigate('OrderDetails', {orderId: call.orderId});
      return;
    }
    if (call.inquiryId) {
      navigation.navigate('AddEditInquiry', {inquiryId: call.inquiryId});
    }
  };

  const dial = async (phone: string) => {
    try {
      await callCustomer(phone);
    } catch (callError: unknown) {
      showNotice({
        title: 'Pragati Gold',
        message: errorMessage(callError, 'The customer could not be called.'),
      });
    }
  };

  return (
    <Screen>
    <View style={styles.screen}>
      <ShopHeader title="Home" />
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.grid}>
          {TILES.map(tile => (
            <Pressable
              key={tile.key}
              accessibilityRole="button"
              onPress={() => openTile(tile)}
              style={[styles.tile, {width: columns === 4 ? wp('22%') : wp('44%')}]}>
              <Text style={styles.count}>{counts[tile.key]}</Text>
              <Text style={styles.tileLabel}>{tile.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.actions}>
          <Pressable
            style={styles.action}
            onPress={() => navigation.navigate('Orders')}>
            <Text style={styles.actionText}>All orders</Text>
          </Pressable>
          <PlusButton label="Order" onPress={() => navigation.navigate('AddEditOrder')} />
        </View>
        <Text style={styles.section}>To call</Text>
        {!loading && calls.length === 0 ? <Text style={styles.empty}>No data</Text> : null}
        {calls.map(call => (
          <View key={call.key} style={styles.callCard}>
            <Pressable
              accessibilityRole="button"
              onPress={() => openCall(call)}
              style={styles.callCopy}>
              <Text style={styles.callReason}>{call.reason}</Text>
              <Text style={styles.callName}>{call.name}</Text>
              <Text style={styles.callDetail}>
                {call.detail}
                {call.phone ? ` · ${call.phone}` : ''}
              </Text>
            </Pressable>
            {call.phone ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => dial(call.phone)}
                style={styles.callButton}>
                <Text style={styles.callButtonText}>Call</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        <Text style={styles.section}>Ready for collection</Text>
        {loading && readyOrders.length === 0 ? (
          <ActivityIndicator color={colors.gold} />
        ) : null}
        {!loading && readyOrders.length === 0 ? (
          <Text style={styles.empty}>No data</Text>
        ) : null}
        {readyOrders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            meta={`Marked ready ${formatWhen(order.readyAt)}`}
            onPress={() => navigation.navigate('OrderDetails', {orderId: order.id})}
          />
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tile: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderTopColor: colors.gold,
    borderTopWidth: 3,
    borderWidth: 1,
    marginBottom: padY,
    paddingHorizontal: padX,
    paddingVertical: padY,
  },
  count: {
    color: colors.green,
    fontSize: 26,
    fontWeight: important,
  },
  tileLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: important,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap,
    marginTop: padY,
  },
  action: {
    backgroundColor: colors.green,
    borderRadius: radius,
    paddingHorizontal: padY,
    paddingVertical: spacing.sm,
  },
  actionText: {
    color: colors.cream,
    fontWeight: important,
  },
  section: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: important,
    marginBottom: padY,
    marginTop: spacing.lg,
  },
  callCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    flexDirection: 'row',
    gap,
    marginBottom: padY,
    padding: padY,
  },
  callCopy: {
    flex: 1,
  },
  callReason: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: important,
  },
  callName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: important,
    marginTop: spacing.xs,
  },
  callDetail: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  callButton: {
    borderColor: colors.green,
    borderRadius: radius,
    borderWidth: 1,
    paddingHorizontal: padY,
    paddingVertical: spacing.sm,
  },
  callButtonText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: important,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
  },
});
