import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {Jangad, JangadStatus, ShopStackParamList} from '../types';
import {errorMessage} from '../types';
import React, {useCallback, useState} from 'react';
import {ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AppInput from '../components/AppInput';
import EmptyState from '../components/EmptyState';
import PlusButton from '../components/PlusButton';
import Screen from '../components/Screen';
import ShopHeader from '../components/ShopHeader';
import {jangadQuantity, listJangads, returnJangad} from '../services/jangadService';
import {listWindow} from '../utils/listWindow';
import {useDebouncedValue} from '../utils/useDebouncedValue';
import {confirmAction} from '../utils/confirm';
import {formatDay} from '../utils/dates';
import {useLanguage} from '../i18n/LanguageProvider';
import {colors} from '../theme/colors';
import {cardLift, gap, radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important, face} from '../theme/type';

type Props = NativeStackScreenProps<ShopStackParamList, 'JangadHome'>;

export default function JangadsScreen({navigation}: Props) {
  const {t} = useLanguage();
  const [query, setQuery] = useState('');
  const settledQuery = useDebouncedValue(query);
  const [status, setStatus] = useState<'' | JangadStatus>('');
  const [jangads, setJangads] = useState<Jangad[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(0);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    try {
      setJangads(listJangads(settledQuery, status));
      setError('');
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, 'Jangad slips could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [settledQuery, status]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const recordReturn = (item: Jangad) => {
    if (savingId) {
      return;
    }
    confirmAction({
      title: 'Return jangad',
      confirmLabel: 'Return',
      lines: [
        item.shopName,
        ...item.pieces.map(piece => `${piece.itemName} · ${piece.tagNumber} · ${piece.quantity}`),
        t('Total {count}', {count: jangadQuantity(item)}),
      ],
      onConfirm: () => {
        setSavingId(item.id);
        returnJangad(item.id)
          .then(() => {
            setError('');
            load();
          })
          .catch((returnError: unknown) => {
            setError(errorMessage(returnError, 'The jangad could not be saved.'));
          })
          .finally(() => setSavingId(0));
      },
    });
  };

  return (
    <Screen>
      <View style={styles.screen}>
        <ShopHeader
          title="Jangad"
          menu
        />
        <FlatList
          data={jangads}
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
                placeholder="Shop, name, or tag"
                autoCapitalize="none"
              />
              <View style={styles.filters}>
                {[
                  {key: '', label: 'All'},
                  {key: 'Given', label: 'Pending'},
                  {key: 'Returned', label: 'Returned'},
                ].map(item => {
                  const selected = status === item.key;
                  return (
                    <Pressable
                      key={item.label}
                      onPress={() => setStatus(item.key as '' | JangadStatus)}
                      style={[styles.chip, selected && styles.chipSelected]}>
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {t(item.label)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
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
          renderItem={({item}) => {
            const total = jangadQuantity(item);
            const pending = item.status === 'Given';
            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('AddEditJangad', {jangadId: item.id})}
                style={({pressed}) => [styles.card, pressed && styles.pressed]}>
                <View style={styles.row}>
                  <Text style={styles.name}>{item.shopName}</Text>
                  <Text style={pending ? styles.status : styles.statusQuiet}>
                    {t(pending ? 'Pending' : item.status)}
                  </Text>
                </View>
                {item.pieces.map(piece => (
                  <Text key={piece.id} style={styles.item}>
                    {piece.itemName}
                    {piece.tagNumber ? ` · ${piece.tagNumber}` : ''} · {piece.quantity}
                  </Text>
                ))}
                <Text style={styles.meta}>{t('Total {count}', {count: total})}</Text>
                <Text style={styles.meta}>
                  {t('Given by')}: {item.givenBy}
                </Text>
                <Text style={styles.meta}>
                  {t('Received by')}: {item.receivedBy}
                </Text>
                {item.moves.map(move => (
                  <Text key={move.id} style={styles.meta}>
                    {t(move.direction)} · {move.quantity} · {formatDay(move.movedAt)}
                  </Text>
                ))}
                {pending ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={savingId === item.id}
                    onPress={() => recordReturn(item)}
                    style={styles.returnButton}>
                    <Text style={styles.returnText}>
                      {savingId === item.id ? t('Saving…') : t('Return')}
                    </Text>
                  </Pressable>
                ) : null}
              </Pressable>
            );
          }}
        />
        <PlusButton
          floating
          label="Jangad"
          onPress={() => navigation.navigate('AddEditJangad')}
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
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap,
    marginBottom: padY,
  },
  chip: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
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
    fontFamily: face.important, fontWeight: '400',
  },
  chipTextSelected: {
    color: colors.cream,
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
  statusQuiet: {
    color: colors.muted,
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
  returnButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.green,
    borderRadius: radius,
    marginTop: spacing.sm,
    paddingHorizontal: padY,
    paddingVertical: spacing.sm,
  },
  returnText: {
    color: colors.cream,
    fontSize: 13,
    fontFamily: face.important, fontWeight: '400',
  },
});
