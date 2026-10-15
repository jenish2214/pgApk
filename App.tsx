import {errorMessage} from './src/types';
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, StatusBar, StyleSheet, Text, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {prepareDatabase} from './src/database/database';
import DialogHost from './src/components/DialogHost';
import {LanguageProvider, useLanguage} from './src/i18n/LanguageProvider';
import AppNavigator from './src/navigation/AppNavigator';
import {refreshOrderReminder, requestStartupPermissions, watchOrderReminder} from './src/services/orderReminders';
import {subscribeShopChanges} from './src/services/shopEvents';
import {colors} from './src/theme/colors';
import {ThemeProvider} from './src/theme/ThemeProvider';
import {radius} from './src/theme/layout';
import {face} from './src/theme/type';
import {spacing} from './src/theme/spacing';

function BootScreen({
  error,
  message,
  onRetry,
}: {
  error: string;
  message: string;
  onRetry: () => void;
}) {
  const {t} = useLanguage();
  return (
    <View style={styles.boot}>
      <Text style={styles.title}>Pragati Gold</Text>
      {error ? (
        <>
          <Text style={styles.message}>{t(error)}</Text>
          <Pressable onPress={onRetry} style={styles.retry}>
            <Text style={styles.retryText}>{t('Try again')}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.cream} />
          <Text style={styles.message}>{t(message)}</Text>
        </>
      )}
    </View>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [splashHold, setSplashHold] = useState(true);
  const [splashMessage, setSplashMessage] = useState('Opening shop records…');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setError('');
    setReady(false);
    setSplashHold(true);
    setSplashMessage('Opening shop records…');
    const started = Date.now();
    prepareDatabase()
      .then(async () => {
        if (!active) {
          return;
        }
        setSplashMessage('Allow notifications for order reminders.');
        const permission = await requestStartupPermissions();
        if (!active) {
          return;
        }
        setSplashMessage(
          permission === 'granted'
            ? 'Notifications are ready.'
            : 'You can allow notifications later in Settings.',
        );
        const remaining = 900 - (Date.now() - started);
        if (remaining > 0) {
          await new Promise<void>(resolve => {
            setTimeout(resolve, remaining);
          });
        }
        if (!active) {
          return;
        }
        setReady(true);
        setSplashHold(false);
      })
      .catch(openError => {
        if (active) {
          setError(errorMessage(openError, 'Shop records could not be opened.'));
        }
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    refreshOrderReminder().catch(() => undefined);
    const stopWatch = watchOrderReminder();
    const stopShop = subscribeShopChanges(() => {
      refreshOrderReminder().catch(() => undefined);
    });
    return () => {
      stopWatch();
      stopShop();
    };
  }, [ready]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <LanguageProvider ready={ready}>
        <ThemeProvider ready={ready}>
        <StatusBar barStyle="dark-content" />
        {ready && !splashHold ? <AppNavigator /> : (
          <BootScreen
            error={error}
            message={splashMessage}
            onRetry={() => setAttempt(value => value + 1)}
          />
        )}
        <DialogHost />
        </ThemeProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  boot: {
    alignItems: 'center',
    backgroundColor: colors.green,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    color: colors.cream,
    fontFamily: face.display,
    fontSize: 32,
    marginBottom: spacing.lg,
  },
  message: {
    color: colors.cream,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  retry: {
    backgroundColor: colors.cream,
    borderRadius: radius,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  retryText: {
    color: colors.green,
    fontFamily: face.display, fontWeight: '400',
  },
});
