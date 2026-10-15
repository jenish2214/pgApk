import React, {useState, type ReactNode} from 'react';
import {StyleSheet, Text, TextInput, View, type TextInputProps} from 'react-native';
import {useLanguage} from '../i18n/LanguageProvider';
import {colors} from '../theme/colors';
import {radius} from '../theme/layout';
import {padY, spacing} from '../theme/spacing';
import {important, regular, text, face} from '../theme/type';

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
  multiline?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  secureTextEntry?: boolean;
  accessory?: ReactNode;
};

export default function AppInput({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  keyboardType,
  multiline = false,
  autoCapitalize = 'sentences',
  secureTextEntry = false,
  accessory,
}: Props) {
  const {t} = useLanguage();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, error ? styles.labelError : null]}>{t(label)}</Text>
      <View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ? t(placeholder) : undefined}
          placeholderTextColor={error ? colors.danger : colors.muted}
          keyboardType={keyboardType}
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          secureTextEntry={secureTextEntry}
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
    fontSize: text.label,
    fontFamily: face.important, fontWeight: '400',
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    color: colors.ink,
    fontSize: text.body,
    fontFamily: face.regular, fontWeight: '400',
    minHeight: 48,
    paddingHorizontal: padY,
    paddingVertical: spacing.sm,
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
    borderColor: colors.green,
    borderWidth: 1.5,
  },
  inputError: {
    backgroundColor: colors.cancelledBg,
    borderColor: colors.danger,
    color: colors.danger,
  },
  error: {
    color: colors.danger,
    fontSize: text.meta,
    marginTop: spacing.xs,
  },
});
