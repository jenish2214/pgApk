import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {Customer, FieldErrors, RepairInput, RepairPieceInput, ShopStackParamList} from '../types';
import {REPAIR_KINDS, REPAIR_METALS, REPAIR_STATUSES, errorMessage, isFieldValidationError} from '../types';
import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AppButton from '../components/AppButton';
import PlusButton from '../components/PlusButton';
import AppInput from '../components/AppInput';
import DateTimeField from '../components/DateTimeField';
import EmptyState from '../components/EmptyState';
import Screen from '../components/Screen';
import {listCustomers} from '../services/customerService';
import {createRepair, getRepair, saveRepair} from '../services/repairService';
import {confirmAction} from '../utils/confirm';
import {formatDay, todayISO} from '../utils/dates';
import {hasFieldErrors, validateRepair} from '../utils/validation';
import {colors} from '../theme/colors';
import {gap, radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important} from '../theme/type';

const EMPTY: RepairInput = {
  customerId: null,
  customerName: '',
  phone: '',
  address: '',
  itemName: '',
  weight: '',
  metal: 'Gold',
  repairKind: 'Polish',
  details: '',
  receivedDate: todayISO(),
  status: 'Received',
};

const EMPTY_PIECE: RepairPieceInput = {
  itemName: '',
  weight: '',
  metal: 'Gold',
  repairKind: 'Polish',
  details: '',
};

type Props = NativeStackScreenProps<ShopStackParamList, 'AddEditRepair'>;

