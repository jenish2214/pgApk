import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidNotificationSetting,
  AndroidVisibility,
  AuthorizationStatus,
  EventType,
  TriggerType,
} from '@notifee/react-native';
import {getMeta, prepareDatabase, setMeta} from '../database/database';
import {listInquiries} from './inquiryService';
import {listOrders} from './orderService';
import {getActiveLanguage} from '../i18n/active';
import {translate} from '../i18n/translate';
import {
  alarmDurationMs,
  alarmVibrationEnabled,
  beginNativeAlarmBatch,
  cancelNativeAlarm,
  catchUpNativeAlarms,
  orderSirenEnabled,
  pushAlarmOptions,
  readNativeReminderStatus,
  remindersEnabled,
  scheduleNativeAlarm,
  startSirenTone,
  stopOrderSiren,
  type NativeScheduleTiming,
} from './orderSiren';
import {
  MORNING_REMINDER_ID,
  PREPARATION_SIREN_HOURS,
  nextClockAt,
  shopAlertPlaysSiren,
  shopSirenCopy,
} from '../utils/orderReminder';
import {
  reminderFullScreenNote,
  reminderProblems,
  type ReminderCheck,
  type ReminderHealth,
} from '../utils/reminderHealth';
import {todayISO} from '../utils/dates';

const CHANNEL_ID = 'pragati-alarm';
const NOTIFICATION_ID = MORNING_REMINDER_ID;
const PREVIOUS_NOTIFICATION_ID = 'pragati-morning-orders';

export function preparationSirenId(hour: number): string {
  return `pragati-prep-siren-${hour}`;
}

export function isPreparationSiren(id?: string): boolean {
  return PREPARATION_SIREN_HOURS.some(hour => preparationSirenId(hour) === id);
}

/** Same pulse as the test siren, so a reminder is hard to miss. */
const WARNING_VIBRATION = [0, 700, 180, 700, 180, 700, 180, 900];
const VISIBLE_ALERT_ID = 'pragati-shop-alert';

function alarmContent(id: string, title: string, body: string) {
  const language = getActiveLanguage();
  return {
    id,
    title,
    body,
    android: {
      channelId: CHANNEL_ID,
      category: AndroidCategory.ALARM,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      lightUpScreen: true,
      pressAction: {id: 'default'},
      autoCancel: true,
      vibrationPattern: alarmVibrationEnabled() ? WARNING_VIBRATION : undefined,
      actions: [
        {
          title: translate(language, 'Stop alarm'),
          pressAction: {id: 'stop'},
        },
      ],
    },
    ios: {
      sound: 'default' as const,
      interruptionLevel: 'timeSensitive' as const,
      foregroundPresentationOptions: {
        alert: true,
        badge: false,
        sound: true,
      },
    },
  };
}

function localizeReminder(
  copy: {title: string; body: string} | null,
): {title: string; body: string} | null {
  if (!copy) {
    return null;
  }
  const language = getActiveLanguage();
  const body = copy.body
    .split('\n')
    .map(line => {
      const more = line.match(/^and (\d+) more$/);
      if (more) {
        return translate(language, 'and {count} more', {count: more[1]});
      }
      const split = line.indexOf(':');
      if (split < 0) {
        return translate(language, line);
      }
      const head = line.slice(0, split);
      return `${translate(language, head)}:${line.slice(split + 1)}`;
    })
    .join('\n');
  return {title: translate(language, copy.title), body};
}

function checkOf(value: boolean | undefined): ReminderCheck {
  if (value === true) {
    return 'ok';
  }
  if (value === false) {
    return 'off';
  }
  return 'unknown';
}

async function ensureAlarmChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Order alarm',
    description: 'Shop reminders. The siren uses the phone alarm volume and does not change it.',
    importance: AndroidImportance.HIGH,
    vibration: alarmVibrationEnabled(),
    vibrationPattern: alarmVibrationEnabled() ? WARNING_VIBRATION : undefined,
  });
}

