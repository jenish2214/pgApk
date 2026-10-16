import type {Inquiry, Order} from '../src/types';
import {dayReason, marksByDay, monthGrid, ordersOnDay} from '../src/utils/calendar';
import {customerHistory} from '../src/utils/customerHistory';
import {deskAlerts} from '../src/utils/deskAlerts';
import {employeeAlerts} from '../src/utils/orderAlerts';
import {
  nextClockAt,
  nextReminderAt,
  orderReminderCopy,
  preparationSirenCopy,
  reminderFireDay,
  shopAlertPlaysSiren,
  shopSirenCopy,
} from '../src/utils/orderReminder';
import {homeKicker, timeGreeting} from '../src/utils/greeting';
import {formatRupees} from '../src/utils/money';
import {formatOrderNumber, nextSequence} from '../src/utils/orderNumbers';
import {repairTriesLeft, repairWaitSeconds, tryUnlockRepair} from '../src/services/repairAccess';
import {validateCustomer, validateJangad, validateOrder} from '../src/utils/validation';
import {accessStatus, alarmToneId, batteryRestrictionStatus, reminderFullScreenNote, reminderProblems, sirenDurationMs, snoozeMinutes} from '../src/utils/reminderHealth';
import {buildReadyMessage, whatsAppPhone, whatsappUrl} from '../src/utils/whatsappUtils';

test('builds the ready-for-collection WhatsApp message', () => {
  expect(buildReadyMessage('Anita Shah', 'PG-2026-0001')).toBe(
    'Hello Anita Shah, your jewellery order #PG-2026-0001 is ready for collection at Pragati Gold. Please visit our shop to collect your order. Thank you!',
  );
});

test('normalizes Indian mobile numbers and encodes the WhatsApp URL', () => {
  expect(whatsAppPhone('98765 43210')).toBe('919876543210');
  const url = whatsappUrl('9876543210', 'Hello Anita');
  expect(url).toBe('https://wa.me/919876543210?text=Hello%20Anita');
  expect(whatsAppPhone('12345')).toBe('');
});

test('numbers orders for the current year', () => {
  expect(formatOrderNumber(2026, 1)).toBe('PG-2026-0001');
  expect(nextSequence('PG-2026-0007', 'PG-2026-')).toBe(8);
  expect(nextSequence(undefined, 'PG-2026-')).toBe(1);
});

test('builds a time-based home greeting and Indian prices', () => {
  expect(timeGreeting(new Date(2026, 9, 9, 9))).toBe('Good morning');
  expect(timeGreeting(new Date(2026, 9, 9, 15))).toBe('Good afternoon');
  expect(timeGreeting(new Date(2026, 9, 9, 20))).toBe('Good evening');
  expect(homeKicker('Ananya', new Date(2026, 9, 9, 9))).toBe(
    'GOOD MORNING, ANANYA',
  );
  expect(formatRupees(148500)).toBe('₹1,48,500');
  expect(formatRupees(72800)).toBe('₹72,800');
});

test('requires a name, phone, item, and date', () => {
  expect(validateCustomer({name: 'A', phone: '123'})).toEqual({
    name: "Enter the customer's full name.",
    phone: 'Enter a phone number with 10 to 15 digits.',
  });
  const orderErrors = validateOrder({
    customerId: 0,
    itemName: '',
    orderDate: '09-10-2026',
    expectedDeliveryDate: '',
    status: 'Pending',
    category: 'Necklaces',
  });
  expect(orderErrors.customerId).toBeTruthy();
  expect(orderErrors.itemName).toBeTruthy();
  expect(orderErrors.orderDate).toBeTruthy();
  const ownCategory = validateOrder({
    customerId: 1,
    itemName: 'Nose pin',
    orderDate: '2026-10-12 10:00',
    expectedDeliveryDate: '',
    status: 'Pending',
    category: 'Nose pin',
    pieces: [{tagNumber: 'A1', itemName: 'Nose pin', category: 'Nose pin'}],
  });
  expect(ownCategory.category).toBeFalsy();
  const missingCategory = validateOrder({
    customerId: 1,
    itemName: 'Nose pin',
    orderDate: '2026-10-12 10:00',
    expectedDeliveryDate: '',
    status: 'Pending',
    category: 'Other',
    pieces: [{tagNumber: 'A1', itemName: 'Nose pin', category: 'Other'}],
  });
  expect(missingCategory.category).toBe('Enter your category.');
});

