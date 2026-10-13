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
import {nextReminderAt, orderReminderCopy, reminderFireDay} from '../utils/orderReminder';

const CHANNEL_ID = 'pragati-order-warning';
const NOTIFICATION_ID = 'pragati-order-warning';
const PREVIOUS_NOTIFICATION_ID = 'pragati-morning-orders';

/** A short warning pulse. Loudness follows the phone's own volume. */
const WARNING_VIBRATION = [0, 400, 180, 400, 180, 700];

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
    {
      id: NOTIFICATION_ID,
      title: copy.title,
      body: copy.body,
      android: {
        channelId: CHANNEL_ID,
        category: AndroidCategory.ALARM,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: 'default',
        lightUpScreen: true,
        pressAction: {id: 'default'},
        vibrationPattern: WARNING_VIBRATION,
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
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: when.getTime(),
      alarmManager: exact
        ? {type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE}
        : true,
    },
  );
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
    description: 'Warns when an order is ready, due, or late. The sound follows your phone volume.',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: WARNING_VIBRATION,
  });
  try {
    await schedule(true);
  } catch {
    await schedule(false);
  }
}

/** After a warning is delivered, queue the next morning with fresh shop records. */
export function watchOrderReminder(): () => void {
  return notifee.onForegroundEvent(({type}) => {
    if (type === EventType.DELIVERED) {
      refreshOrderReminder().catch(() => undefined);
    }
  });
}

export async function continueOrderReminder(): Promise<void> {
  await prepareDatabase();
  await refreshOrderReminder();
}
