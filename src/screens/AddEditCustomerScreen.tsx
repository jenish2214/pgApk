import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {CustomerInput, FieldErrors, ShopStackParamList} from '../types';
import {errorMessage, isFieldValidationError} from '../types';
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, Text, View} from 'react-native';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import EmptyState from '../components/EmptyState';
import Screen from '../components/Screen';
import {createCustomer, getCustomer, saveCustomer} from '../services/customerService';
import {confirmAction} from '../utils/confirm';
import {hasFieldErrors, validateCustomer} from '../utils/validation';
import {useLanguage} from '../i18n/LanguageProvider';
import {colors} from '../theme/colors';
import {padX, padY, spacing} from '../theme/spacing';

const EMPTY = {name: '', phone: '', address: '', notes: ''};

type Props = NativeStackScreenProps<ShopStackParamList, 'AddEditCustomer'>;

export default function AddEditCustomerScreen({navigation, route}: Props) {
  const {t} = useLanguage();
  const customerId = route.params?.customerId;
  const [form, setForm] = useState<CustomerInput>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(Boolean(customerId));
  const [saving, setSaving] = useState(false);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!customerId) {
      return;
    }
    try {
      const customer = getCustomer(customerId);
      if (!customer) {
        setMissing(true);
        return;
      }
      setForm({
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        notes: customer.notes,
      });
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, 'This customer could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const update = (key: keyof CustomerInput, value: string) => {
    setForm(current => ({...current, [key]: value}));
    setFieldErrors(current => ({...current, [key]: undefined}));
  };

  const askSave = () => {
    const fields = validateCustomer(form);
    if (hasFieldErrors(fields)) {
      setFieldErrors(fields);
      return;
    }
    confirmAction({
      title: customerId ? 'Update customer' : 'Save customer',
      confirmLabel: customerId ? 'Update' : 'Save',
      lines: [
        form.name.trim(),
        form.phone.trim(),
        `Address: ${form.address?.trim() || 'not set'}`,
        `Notes: ${form.notes?.trim() || 'not set'}`,
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
      if (customerId) {
        await saveCustomer(customerId, form);
      } else {
        await createCustomer(form);
      }
      navigation.goBack();
    } catch (saveError: unknown) {
      if (isFieldValidationError(saveError)) {
        setFieldErrors(saveError.fields);
      } else {
        setError(errorMessage(saveError, 'The customer could not be saved.'));
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
        message="This record is not in the shop database."
        actionLabel="Back"
        onAction={() => navigation.goBack()}
      />
    );
  }

  return (
    <Screen>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{t(error)}</Text> : null}
        <AppInput
          label="Full name"
          value={form.name}
          onChangeText={value => update('name', value)}
          error={fieldErrors.name}
          placeholder="Customer name"
        />
        <AppInput
          label="Phone number"
          value={form.phone}
          onChangeText={value => update('phone', value)}
          error={fieldErrors.phone}
          placeholder="10-digit mobile number"
          keyboardType="phone-pad"
        />
        <AppInput
          label="Address"
          value={form.address ?? ''}
          onChangeText={value => update('address', value)}
          placeholder="Optional"
          multiline
        />
        <AppInput
          label="Notes"
          value={form.notes ?? ''}
          onChangeText={value => update('notes', value)}
          placeholder="Optional"
          multiline
        />
        <AppButton
          label={saving ? 'Saving…' : customerId ? 'Update customer' : 'Save customer'}
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
});
