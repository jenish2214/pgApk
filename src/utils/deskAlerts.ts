import type {Inquiry, Order} from '../types';
import {dayKey, todayISO} from './dates';
import {nextOrderStatus} from './orderStatus';

export type DeskAlertTone = 'late' | 'due' | 'inquiry' | 'ready';

export type DeskAlert = {
  key: string;
  tone: DeskAlertTone;
  title: string;
  detail: string;
  orderId?: number;
  inquiryId?: number;
};

const RANK: Record<DeskAlertTone, number> = {
  late: 0,
  due: 1,
  inquiry: 2,
  ready: 3,
};

function openOrder(order: Order): boolean {
  return order.status !== 'Delivered' && order.status !== 'Cancelled';
}

/** At most three alerts: late and due first, ready collapsed into one line. */
export function deskAlerts(
  orders: Order[],
  inquiries: Inquiry[] = [],
  today = todayISO(),
): DeskAlert[] {
  const urgent: DeskAlert[] = [];
  const ready: Order[] = [];

  orders.forEach(order => {
    if (!openOrder(order)) {
      return;
    }
    if (order.status === 'Ready for Collection') {
      ready.push(order);
      return;
    }
    const due = dayKey(order.expectedDeliveryDate);
    if (!due || due > today) {
      return;
    }
    const late = due < today;
    urgent.push({
      key: `order-${order.id}`,
      tone: late ? 'late' : 'due',
      title: late ? 'Delivery is late' : 'Due today',
      detail: `${order.customerName || 'Customer'} · ${order.itemName} · ${order.orderNumber}`,
      orderId: order.id,
    });
  });

  inquiries.forEach(item => {
    if (item.status !== 'Waiting') {
      return;
    }
    const day = dayKey(item.followUpDate);
    if (!day || day > today) {
      return;
    }
    urgent.push({
      key: `inquiry-${item.id}`,
      tone: 'inquiry',
      title: day < today ? 'Follow-up is late' : 'Follow up today',
      detail: `${item.customerName || 'Customer'} · ${item.itemName || 'Jewellery'}`,
      inquiryId: item.id,
    });
  });

  urgent.sort((left, right) => RANK[left.tone] - RANK[right.tone]);
  const shown = urgent.slice(0, 3);
  if (shown.length < 3 && ready.length > 0) {
    const first = ready[0];
    shown.push({
      key: 'ready-summary',
      tone: 'ready',
      title: ready.length === 1 ? 'Ready for collection' : `${ready.length} ready for collection`,
      detail:
        ready.length === 1
          ? `${first.customerName || 'Customer'} · ${first.itemName}`
          : 'Open Ready when the customer comes in.',
      orderId: ready.length === 1 ? first.id : undefined,
    });
  }
  return shown;
}

/** The few open orders worth updating from the desk, most urgent first. */
export function ordersToUpdate(orders: Order[], today = todayISO()): Order[] {
  const rank = (order: Order) => {
    const due = dayKey(order.expectedDeliveryDate);
    if (due && due < today && order.status !== 'Ready for Collection') {
      return 0;
    }
    if (due && due === today && order.status !== 'Ready for Collection') {
      return 1;
    }
    if (order.status === 'Ready for Collection') {
      return 2;
    }
    return 3;
  };
  return orders
    .filter(order => openOrder(order) && nextOrderStatus(order.status))
    .sort((left, right) => rank(left) - rank(right))
    .slice(0, 2);
}
