import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {
  Customer,
  CustomerInput,
  FieldErrors,
  OrderInput,
  OrderPieceInput,
  ShopStackParamList,
} from '../types';
import {errorMessage, isFieldValidationError} from '../types';
import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import PlusButton from '../components/PlusButton';
import DateTimeField from '../components/DateTimeField';
import EmptyState from '../components/EmptyState';
import Screen from '../components/Screen';
import {createCustomer, listCustomers} from '../services/customerService';
import {createOrder, getOrder, saveOrder} from '../services/orderService';
import {PRODUCT_CATEGORIES} from '../utils/categories';
import {confirmAction} from '../utils/confirm';
import {formatDay, todayISO} from '../utils/dates';
import {hasFieldErrors, validateCustomer, validateOrder} from '../utils/validation';
import {ORDER_STATUSES} from '../utils/orderStatus';
import {colors} from '../theme/colors';
import {gap, radius} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {important} from '../theme/type';

const EMPTY_CUSTOMER: CustomerInput = {name: '', phone: '', address: '', notes: ''};

const EMPTY: OrderInput = {
  customerId: 0,
  itemName: '',
  description: '',
  orderDate: todayISO(),
  expectedDeliveryDate: '',
  status: 'Pending',
  employeeNotes: '',
  category: 'Necklaces',
};

const EMPTY_PIECE: OrderPieceInput = {
  itemName: '',
  category: 'Necklaces',
  description: '',
};

type Props = NativeStackScreenProps<ShopStackParamList, 'AddEditOrder'>;

