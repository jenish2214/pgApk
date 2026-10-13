import {ORDER_STATUSES, READY_STATUS, type OrderStatus} from '../types';

export {ORDER_STATUSES, READY_STATUS};
export type {OrderStatus};

export function isOrderStatus(status: string): status is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(status);
}

/** The next step an employee can take inside the app. */
export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  if (status === 'Pending') {
    return 'In Preparation';
  }
  if (status === 'In Preparation') {
    return READY_STATUS;
  }
  if (status === READY_STATUS) {
    return 'Delivered';
  }
  return null;
}

export function nextStatusLabel(status: OrderStatus): string {
  if (status === 'Pending') {
    return 'Start preparation';
  }
  if (status === 'In Preparation') {
    return 'Mark ready';
  }
  if (status === READY_STATUS) {
    return 'Mark delivered';
  }
  return 'Update order';
}