test('marks calendar days from order and delivery dates', () => {
  expect(monthGrid(2026, 9)[0]).toBeNull();
  expect(monthGrid(2026, 9)[4]).toBe(1);
  const order = {
    id: 1,
    orderNumber: 'PG-2026-0001',
    customerId: 1,
    customerName: 'Anita Shah',
    customerPhone: '9876543210',
    itemName: 'Necklace',
    description: 'Polki',
    orderDate: '2026-10-12 10:00',
    expectedDeliveryDate: '2026-10-18 16:00',
    status: 'Pending' as const,
    readyAt: '',
    employeeNotes: '',
    category: 'Necklaces',
    pieces: [],
    createdAt: '',
    updatedAt: '',
  };
  const marks = marksByDay([order]);
  expect(marks['2026-10-12']?.ordered).toBe(true);
  expect(marks['2026-10-18']?.delivery).toBe(true);
  expect(ordersOnDay([order], '2026-10-18')).toHaveLength(1);
  expect(dayReason(order, '2026-10-18')).toBe('Expected delivery');
});

function sampleOrder(patch: Partial<Order>): Order {
  return {
    id: 1,
    orderNumber: 'PG-2026-0001',
    customerId: 1,
    customerName: 'Anita Shah',
    customerPhone: '9876543210',
    itemName: 'Necklace',
    description: '',
    orderDate: '2026-10-09',
    expectedDeliveryDate: '',
    status: 'Pending',
    readyAt: '',
    employeeNotes: '',
    category: 'Necklaces',
    pieces: [],
    createdAt: '',
    updatedAt: '',
    ...patch,
  };
}

test('builds a 9:00 reminder for ready and due orders', () => {
  const morning = new Date(2026, 9, 9, 8, 15);
  const next = nextReminderAt(morning);
  expect(next.getHours()).toBe(9);
  expect(next.getDate()).toBe(9);
  const after = nextReminderAt(new Date(2026, 9, 9, 9, 0));
  expect(after.getDate()).toBe(10);
  expect(reminderFireDay(new Date(2026, 9, 9, 8, 15))).toBe('2026-10-09');
  expect(reminderFireDay(new Date(2026, 9, 9, 10, 0))).toBe('2026-10-10');

  const copy = orderReminderCopy(
    [
      sampleOrder({status: 'Ready for Collection', customerName: 'Anita Shah', itemName: 'Necklace'}),
      sampleOrder({
        id: 2,
        status: 'Pending',
        customerName: 'Raj Patel',
        itemName: 'Bangles',
        expectedDeliveryDate: '2026-10-09',
      }),
      sampleOrder({
        id: 3,
        status: 'Delivered',
        expectedDeliveryDate: '2026-10-09',
      }),
    ],
    '2026-10-09',
  );
  expect(copy).toEqual({
    title: 'Order warning',
    body: 'Ready: Anita Shah, 9876543210, PG-2026-0001 · Necklace\nDue: Raj Patel, 9876543210, PG-2026-0001 · Bangles',
  });
  expect(orderReminderCopy([sampleOrder({expectedDeliveryDate: '2026-10-20'})], '2026-10-09')).toBe(
    null,
  );
});

