import {errorMessage} from './src/types';
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, StatusBar, StyleSheet, Text, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {prepareDatabase} from './src/database/database';
import DialogHost from './src/components/DialogHost';
import LanguageButton from './src/components/LanguageButton';
import {LanguageProvider, useLanguage} from './src/i18n/LanguageProvider';
import AppNavigator from './src/navigation/AppNavigator';
import {refreshOrderReminder, watchOrderReminder} from './src/services/orderReminders';
import {subscribeShopChanges} from './src/services/shopEvents';
import {colors} from './src/theme/colors';
import {radius} from './src/theme/layout';
import {fonts} from './src/theme/type';

function BootScreen({error, onRetry}: {error: string; onRetry: () => void}) {
  const {t} = useLanguage();
  return (
    <View style={styles.boot}>
      <View style={styles.language}>
        <LanguageButton />
      </View>
      <View style={styles.mark}>
        <Text style={styles.markText}>P</Text>
      </View>
      <Text style={styles.title}>Shree Pragati Gold</Text>
      {error ? (
        <>
          <Text style={styles.message}>{t(error)}</Text>
          <Pressable onPress={onRetry} style={styles.retry}>
            <Text style={styles.retryText}>{t('Try again')}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.gold} />
          <Text style={styles.message}>{t('Opening shop records…')}</Text>
        </>
      )}
    </View>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [splashHold, setSplashHold] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setSplashHold(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;
    setError('');
    setReady(false);
    prepareDatabase()
      .then(() => {
        if (active) {
          setReady(true);
        }
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
        <StatusBar barStyle="light-content" />
        {ready && !splashHold ? <AppNavigator /> : (
          <BootScreen error={error} onRetry={() => setAttempt(value => value + 1)} />
        )}
        <DialogHost />
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
    padding: 24,
  },
  language: {
    position: 'absolute',
    right: 16,
    top: 48,
  },
  mark: {
    alignItems: 'center',
    borderColor: colors.gold,
    borderRadius: 28,
    borderWidth: 1.5,
    height: 56,
    justifyContent: 'center',
    marginBottom: 16,
    width: 56,
  },
  markText: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 28,
  },
  title: {
    color: colors.cream,
    fontFamily: fonts.serif,
    fontSize: 32,
    marginBottom: 16,
  },
  message: {
    color: colors.goldSoft,
    marginTop: 12,
    textAlign: 'center',
  },
  retry: {
    backgroundColor: colors.gold,
    borderRadius: radius,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryText: {
    color: colors.greenDeep,
    fontWeight: '800',
  },
});
