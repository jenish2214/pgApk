import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {
  Customer,
  Inquiry,
  Order,
  Repair,
  ShopStackParamList,
} from '../types';
import {errorMessage} from '../types';
import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AppButton from '../components/AppButton';
import EmptyState from '../components/EmptyState';
import PlusButton from '../components/PlusButton';
import Screen from '../components/Screen';
import {getCustomer, getCustomerOrders, removeCustomer} from '../services/customerService';
import {listCustomerInquiries} from '../services/inquiryService';
import {listCustomerRepairs} from '../services/repairService';
import {customerHistory} from '../utils/customerHistory';
import {confirmAction, showNotice} from '../utils/confirm';
import {formatDay} from '../utils/dates';
import {buildShopMessage, callCustomer, openWhatsApp} from '../utils/whatsappUtils';
import {categoryImage} from '../utils/categories';
import {colors} from '../theme/colors';
import {gap, radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important} from '../theme/type';

type Props = NativeStackScreenProps<ShopStackParamList, 'CustomerDetails'>;

export default function CustomerDetailsScreen({navigation, route}: Props) {
  const customerId = route.params?.customerId;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    try {
      const record = getCustomer(customerId);
      setCustomer(record);
      setOrders(record ? getCustomerOrders(record.id) : []);
      setInquiries(record ? listCustomerInquiries(record.id) : []);
      setRepairs(record ? listCustomerRepairs(record.id) : []);
      setError('');
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, 'This customer could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const contactPhone = async (phone: string) => {
    try {
      await callCustomer(phone);
    } catch (contactError: unknown) {
      showNotice({
        title: 'Pragati Gold',
        message: errorMessage(contactError, 'The customer could not be called.'),
      });
    }
  };

  const contact = async (action: 'call' | 'whatsapp') => {
    if (!customer) {
      return;
    }
    try {
      if (action === 'call') {
        await callCustomer(customer.phone);
        return;
      }
      await openWhatsApp(customer.phone, buildShopMessage(customer.name));
    } catch (contactError: unknown) {
      showNotice({
        title: 'Pragati Gold',
        message: errorMessage(contactError, 'The customer could not be contacted.'),
      });
    }
  };

  const confirmDelete = () => {
    if (!customer) {
      return;
    }
    confirmAction({
      title: 'Delete customer',
      confirmLabel: 'Delete',
      destructive: true,
      lines: [
        customer.name,
        customer.phone,
        `Address: ${customer.address || 'not set'}`,
        `Notes: ${customer.notes || 'not set'}`,
        `Added: ${formatDay(customer.createdAt)}`,
        'Only possible when this customer has no orders.',
      ],
      onConfirm: async () => {
        try {
          await removeCustomer(customer.id);
          navigation.goBack();
        } catch (deleteError: unknown) {
          showNotice({
            title: 'Customer kept',
            message: errorMessage(deleteError, 'The customer was kept.'),
          });
        }
      },
    });
  };

  const history = customerHistory(orders, inquiries, repairs);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  if (!customer) {
    return (
      <EmptyState
        title="No data"
        message={error || 'This record is not in the shop database.'}
        actionLabel="Back"
        onAction={() => navigation.goBack()}
      />
    );
  }

  return (
    <Screen>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.name}>{customer.name}</Text>
      <Text style={styles.phone}>{customer.phone}</Text>
      <Text style={styles.meta}>Customer since {formatDay(customer.createdAt)}</Text>
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Address</Text>
        <Text style={styles.infoValue}>{customer.address || 'No data'}</Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Notes</Text>
        <Text style={styles.infoValue}>{customer.notes || 'No data'}</Text>
      </View>
      <View style={styles.row}>
        <AppButton
          label="Call"
          variant="secondary"
          onPress={() => contact('call')}
          style={styles.half}
        />
        <AppButton
          label="WhatsApp"
          variant="secondary"
          onPress={() => contact('whatsapp')}
          style={styles.half}
        />
      </View>
      <View style={styles.stack}>
        <AppButton
          label="Edit customer"
          onPress={() =>
            navigation.navigate('AddEditCustomer', {customerId: customer.id})
          }
        />
        <View style={styles.sectionRow}>
          <PlusButton
            label="Order"
            onPress={() => navigation.navigate('AddEditOrder', {customerId: customer.id})}
          />
          <PlusButton
            label="Inquiry"
            onPress={() => navigation.navigate('AddEditInquiry', {customerId: customer.id})}
          />
          <PlusButton
            label="Repair"
            onPress={() => navigation.navigate('AddEditRepair', {customerId: customer.id})}
          />
        </View>
      </View>
      <Text style={styles.section}>History by date</Text>
      {history.length === 0 ? (
        <Text style={styles.empty}>No data</Text>
      ) : (
        history.map((entry, index, rows) => {
          const showDay = index === 0 || rows[index - 1].day !== entry.day;
          return (
            <View key={entry.key}>
              {showDay ? (
                <Text style={styles.day}>{formatDay(entry.day) || 'Date not set'}</Text>
              ) : null}
              <View style={styles.history}>
                {entry.imageUri ? (
                  <Image source={{uri: entry.imageUri}} style={styles.historyPhoto} />
                ) : (
                  <Image source={categoryImage(entry.category || 'Other')} style={styles.historyPhoto} />
                )}
                <View style={styles.historyCopy}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      if (entry.orderId) {
                        navigation.navigate('OrderDetails', {orderId: entry.orderId});
                        return;
                      }
                      if (entry.inquiryId) {
                        navigation.navigate('AddEditInquiry', {inquiryId: entry.inquiryId});
                        return;
                      }
                      if (entry.repairId) {
                        navigation.navigate('AddEditRepair', {repairId: entry.repairId});
                      }
                    }}>
                    <Text style={styles.historyTitle}>{entry.title}</Text>
                    {entry.lines.map(line => (
                      <Text key={line} style={styles.historyDetail}>
                        {line}
                      </Text>
                    ))}
                  </Pressable>
                  {entry.phone ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => contactPhone(entry.phone)}
                      style={styles.call}>
                      <Text style={styles.callText}>Call</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          );
        })
      )}
      <AppButton
        label="Delete customer"
        variant="danger"
        onPress={confirmDelete}
        style={styles.delete}
      />
    </ScrollView>
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
  center: {
    alignItems: 'center',
    backgroundColor: colors.ivory,
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: important,
  },
  phone: {
    color: colors.green,
    fontSize: 18,
    fontWeight: important,
    marginTop: spacing.xs,
  },
  meta: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
  day: {
    color: colors.green,
    fontSize: 13,
    fontWeight: important,
    marginTop: padY,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    marginTop: padY,
    paddingHorizontal: padX,
    paddingVertical: padY,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: important,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  infoValue: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: important,
    marginTop: spacing.xs,
  },
  history: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    flexDirection: 'row',
    gap: padY,
    marginTop: spacing.sm,
    padding: padY,
  },
  historyPhoto: {
    borderRadius: radius,
    height: 56,
    width: 56,
  },
  historyCopy: {
    flex: 1,
  },
  historyTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: important,
  },
  historyDetail: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  call: {
    alignSelf: 'flex-start',
    borderColor: colors.green,
    borderRadius: radius,
    borderWidth: 1,
    marginTop: padY,
    paddingHorizontal: padY,
    paddingVertical: spacing.sm,
  },
  callText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: important,
  },
  block: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
    marginTop: padY,
  },
  row: {
    flexDirection: 'row',
    gap,
    marginTop: padY,
  },
  half: {
    flex: 1,
  },
  stack: {
    gap,
    marginTop: gap,
  },
  sectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap,
  },
  delete: {
    marginTop: gap,
  },
  section: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: important,
    marginBottom: padY,
    marginTop: spacing.lg,
  },
  empty: {
    color: colors.muted,
  },
});
