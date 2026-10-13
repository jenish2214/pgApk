import type {Inquiry, Order} from '../types';
import {dayKey, todayISO} from './dates';

export const REMINDER_HOUR = 9;

export function nextReminderAt(now = new Date()): Date {
  const next = new Date(now);
  next.setHours(REMINDER_HOUR, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
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
    title: '9:00 order reminder',
    body: lines.join('\n'),
  };
}
