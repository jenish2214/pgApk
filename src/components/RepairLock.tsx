import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useLanguage} from '../i18n/LanguageProvider';
import {isRepairUnlocked, noteRepairEntered, noteRepairLeft, tryUnlockRepair} from '../services/repairAccess';
import {colors} from '../theme/colors';
import {padX, padY, spacing} from '../theme/spacing';
import {important, regular, text, face} from '../theme/type';
import {radius} from '../theme/layout';
import AppButton from './AppButton';
import AppInput from './AppInput';
import EyeIcon from './EyeIcon';

export function useRepairAccess() {
  const [unlocked, setUnlocked] = useState(isRepairUnlocked);
  useFocusEffect(
    useCallback(() => {
      noteRepairEntered();
      setUnlocked(isRepairUnlocked());
      return () => noteRepairLeft();
    }, []),
  );
  return {unlocked, unlock: () => setUnlocked(true)};
}

export default function RepairLock({onUnlock}: {onUnlock: () => void}) {
  const {t} = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const signIn = () => {
    if (tryUnlockRepair(username, password)) {
      setError('');
      onUnlock();
      return;
    }
    setError('That username or password is not correct.');
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.mark}>
          <Text style={styles.markText}>P</Text>
        </View>
        <Text style={styles.brand}>Pragati Gold</Text>
        <Text style={styles.title}>{t('Repair access')}</Text>
        <Text style={styles.note}>
          {t('Anyone can see a repair. Sign in to add or change it.')}
        </Text>
        <AppInput
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <AppInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          secureTextEntry={!showPassword}
          error={error}
          accessory={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(showPassword ? 'Hide password' : 'Show password')}
              hitSlop={8}
              onPress={() => setShowPassword(current => !current)}
              style={styles.eye}>
              <EyeIcon color={colors.muted} off={showPassword} />
            </Pressable>
          }
        />
        <AppButton label="Sign in" onPress={signIn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.ivory,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: padX,
    paddingVertical: padY,
  },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    paddingHorizontal: padX,
    paddingVertical: spacing.xl,
  },
  mark: {
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: colors.green,
    borderRadius: radius,
    borderWidth: 1.5,
    height: 48,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 48,
  },
  markText: {
    color: colors.green,
    fontSize: text.title,
    fontFamily: face.important, fontWeight: '400',
  },
  brand: {
    color: colors.ink,
    fontSize: text.section,
    fontFamily: face.important, fontWeight: '400',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  title: {
    color: colors.ink,
    fontSize: text.lead,
    fontFamily: face.important, fontWeight: '400',
  },
  note: {
    color: colors.muted,
    fontSize: text.label,
    fontFamily: face.regular, fontWeight: '400',
    lineHeight: 20,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  eye: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});
