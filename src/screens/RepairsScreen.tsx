import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {Repair, ShopStackParamList} from '../types';
import {errorMessage} from '../types';
import React, {useCallback, useState} from 'react';
import {ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AppInput from '../components/AppInput';
import EmptyState from '../components/EmptyState';
import PlusButton from '../components/PlusButton';
import Screen from '../components/Screen';
import ShopHeader from '../components/ShopHeader';
import {listRepairs} from '../services/repairService';
import {showNotice} from '../utils/confirm';
import {formatDay} from '../utils/dates';
import {callCustomer} from '../utils/whatsappUtils';
import {colors} from '../theme/colors';
import {radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important} from '../theme/type';

type Props = NativeStackScreenProps<ShopStackParamList, 'RepairHome'>;

export default function RepairsScreen({navigation}: Props) {
  const [query, setQuery] = useState('');
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    try {
      setRepairs(listRepairs(query));
      setError('');
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, 'Repairs could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen>
      <View style={styles.screen}>
        <ShopHeader
          title="Repair"
          onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        />
        <FlatList
          data={repairs}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              <AppInput
                label="Search"
                value={query}
                onChangeText={setQuery}
                placeholder="Name, item, address, or kind"
                autoCapitalize="none"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
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
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('AddEditRepair', {repairId: item.id})}
              style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.name}>{item.customerName}</Text>
                <Text style={styles.status}>{item.status}</Text>
              </View>
              {(item.pieces.length
                ? item.pieces
                : [
                    {
                      itemName: item.itemName,
                      weight: item.weight,
                      metal: item.metal,
                      repairKind: item.repairKind,
                      details: item.details,
                    },
                  ]
              ).map((piece, index) => (
                <Text key={`${item.id}-${index}`} style={styles.item}>
                  {piece.itemName} · {piece.repairKind} · {piece.metal}
                  {piece.weight ? ` · ${piece.weight} g` : ''}
                  {piece.details ? `\n${piece.details}` : ''}
                </Text>
              ))}
              <Text style={styles.meta}>{item.address || 'No data'}</Text>
              <Text style={styles.meta}>Received {formatDay(item.receivedDate)}</Text>
              {item.phone ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    callCustomer(item.phone).catch((callError: unknown) => {
                      showNotice({
                        title: 'Pragati Gold',
                        message: errorMessage(callError, 'The customer could not be called.'),
                      });
                    });
                  }}
                  style={styles.call}>
                  <Text style={styles.callText}>Call</Text>
                </Pressable>
              ) : null}
            </Pressable>
          )}
        />
        <PlusButton
          floating
          label="Repair"
          onPress={() => navigation.navigate('AddEditRepair')}
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
  card: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    marginBottom: padY,
    padding: padY,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  name: {
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: important,
    marginRight: spacing.sm,
  },
  status: {
    color: colors.green,
    fontSize: 12,
    fontWeight: important,
  },
  item: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: important,
    marginTop: spacing.xs,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  details: {
    color: colors.ink,
    fontSize: 14,
    marginTop: spacing.sm,
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
});
