import DateTimePicker from '@react-native-community/datetimepicker';
import React, {useRef, useState} from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {formatDateTimeValue, formatDateValue, formatDay, parseShopDate} from '../utils/dates';
import {useLanguage} from '../i18n/LanguageProvider';
import {colors} from '../theme/colors';
import {gap, radius} from '../theme/layout';
import {padY, spacing} from '../theme/spacing';
import {text, face} from '../theme/type';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  optional?: boolean;
  withTime?: boolean;
};

export default function DateTimeField({
  label,
  value,
  onChange,
  error,
  placeholder = 'Tap to choose the day',
  optional = false,
  withTime = false,
}: Props) {
  const {t} = useLanguage();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'date' | 'time'>('date');
  const openingTime = useRef(false);
  const [draft, setDraft] = useState(() => new Date());

  const show = () => {
    setDraft(parseShopDate(value) ?? new Date());
    setStep('date');
    setOpen(true);
  };

  const close = () => setOpen(false);

  const commit = (date: Date) => {
    onChange(withTime ? formatDateTimeValue(date) : formatDateValue(date));
    close();
  };

  const onAndroidChange = (_event: unknown, selected: Date) => {
    if (withTime && step === 'date') {
      const next = new Date(draft);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      openingTime.current = true;
      setDraft(next);
      setStep('time');
      return;
    }
    if (step === 'time') {
      const next = new Date(draft);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      commit(next);
      return;
    }
    commit(selected);
  };

  const help = withTime
    ? 'Tap to choose the day and time.'
    : optional
      ? 'Tap to choose the day. You can skip this.'
      : 'Tap to choose the day.';

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, error ? styles.labelError : null]}>{t(label)}</Text>
      {error ? null : <Text style={styles.hint}>{t(help)}</Text>}
      <Pressable
        accessibilityRole="button"
        accessibilityHint={t(help)}
        onPress={show}
        style={[styles.field, error ? styles.fieldError : null]}>
        <Text
          style={
            value
              ? [styles.value, error ? styles.valueError : null]
              : [styles.placeholder, error ? styles.valueError : null]
          }>
          {value ? formatDay(value) : t(placeholder)}
        </Text>
        <Text style={styles.tap}>{t('Tap')}</Text>
      </Pressable>
      {optional && value ? (
        <Pressable accessibilityRole="button" onPress={() => onChange('')} hitSlop={8}>
          <Text style={styles.clear}>{t('Clear date')}</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={styles.error}>{t(error)}</Text> : null}
      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          key={step}
          value={draft}
          mode={step === 'time' ? 'time' : 'date'}
          onValueChange={onAndroidChange}
          onDismiss={() => {
            if (openingTime.current) {
              openingTime.current = false;
              return;
            }
            close();
          }}
        />
      ) : null}
      {open && Platform.OS === 'ios' ? (
        <Modal transparent animationType="fade" onRequestClose={close}>
          <View style={styles.backdrop}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>{t(label)}</Text>
              <DateTimePicker
                value={draft}
                mode={withTime ? 'datetime' : 'date'}
                display="spinner"
                onValueChange={(_event, selected) => setDraft(selected)}
              />
              <View style={styles.sheetActions}>
                <Pressable onPress={close} style={styles.sheetButton}>
                  <Text style={styles.cancel}>{t('Cancel')}</Text>
                </Pressable>
                <Pressable onPress={() => commit(draft)} style={styles.sheetButton}>
                  <Text style={styles.done}>{t('Done')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: padY,
  },
  label: {
    color: colors.ink,
    fontSize: text.section,
    fontFamily: face.important, fontWeight: '400',
    marginBottom: spacing.xs,
  },
  hint: {
    color: colors.muted,
    fontSize: text.meta,
    fontFamily: face.regular, fontWeight: '400',
    marginBottom: spacing.sm,
  },
  field: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  labelError: {
    color: colors.danger,
  },
  fieldError: {
    backgroundColor: colors.cancelledBg,
    borderColor: colors.danger,
    borderWidth: 2,
  },
  valueError: {
    color: colors.danger,
  },
  value: {
    color: colors.ink,
    flex: 1,
    fontSize: text.lead,
    fontFamily: face.regular, fontWeight: '400',
  },
  placeholder: {
    color: colors.muted,
    flex: 1,
    fontSize: text.lead,
    fontFamily: face.regular, fontWeight: '400',
  },
  tap: {
    backgroundColor: colors.greenSoft,
    borderRadius: radius,
    color: colors.green,
    fontSize: text.meta,
    fontFamily: face.important, fontWeight: '400',
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clear: {
    color: colors.green,
    fontSize: text.meta,
    fontFamily: face.important, fontWeight: '400',
    marginTop: spacing.xs,
  },
  error: {
    color: colors.danger,
    fontSize: text.label,
    fontFamily: face.regular, fontWeight: '400',
    marginTop: spacing.sm,
  },
  backdrop: {
    backgroundColor: 'rgba(10, 40, 32, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius,
    borderTopRightRadius: radius,
    padding: padY,
  },
  sheetTitle: {
    color: colors.ink,
    fontSize: text.section,
    fontFamily: face.important, fontWeight: '400',
    textAlign: 'center',
  },
  sheetActions: {
    flexDirection: 'row',
    gap,
    justifyContent: 'space-between',
    marginTop: padY,
  },
  sheetButton: {
    borderRadius: radius,
    paddingHorizontal: padY,
    paddingVertical: spacing.sm,
  },
  cancel: {
    color: colors.muted,
    fontSize: text.body,
    fontFamily: face.important, fontWeight: '400',
  },
  done: {
    color: colors.green,
    fontSize: text.body,
    fontFamily: face.important, fontWeight: '400',
  },
});
