import type {Inquiry, Order} from '../src/types';
import {dayReason, marksByDay, monthGrid, ordersOnDay} from '../src/utils/calendar';
import {customerHistory} from '../src/utils/customerHistory';
import {deskAlerts} from '../src/utils/deskAlerts';
import {employeeAlerts} from '../src/utils/orderAlerts';
import {nextReminderAt, orderReminderCopy} from '../src/utils/orderReminder';
import {homeKicker, timeGreeting} from '../src/utils/greeting';
import {formatRupees} from '../src/utils/money';
import {formatOrderNumber, nextSequence} from '../src/utils/orderNumbers';
import {validateCustomer, validateOrder} from '../src/utils/validation';
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
    title: '9:00 order reminder',
    body: 'Ready: Anita Shah, 9876543210, PG-2026-0001 · Necklace\nDue: Raj Patel, 9876543210, PG-2026-0001 · Bangles',
  });
  expect(orderReminderCopy([sampleOrder({expectedDeliveryDate: '2026-10-20'})], '2026-10-09')).toBe(
    null,
  );
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
