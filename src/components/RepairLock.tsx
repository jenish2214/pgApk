import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useLanguage} from '../i18n/LanguageProvider';
import {isRepairUnlocked, noteRepairEntered, noteRepairLeft, tryUnlockRepair} from '../services/repairAccess';
import {colors} from '../theme/colors';
import {padX, padY, spacing} from '../theme/spacing';
import {important} from '../theme/type';
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
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.ivory,
    flex: 1,
    paddingHorizontal: padX,
    paddingTop: padY,
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: important,
  },
  note: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: important,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  eye: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});