export default function AddEditOrderScreen({navigation, route}: Props) {
  const orderId = route.params?.orderId;
  const [form, setForm] = useState<OrderInput>({
    ...EMPTY,
    customerId: Number(route.params?.customerId) || 0,
    itemName: route.params?.itemName || '',
    orderDate: route.params?.orderDate || todayISO(),
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState<CustomerInput>(EMPTY_CUSTOMER);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pieces, setPieces] = useState<OrderPieceInput[]>([
    {...EMPTY_PIECE, itemName: route.params?.itemName || ''},
  ]);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      try {
        const rows = listCustomers('');
        setCustomers(rows);
        if (rows.length === 0) {
          setAddingCustomer(true);
        }
      } catch (loadError: unknown) {
        setError(errorMessage(loadError, 'Customers could not be loaded.'));
      }
    }, []),
  );

  useEffect(() => {
    try {
      if (!orderId) {
        return;
      }
      const order = getOrder(orderId);
      if (!order) {
        setMissing(true);
        return;
      }
      setForm({
        customerId: order.customerId,
        itemName: order.itemName,
        description: order.description,
        orderDate: order.orderDate,
        expectedDeliveryDate: order.expectedDeliveryDate,
        status: order.status,
        employeeNotes: order.employeeNotes,
        category: order.category || 'Other',
      });
      setPieces(
        order.pieces.length
          ? order.pieces.map(piece => ({
              itemName: piece.itemName,
              category: piece.category,
              description: piece.description,
            }))
          : [
              {
                itemName: order.itemName,
                category: order.category || 'Other',
                description: order.description,
              },
            ],
      );
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, 'This order could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const update = <K extends keyof OrderInput>(key: K, value: OrderInput[K]) => {
    setForm(current => ({...current, [key]: value}));
    setFieldErrors(current => ({...current, [key]: undefined}));
  };

  const updateCustomerField = (key: keyof CustomerInput, value: string) => {
    setNewCustomer(current => ({...current, [key]: value}));
    setFieldErrors(current => ({...current, [key]: undefined}));
  };

  const chooseCustomer = (customerId: number) => {
    setAddingCustomer(false);
    update('customerId', customerId);
  };

  const changePiece = (index: number, patch: Partial<OrderPieceInput>) => {
    setPieces(current =>
      current.map((piece, pieceIndex) =>
        pieceIndex === index ? {...piece, ...patch} : piece,
      ),
    );
    setFieldErrors(current => ({...current, itemName: undefined, category: undefined}));
  };

  const askSave = () => {
    const customerErrors = addingCustomer ? validateCustomer(newCustomer) : {};
    const orderErrors = validateOrder({
      ...form,
      pieces,
      customerId: addingCustomer ? form.customerId || 1 : form.customerId,
    });
    if (addingCustomer) {
      delete orderErrors.customerId;
    }
    const fields = {...orderErrors, ...customerErrors};
    if (hasFieldErrors(fields)) {
      setFieldErrors(fields);
      return;
    }
    const customer = customers.find(item => item.id === form.customerId);
    const customerName = addingCustomer
      ? newCustomer.name.trim()
      : customer?.name || 'Customer selected';
    const customerPhone = addingCustomer ? newCustomer.phone.trim() : customer?.phone || '';
    const customerAddress = addingCustomer
      ? newCustomer.address?.trim()
      : customer?.address;
    const customerNotes = addingCustomer ? newCustomer.notes?.trim() : customer?.notes;
    confirmAction({
      title: orderId ? 'Update order' : 'Save order',
      confirmLabel: orderId ? 'Update' : 'Save',
      lines: [
        customerName,
        customerPhone,
        `Address: ${customerAddress || 'not set'}`,
        `Customer notes: ${customerNotes || 'not set'}`,
        ...pieces.map(
          (piece, index) =>
            `Piece ${index + 1}: ${piece.category} · ${piece.itemName.trim() || 'unnamed'}`,
        ),
        `Ordered: ${formatDay(form.orderDate)}`,
        `Delivery: ${form.expectedDeliveryDate ? formatDay(form.expectedDeliveryDate) : 'not set'}`,
        `Status: ${form.status}`,
        `Notes: ${form.employeeNotes?.trim() || 'not set'}`,
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
      let customerId = form.customerId;
      if (addingCustomer) {
        const created = await createCustomer(newCustomer);
        if (!created) {
          throw new Error('The customer could not be saved.');
        }
        customerId = created.id;
      }
      const order = {...form, customerId, pieces};
      if (orderId) {
        await saveOrder(orderId, order);
      } else {
        await createOrder(order);
      }
      navigation.goBack();
    } catch (saveError: unknown) {
      if (isFieldValidationError(saveError)) {
        setFieldErrors(saveError.fields);
      } else {
        setError(errorMessage(saveError, 'The order could not be saved.'));
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
        message="This order is not in the shop database."
        actionLabel="Back"
        onAction={() => navigation.goBack()}
      />
    );
  }

  const customerTerm = customerQuery.trim().toLowerCase();
  const visibleCustomers = customerTerm
    ? customers.filter(
        customer =>
          customer.name.toLowerCase().includes(customerTerm) ||
          customer.phone.toLowerCase().includes(customerTerm),
      )
    : customers.filter(customer => customer.id === form.customerId);

  return (
    <Screen>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.label}>Customer</Text>
        {addingCustomer ? (
          <View style={styles.newCustomer}>
            <AppInput
              label="Full name"
              value={newCustomer.name}
              onChangeText={value => updateCustomerField('name', value)}
              error={fieldErrors.name}
              placeholder="Customer name"
            />
            <AppInput
              label="Phone number"
              value={newCustomer.phone}
              onChangeText={value => updateCustomerField('phone', value)}
              error={fieldErrors.phone}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
            />
            <AppInput
              label="Address"
              value={newCustomer.address ?? ''}
              onChangeText={value => updateCustomerField('address', value)}
              placeholder="Optional"
              multiline
            />
            <AppInput
              label="Customer notes"
              value={newCustomer.notes ?? ''}
              onChangeText={value => updateCustomerField('notes', value)}
              placeholder="Optional"
              multiline
            />
            {customers.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setAddingCustomer(false)}
                style={styles.addCustomer}>
                <Text style={styles.addCustomerText}>Choose an existing customer</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View>
            <AppInput
              label="Find customer"
              value={customerQuery}
              onChangeText={setCustomerQuery}
              error={fieldErrors.customerId}
              placeholder="Name or phone"
              autoCapitalize="none"
            />
            {customerTerm && visibleCustomers.length === 0 ? (
              <Text style={styles.customerHint}>No customer matches that name or phone.</Text>
            ) : null}
            {visibleCustomers.map(customer => {
              const selected = form.customerId === customer.id;
              return (
                <Pressable
                  key={customer.id}
                  onPress={() => chooseCustomer(customer.id)}
                  style={[styles.customer, selected && styles.customerSelected]}>
                  <Text style={styles.customerName}>{customer.name}</Text>
                  <Text style={styles.customerPhone}>{customer.phone}</Text>
                  {selected && customer.address ? (
                    <Text style={styles.customerDetail}>{customer.address}</Text>
                  ) : null}
                  {selected && customer.notes ? (
                    <Text style={styles.customerDetail}>{customer.notes}</Text>
                  ) : null}
                </Pressable>
              );
            })}
            <PlusButton
              label="Customer"
              onPress={() => {
                setAddingCustomer(true);
                update('customerId', 0);
              }}
              style={styles.addAction}
            />
          </View>
        )}
        <View style={styles.sectionRow}>
          <Text style={styles.label}>Jewellery items</Text>
          <PlusButton
            label="Item"
            onPress={() => setPieces(current => [...current, {...EMPTY_PIECE, category: 'Earrings'}])}
          />
        </View>
        {fieldErrors.itemName ? <Text style={styles.error}>{fieldErrors.itemName}</Text> : null}
        {fieldErrors.category ? <Text style={styles.error}>{fieldErrors.category}</Text> : null}
        {pieces.map((piece, index) => (
          <View key={`piece-${index}`} style={styles.piece}>
            <Text style={styles.pieceTitle}>Piece {index + 1}</Text>
            <View style={styles.statuses}>
              {PRODUCT_CATEGORIES.map(item => {
                const selected = piece.category === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => changePiece(index, {category: item})}
                    style={[styles.chip, selected && styles.chipSelected]}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <AppInput
              label="Jewellery item"
              value={piece.itemName}
              onChangeText={value => changePiece(index, {itemName: value})}
              placeholder="Necklace, bangles, earrings"
            />
            <AppInput
              label="Design description"
              value={piece.description ?? ''}
              onChangeText={value => changePiece(index, {description: value})}
              placeholder="Optional"
              multiline
            />
            {pieces.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setPieces(current => current.filter((_, pieceIndex) => pieceIndex !== index))
                }>
                <Text style={styles.removePiece}>Delete this piece</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        <DateTimeField
          label="Order date"
          value={form.orderDate}
          onChange={value => update('orderDate', value)}
          error={fieldErrors.orderDate}
        />
        <DateTimeField
          label="Expected delivery"
          value={form.expectedDeliveryDate ?? ''}
          onChange={value => update('expectedDeliveryDate', value)}
          error={fieldErrors.expectedDeliveryDate}
          placeholder="Optional date"
          optional
        />
        <Text style={styles.label}>Status</Text>
        <View style={styles.statuses}>
          {ORDER_STATUSES.map(status => {
            const selected = form.status === status;
            return (
              <Pressable
                key={status}
                onPress={() => update('status', status)}
                style={[
                  styles.chip,
                  selected && styles.chipSelected,
                  fieldErrors.status ? styles.chipError : null,
                ]}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {status}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {fieldErrors.status ? (
          <Text style={styles.error}>{fieldErrors.status}</Text>
        ) : null}
        <AppInput
          label="Employee notes"
          value={form.employeeNotes ?? ''}
          onChangeText={value => update('employeeNotes', value)}
          placeholder="Optional"
          multiline
        />
        <AppButton
          label={saving ? 'Saving…' : orderId ? 'Update order' : 'Save order'}
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
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: important,
    marginBottom: spacing.xs,
  },
  sectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  addAction: {
    alignSelf: 'flex-start',
    marginBottom: padY,
  },
  customerHint: {
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
  customerDetail: {
    color: colors.ink,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  newCustomer: {
    marginBottom: spacing.sm,
  },
  addCustomer: {
    alignItems: 'center',
    borderColor: colors.green,
    borderRadius: radius,
    borderWidth: 1,
    marginBottom: padY,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: padY,
    paddingVertical: spacing.sm,
  },
  addCustomerText: {
    color: colors.green,
    fontSize: 15,
    fontWeight: important,
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
  chipError: {
    backgroundColor: colors.cancelledBg,
    borderColor: colors.danger,
  },
  chipText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: important,
  },
  chipTextSelected: {
    color: colors.cream,
  },
  piece: {
    marginTop: padY,
  },
  pieceTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: important,
    marginBottom: spacing.sm,
  },
  removePiece: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: important,
    marginBottom: padY,
  },
  error: {
    color: colors.danger,
    marginBottom: padY,
  },
});