test('sounds a preparation siren at 9:00 AM and 12:00 AM', () => {
  const morning = new Date(2026, 9, 9, 8, 0);
  expect(nextClockAt(9, morning).getHours()).toBe(9);
  expect(nextClockAt(9, morning).getDate()).toBe(9);
  const afterNine = nextClockAt(9, new Date(2026, 9, 9, 10, 0));
  expect(afterNine.getDate()).toBe(10);
  const midnight = nextClockAt(0, new Date(2026, 9, 9, 23, 0));
  expect(midnight.getDate()).toBe(10);
  expect(midnight.getHours()).toBe(0);

  const copy = preparationSirenCopy([
    sampleOrder({status: 'In Preparation', customerName: 'Anita Shah', itemName: 'Necklace'}),
    sampleOrder({id: 2, status: 'Ready for Collection', customerName: 'Raj Patel'}),
  ]);
  expect(copy).toEqual({
    title: 'Order alert',
    body: 'In Preparation: Anita Shah, Necklace',
  });
  expect(preparationSirenCopy([sampleOrder({status: 'Pending'})])).toBe(null);
  expect(shopAlertPlaysSiren('pragati-order-warning')).toBe(true);
  expect(shopAlertPlaysSiren('pragati-prep-siren-9')).toBe(true);
  expect(shopAlertPlaysSiren('pragati-prep-siren-0')).toBe(true);
  expect(shopAlertPlaysSiren('pragati-order-siren')).toBe(false);
  expect(shopAlertPlaysSiren('pragati-shop-alert')).toBe(false);

  const combined = shopSirenCopy(
    [
      sampleOrder({status: 'In Preparation', customerName: 'Anita Shah', itemName: 'Necklace'}),
      sampleOrder({
        id: 2,
        status: 'Pending',
        customerName: 'Raj Patel',
        itemName: 'Bangles',
        expectedDeliveryDate: '2026-10-09',
      }),
    ],
    '2026-10-09',
  );
  expect(combined?.body).toContain('In Preparation: Anita Shah, Necklace');
  expect(combined?.body).toContain('Due: Raj Patel');
});

test('alerts the employee and keeps customer history by date', () => {
  const ready = sampleOrder({
    status: 'Ready for Collection',
    category: 'Necklaces',
    orderDate: '2026-10-08',
  });
  const late = sampleOrder({
    id: 2,
    status: 'In Preparation',
    category: 'Bangles',
    itemName: 'Bangles',
    expectedDeliveryDate: '2026-10-07',
    orderDate: '2026-10-01',
  });
  const alerts = employeeAlerts([ready, late], '2026-10-09');
  expect(alerts.map(alert => alert.title)).toEqual([
    'Ready for collection',
    'Delivery is late',
  ]);

  const inquiry: Inquiry = {
    id: 4,
    customerId: 1,
    customerName: 'Anita Shah',
    phone: '9876543210',
    itemName: 'Jhumkas',
    note: '',
    followUpDate: '2026-10-11',
    status: 'Waiting',
    pieces: [],
    createdAt: '2026-10-09T10:00:00.000Z',
    updatedAt: '2026-10-09T10:00:00.000Z',
  };
  const history = customerHistory([ready], [inquiry]);
  expect(history[0].title).toBe('Jhumkas');
  expect(history[0].lines.join(' ')).toContain('Inquiry · Waiting');
  expect(history[1].day).toBe('2026-10-08');
  expect(history[1].lines[0]).toBe('Ready for Collection');
});

test('keeps the desk alert list short and puts late work first', () => {
  const alerts = deskAlerts(
    [
      sampleOrder({status: 'Ready for Collection', itemName: 'Necklace'}),
      sampleOrder({
        id: 2,
        status: 'Ready for Collection',
        itemName: 'Ring',
      }),
      sampleOrder({
        id: 3,
        status: 'In Preparation',
        itemName: 'Bangles',
        expectedDeliveryDate: '2026-10-07',
      }),
      sampleOrder({
        id: 4,
        status: 'Pending',
        expectedDeliveryDate: '2026-10-20',
      }),
    ],
    [],
    '2026-10-09',
  );
  expect(alerts.map(alert => alert.title)).toEqual([
    'Delivery is late',
    '2 ready for collection',
  ]);
});

test('opens repairs only for the shop sign-in', () => {
  expect(tryUnlockRepair('admin', 'wrong')).toBe(false);
  expect(tryUnlockRepair(' admin ', 'admin@123')).toBe(true);
});

