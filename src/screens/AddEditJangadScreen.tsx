import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {FieldErrors, JangadInput, JangadMoveInput, JangadPieceInput, ShopStackParamList} from '../types';
import {JANGAD_DIRECTIONS, errorMessage, isFieldValidationError} from '../types';
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import DateTimeField from '../components/DateTimeField';
import EmptyState from '../components/EmptyState';
import PlusButton from '../components/PlusButton';
import Screen from '../components/Screen';
import {createJangad, getJangad, saveJangad} from '../services/jangadService';
import {confirmAction} from '../utils/confirm';
import {formatDay, nowDateTime} from '../utils/dates';
import {formatTagNumber} from '../utils/tags';
import {hasFieldErrors, validateJangad} from '../utils/validation';
import {useLanguage} from '../i18n/LanguageProvider';
import {colors} from '../theme/colors';
import {gap, radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important, face} from '../theme/type';

const EMPTY: JangadInput = {
  shopName: '',
  givenBy: '',
  receivedBy: '',
  handedAt: nowDateTime(),
  note: '',
  status: 'Given',
};

function pieceCount(pieces: JangadPieceInput[]): number {
  const total = pieces.reduce((sum, piece) => sum + (Number(piece.quantity) || 0), 0);
  return total > 0 ? total : 1;
}

function stillOut(moves: JangadMoveInput[]): boolean {
  const balance = moves.reduce((sum, move) => {
    const quantity = Number(move.quantity) || 0;
    return sum + (move.direction === 'Entry' ? -quantity : quantity);
  }, 0);
  return balance > 0;
}

type Props = NativeStackScreenProps<ShopStackParamList, 'AddEditJangad'>;