async function notifeeFallback(
  id: string,
  copy: {title: string; body: string},
  when: Date,
): Promise<boolean> {
  try {
    await notifee.createTriggerNotification(alarmContent(id, copy.title, copy.body), {
      type: TriggerType.TIMESTAMP,
      timestamp: when.getTime(),
      alarmManager: true,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Plays the siren for a delivered Notifee reminder and keeps the message on screen.
 * Native alarms play their own siren and do not come through here.
 */
export async function onShopAlertDelivered(notification?: {
  id?: string;
  title?: string;
  body?: string;
}): Promise<boolean> {
  const id = notification?.id;
  if (!shopAlertPlaysSiren(id)) {
    return false;
  }
  if (orderSirenEnabled()) {
    await startSirenTone(alarmDurationMs());
  }
  if (notification?.title) {
    await notifee.displayNotification(
      alarmContent(VISIBLE_ALERT_ID, notification.title, notification.body || ''),
    );
  }
  return true;
}

type ClockResult = {
  timing: NativeScheduleTiming | 'empty';
  error: string;
};

async function armClock(
  id: string,
  hour: number,
  copy: {title: string; body: string} | null,
  sound: boolean,
): Promise<ClockResult> {
  await notifee.cancelNotification(id);
  if (!copy) {
    await cancelNativeAlarm(id);
    await cancelNativeAlarm(`${id}-snooze`);
    return {timing: 'empty', error: ''};
  }
  const when = nextClockAt(hour);
  const timing = await scheduleNativeAlarm({
    id,
    at: when.getTime(),
    title: copy.title,
    body: copy.body,
    hour,
    sound,
  });
  if (timing === 'exact' || timing === 'inexact') {
    return {timing, error: ''};
  }
  const fallback = await notifeeFallback(id, copy, when);
  if (timing === 'missing') {
    return {
      timing: fallback ? 'inexact' : 'unscheduled',
      error: 'Rebuild the Android app so reminders can ring after it is closed.',
    };
  }
  if (fallback) {
    return {timing: 'inexact', error: ''};
  }
  return {timing: 'unscheduled', error: 'The reminder could not be scheduled.'};
}

function combineTiming(results: ClockResult[]): {timing: ReminderHealth['timing']; error: string} {
  const scheduled = results.filter(result => result.timing !== 'empty');
  if (scheduled.length === 0) {
    return {timing: 'none', error: ''};
  }
  const error = scheduled.find(result => result.error)?.error ?? '';
  if (scheduled.some(result => result.timing === 'unscheduled')) {
    return {timing: 'unscheduled', error: error || 'The reminder could not be scheduled.'};
  }
  if (scheduled.some(result => result.timing === 'inexact')) {
    return {timing: 'inexact', error};
  }
  return {timing: 'exact', error: ''};
}

const TEST_NOTIFICATION_ID = 'pragati-notification-test';
let refreshSerial = 0;

/** Schedule the shop alarms on this phone. A denied permission is reported, not ignored. */
export async function refreshOrderReminder(): Promise<void> {
  const serial = ++refreshSerial;
  const stale = () => serial !== refreshSerial;
  try {
    await pushAlarmOptions();
    if (!remindersEnabled()) {
      beginNativeAlarmBatch();
      for (const hour of PREPARATION_SIREN_HOURS) {
        if (stale()) {
          return;
        }
        await armClock(preparationSirenId(hour), hour, null, false);
      }
      await notifee.cancelNotification(NOTIFICATION_ID);
      await notifee.cancelNotification(PREVIOUS_NOTIFICATION_ID);
      await cancelNativeAlarm(NOTIFICATION_ID);
      if (stale()) {
        return;
      }
      setMeta('reminder_timing', 'none');
      setMeta('reminder_error', '');
      return;
    }
    try {
      await notifee.requestPermission({alert: true, sound: true, badge: false});
    } catch {
      // Scheduling continues. The settings screen explains a denied permission.
    }
    try {
      await ensureAlarmChannel();
    } catch {
      // The native alarm still creates the channel when it rings.
    }
    try {
      await catchUpNativeAlarms();
    } catch {
      // The next open tries again. A missed alarm stays stored on the phone.
    }
    if (stale()) {
      return;
    }
    beginNativeAlarmBatch();
    const sound = orderSirenEnabled();
    const copy = localizeReminder(shopSirenCopy(listOrders(), todayISO(), listInquiries()));
    const results: ClockResult[] = [];
    for (const hour of PREPARATION_SIREN_HOURS) {
      if (stale()) {
        return;
      }
      results.push(await armClock(preparationSirenId(hour), hour, copy, sound));
    }
    await notifee.cancelNotification(NOTIFICATION_ID);
    await notifee.cancelNotification(PREVIOUS_NOTIFICATION_ID);
    await cancelNativeAlarm(NOTIFICATION_ID);
    if (stale()) {
      return;
    }
    const combined = combineTiming(results);
    setMeta('reminder_timing', combined.timing);
    setMeta('reminder_error', combined.error);
  } catch {
    if (stale()) {
      return;
    }
    setMeta('reminder_error', 'The reminder could not be scheduled.');
    setMeta('reminder_timing', 'unscheduled');
  }
}

export type TestNotice = 'sent' | 'sent-quiet' | 'sent-silent' | 'denied' | 'channel-off' | 'failed';

/** One immediate test. Repeating it updates the same notification. */
export async function sendTestNotification(): Promise<TestNotice> {
  try {
    const settings = await notifee.requestPermission({alert: true, sound: true, badge: false});
    if (settings.authorizationStatus === AuthorizationStatus.DENIED) {
      return 'denied';
    }
    await ensureAlarmChannel();
    await pushAlarmOptions();
    const channel = await notifee.getChannel(CHANNEL_ID);
    if (channel?.blocked) {
      return 'channel-off';
    }
    const native = await readNativeReminderStatus();
    if (native && !native.notificationsEnabled) {
      return 'denied';
    }
    if (native?.channelBlocked) {
      return 'channel-off';
    }
    const language = getActiveLanguage();
    await notifee.displayNotification(
      alarmContent(
        TEST_NOTIFICATION_ID,
        translate(language, 'Test notification'),
        translate(language, 'This is a test notification. It is not a customer reminder.'),
      ),
    );
    if (!orderSirenEnabled()) {
      return 'sent-quiet';
    }
    const tone = await startSirenTone(alarmDurationMs());
    if (tone === 'silent') {
      return 'sent-silent';
    }
    return 'sent';
  } catch {
    return 'failed';
  }
}

/** After a warning is delivered, queue the next alarm with fresh shop records. */
export function watchOrderReminder(): () => void {
  return notifee.onForegroundEvent(({type, detail}) => {
    if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'stop') {
      stopOrderSiren();
      return;
    }
    if (type === EventType.DISMISSED) {
      const id = detail.notification?.id;
      if (id === VISIBLE_ALERT_ID || id === 'pragati-order-siren' || shopAlertPlaysSiren(id)) {
        stopOrderSiren();
      }
      return;
    }
    if (type !== EventType.DELIVERED) {
      return;
    }
    onShopAlertDelivered(detail.notification)
      .then(handled => {
        if (handled) {
          refreshOrderReminder().catch(() => undefined);
        }
      })
      .catch(() => undefined);
  });
}

export async function requestStartupPermissions(): Promise<'granted' | 'denied'> {
  try {
    const settings = await notifee.requestPermission({
      alert: true,
      sound: true,
      badge: false,
    });
    if (settings.authorizationStatus === AuthorizationStatus.DENIED) {
      return 'denied';
    }
    return 'granted';
  } catch {
    return 'denied';
  }
}

export async function continueOrderReminder(): Promise<void> {
  await prepareDatabase();
  await refreshOrderReminder();
}

export async function readReminderHealth(): Promise<ReminderHealth> {
  const native = await readNativeReminderStatus();
  let notifications = checkOf(native?.notificationsEnabled);
  let exact = checkOf(native?.exactAllowed);
  try {
    const settings = await notifee.getNotificationSettings();
    if (settings.authorizationStatus === AuthorizationStatus.DENIED) {
      notifications = 'off';
    } else if (notifications === 'unknown' && settings.authorizationStatus === AuthorizationStatus.AUTHORIZED) {
      notifications = 'ok';
    }
    if (exact === 'unknown') {
      const alarm = settings.android?.alarm;
      exact =
        alarm === AndroidNotificationSetting.ENABLED
          ? 'ok'
          : alarm === AndroidNotificationSetting.DISABLED
            ? 'off'
            : 'unknown';
    }
  } catch {
    // Native status still covers Android checks.
  }
  let channel: ReminderCheck = 'unknown';
  let vibration: ReminderCheck = 'unknown';
  try {
    const created = await notifee.getChannel(CHANNEL_ID);
    if (created) {
      channel = created.blocked ? 'off' : 'ok';
      vibration = created.vibration === false ? 'off' : 'ok';
    }
  } catch {
    channel = 'unknown';
  }
  if (native?.channelBlocked) {
    channel = 'off';
  }
  if (native && native.channelVibration === false) {
    vibration = 'off';
  }
  const storedTiming = getMeta('reminder_timing', native?.timing || 'none');
  const timing = storedTiming === 'exact' || storedTiming === 'inexact' || storedTiming === 'unscheduled'
    ? storedTiming
    : 'none';
  const fullScreen = native?.fullScreen;
  return {
    notifications,
    exact,
    channel,
    vibration,
    battery: checkOf(native?.batteryUnrestricted),
    fullScreen: fullScreen === 'available' || fullScreen === 'unavailable' ? fullScreen : 'unknown',
    alarmVolume: native ? native.alarmVolume : null,
    timing,
    scheduleError: getMeta('reminder_error', ''),
  };
}

export function reminderWarningLines(health: ReminderHealth): string[] {
  return reminderProblems(health);
}

export function reminderScreenNote(health: ReminderHealth): string {
  return reminderFullScreenNote(health);
}

export async function openReminderSettings(target: 'notifications' | 'alarms' | 'battery'): Promise<void> {
  if (target === 'alarms') {
    await notifee.openAlarmPermissionSettings();
    return;
  }
  if (target === 'battery') {
    await notifee.openBatteryOptimizationSettings();
    return;
  }
  await notifee.openNotificationSettings(CHANNEL_ID);
}
