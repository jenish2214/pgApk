import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {Order, ShopStackParamList} from '../types';
import {errorMessage} from '../types';
import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AppInput from '../components/AppInput';
import EmptyState from '../components/EmptyState';
import PlusButton from '../components/PlusButton';
import Screen from '../components/Screen';
import OrderCard from '../components/OrderCard';
import {listOrders} from '../services/orderService';
import {PRODUCT_CATEGORIES} from '../utils/categories';
import {employeeAlerts, type EmployeeAlert} from '../utils/orderAlerts';
import {ORDER_STATUSES} from '../utils/orderStatus';
import {useLanguage} from '../i18n/LanguageProvider';
import {colors} from '../theme/colors';
import {gap, radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important} from '../theme/type';

type Props = NativeStackScreenProps<ShopStackParamList, 'Orders'>;

function alertDetail(
  detail: string,
  t: (source: string, values?: Record<string, string | number>) => string,
): string {
  const collect = detail.match(/^(.*) can collect (.*)\. (.*)$/);
  if (collect) {
    return t('{who} can collect {piece}. {number}', {
      who: collect[1],
      piece: collect[2],
      number: collect[3],
    });
  }
  const late = detail.match(/^(.*), (.*), was due (.*)\. (.*)$/);
  if (late) {
    return t('{who}, {piece}, was due {due}. {number}', {
      who: late[1],
      piece: late[2],
      due: late[3],
      number: late[4],
    });
  }
  const due = detail.match(/^(.*), (.*), is expected today\. (.*)$/);
  if (due) {
    return t('{who}, {piece}, is expected today. {number}', {
      who: due[1],
      piece: due[2],
      number: due[3],
    });
  }
  return t(detail);
}

export default function OrdersScreen({navigation, route}: Props) {
  const {t} = useLanguage();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(route.params?.status || '');
  const [category, setCategory] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [alerts, setAlerts] = useState<EmployeeAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (route.params?.status) {
      setStatus(route.params.status);
      navigation.setParams({status: ''});
    }
  }, [navigation, route.params?.status]);

  const load = useCallback(() => {
    setLoading(true);
    try {
      setOrders(listOrders(query, status, category));
      setAlerts(employeeAlerts(listOrders()));
      setError('');
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, 'Orders could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [category, query, status]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen>
    <View style={styles.screen}>
      <FlatList
        data={orders}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <AppInput
              label="Search"
              value={query}
              onChangeText={setQuery}
              placeholder="Order number, item, or customer"
              autoCapitalize="none"
            />
            <View style={styles.filters}>
              {['', ...ORDER_STATUSES].map(item => {
                const selected = status === item;
                return (
                  <Pressable
                    key={item || 'all'}
                    onPress={() => setStatus(item)}
                    style={[styles.chip, selected && styles.chipSelected]}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {t(item || 'All')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.filterLabel}>{t('Category')}</Text>
            <View style={styles.filters}>
              {['', ...PRODUCT_CATEGORIES].map(item => {
                const selected = category === item;
                return (
                  <Pressable
                    key={item || 'all-categories'}
                    onPress={() => setCategory(item)}
                    style={[styles.chip, selected && styles.chipSelected]}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {t(item || 'All jewellery')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {alerts.slice(0, 3).map(alert => (
              <Pressable
                accessibilityRole="button"
                key={`${alert.orderId}-${alert.title}`}
                onPress={() => navigation.navigate('OrderDetails', {orderId: alert.orderId})}
                style={styles.alert}>
                <Text style={styles.alertTitle}>{t(alert.title)}</Text>
                <Text style={styles.alertDetail}>{alertDetail(alert.detail, t)}</Text>
              </Pressable>
            ))}
            {error ? <Text style={styles.error}>{t(error)}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.green} />
          ) : (
            <EmptyState title="No data" message="No data" />
          )
        }
        renderItem={({item}) => (
          <OrderCard
            order={item}
            onPress={() => navigation.navigate('OrderDetails', {orderId: item.id})}
          />
        )}
      />
      <PlusButton floating label="Order" onPress={() => navigation.navigate('AddEditOrder')} />
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
    paddingBottom: 88,
    paddingHorizontal: padX,
    paddingTop: padY,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap,
    marginBottom: padY,
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
  filterLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: important,
    marginBottom: spacing.sm,
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
    fontSize: 14,
    fontWeight: important,
  },
  alertDetail: {
    color: colors.ink,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  error: {
    color: colors.danger,
    marginBottom: padY,
  },
});