export default function AddEditRepairScreen({navigation, route}: Props) {
  const repairId = route.params?.repairId;
  const [form, setForm] = useState<RepairInput>(EMPTY);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(Boolean(repairId));
  const [saving, setSaving] = useState(false);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');
  const [pieces, setPieces] = useState<RepairPieceInput[]>([{...EMPTY_PIECE}]);

  useFocusEffect(
    useCallback(() => {
      try {
        setCustomers(listCustomers(''));
      } catch (loadError: unknown) {
        setError(errorMessage(loadError, 'Customers could not be loaded.'));
      }
    }, []),
  );

  useEffect(() => {
    if (!repairId) {
      if (route.params?.customerId) {
        const match = listCustomers('').find(item => item.id === route.params?.customerId);
        if (match) {
          setForm(current => ({
            ...current,
            customerId: match.id,
            customerName: match.name,
            phone: match.phone,
            address: match.address,
          }));
        }
      }
      setLoading(false);
      return;
    }
    try {
      const repair = getRepair(repairId);
      if (!repair) {
        setMissing(true);
        return;
      }
      setForm({
        customerId: repair.customerId,
        customerName: repair.customerName,
        phone: repair.phone,
        address: repair.address,
        itemName: repair.itemName,
        weight: repair.weight,
        metal: repair.metal,
        repairKind: repair.repairKind,
        details: repair.details,
        receivedDate: repair.receivedDate,
        status: repair.status,
      });
      setPieces(
        repair.pieces.length
          ? repair.pieces.map(piece => ({
              itemName: piece.itemName,
              weight: piece.weight,
              metal: piece.metal,
              repairKind: piece.repairKind,
              details: piece.details,
            }))
          : [{...EMPTY_PIECE}],
      );
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, 'This repair could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [repairId, route.params?.customerId]);

  const update = <K extends keyof RepairInput>(key: K, value: RepairInput[K]) => {
    setForm(current => ({...current, [key]: value}));
    setFieldErrors(current => ({...current, [key]: undefined}));
  };

  const changePiece = (index: number, patch: Partial<RepairPieceInput>) => {
    setPieces(current =>
      current.map((piece, pieceIndex) =>
        pieceIndex === index ? {...piece, ...patch} : piece,
      ),
    );
    setFieldErrors(current => ({
      ...current,
      itemName: undefined,
      weight: undefined,
      metal: undefined,
      repairKind: undefined,
    }));
  };

  const askSave = () => {
    const fields = validateRepair({...form, pieces});
    if (hasFieldErrors(fields)) {
      setFieldErrors(fields);
      return;
    }
    confirmAction({
      title: repairId ? 'Update repair' : 'Save repair',
      confirmLabel: repairId ? 'Update' : 'Save',
      lines: [
        form.customerName.trim(),
        form.phone?.trim() || 'No phone number',
        `Address: ${form.address?.trim() || 'not set'}`,
        ...pieces.map(
          (piece, index) =>
            `Piece ${index + 1}: ${piece.itemName.trim() || 'unnamed'} · ${piece.weight.trim() || '0'} g · ${piece.metal} · ${piece.repairKind}`,
        ),
        `Received: ${formatDay(form.receivedDate)}`,
        form.status,
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
      const repair = {...form, pieces};
      if (repairId) {
        await saveRepair(repairId, repair);
      } else {
        await createRepair(repair);
      }
      navigation.goBack();
    } catch (saveError: unknown) {
      if (isFieldValidationError(saveError)) {
        setFieldErrors(saveError.fields);
      } else {
        setError(errorMessage(saveError, 'The repair could not be saved.'));
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
        message="This repair is not in the shop records."
        actionLabel="Back"
        onAction={() => navigation.goBack()}
      />
    );
  }

  const term = customerQuery.trim().toLowerCase();
  const matches = term
    ? customers.filter(
        customer =>
          customer.name.toLowerCase().includes(term) ||
          customer.phone.toLowerCase().includes(term),
      )
    : [];

  return (
    <Screen>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppInput
          label="Find customer"
          value={customerQuery}
          onChangeText={setCustomerQuery}
          placeholder="Type a name or phone"
          autoCapitalize="none"
        />
        {matches.map(customer => (
          <Pressable
            key={customer.id}
            accessibilityRole="button"
            onPress={() => {
              setForm(current => ({
                ...current,
                customerId: customer.id,
                customerName: customer.name,
                phone: customer.phone,
                address: customer.address,
              }));
              setCustomerQuery('');
            }}
            style={styles.customer}>
            <Text style={styles.customerName}>{customer.name}</Text>
            <Text style={styles.customerPhone}>{customer.phone}</Text>
          </Pressable>
        ))}
        <AppInput
          label="Customer name"
          value={form.customerName}
          onChangeText={value => update('customerName', value)}
          error={fieldErrors.customerName}
        />
        <AppInput
          label="Phone number"
          value={form.phone ?? ''}
          onChangeText={value => update('phone', value)}
          error={fieldErrors.phone}
          keyboardType="phone-pad"
          placeholder="Optional"
        />
        <AppInput
          label="Address"
          value={form.address ?? ''}
          onChangeText={value => update('address', value)}
          placeholder="Shop or home address"
          multiline
        />
        <View style={styles.sectionRow}>
          <Text style={styles.label}>Jewellery items</Text>
          <PlusButton
            label="Item"
            onPress={() => setPieces(current => [...current, {...EMPTY_PIECE}])}
          />
        </View>
        {fieldErrors.itemName ? <Text style={styles.error}>{fieldErrors.itemName}</Text> : null}
        {fieldErrors.weight ? <Text style={styles.error}>{fieldErrors.weight}</Text> : null}
        {pieces.map((piece, index) => (
          <View key={`piece-${index}`} style={styles.piece}>
            <Text style={styles.pieceTitle}>Piece {index + 1}</Text>
            <AppInput
              label="Jewellery item"
              value={piece.itemName}
              onChangeText={value => changePiece(index, {itemName: value})}
              placeholder="Chain, ring, bangles"
            />
            <AppInput
              label="Weight (grams)"
              value={piece.weight}
              onChangeText={value => changePiece(index, {weight: value})}
              keyboardType="decimal-pad"
              placeholder="12.50"
            />
            <Text style={styles.label}>Metal</Text>
            <View style={styles.chips}>
              {REPAIR_METALS.map(metal => {
                const selected = piece.metal === metal;
                return (
                  <Pressable
                    key={metal}
                    onPress={() => changePiece(index, {metal})}
                    style={[styles.chip, selected && styles.chipSelected]}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {metal}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.label}>Kind of repair</Text>
            <View style={styles.chips}>
              {REPAIR_KINDS.map(kind => {
                const selected = piece.repairKind === kind;
                return (
                  <Pressable
                    key={kind}
                    onPress={() => changePiece(index, {repairKind: kind})}
                    style={[styles.chip, selected && styles.chipSelected]}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {kind}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <AppInput
              label="Repair details"
              value={piece.details ?? ''}
              onChangeText={value => changePiece(index, {details: value})}
              placeholder="What needs to be done"
              multiline
            />
            {pieces.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setPieces(current => current.filter((_, pieceIndex) => pieceIndex !== index))
                }>
                <Text style={styles.remove}>Delete this piece</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        <DateTimeField
          label="Received date"
          value={form.receivedDate}
          onChange={value => update('receivedDate', value)}
          error={fieldErrors.receivedDate}
        />
        <Text style={styles.label}>Status</Text>
        <View style={styles.chips}>
          {REPAIR_STATUSES.map(status => {
            const selected = form.status === status;
            return (
              <Pressable
                key={status}
                onPress={() => update('status', status)}
                style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{status}</Text>
              </Pressable>
            );
          })}
        </View>
        <AppButton
          label={saving ? 'Saving…' : repairId ? 'Update repair' : 'Save repair'}
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
  customer: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    marginBottom: padY,
    paddingHorizontal: padX,
    paddingVertical: padY,
  },
  customerName: {
    color: colors.ink,
    fontWeight: important,
  },
  customerPhone: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: important,
    marginBottom: spacing.sm,
  },
  chips: {
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
    fontWeight: important,
    marginBottom: spacing.sm,
  },
  remove: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: important,
    marginBottom: spacing.sm,
  },
});
