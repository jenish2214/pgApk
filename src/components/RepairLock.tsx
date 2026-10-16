import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useLanguage} from '../i18n/LanguageProvider';
import {
  isRepairUnlocked,
  noteRepairEntered,
  noteRepairLeft,
  repairTriesLeft,
  repairWaitSeconds,
  tryUnlockRepair,
} from '../services/repairAccess';
import {colors} from '../theme/colors';
import {capped, radius, sheetMax} from '../theme/layout';
import {padX, padY, spacing} from '../theme/spacing';
import {text, face} from '../theme/type';
import AppButton from './AppButton';
import AppInput, {type InputHandle} from './AppInput';
import EyeIcon from './EyeIcon';
import LockIcon from './LockIcon';

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
  const passwordRef = useRef<InputHandle>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [wait, setWait] = useState(repairWaitSeconds);

  useEffect(() => {
    if (wait <= 0) {
      return;
    }
    const timer = setInterval(() => {
      const left = repairWaitSeconds();
      setWait(left);
      if (left <= 0) {
        setError('');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [wait]);

  const ready = username.trim().length > 0 && password.length > 0 && wait <= 0;

  const signIn = () => {
    if (!ready) {
      return;
    }
    if (tryUnlockRepair(username, password)) {
      setError('');
      onUnlock();
      return;
    }
    setPassword('');
    const left = repairWaitSeconds();
    if (left > 0) {
      setWait(left);
      setError('');
      return;
    }
    setError(
      `${t('That username or password is not correct.')} ${t('{count} tries left.', {
        count: repairTriesLeft(),
      })}`,
    );
    passwordRef.current?.focus();
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <View style={styles.column}>
        <View style={styles.badge}>
          <LockIcon color={colors.green} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {t('Repair access')}
        </Text>
        <Text style={styles.note}>
          {t('Anyone can see a repair. Sign in to add or change it.')}
        </Text>

        <View style={styles.card}>
          <AppInput
            label="Username"
            value={username}
            onChangeText={value => {
              setUsername(value);
              setError('');
            }}
            autoCapitalize="none"
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={wait <= 0}
          />
          <AppInput
            inputRef={passwordRef}
            label="Password"
            value={password}
            onChangeText={value => {
              setPassword(value);
              setError('');
            }}
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            secureTextEntry={!showPassword}
            returnKeyType="go"
            onSubmitEditing={signIn}
            editable={wait <= 0}
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
          {wait > 0 ? (
            <View style={styles.wait} accessibilityLiveRegion="polite">
              <Text style={styles.waitText}>
                {t('Too many wrong tries. Wait {seconds} seconds.', {seconds: wait})}
              </Text>
            </View>
          ) : null}
          <AppButton label="Sign in" onPress={signIn} disabled={!ready} />
        </View>

        <View style={styles.footer}>
          <LockIcon color={colors.muted} />
          <Text style={styles.footerText}>{t('Locks again when you leave Repair.')}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.ivory,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: padX,
    paddingVertical: spacing.xl,
  },
  column: {
    ...capped(sheetMax),
  },
  badge: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.greenSoft,
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 72,
  },
  title: {
    color: colors.ink,
    fontSize: text.title,
    fontFamily: face.display, fontWeight: '400',
    textAlign: 'center',
  },
  note: {
    color: colors.muted,
    fontSize: text.label,
    fontFamily: face.regular, fontWeight: '400',
    lineHeight: text.label + 6,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius,
    borderWidth: 1,
    paddingHorizontal: padX,
    paddingTop: spacing.xl,
    paddingBottom: padY,
  },
  eye: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  wait: {
    backgroundColor: colors.pendingBg,
    borderRadius: radius,
    marginBottom: padY,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  waitText: {
    color: colors.pendingText,
    fontSize: text.label,
    fontFamily: face.important, fontWeight: '400',
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.lg,
    opacity: 0.8,
  },
  footerText: {
    color: colors.muted,
    fontSize: text.meta,
    fontFamily: face.regular, fontWeight: '400',
  },
});
