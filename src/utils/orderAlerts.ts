import type {Order} from '../types';
import {dayKey, todayISO} from './dates';

export type EmployeeAlert = {
  orderId: number;
  title: string;
  detail: string;
};

function openOrder(order: Order): boolean {
  return order.status !== 'Delivered' && order.status !== 'Cancelled';
}

/** What the employee should act on today. */
export function employeeAlerts(orders: Order[], today = todayISO()): EmployeeAlert[] {
  const alerts: EmployeeAlert[] = [];
  orders.forEach(order => {
    if (!openOrder(order)) {
      return;
    }
    const who = order.customerName || 'Customer';
    const piece = `${order.category || 'Other'} · ${order.itemName}`;
    if (order.status === 'Ready for Collection') {
      alerts.push({
        orderId: order.id,
        title: 'Ready for collection',
        detail: `${who} can collect ${piece}. ${order.orderNumber}`,
      });
      return;
    }
    const due = dayKey(order.expectedDeliveryDate);
    if (!due) {
      return;
    }
    if (due < today) {
      alerts.push({
        orderId: order.id,
        title: 'Delivery is late',
        detail: `${who}, ${piece}, was due ${due}. ${order.orderNumber}`,
      });
    } else if (due === today) {
      alerts.push({
        orderId: order.id,
        title: 'Due today',
        detail: `${who}, ${piece}, is expected today. ${order.orderNumber}`,
      });
    }
  });
  return alerts;
}
