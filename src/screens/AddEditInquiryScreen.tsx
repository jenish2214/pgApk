import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {
  Customer,
  FieldErrors,
  InquiryInput,
  InquiryPieceInput,
  InquiryStatus,
  ShopStackParamList,
} from '../types';
import {INQUIRY_STATUSES, errorMessage, isFieldValidationError} from '../types';
import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AppButton from '../components/AppButton';
import PlusButton from '../components/PlusButton';
import PlusIcon from '../components/PlusIcon';
import AppInput from '../components/AppInput';
import DateTimeField from '../components/DateTimeField';
import EmptyState from '../components/EmptyState';
import Screen from '../components/Screen';
import {listCustomers} from '../services/customerService';
import {createInquiry, getInquiry, saveInquiry, shopTagNumbers} from '../services/inquiryService';
import {pickShopImage} from '../utils/pickImage';
import {nextTagNumber} from '../utils/tags';
import {confirmAction} from '../utils/confirm';
import {formatDay, tomorrowISO} from '../utils/dates';
import {hasFieldErrors, validateInquiry} from '../utils/validation';
import {colors} from '../theme/colors';
import {gap, radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important} from '../theme/type';

const STATUS_LABEL: Record<InquiryStatus, string> = {
  Waiting: 'Waiting',
  Bought: 'Bought',
  Closed: 'Closed',
};

const EMPTY_PIECE = (tagNumber: string): InquiryPieceInput => ({
  tagNumber,
  itemName: '',
  imageUri: '',
});

const EMPTY: InquiryInput = {
  customerId: null,
  customerName: '',
  phone: '',
  itemName: '',
  note: '',
  followUpDate: tomorrowISO(),
  status: 'Waiting',
};

type Props = NativeStackScreenProps<ShopStackParamList, 'AddEditInquiry'>;

