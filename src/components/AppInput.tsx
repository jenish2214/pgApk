import React, {useState, type ReactNode} from 'react';
import {StyleSheet, Text, TextInput, View, type TextInputProps} from 'react-native';
import {useLanguage} from '../i18n/LanguageProvider';
import {colors} from '../theme/colors';
import {radius} from '../theme/layout';
import {padY, spacing} from '../theme/spacing';
import {text, face} from '../theme/type';

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  placeholder?: string;
  hint?: string;
  keyboardType?: TextInputProps['keyboardType'];
  multiline?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  secureTextEntry?: boolean;
  accessory?: ReactNode;
};

const HINTS: Record<string, string> = {
  'Full name': 'Write the name.',
  'Customer name': 'Write the name.',
  'Phone number': 'Write the mobile number.',
  'Find customer': 'Type a name or a phone number.',
  'Tag number': 'Write letters and numbers, like A1001.',
  'Jewellery item': 'Write what the jewellery is called.',
  'Your category': 'Write the kind of jewellery.',
  'Shop name': "Write the other shop's name.",
  'Given by': 'Write who gives the jewellery.',
  'Received by': 'Write who takes the jewellery.',
  Quantity: 'Write how many pieces.',
  'Weight (grams)': 'Write how heavy it is.',
  Address: 'You can skip this.',
  'Customer notes': 'You can skip this.',
  'Employee notes': 'You can skip this.',
  'Design description': 'You can skip this.',
  Note: 'You can skip this.',
  Notes: 'You can skip this.',
};

export default function AppInput({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  hint,
  keyboardType,
  multiline = false,
  autoCapitalize = 'sentences',
  secureTextEntry = false,
  accessory,
}: Props) {
  const {t} = useLanguage();
  const [focused, setFocused] = useState(false);
  const help = hint ?? HINTS[label];
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, error ? styles.labelError : null]}>{t(label)}</Text>
      {help && !error ? <Text style={styles.hint}>{t(help)}</Text> : null}
      <View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ? t(placeholder) : undefined}
          placeholderTextColor={colors.muted}
          keyboardType={keyboardType}
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          secureTextEntry={secureTextEntry}
          accessibilityHint={help ? t(help) : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            multiline && styles.multiline,
            accessory ? styles.withAccessory : null,
            focused && !error ? styles.inputFocus : null,
            error ? styles.inputError : null,
          ]}
        />
        {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
      </View>
      {error ? <Text style={styles.error}>{t(error)}</Text> : null}
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
  input: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    color: colors.ink,
    fontSize: text.lead,
    fontFamily: face.regular, fontWeight: '400',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  withAccessory: {
    paddingRight: 48,
  },
  accessory: {
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    top: 0,
  },
  labelError: {
    color: colors.danger,
  },
  inputFocus: {
    backgroundColor: colors.greenSoft,
    borderColor: colors.green,
    borderWidth: 2,
  },
  inputError: {
    backgroundColor: colors.cancelledBg,
    borderColor: colors.danger,
    borderWidth: 2,
  },
  error: {
    color: colors.danger,
    fontSize: text.label,
    fontFamily: face.regular, fontWeight: '400',
    marginTop: spacing.sm,
  },
});
