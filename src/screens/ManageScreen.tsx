import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {ShopStackParamList} from '../types';
import {errorMessage} from '../types';
import React, {useCallback, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import TabIcon, {type DeskIconName} from '../components/TabIcon';
import Screen from '../components/Screen';
import ShopHeader from '../components/ShopHeader';
import {listInquiries} from '../services/inquiryService';
import {getDashboard} from '../services/orderService';
import {listRepairs} from '../services/repairService';
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
    key: 'ready',
    title: 'Ready',
    detail: 'Pieces waiting for collection',
    screen: 'ReadyHome',
    icon: 'Ready',
  },
  {
    key: 'inquiries',
    title: 'Inquiry',
    detail: 'Jewellery the customer is considering',
    screen: 'InquiryHome',
    icon: 'Inquiry',
  },
  {
    key: 'repairs',
    title: 'Repair',
    detail: 'Jobs still in the workshop',
    screen: 'RepairHome',
    icon: 'Repair',
  },
  {
    key: 'orders',
    title: 'Orders',
    detail: 'Open orders on the desk',
    screen: 'Orders',
    icon: 'Orders',
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
  const [error, setError] = useState('');

  const load = useCallback(() => {
    try {
      const desk = getDashboard().counts;
      setCounts({
        ready: desk.ready,
        inquiries: listInquiries().filter(item => item.status === 'Waiting').length,
        repairs: listRepairs().filter(item => item.status !== 'Returned').length,
        orders: desk.pending + desk.preparing + desk.ready,
      });
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

  return (
    <Screen>
      <View style={styles.screen}>
        <ShopHeader title="Manage" />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.lead}>Ready, inquiry, repair, and orders.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {OPTIONS.map(option => {
            const count = counts[option.key];
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityLabel={
                  count > 0 ? `${option.title}, ${count}` : option.title
                }
                onPress={() => navigation.navigate(option.screen)}
                style={styles.card}>
                <View style={styles.icon}>
                  <TabIcon name={option.icon} color={colors.green} />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.title}>{option.title}</Text>
                  <Text style={styles.detail}>{option.detail}</Text>
                </View>
                <Text style={styles.count}>{count}</Text>
              </Pressable>
            );
          })}
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
  lead: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: padY,
  },
  error: {
    color: colors.danger,
    marginBottom: padY,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderTopColor: colors.gold,
    borderTopWidth: 3,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: padY,
    paddingHorizontal: padY,
    paddingVertical: padY,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: radius,
    height: 40,
    justifyContent: 'center',
    width: 40,
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
    marginTop: spacing.xs,
  },
  count: {
    color: colors.green,
    fontSize: 22,
    fontWeight: important,
    marginLeft: spacing.sm,
    minWidth: 28,
    textAlign: 'right',
  },
});
