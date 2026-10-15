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
import {shopAlertPlaysSiren} from '../utils/orderReminder';
import {sirenDurationMs, snoozeMinutes} from '../utils/reminderHealth';

type SirenNative = {
  play: (durationMs: number) => void;
  stop: () => void;
  alarmVolume: () => Promise<number>;
  setAlarmOptions?: (
    durationMs: number,
    snoozeMinutes: number,
    stopLabel: string,
    snoozeLabel: string,
    tone: string,
    vibrate: boolean,
  ) => void;
  beginAlarmBatch?: () => void;
  scheduleAlarm?: (
    id: string,
    atMillis: number,
    title: string,
    body: string,
    hour: number,
    sound: boolean,
  ) => Promise<{timing?: string}>;
  cancelAlarm?: (id: string) => void;
  catchUpAlarms?: () => Promise<boolean>;
  reminderStatus?: () => Promise<NativeReminderStatus>;
};

export type NativeReminderStatus = {
  exactAllowed: boolean;
  batteryUnrestricted: boolean;
  notificationsEnabled: boolean;
  channelBlocked: boolean;
  channelVibration: boolean;
  fullScreen: string;
  alarmVolume: number;
  timing: string;
  scheduleError: string;
  pending: number;
};

export type NativeScheduleTiming = 'exact' | 'inexact' | 'unscheduled' | 'missing';

type SirenResult = 'played' | 'denied' | 'silent';

const SIREN_MS = 6000;

function deviceSiren(): SirenNative | null {
  const native = NativeModules.OrderSiren as SirenNative | undefined;
  if (Platform.OS !== 'android' || !native?.play || !native?.stop) {
    return null;
  }
  return native;
}

const SIREN_CHANNEL_ID = 'pragati-alarm';
const SIREN_ID = 'pragati-order-siren';
const VISIBLE_ALERT_ID = 'pragati-shop-alert';
/** Notifee rejects a zero entry, so the pattern starts with a short pause. */
const SIREN_VIBRATION = [100, 700, 180, 700, 180, 700, 180, 900];

let sirenStop: ReturnType<typeof setTimeout> | undefined;

export type AlarmTone = 'siren' | 'alarm';

export function remindersEnabled(): boolean {
  return getMeta('reminder_alerts', '1') !== '0';
}

export function setRemindersEnabled(enabled: boolean): void {
  setMeta('reminder_alerts', enabled ? '1' : '0');
}

export function orderSirenEnabled(): boolean {
  return getMeta('order_siren', '1') !== '0';
}

export function setOrderSirenEnabled(enabled: boolean): void {
  setMeta('order_siren', enabled ? '1' : '0');
}

export function alarmVibrationEnabled(): boolean {
  return getMeta('siren_vibrate', '1') !== '0';
}

export function setAlarmVibrationEnabled(enabled: boolean): void {
  setMeta('siren_vibrate', enabled ? '1' : '0');
}

export function alarmTone(): AlarmTone {
  return getMeta('siren_tone', 'siren') === 'alarm' ? 'alarm' : 'siren';
}

export function setAlarmTone(tone: AlarmTone): void {
  setMeta('siren_tone', tone === 'alarm' ? 'alarm' : 'siren');
}

export function alarmDurationMs(): number {
  return sirenDurationMs(getMeta('siren_ms', '20000'));
}

export function alarmSnoozeMinutes(): number {
  return snoozeMinutes(getMeta('siren_snooze_min', '10'));
}

export function setAlarmDurationMs(durationMs: number): void {
  setMeta('siren_ms', String(sirenDurationMs(String(durationMs))));
}

export function setAlarmSnoozeMinutes(minutes: number): void {
  setMeta('siren_snooze_min', String(snoozeMinutes(String(minutes))));
}

export function shouldStopSiren(id?: string): boolean {
  return (
    id === SIREN_ID ||
    id === VISIBLE_ALERT_ID ||
    shopAlertPlaysSiren(id) ||
    (id?.startsWith('pragati-order-arrival') ?? false)
  );
}

export function stopOrderSiren(): void {
  if (sirenStop) {
    clearTimeout(sirenStop);
    sirenStop = undefined;
  }
  deviceSiren()?.stop();
  notifee.cancelNotification(SIREN_ID).catch(() => undefined);
}

export async function pushAlarmOptions(): Promise<void> {
  const native = deviceSiren();
  const language = getActiveLanguage();
  native?.setAlarmOptions?.(
    alarmDurationMs(),
    alarmSnoozeMinutes(),
    translate(language, 'Stop alarm'),
    translate(language, 'Snooze'),
    alarmTone(),
    alarmVibrationEnabled(),
  );
}

export async function readNativeReminderStatus(): Promise<NativeReminderStatus | null> {
  const native = deviceSiren();
  if (!native?.reminderStatus) {
    return null;
  }
  try {
    return await native.reminderStatus();
  } catch {
    return null;
  }
}

export async function catchUpNativeAlarms(): Promise<void> {
  const native = deviceSiren();
  if (!native?.catchUpAlarms) {
    return;
  }
  await native.catchUpAlarms();
}

export async function cancelNativeAlarm(id: string): Promise<void> {
  deviceSiren()?.cancelAlarm?.(id);
}

export function beginNativeAlarmBatch(): void {
  deviceSiren()?.beginAlarmBatch?.();
}

export async function scheduleNativeAlarm(input: {
  id: string;
  at: number;
  title: string;
  body: string;
  hour: number;
  sound: boolean;
}): Promise<NativeScheduleTiming> {
  const native = deviceSiren();
  if (!native?.scheduleAlarm) {
    return 'missing';
  }
  try {
    const result = await native.scheduleAlarm(
      input.id,
      input.at,
      input.title,
      input.body,
      input.hour,
      input.sound,
    );
    if (result?.timing === 'exact' || result?.timing === 'inexact' || result?.timing === 'unscheduled') {
      return result.timing;
    }
    return 'unscheduled';
  } catch {
    return 'unscheduled';
  }
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
      'Shop reminders. The siren uses the phone alarm volume and does not change it.',
    importance: AndroidImportance.HIGH,
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
  const duration = alarmDurationMs();
  const tone = await startSirenTone(duration);
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
        lightUpScreen: true,
        pressAction: {id: 'default'},
        autoCancel: true,
        vibrationPattern: alarmVibrationEnabled() ? SIREN_VIBRATION : undefined,
        actions: [
          {
            title: translate(getActiveLanguage(), 'Stop alarm'),
            pressAction: {id: 'stop'},
          },
        ],
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
  }, duration);
  return 'played';
}

export async function testAlarmSound(): Promise<'played' | 'silent' | 'unavailable'> {
  stopOrderSiren();
  return startSirenTone(alarmDurationMs());
}

/** Ready-for-collection alert. Stays quiet when reminder alerts are off. */
export async function announceReadyOrder(title: string, body: string): Promise<void> {
  if (!remindersEnabled()) {
    return;
  }
  if (orderSirenEnabled()) {
    await playOrderSiren(title, body);
    return;
  }
  const allowed = await ensureSirenChannel();
  if (!allowed) {
    return;
  }
  await notifee.displayNotification({
    id: SIREN_ID,
    title,
    body,
    android: {
      channelId: SIREN_CHANNEL_ID,
      category: AndroidCategory.ALARM,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      pressAction: {id: 'default'},
      autoCancel: true,
      vibrationPattern: alarmVibrationEnabled() ? SIREN_VIBRATION : undefined,
    },
  });
}
