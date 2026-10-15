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
import {listWindow} from '../utils/listWindow';
import {useDebouncedValue} from '../utils/useDebouncedValue';
import {showNotice} from '../utils/confirm';
import {formatDay} from '../utils/dates';
import {callCustomer} from '../utils/whatsappUtils';
import {useLanguage} from '../i18n/LanguageProvider';
import {colors} from '../theme/colors';
import {cardLift, radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important, face} from '../theme/type';

type Props = NativeStackScreenProps<ShopStackParamList, 'RepairHome'>;

export default function RepairsScreen({navigation}: Props) {
  const {t} = useLanguage();
  const [query, setQuery] = useState('');
  const settledQuery = useDebouncedValue(query);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    try {
      setRepairs(listRepairs(settledQuery));
      setError('');
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, 'Repairs could not be loaded.'));
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
        <ShopHeader
          title="Repair"
          menu
          onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        />
        <FlatList
          data={repairs}
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
                placeholder="Name, item, address, or kind"
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
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('AddEditRepair', {repairId: item.id})}
              style={({pressed}) => [styles.card, pressed && styles.pressed]}>
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
                  {piece.itemName} · {t(piece.repairKind)} · {t(piece.metal)}
                  {piece.weight ? ` · ${piece.weight} g` : ''}
                  {piece.details ? `\n${piece.details}` : ''}
                </Text>
              ))}
              <Text style={styles.meta}>{item.address || t('No data')}</Text>
              <Text style={styles.meta}>
                {t('Received {date}', {date: formatDay(item.receivedDate)})}
              </Text>
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
                  <Text style={styles.callText}>{t('Call')}</Text>
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
    ...cardLift,
  },
  pressed: {
    opacity: 0.86,
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
    fontFamily: face.important, fontWeight: '400',
    marginRight: spacing.sm,
  },
  status: {
    color: colors.green,
    fontSize: 12,
    fontFamily: face.important, fontWeight: '400',
  },
  item: {
    color: colors.ink,
    fontSize: 15,
    fontFamily: face.important, fontWeight: '400',
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
    fontFamily: face.important, fontWeight: '400',
  },
});
