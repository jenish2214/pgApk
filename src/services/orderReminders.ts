import notifee, {
  AlarmType,
  AndroidCategory,
  AndroidImportance,
  AuthorizationStatus,
  RepeatFrequency,
  TriggerType,
} from '@notifee/react-native';
import {listInquiries} from './inquiryService';
import {listOrders} from './orderService';
import {todayISO} from '../utils/dates';
import {nextReminderAt, orderReminderCopy} from '../utils/orderReminder';

const CHANNEL_ID = 'pragati-order-reminders';
const NOTIFICATION_ID = 'pragati-morning-orders';

async function schedule(exact: boolean): Promise<void> {
  const copy = orderReminderCopy(listOrders(), todayISO(), listInquiries());
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
        category: AndroidCategory.REMINDER,
        importance: AndroidImportance.HIGH,
        sound: 'default',
        pressAction: {id: 'default'},
        vibrationPattern: [250, 400, 250, 400],
      },
      ios: {
        sound: 'default',
        foregroundPresentationOptions: {
          alert: true,
          badge: false,
          sound: true,
        },
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: nextReminderAt().getTime(),
      repeatFrequency: RepeatFrequency.DAILY,
      alarmManager: exact
        ? {type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE}
        : true,
    },
  );
}

/** Schedule the next 9:00 reminder for ready and due customer orders. */
export async function refreshOrderReminder(): Promise<void> {
  const settings = await notifee.requestPermission();
  if (settings.authorizationStatus === AuthorizationStatus.DENIED) {
    return;
  }
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Order reminders',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });
  try {
    await schedule(true);
  } catch {
    await schedule(false);
  }
}
