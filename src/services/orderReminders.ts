import notifee, {
  AlarmType,
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
  AuthorizationStatus,
  EventType,
  TriggerType,
} from '@notifee/react-native';
import {prepareDatabase} from '../database/database';
import {listInquiries} from './inquiryService';
import {listOrders} from './orderService';
import {getActiveLanguage} from '../i18n/active';
import {translate} from '../i18n/translate';
import {orderSirenEnabled, startSirenTone} from './orderSiren';
import {
  MORNING_REMINDER_ID,
  PREPARATION_SIREN_HOURS,
  nextClockAt,
  nextReminderAt,
  orderReminderCopy,
  reminderFireDay,
  shopAlertPlaysSiren,
  shopSirenCopy,
} from '../utils/orderReminder';
import {todayISO} from '../utils/dates';

const CHANNEL_ID = 'pragati-order-warning';
const NOTIFICATION_ID = MORNING_REMINDER_ID;
const PREVIOUS_NOTIFICATION_ID = 'pragati-morning-orders';
const PREP_CHANNEL_ID = 'pragati-order-siren';

export function preparationSirenId(hour: number): string {
  return `pragati-prep-siren-${hour}`;
}

export function isPreparationSiren(id?: string): boolean {
  return PREPARATION_SIREN_HOURS.some(hour => preparationSirenId(hour) === id);
}

/** Same pulse as the test siren, so a reminder is hard to miss. */
const WARNING_VIBRATION = [0, 700, 180, 700, 180, 700, 180, 900];
const VISIBLE_ALERT_ID = 'pragati-shop-alert';

function alarmContent(id: string, title: string, body: string, channelId: string) {
  return {
    id,
    title,
    body,
    android: {
      channelId,
      category: AndroidCategory.ALARM,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      sound: 'default' as const,
      lightUpScreen: true,
      pressAction: {id: 'default'},
      vibrationPattern: WARNING_VIBRATION,
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

async function schedule(exact: boolean): Promise<void> {
  const when = nextReminderAt();
  const copy = localizeReminder(
    orderReminderCopy(listOrders(), reminderFireDay(), listInquiries()),
  );
  await notifee.cancelNotification(PREVIOUS_NOTIFICATION_ID);
  if (!copy) {
    await notifee.cancelNotification(NOTIFICATION_ID);
    return;
  }
  await notifee.createTriggerNotification(
    alarmContent(NOTIFICATION_ID, copy.title, copy.body, CHANNEL_ID),
    {
      type: TriggerType.TIMESTAMP,
      timestamp: when.getTime(),
      alarmManager: exact
        ? {type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE}
        : true,
    },
  );
}

async function schedulePreparationSirens(exact: boolean): Promise<void> {
  await Promise.all(
    PREPARATION_SIREN_HOURS.map(hour => notifee.cancelNotification(preparationSirenId(hour))),
  );
  const copy = localizeReminder(shopSirenCopy(listOrders(), todayISO(), listInquiries()));
  if (!copy || !orderSirenEnabled()) {
    return;
  }
  await notifee.createChannel({
    id: PREP_CHANNEL_ID,
    name: 'Order siren',
    description:
      'Siren for preparation, ready, due, and late orders at 9:00 AM and 12:00 AM.',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: WARNING_VIBRATION,
  });
  await Promise.all(
    PREPARATION_SIREN_HOURS.map(hour =>
      notifee.createTriggerNotification(
        alarmContent(preparationSirenId(hour), copy.title, copy.body, PREP_CHANNEL_ID),
        {
          type: TriggerType.TIMESTAMP,
          timestamp: nextClockAt(hour).getTime(),
          alarmManager: exact ? {type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE} : true,
        },
      ),
    ),
  );
}

/**
 * Plays the siren for a delivered reminder and keeps the message on screen.
 * Returns true when this delivery should schedule the next alarm.
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
    await startSirenTone();
  }
  if (notification?.title) {
    const channelId = isPreparationSiren(id) ? PREP_CHANNEL_ID : CHANNEL_ID;
    await notifee.displayNotification(
      alarmContent(VISIBLE_ALERT_ID, notification.title, notification.body || '', channelId),
    );
  }
  return true;
}

/** Schedule the next 9:00 reminder for ready and due customer orders. */
export async function refreshOrderReminder(): Promise<void> {
  const settings = await notifee.requestPermission({
    alert: true,
    sound: true,
    badge: false,
  });
  if (settings.authorizationStatus === AuthorizationStatus.DENIED) {
    return;
  }
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Order warnings',
    description: 'Warns when an order is ready, due, or late, and plays the order siren.',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: WARNING_VIBRATION,
  });
  try {
    await schedule(true);
    await schedulePreparationSirens(true);
  } catch {
    await schedule(false);
    await schedulePreparationSirens(false);
  }
}

/** After a warning is delivered, queue the next morning with fresh shop records. */
export function watchOrderReminder(): () => void {
  return notifee.onForegroundEvent(({type, detail}) => {
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

export async function continueOrderReminder(): Promise<void> {
  await prepareDatabase();
  await refreshOrderReminder();
}
