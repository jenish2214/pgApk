import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
  AuthorizationStatus,
} from '@notifee/react-native';
import {NativeModules, Platform} from 'react-native';
import {getMeta, setMeta} from '../database/database';
import {getActiveLanguage} from '../i18n/active';
import {translate} from '../i18n/translate';

type SirenNative = {
  play: (durationMs: number) => void;
  stop: () => void;
  alarmVolume: () => Promise<number>;
};

type SirenResult = 'played' | 'denied' | 'silent';

const SIREN_MS = 6000;

function deviceSiren(): SirenNative | null {
  const native = NativeModules.OrderSiren as SirenNative | undefined;
  if (Platform.OS !== 'android' || !native?.play || !native?.stop) {
    return null;
  }
  return native;
}

const SIREN_CHANNEL_ID = 'pragati-order-siren';
const SIREN_ID = 'pragati-order-siren';
const SIREN_VIBRATION = [0, 700, 180, 700, 180, 700, 180, 900];

let sirenStop: ReturnType<typeof setTimeout> | undefined;

export function orderSirenEnabled(): boolean {
  return getMeta('order_siren', '1') !== '0';
}

export function setOrderSirenEnabled(enabled: boolean): void {
  setMeta('order_siren', enabled ? '1' : '0');
}

async function ensureSirenChannel(): Promise<boolean> {
  const settings = await notifee.requestPermission({
    alert: true,
    sound: true,
    badge: false,
  });
  if (settings.authorizationStatus === AuthorizationStatus.DENIED) {
    return false;
  }
  await notifee.createChannel({
    id: SIREN_CHANNEL_ID,
    name: 'Order siren',
    description:
      'Alarm when an order is in preparation or ready. Loudness follows the phone alarm volume.',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: SIREN_VIBRATION,
  });
  return true;
}

/** Plays the generated siren. Loudness follows the phone alarm volume. */
export async function startSirenTone(durationMs = SIREN_MS): Promise<'played' | 'silent' | 'unavailable'> {
  const native = deviceSiren();
  if (!native) {
    return 'unavailable';
  }
  try {
    if ((await native.alarmVolume()) === 0) {
      return 'silent';
    }
  } catch {
    return 'unavailable';
  }
  if (sirenStop) {
    clearTimeout(sirenStop);
  }
  native.play(durationMs);
  sirenStop = setTimeout(() => {
    native.stop();
  }, durationMs);
  return 'played';
}

/** Short alarm. Loudness follows the phone's own alarm volume. */
export async function playOrderSiren(title: string, body: string): Promise<SirenResult> {
  const tone = await startSirenTone(SIREN_MS);
  if (tone === 'silent') {
    return 'silent';
  }
  const native = deviceSiren();
  const allowed = await ensureSirenChannel();
  if (!allowed && tone !== 'played') {
    return 'denied';
  }
  if (sirenStop) {
    clearTimeout(sirenStop);
  }
  if (allowed) {
    await notifee.displayNotification({
      id: SIREN_ID,
      title,
      body,
      android: {
        channelId: SIREN_CHANNEL_ID,
        category: AndroidCategory.ALARM,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: 'default',
        lightUpScreen: true,
        pressAction: {id: 'default'},
        vibrationPattern: SIREN_VIBRATION,
      },
      ios: {
        sound: 'default',
        interruptionLevel: 'timeSensitive',
        foregroundPresentationOptions: {
          alert: true,
          badge: false,
          sound: true,
        },
      },
    });
  }
  sirenStop = setTimeout(() => {
    native?.stop();
    notifee.cancelNotification(SIREN_ID).catch(() => undefined);
  }, SIREN_MS);
  return 'played';
}

export async function testOrderSiren(): Promise<SirenResult> {
  const language = getActiveLanguage();
  return playOrderSiren(
    translate(language, 'Order alert'),
    translate(language, 'This is a test of the order siren.'),
  );
}
