import type {Order} from '../types';
import {dayKey} from './dates';

export const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export type DayMark = {
  ordered: boolean;
  delivery: boolean;
};

export function monthGrid(year: number, monthIndex: number): Array<number | null> {
  const leading = new Date(year, monthIndex, 1).getDay();
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<number | null> = Array.from({length: leading}, () => null);
  for (let day = 1; day <= days; day += 1) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

export function dayKeyFromParts(year: number, monthIndex: number, day: number): string {
  const month = String(monthIndex + 1).padStart(2, '0');
  const date = String(day).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

export function marksByDay(orders: Order[]): Record<string, DayMark> {
  const marks: Record<string, DayMark> = {};
  const touch = (key: string): DayMark | null => {
    if (!key) {
      return null;
    }
    if (!marks[key]) {
      marks[key] = {ordered: false, delivery: false};
    }
    return marks[key];
  };
  orders.forEach(order => {
    const ordered = touch(dayKey(order.orderDate));
    if (ordered) {
      ordered.ordered = true;
    }
    const delivery = touch(dayKey(order.expectedDeliveryDate));
    if (delivery) {
      delivery.delivery = true;
    }
  });
  return marks;
}

export function ordersOnDay(orders: Order[], key: string): Order[] {
  return orders.filter(
    order => dayKey(order.orderDate) === key || dayKey(order.expectedDeliveryDate) === key,
  );
}

export function dayReason(order: Order, key: string): string {
  const ordered = dayKey(order.orderDate) === key;
  const delivery = dayKey(order.expectedDeliveryDate) === key;
  if (ordered && delivery) {
    return 'Ordered and expected today';
  }
  if (delivery) {
    return 'Expected delivery';
  }
  return 'Order placed';
}
