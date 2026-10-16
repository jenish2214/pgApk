import React, {useState, type ReactNode, type Ref} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
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
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  editable?: boolean;
  maxLength?: number;
  inputRef?: Ref<InputHandle>;
};

export type InputHandle = React.ComponentRef<typeof TextInput>;

const SKIP = 'You can skip this.';

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
  Address: SKIP,
  'Customer notes': SKIP,
  'Employee notes': SKIP,
  'Design description': SKIP,
  Note: SKIP,
  Notes: SKIP,
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
  returnKeyType,
  onSubmitEditing,
  autoComplete,
  textContentType,
  editable = true,
  maxLength,
  inputRef,
}: Props) {
  const {t} = useLanguage();
  const [focused, setFocused] = useState(false);
  const help = hint ?? HINTS[label];
  const optional = help === SKIP;
  const shownHint = optional ? undefined : help;
  const canClear =
    editable && focused && !accessory && !multiline && !secureTextEntry && value.length > 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, error ? styles.labelError : null]}>{t(label)}</Text>
        {optional ? (
          <View style={styles.optional}>
            <Text style={styles.optionalText}>{t('Optional')}</Text>
          </View>
        ) : null}
      </View>
      {shownHint && !error ? <Text style={styles.hint}>{t(shownHint)}</Text> : null}
      <View>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ? t(placeholder) : undefined}
          placeholderTextColor={colors.muted}
          keyboardType={keyboardType}
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          secureTextEntry={secureTextEntry}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          {...(autoComplete ? {autoComplete} : null)}
          {...(textContentType ? {textContentType} : null)}
          editable={editable}
          maxLength={maxLength}
          accessibilityHint={help ? t(help) : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            multiline && styles.multiline,
            canClear || accessory ? styles.withSide : null,
            focused && !error ? styles.inputFocus : null,
            error ? styles.inputError : null,
            editable ? null : styles.inputLocked,
          ]}
        />
        {canClear ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Clear')}
            hitSlop={8}
            onPress={() => onChangeText('')}
            style={styles.side}>
            <View style={styles.clear}>
              <Text style={styles.clearText}>×</Text>
            </View>
          </Pressable>
        ) : null}
        {accessory ? <View style={styles.side}>{accessory}</View> : null}
      </View>
      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <View style={styles.errorDot}>
            <Text style={styles.errorDotText}>!</Text>
          </View>
          <Text style={styles.error}>{t(error)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: padY,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  label: {
    color: colors.ink,
    flexShrink: 1,
    fontSize: text.section,
    fontFamily: face.important, fontWeight: '400',
  },
  labelError: {
    color: colors.danger,
  },
  optional: {
    backgroundColor: colors.ivory,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  optionalText: {
    color: colors.muted,
    fontSize: text.small,
    fontFamily: face.regular, fontWeight: '400',
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
    borderWidth: 1.5,
    color: colors.ink,
    fontSize: text.lead,
    fontFamily: face.regular, fontWeight: '400',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  withSide: {
    paddingRight: 52,
  },
  inputFocus: {
    borderColor: colors.green,
  },
  inputError: {
    backgroundColor: colors.cancelledBg,
    borderColor: colors.danger,
  },
  inputLocked: {
    backgroundColor: colors.ivory,
  },
  side: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.xs,
    top: 0,
    width: 44,
  },
  clear: {
    alignItems: 'center',
    backgroundColor: colors.line,
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  clearText: {
    color: colors.ink,
    fontSize: text.section,
    fontFamily: face.important, fontWeight: '400',
    lineHeight: text.section + 2,
  },
  errorRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  errorDot: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    marginTop: 1,
    width: 20,
  },
  errorDotText: {
    color: colors.white,
    fontSize: text.small,
    fontFamily: face.display, fontWeight: '400',
  },
  error: {
    color: colors.danger,
    flex: 1,
    fontSize: text.label,
    fontFamily: face.regular, fontWeight: '400',
  },
});