test('pauses repair sign-in for 30 seconds after five wrong tries', () => {
  const start = 1_000_000;
  const clock = jest.spyOn(Date, 'now').mockReturnValue(start);
  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(tryUnlockRepair('admin', 'wrong')).toBe(false);
    }
    expect(repairWaitSeconds()).toBe(30);
    expect(tryUnlockRepair('admin', 'admin@123')).toBe(false);
    clock.mockReturnValue(start + 30_000);
    expect(repairWaitSeconds()).toBe(0);
    expect(repairTriesLeft()).toBe(5);
    expect(tryUnlockRepair('admin', 'admin@123')).toBe(true);
  } finally {
    clock.mockRestore();
  }
});

test('requires shop, people, and a date with time on a jangad', () => {
  const missing = validateJangad({
    shopName: '',
    givenBy: '',
    receivedBy: '',
    handedAt: '2026-10-13',
    status: 'Given',
    pieces: [{tagNumber: '', itemName: '', quantity: 0}],
  });
  expect(missing.shopName).toBeTruthy();
  expect(missing.handedAt).toBeTruthy();
  expect(missing.itemName).toBeTruthy();
  expect(missing.tagNumber).toBeFalsy();
  expect(missing.direction).toBeTruthy();

  const ready = validateJangad({
    shopName: 'Mehta Jewellers',
    givenBy: 'Ramesh',
    receivedBy: 'Suresh',
    handedAt: '2026-10-13 16:30',
    status: 'Given',
    pieces: [{tagNumber: '', itemName: 'Necklace', quantity: 23}],
    moves: [
      {direction: 'Exit', quantity: 23, movedAt: '2026-10-13 16:30'},
      {direction: 'Entry', quantity: 23, movedAt: '2026-10-20 11:00'},
    ],
  });
  expect(Object.keys(ready)).toHaveLength(0);
});

test('explains reminder problems without hiding a failed schedule', () => {
  expect(sirenDurationMs('10000')).toBe(10000);
  expect(sirenDurationMs('30000')).toBe(30000);
  expect(sirenDurationMs('999')).toBe(20000);
  expect(snoozeMinutes('5')).toBe(5);
  expect(snoozeMinutes('15')).toBe(15);
  expect(snoozeMinutes('8')).toBe(10);

  const quiet = reminderProblems({
    notifications: 'ok',
    exact: 'ok',
    channel: 'ok',
    vibration: 'ok',
    battery: 'ok',
    fullScreen: 'available',
    alarmVolume: 40,
    timing: 'exact',
    scheduleError: '',
  });
  expect(quiet).toEqual([]);

  const blocked = reminderProblems({
    notifications: 'off',
    exact: 'off',
    channel: 'off',
    vibration: 'off',
    battery: 'off',
    fullScreen: 'unavailable',
    alarmVolume: 0,
    timing: 'unscheduled',
    scheduleError: 'The reminder could not be scheduled.',
  });
  expect(blocked).toContain('Notifications are off, so this phone will not show reminders.');
  expect(blocked).toContain('The reminder could not be scheduled.');
  expect(blocked.filter(line => line.startsWith('Exact alarms')).length).toBe(1);
  expect(reminderFullScreenNote({
    notifications: 'ok',
    exact: 'ok',
    channel: 'ok',
    vibration: 'ok',
    battery: 'ok',
    fullScreen: 'unavailable',
    alarmVolume: 50,
    timing: 'exact',
    scheduleError: '',
  })).toContain('full-screen');
  expect(accessStatus('ok', 'permission')).toBe('Enabled');
  expect(accessStatus('off', 'permission')).toBe('Permission required');
  expect(accessStatus('unknown', 'disabled')).toBe('Unable to verify');
  expect(batteryRestrictionStatus('ok')).toBe('Disabled');
  expect(batteryRestrictionStatus('off')).toBe('Enabled');
  expect(batteryRestrictionStatus('unknown')).toBe('Unable to verify');
  expect(alarmToneId('alarm')).toBe('alarm');
  expect(alarmToneId('other')).toBe('siren');
});