export default function AddEditInquiryScreen({navigation, route}: Props) {
  const inquiryId = route.params?.inquiryId;
  const [form, setForm] = useState<InquiryInput>({
    ...EMPTY,
    customerId: route.params?.customerId || null,
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(Boolean(inquiryId));
  const [saving, setSaving] = useState(false);
  const [pieces, setPieces] = useState<InquiryPieceInput[]>([EMPTY_PIECE('1001')]);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');

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
    if (!inquiryId) {
      if (route.params?.customerId) {
        const match = listCustomers('').find(item => item.id === route.params?.customerId);
        if (match) {
          setForm(current => ({
            ...current,
            customerId: match.id,
            customerName: match.name,
            phone: match.phone,
          }));
        }
      }
      setPieces([EMPTY_PIECE(nextTagNumber(shopTagNumbers()))]);
      setLoading(false);
      return;
    }
    try {
      const inquiry = getInquiry(inquiryId);
      if (!inquiry) {
        setMissing(true);
        return;
      }
      setForm({
        customerId: inquiry.customerId,
        customerName: inquiry.customerName,
        phone: inquiry.phone,
        itemName: inquiry.itemName,
        note: inquiry.note,
        followUpDate: inquiry.followUpDate,
        status: inquiry.status,
      });
      setPieces(
        inquiry.pieces.length
          ? inquiry.pieces.map(piece => ({
              tagNumber: piece.tagNumber,
              itemName: piece.itemName,
              imageUri: piece.imageUri,
            }))
          : [EMPTY_PIECE(nextTagNumber(shopTagNumbers()))],
      );
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, 'This inquiry could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [inquiryId, route.params?.customerId]);

  const update = <K extends keyof InquiryInput>(key: K, value: InquiryInput[K]) => {
    setForm(current => ({...current, [key]: value}));
    setFieldErrors(current => ({...current, [key]: undefined}));
  };

  const chooseCustomer = (customer: Customer) => {
    setForm(current => ({
      ...current,
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
    }));
    setCustomerQuery('');
    setFieldErrors(current => ({
      ...current,
      customerName: undefined,
      phone: undefined,
    }));
  };

  const changePiece = (index: number, patch: Partial<InquiryPieceInput>) => {
    setPieces(current =>
      current.map((piece, pieceIndex) =>
        pieceIndex === index ? {...piece, ...patch} : piece,
      ),
    );
    setFieldErrors(current => ({...current, itemName: undefined}));
  };

  const addPiece = () => {
    setPieces(current => [
      ...current,
      EMPTY_PIECE(nextTagNumber([...shopTagNumbers(), ...current.map(piece => piece.tagNumber)])),
    ]);
  };

  const attachImage = async (index: number) => {
    try {
      const uri = await pickShopImage();
      if (uri) {
        changePiece(index, {imageUri: uri});
      }
    } catch (pickError: unknown) {
      setError(errorMessage(pickError, 'The photo could not be added.'));
    }
  };

  const askSave = () => {
    const fields = validateInquiry({...form, pieces});
    if (hasFieldErrors(fields)) {
      setFieldErrors(fields);
      return;
    }
    confirmAction({
      title: inquiryId ? 'Update inquiry' : 'Save inquiry',
      confirmLabel: inquiryId ? 'Update' : 'Save',
      lines: [
        form.customerName.trim(),
        form.phone?.trim() || 'No phone number',
        ...pieces.map(
          piece => `Tag ${piece.tagNumber || '—'}: ${piece.itemName.trim() || 'unnamed'}`,
        ),
        `Follow-up: ${formatDay(form.followUpDate)}`,
        STATUS_LABEL[form.status],
        form.note?.trim() ? `Note: ${form.note.trim()}` : 'Note: not set',
      ],
      onConfirm: () => {
        save();
      },
    });
  };

  const save = async (next: InquiryInput = {...form, pieces}) => {
    if (saving) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (inquiryId) {
        await saveInquiry(inquiryId, next);
      } else {
        await createInquiry(next);
      }
      navigation.goBack();
    } catch (saveError: unknown) {
      if (isFieldValidationError(saveError)) {
        setFieldErrors(saveError.fields);
      } else {
        setError(errorMessage(saveError, 'The inquiry could not be saved.'));
      }
    } finally {
      setSaving(false);
    }
  };

  const setStatus = (status: InquiryStatus) => {
    const next = {...form, pieces, status};
    const fields = validateInquiry(next);
    if (hasFieldErrors(fields)) {
      setFieldErrors(fields);
      update('status', status);
      return;
    }
    confirmAction({
      title: status === 'Bought' ? 'Mark as bought' : 'Close inquiry',
      confirmLabel: status === 'Bought' ? 'Bought' : 'Close',
      lines: [
        form.customerName.trim(),
        form.itemName.trim(),
        `From: ${STATUS_LABEL[form.status]}`,
        `To: ${STATUS_LABEL[status]}`,
      ],
      onConfirm: () => {
        update('status', status);
        save(next);
      },
    });
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
        message="This inquiry is not in the shop records."
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
        {term && matches.length === 0 ? (
          <Text style={styles.hint}>No saved customer matches. Enter the name below.</Text>
        ) : null}
        {matches.map(customer => (
          <Pressable
            key={customer.id}
            onPress={() => chooseCustomer(customer)}
            style={[
              styles.customer,
              form.customerId === customer.id && styles.customerSelected,
            ]}>
            <Text style={styles.customerName}>{customer.name}</Text>
            <Text style={styles.customerPhone}>{customer.phone}</Text>
          </Pressable>
        ))}
        <AppInput
          label="Customer name"
          value={form.customerName}
          onChangeText={value => {
            setForm(current => ({...current, customerName: value, customerId: null}));
            setFieldErrors(current => ({...current, customerName: undefined}));
          }}
          error={fieldErrors.customerName}
          placeholder="Who looked at the jewellery"
        />
        <AppInput
          label="Phone number"
          value={form.phone ?? ''}
          onChangeText={value => update('phone', value)}
          error={fieldErrors.phone}
          placeholder="Optional, 10-digit mobile"
          keyboardType="phone-pad"
        />
        <View style={styles.sectionRow}>
          <Text style={styles.label}>Jewellery</Text>
          <PlusButton label="Item" onPress={addPiece} />
        </View>
        {fieldErrors.itemName ? <Text style={styles.error}>{fieldErrors.itemName}</Text> : null}
        {pieces.map((piece, index) => (
          <View key={`piece-${index}`} style={styles.piece}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add photo"
              onPress={() => attachImage(index)}
              style={styles.photo}>
              {piece.imageUri ? (
                <Image source={{uri: piece.imageUri}} style={styles.photoImage} />
              ) : (
                <PlusIcon color={colors.green} />
              )}
            </Pressable>
            <View style={styles.pieceFields}>
              <AppInput
                label="Tag number"
                value={piece.tagNumber}
                onChangeText={value => changePiece(index, {tagNumber: value})}
                keyboardType="number-pad"
              />
              <AppInput
                label="Jewellery item"
                value={piece.itemName}
                onChangeText={value => changePiece(index, {itemName: value})}
                placeholder="Necklace, bangles, ring"
              />
              {pieces.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    setPieces(current => current.filter((_, pieceIndex) => pieceIndex !== index))
                  }>
                  <Text style={styles.remove}>Delete piece</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
        <DateTimeField
          label="Follow-up date"
          value={form.followUpDate}
          onChange={value => update('followUpDate', value)}
          error={fieldErrors.followUpDate}
        />
        <AppInput
          label="Note"
          value={form.note ?? ''}
          onChangeText={value => update('note', value)}
          placeholder="Optional"
          multiline
        />
        <Text style={styles.label}>Decision</Text>
        <View style={styles.statuses}>
          {INQUIRY_STATUSES.map(status => {
            const selected = form.status === status;
            return (
              <Pressable
                key={status}
                onPress={() => update('status', status)}
                style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {STATUS_LABEL[status]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <AppButton
          label={saving ? 'Saving…' : inquiryId ? 'Update inquiry' : 'Save inquiry'}
          onPress={askSave}
          disabled={saving}
        />
        {inquiryId && form.customerId ? (
          <AppButton
            label="Start order"
            variant="secondary"
            onPress={() =>
              navigation.navigate('AddEditOrder', {
                customerId: form.customerId || undefined,
                itemName: pieces[0]?.itemName || form.itemName,
              })
            }
            style={styles.follow}
          />
        ) : null}
        {inquiryId && form.status === 'Waiting' ? (
          <View style={styles.followRow}>
            <AppButton
              label="Mark bought"
              variant="secondary"
              onPress={() => setStatus('Bought')}
              style={styles.half}
            />
            <AppButton
              label="Close"
              variant="secondary"
              onPress={() => setStatus('Closed')}
              style={styles.half}
            />
          </View>
        ) : null}
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
  hint: {
    color: colors.muted,
    fontSize: 14,
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
  customerSelected: {
    borderColor: colors.gold,
    borderWidth: 2,
  },
  customerName: {
    color: colors.ink,
    fontWeight: important,
  },
  customerPhone: {
    color: colors.muted,
    fontWeight: important,
    marginTop: spacing.xs,
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: important,
    marginBottom: spacing.xs,
  },
  statuses: {
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
  follow: {
    marginTop: gap,
  },
  followRow: {
    flexDirection: 'row',
    gap,
    marginTop: gap,
  },
  half: {
    flex: 1,
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
    flexDirection: 'row',
    gap: padY,
    marginBottom: padY,
    padding: padY,
  },
  photo: {
    alignItems: 'center',
    backgroundColor: colors.ivory,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 72,
  },
  photoImage: {
    height: 72,
    width: 72,
  },
  pieceFields: {
    flex: 1,
  },
  remove: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: important,
    marginBottom: spacing.sm,
  },
});