export default function AddEditJangadScreen({navigation, route}: Props) {
  const {t} = useLanguage();
  const jangadId = route.params?.jangadId;
  const [form, setForm] = useState<JangadInput>(EMPTY);
  const [pieces, setPieces] = useState<JangadPieceInput[]>(() => [
    {tagNumber: '', itemName: '', quantity: 1},
  ]);
  const [moves, setMoves] = useState<JangadMoveInput[]>(() => [
    {direction: 'Exit', quantity: 1, movedAt: nowDateTime(), note: ''},
  ]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(Boolean(jangadId));
  const [saving, setSaving] = useState(false);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!jangadId) {
      setLoading(false);
      return;
    }
    try {
      const jangad = getJangad(jangadId);
      if (!jangad) {
        setMissing(true);
        return;
      }
      setForm({
        shopName: jangad.shopName,
        givenBy: jangad.givenBy,
        receivedBy: jangad.receivedBy,
        handedAt: jangad.handedAt,
        note: jangad.note,
        status: jangad.status,
      });
      const loadedPieces = jangad.pieces.length
        ? jangad.pieces.map(piece => ({
            tagNumber: piece.tagNumber,
            itemName: piece.itemName,
            quantity: piece.quantity || 1,
          }))
        : [{tagNumber: '', itemName: '', quantity: 1}];
      setPieces(loadedPieces);
      setMoves(
        jangad.moves.length
          ? jangad.moves.map(move => ({
              direction: move.direction,
              quantity: move.quantity,
              movedAt: move.movedAt,
              note: move.note,
            }))
          : [{direction: 'Exit', quantity: pieceCount(loadedPieces), movedAt: jangad.handedAt, note: ''}],
      );
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, 'This jangad could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [jangadId]);

  const update = <K extends keyof JangadInput>(key: K, value: JangadInput[K]) => {
    setForm(current => ({...current, [key]: value}));
    setFieldErrors(current => ({...current, [key]: undefined}));
  };

  const changePiece = (index: number, patch: Partial<JangadPieceInput>) => {
    setPieces(current =>
      current.map((piece, pieceIndex) =>
        pieceIndex === index ? {...piece, ...patch} : piece,
      ),
    );
    setFieldErrors(current => ({...current, itemName: undefined, tagNumber: undefined, quantity: undefined}));
  };

  const changeMove = (index: number, patch: Partial<JangadMoveInput>) => {
    setMoves(current =>
      current.map((move, moveIndex) => (moveIndex === index ? {...move, ...patch} : move)),
    );
    setFieldErrors(current => ({
      ...current,
      direction: undefined,
      quantity: undefined,
      movedAt: undefined,
    }));
  };

  const askSave = () => {
    const fields = validateJangad({...form, pieces, moves, status: stillOut(moves) ? 'Given' : 'Returned'});
    if (hasFieldErrors(fields)) {
      setFieldErrors(fields);
      return;
    }
    confirmAction({
      title: jangadId ? 'Update jangad' : 'Save jangad',
      confirmLabel: jangadId ? 'Update' : 'Save',
      lines: [
        form.shopName.trim(),
        `Given by: ${form.givenBy.trim()}`,
        `Received by: ${form.receivedBy.trim()}`,
        ...pieces.map(
          (piece, index) =>
            `Piece ${index + 1}: ${piece.itemName.trim()}${
              formatTagNumber(piece.tagNumber) ? ` · ${formatTagNumber(piece.tagNumber)}` : ''
            } · ${piece.quantity}`,
        ),
        ...moves.map(
          move => `${move.direction}: ${move.quantity} · ${formatDay(move.movedAt)}`,
        ),
        formatDay(form.handedAt),
        stillOut(moves) ? 'Given' : 'Returned',
      ],
      onConfirm: () => {
        save();
      },
    });
  };

  const save = async () => {
    if (saving) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      const jangad = {...form, pieces, moves, status: stillOut(moves) ? 'Given' as const : 'Returned' as const};
      if (jangadId) {
        await saveJangad(jangadId, jangad);
      } else {
        await createJangad(jangad);
      }
      navigation.goBack();
    } catch (saveError: unknown) {
      if (isFieldValidationError(saveError)) {
        setFieldErrors(saveError.fields);
      } else {
        setError(errorMessage(saveError, 'The jangad could not be saved.'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  if (missing) {
    return (
      <EmptyState
        title="No data"
        message="This jangad is not in the shop records."
        actionLabel="Back"
        onAction={() => navigation.goBack()}
      />
    );
  }

  return (
    <Screen>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{t(error)}</Text> : null}
        <AppInput
          label="Shop name"
          value={form.shopName}
          onChangeText={value => update('shopName', value)}
          error={fieldErrors.shopName}
          placeholder="Other shop"
        />
        <AppInput
          label="Given by"
          value={form.givenBy}
          onChangeText={value => update('givenBy', value)}
          error={fieldErrors.givenBy}
          placeholder="Who gives the jewellery"
        />
        <AppInput
          label="Received by"
          value={form.receivedBy}
          onChangeText={value => update('receivedBy', value)}
          error={fieldErrors.receivedBy}
          placeholder="Who receives the jewellery"
        />
        <DateTimeField
          label="Date and time"
          value={form.handedAt}
          onChange={value => update('handedAt', value)}
          error={fieldErrors.handedAt}
          placeholder="Choose date and time"
          withTime
        />
        <View style={styles.sectionRow}>
          <Text style={styles.label}>{t('Jewellery items')}</Text>
          <PlusButton
            label="Item"
            onPress={() =>
              setPieces(current => [
                ...current,
                {tagNumber: '', itemName: '', quantity: 1},
              ])
            }
          />
        </View>
        {fieldErrors.itemName ? <Text style={styles.error}>{t(fieldErrors.itemName)}</Text> : null}
        {fieldErrors.tagNumber ? <Text style={styles.error}>{t(fieldErrors.tagNumber)}</Text> : null}
        {fieldErrors.quantity ? <Text style={styles.error}>{t(fieldErrors.quantity)}</Text> : null}
        {pieces.map((piece, index) => (
          <View key={`piece-${index}`} style={styles.piece}>
            <Text style={styles.pieceTitle}>{t('Piece {number}', {number: index + 1})}</Text>
            <AppInput
              label="Jewellery item"
              value={piece.itemName}
              onChangeText={value => changePiece(index, {itemName: value})}
              placeholder="Necklace, bangles, ring"
            />
            <AppInput
              label="Tag number"
              value={piece.tagNumber}
              onChangeText={value => changePiece(index, {tagNumber: formatTagNumber(value)})}
              autoCapitalize="characters"
              placeholder="Optional"
            />
            <AppInput
              label="Quantity"
              value={piece.quantity ? String(piece.quantity) : ''}
              onChangeText={value => changePiece(index, {quantity: Number(value.replace(/\D/g, '')) || 0})}
              keyboardType="number-pad"
              placeholder="23"
            />
            {pieces.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setPieces(current => current.filter((_, pieceIndex) => pieceIndex !== index))
                }>
                <Text style={styles.remove}>{t('Delete this piece')}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        <Text style={styles.meta}>
          {t('Total {count}', {
            count: pieces.reduce((sum, piece) => sum + (Number(piece.quantity) || 0), 0),
          })}
        </Text>
        <AppInput
          label="Note"
          value={form.note ?? ''}
          onChangeText={value => update('note', value)}
          placeholder="Optional"
          multiline
        />
        <View style={styles.sectionRow}>
          <Text style={styles.label}>{t('Entry and exit')}</Text>
          <PlusButton
            label="Movement"
            onPress={() =>
              setMoves(current => [
                ...current,
                {
                  direction: 'Entry',
                  quantity: pieceCount(pieces),
                  movedAt: nowDateTime(),
                  note: '',
                },
              ])
            }
          />
        </View>
        {fieldErrors.direction ? <Text style={styles.error}>{t(fieldErrors.direction)}</Text> : null}
        {fieldErrors.movedAt ? <Text style={styles.error}>{t(fieldErrors.movedAt)}</Text> : null}
        <Text style={styles.meta}>{t(stillOut(moves) ? 'Given' : 'Returned')}</Text>
        {moves.map((move, index) => (
          <View key={`move-${index}`} style={styles.piece}>
            <Text style={styles.pieceTitle}>{t('Movement {number}', {number: index + 1})}</Text>
            <View style={styles.chips}>
              {JANGAD_DIRECTIONS.map(direction => {
                const selected = move.direction === direction;
                return (
                  <Pressable
                    key={direction}
                    onPress={() => changeMove(index, {direction})}
                    style={[styles.chip, selected && styles.chipSelected]}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {t(direction)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <AppInput
              label="Quantity"
              value={move.quantity ? String(move.quantity) : ''}
              onChangeText={value =>
                changeMove(index, {quantity: Number(value.replace(/\D/g, '')) || 0})
              }
              keyboardType="number-pad"
              placeholder="23"
            />
            <DateTimeField
              label="Date and time"
              value={move.movedAt}
              onChange={value => changeMove(index, {movedAt: value})}
              placeholder="Choose date and time"
              withTime
            />
            {moves.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setMoves(current => current.filter((_, moveIndex) => moveIndex !== index))}>
                <Text style={styles.remove}>{t('Delete this movement')}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        <AppButton
          label={saving ? 'Saving…' : jangadId ? 'Update jangad' : 'Save jangad'}
          onPress={askSave}
          disabled={saving}
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
  error: {
    color: colors.danger,
    marginBottom: padY,
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontFamily: face.important, fontWeight: '400',
    marginBottom: spacing.sm,
  },
  chips: {
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
  sectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  piece: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    marginBottom: padY,
    padding: padY,
  },
  pieceTitle: {
    color: colors.ink,
    fontSize: 15,
    fontFamily: face.important, fontWeight: '400',
    marginBottom: spacing.sm,
  },
  remove: {
    color: colors.danger,
    fontSize: 14,
    fontFamily: face.important, fontWeight: '400',
    marginBottom: spacing.sm,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: face.important, fontWeight: '400',
    marginBottom: padY,
  },
});
