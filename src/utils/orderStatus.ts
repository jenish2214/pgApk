import {ORDER_STATUSES, READY_STATUS, type OrderStatus} from '../types';

export {ORDER_STATUSES, READY_STATUS};
export type {OrderStatus};

export function isOrderStatus(status: string): status is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(status);
}
