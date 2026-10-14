import type {Inquiry, Order} from '../types';
import {dayKey, formatDateValue, todayISO} from './dates';

export const REMINDER_HOUR = 9;
export const MORNING_REMINDER_ID = 'pragati-order-warning';

/** Preparation siren: 9:00 AM and 12:00 AM. */
export const PREPARATION_SIREN_HOURS = [9, 0] as const;

/** True for scheduled shop alerts that must sound the siren. */
export function shopAlertPlaysSiren(id?: string): boolean {
  if (!id) {
    return false;
  }
  if (id === MORNING_REMINDER_ID) {
    return true;
  }
  return PREPARATION_SIREN_HOURS.some(hour => id === `pragati-prep-siren-${hour}`);
}

export function nextClockAt(hour: number, now = new Date()): Date {
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

export function nextReminderAt(now = new Date()): Date {
  return nextClockAt(REMINDER_HOUR, now);
}

/** Calendar day the next 9:00 warning describes. */
export function reminderFireDay(now = new Date()): string {
  return formatDateValue(nextReminderAt(now));
}

export type ShopCall = {
  key: string;
  name: string;
  phone: string;
  reason: string;
  detail: string;
  orderId?: number;
  inquiryId?: number;
};

function named(name: string, phone: string, item: string): string {
  const who = name.trim() || 'Customer';
  return phone.trim() ? `${who}, ${phone.trim()}, ${item}` : `${who}, ${item}`;
}

/** Ready orders, due orders, and inquiries to call today. */
export function shopCalls(
  orders: Order[],
  inquiries: Inquiry[] = [],
  today = todayISO(),
): ShopCall[] {
  const calls: ShopCall[] = [];
  orders.forEach(order => {
    if (order.status === 'Delivered' || order.status === 'Cancelled') {
      return;
    }
    const item = order.itemName || 'Jewellery';
    if (order.status === 'Ready for Collection') {
      calls.push({
        key: `order-${order.id}`,
        name: order.customerName || 'Customer',
        phone: order.customerPhone,
        reason: 'Ready',
        detail: `${order.orderNumber} · ${item}`,
        orderId: order.id,
      });
      return;
    }
    const due = dayKey(order.expectedDeliveryDate);
    if (due && due <= today) {
      calls.push({
        key: `order-${order.id}`,
        name: order.customerName || 'Customer',
        phone: order.customerPhone,
        reason: due < today ? 'Late' : 'Due',
        detail: `${order.orderNumber} · ${item}`,
        orderId: order.id,
      });
    }
  });
  inquiries.forEach(item => {
    if (item.status !== 'Waiting') {
      return;
    }
    const day = dayKey(item.followUpDate);
    if (!day || day > today) {
      return;
    }
    calls.push({
      key: `inquiry-${item.id}`,
      name: item.customerName || 'Customer',
      phone: item.phone,
      reason: 'Inquiry',
      detail: item.itemName || 'Jewellery',
      inquiryId: item.id,
    });
  });
  return calls;
}

/** Morning reminder for orders and inquiries the shop should call about. */
export function orderReminderCopy(
  orders: Order[],
  today = todayISO(),
  inquiries: Inquiry[] = [],
): {title: string; body: string} | null {
  const calls = shopCalls(orders, inquiries, today);
  if (calls.length === 0) {
    return null;
  }
  const shown = calls.slice(0, 6);
  const extra = calls.length - shown.length;
  const lines = shown.map(call => `${call.reason}: ${named(call.name, call.phone, call.detail)}`);
  if (extra > 0) {
    lines.push(`and ${extra} more`);
  }
  return {
    title: 'Order warning',
    body: lines.join('\n'),
  };
}

/** Orders still being made, named for the 9:00 AM and 12:00 AM siren. */
export function preparationSirenCopy(orders: Order[]): {title: string; body: string} | null {
  const preparing = orders.filter(order => order.status === 'In Preparation');
  if (preparing.length === 0) {
    return null;
  }
  const shown = preparing.slice(0, 6);
  const extra = preparing.length - shown.length;
  const lines = shown.map(order => {
    const who = order.customerName.trim() || 'Customer';
    const item = order.itemName || 'Jewellery';
    return `In Preparation: ${who}, ${item}`;
  });
  if (extra > 0) {
    lines.push(`and ${extra} more`);
  }
  return {
    title: 'Order alert',
    body: lines.join('\n'),
  };
}

/** Everything the shop could miss: preparation, ready, due, late, and inquiries. */
export function shopSirenCopy(
  orders: Order[],
  today = todayISO(),
  inquiries: Inquiry[] = [],
): {title: string; body: string} | null {
  const parts = [preparationSirenCopy(orders), orderReminderCopy(orders, today, inquiries)].filter(
    (part): part is {title: string; body: string} => part !== null,
  );
  if (parts.length === 0) {
    return null;
  }
  return {
    title: 'Order alert',
    body: parts.map(part => part.body).join('\n'),
  };
}
