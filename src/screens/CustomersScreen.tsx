import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {Customer, ShopStackParamList} from '../types';
import {errorMessage} from '../types';
import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AppInput from '../components/AppInput';
import CustomerCard from '../components/CustomerCard';
import EmptyState from '../components/EmptyState';
import PlusButton from '../components/PlusButton';
import Screen from '../components/Screen';
import ShopHeader from '../components/ShopHeader';
import {listCustomers} from '../services/customerService';
import {listWindow} from '../utils/listWindow';
import {useDebouncedValue} from '../utils/useDebouncedValue';
import {useLanguage} from '../i18n/LanguageProvider';
import {colors} from '../theme/colors';
import {padX, padY} from '../theme/spacing';

type Props = NativeStackScreenProps<ShopStackParamList, 'CustomersHome'>;

export default function CustomersScreen({navigation}: Props) {
  const {t} = useLanguage();
  const [query, setQuery] = useState('');
  const settledQuery = useDebouncedValue(query);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    try {
      setCustomers(listCustomers(settledQuery));
      setError('');
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, 'Customers could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [settledQuery]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen>
    <View style={styles.screen}>
      <ShopHeader title="Customers" menu />
      <FlatList
        data={customers}
        keyExtractor={item => String(item.id)}
        {...listWindow}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <AppInput
              label="Search"
              value={query}
              onChangeText={setQuery}
              placeholder="Name or phone number"
              autoCapitalize="none"
            />
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
          <CustomerCard
            customer={item}
            onPress={() =>
              navigation.navigate('CustomerDetails', {customerId: item.id})
            }
          />
        )}
      />
      <PlusButton
        floating
        label="Customer"
        onPress={() => navigation.navigate('AddEditCustomer')}
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
    paddingBottom: 88,
    paddingHorizontal: padX,
    paddingTop: padY,
  },
  error: {
    color: colors.danger,
    marginBottom: padY,
  },
});
