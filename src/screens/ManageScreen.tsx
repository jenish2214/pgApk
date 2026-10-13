import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {ShopStackParamList} from '../types';
import {errorMessage} from '../types';
import React, {useCallback, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import DeskAlertCard from '../components/DeskAlertCard';
import TabIcon, {type DeskIconName} from '../components/TabIcon';
import Screen from '../components/Screen';
import ShopHeader from '../components/ShopHeader';
import {listInquiries} from '../services/inquiryService';
import {getDashboard, listOrders} from '../services/orderService';
import {listRepairs} from '../services/repairService';
import {deskAlerts, type DeskAlert} from '../utils/deskAlerts';
import {colors} from '../theme/colors';
import {radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important} from '../theme/type';

type ManageScreenName = 'ReadyHome' | 'InquiryHome' | 'RepairHome' | 'Orders';
type CountKey = 'ready' | 'inquiries' | 'repairs' | 'orders';

type ManageOption = {
  key: CountKey;
  title: string;
  detail: string;
  screen: ManageScreenName;
  icon: DeskIconName;
};

const OPTIONS: ManageOption[] = [
  {
    key: 'orders',
    title: 'Orders',
    detail: 'Pending, preparing, and ready',
    screen: 'Orders',
    icon: 'Orders',
  },
  {
    key: 'ready',
    title: 'Ready',
    detail: 'Waiting for the customer',
    screen: 'ReadyHome',
    icon: 'Ready',
  },
  {
    key: 'inquiries',
    title: 'Inquiry',
    detail: 'Still deciding',
    screen: 'InquiryHome',
    icon: 'Inquiry',
  },
  {
    key: 'repairs',
    title: 'Repair',
    detail: 'Open in the workshop',
    screen: 'RepairHome',
    icon: 'Repair',
  },
];

const EMPTY_COUNTS: Record<CountKey, number> = {
  ready: 0,
  inquiries: 0,
  repairs: 0,
  orders: 0,
};

type Props = NativeStackScreenProps<ShopStackParamList, 'ManageHome'>;

export default function ManageScreen({navigation}: Props) {
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [alert, setAlert] = useState<DeskAlert | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    try {
      const desk = getDashboard().counts;
      const orders = listOrders();
      const inquiries = listInquiries();
      setCounts({
        ready: desk.ready,
        inquiries: inquiries.filter(item => item.status === 'Waiting').length,
        repairs: listRepairs().filter(item => item.status !== 'Returned').length,
        orders: desk.pending + desk.preparing + desk.ready,
      });
      setAlert(deskAlerts(orders, inquiries)[0] ?? null);
      setError('');
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, 'The shop options could not be loaded.'));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openAlert = () => {
    if (!alert) {
      return;
    }
    if (alert.orderId) {
      navigation.navigate('OrderDetails', {orderId: alert.orderId});
      return;
    }
    if (alert.inquiryId) {
      navigation.navigate('AddEditInquiry', {inquiryId: alert.inquiryId});
      return;
    }
    navigation.navigate('ReadyHome');
  };

  return (
    <Screen>
      <View style={styles.screen}>
        <ShopHeader title="Manage" />
        <ScrollView contentContainerStyle={styles.content}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {alert ? (
            <View style={styles.block}>
              <Text style={styles.section}>Attention</Text>
              <DeskAlertCard
                tone={alert.tone}
                title={alert.title}
                detail={alert.detail}
                onPress={openAlert}
              />
            </View>
          ) : null}
          <Text style={styles.section}>Shop work</Text>
          <View style={styles.panel}>
            {OPTIONS.map((option, index) => {
              const count = counts[option.key];
              return (
                <Pressable
                  key={option.key}
                  accessibilityRole="button"
                  accessibilityLabel={count > 0 ? `${option.title}, ${count}` : option.title}
                  onPress={() => navigation.navigate(option.screen)}
                  style={({pressed}) => [
                    styles.row,
                    index > 0 && styles.rowLine,
                    pressed && styles.rowPressed,
                  ]}>
                  <View style={styles.icon}>
                    <TabIcon name={option.icon} color={colors.green} />
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.title}>{option.title}</Text>
                    <Text style={styles.detail}>{option.detail}</Text>
                  </View>
                  <Text style={count > 0 ? styles.count : styles.countQuiet}>{count}</Text>
                  <View style={styles.chevron} />
                </Pressable>
              );
            })}
          </View>
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
  block: {
    marginBottom: spacing.sm,
  },
  section: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: important,
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
  },
  panel: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: padY,
    paddingVertical: padY,
  },
  rowLine: {
    borderTopColor: colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowPressed: {
    backgroundColor: colors.cream,
  },
  icon: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  copy: {
    flex: 1,
    marginLeft: padY,
    minWidth: 0,
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: important,
  },
  detail: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  count: {
    color: colors.green,
    fontSize: 18,
    fontWeight: important,
    marginLeft: spacing.sm,
    minWidth: 24,
    textAlign: 'right',
  },
  countQuiet: {
    color: colors.muted,
    fontSize: 18,
    fontWeight: important,
    marginLeft: spacing.sm,
    minWidth: 24,
    textAlign: 'right',
  },
  chevron: {
    borderColor: colors.muted,
    borderRightWidth: 1.5,
    borderTopWidth: 1.5,
    height: 8,
    marginLeft: spacing.sm,
    transform: [{rotate: '45deg'}],
    width: 8,
  },
});
