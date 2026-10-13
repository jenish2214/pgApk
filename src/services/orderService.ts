import {getCustomerById} from '../database/customerRepository';
import {getDatabase, withTransaction} from '../database/database';
import {lastInsertId} from '../database/rows';
import {
  dashboardCounts,
  getOrderById,
  insertOrder,
  insertOrderEvent,
  listOrderEvents,
  listReadyOrders,
  nextOrderNumber,
  replacePieces,
  searchOrders,
  updateOrder,
} from '../database/orderRepository';
import type {Order, OrderEvent, OrderInput, OrderPieceInput, OrderStatus} from '../types';
import {isProductCategory} from '../utils/categories';
import {nowISO} from '../utils/dates';
import {isOrderStatus, READY_STATUS} from '../utils/orderStatus';
import {notifyShopChanged} from './shopEvents';
import {
  hasFieldErrors,
  validateOrder,
  validationError,
} from '../utils/validation';

function commit<T>(result: Promise<T>): Promise<T> {
  return result.then(value => {
    notifyShopChanged();
    return value;
  });
}

function normalizePieces(input: OrderInput): OrderPieceInput[] {
  const source = input.pieces?.length
    ? input.pieces
    : [
        {
          itemName: input.itemName,
          category: input.category,
          description: input.description,
        },
      ];
  return source.map(piece => ({
    itemName: String(piece.itemName || '').trim(),
    category: isProductCategory(piece.category) ? piece.category : 'Other',
    description: String(piece.description || '').trim(),
  }));
}

function summarizePieces(pieces: OrderPieceInput[]): {
  itemName: string;
  category: string;
  description: string;
} {
  const first = pieces[0] || {itemName: '', category: 'Other', description: ''};
  const more = Math.max(pieces.length - 1, 0);
  return {
    itemName: more > 0 ? `${first.itemName} + ${more} more` : first.itemName,
    category: first.category,
    description: pieces
      .map(piece => piece.description || '')
      .filter(Boolean)
      .join('\n'),
  };
}

function cleanOrder(input: OrderInput): OrderInput {
  const pieces = normalizePieces(input);
  const summary = summarizePieces(pieces);
  return {
    customerId: Number(input.customerId),
    itemName: summary.itemName,
    description: summary.description,
    orderDate: String(input.orderDate || '').trim(),
    expectedDeliveryDate: String(input.expectedDeliveryDate || '').trim(),
    status: isOrderStatus(input.status) ? input.status : 'Pending',
    employeeNotes: String(input.employeeNotes || '').trim(),
    category: summary.category,
    pieces,
  };
}

function recordEvent(
  executor: Parameters<typeof insertOrderEvent>[0],
  order: Order,
  label: string,
  detail: string,
  happenedAt: string,
): void {
  insertOrderEvent(executor, {
    orderId: order.id,
    label,
    detail,
    happenedAt,
  });
}

function readyTimestamp(
  previous: Order | null,
  status: OrderStatus,
  now: string,
): string | null {
  if (status !== READY_STATUS) {
    return previous?.readyAt || null;
  }
  if (previous?.status === READY_STATUS && previous.readyAt) {
    return previous.readyAt;
  }
  return now;
}

export function getDashboard(): {
  counts: ReturnType<typeof dashboardCounts>;
  readyOrders: Order[];
} {
  const db = getDatabase();
  return {
    counts: dashboardCounts(db),
    readyOrders: listReadyOrders(db),
  };
}

export function listOrders(query = '', status = '', category = ''): Order[] {
  return searchOrders(getDatabase(), query, status, category);
}

export function orderEvents(orderId: number): OrderEvent[] {
  return listOrderEvents(getDatabase(), orderId);
}

export function listReady(): Order[] {
  return listReadyOrders(getDatabase());
}

export function getOrder(id: number): Order | null {
  return getOrderById(getDatabase(), id);
}

export function createOrder(input: OrderInput): Promise<Order | null> {
  const order = cleanOrder(input);
  const fields = validateOrder(order);
  if (hasFieldErrors(fields)) {
    throw validationError(fields);
  }
  return commit(
    withTransaction(tx => {
      const customer = getCustomerById(tx, order.customerId);
      if (!customer) {
        throw new Error('Choose a customer who is already saved in the shop.');
      }
      const now = nowISO();
      insertOrder(tx, {
        ...order,
        orderNumber: nextOrderNumber(tx),
        readyAt: readyTimestamp(null, order.status, now),
        createdAt: now,
        updatedAt: now,
      });
      const savedId = lastInsertId(tx);
      replacePieces(tx, savedId, order.pieces || [], now);
      const saved = getOrderById(tx, savedId);
      if (saved) {
        const names = (order.pieces || []).map(piece => piece.itemName).join(', ');
        recordEvent(tx, saved, 'Order placed', names || saved.itemName, now);
      }
      return saved;
    }),
  );
}

export function createOrders(inputs: OrderInput[]): Promise<Order[]> {
  const orders = inputs.map(cleanOrder);
  orders.forEach(order => {
    const fields = validateOrder(order);
    if (hasFieldErrors(fields)) {
      throw validationError(fields);
    }
  });
  return commit(
    withTransaction(tx => {
      const customer = getCustomerById(tx, orders[0]?.customerId ?? 0);
      if (!customer) {
        throw new Error('Choose a customer who is already saved in the shop.');
      }
      return orders.map(order => {
        const now = nowISO();
        insertOrder(tx, {
          ...order,
          orderNumber: nextOrderNumber(tx),
          readyAt: readyTimestamp(null, order.status, now),
          createdAt: now,
          updatedAt: now,
        });
        const savedId = lastInsertId(tx);
        replacePieces(tx, savedId, order.pieces || [], now);
        const saved = getOrderById(tx, savedId);
        if (!saved) {
          throw new Error('The order could not be saved.');
        }
        recordEvent(tx, saved, 'Order placed', saved.itemName, now);
        return saved;
      });
    }),
  );
}

export function saveOrder(id: number, input: OrderInput): Promise<Order | null> {
  const order = cleanOrder(input);
  const fields = validateOrder(order);
  if (hasFieldErrors(fields)) {
    throw validationError(fields);
  }
  return commit(
    withTransaction(tx => {
      const existing = getOrderById(tx, id);
      if (!existing) {
        throw new Error('This order could not be found.');
      }
      const customer = getCustomerById(tx, order.customerId);
      if (!customer) {
        throw new Error('Choose a customer who is already saved in the shop.');
      }
      const now = nowISO();
      updateOrder(tx, {
        ...order,
        id: existing.id,
        readyAt: readyTimestamp(existing, order.status, now),
        updatedAt: now,
      });
      replacePieces(tx, existing.id, order.pieces || [], now);
      const saved = getOrderById(tx, existing.id);
      if (saved) {
        const names = (order.pieces || []).map(piece => piece.itemName).join(', ');
        const label = existing.status === order.status ? 'Order updated' : 'Status changed';
        const detail =
          existing.status === order.status ? names || saved.itemName : `${existing.status} → ${order.status}`;
        recordEvent(tx, saved, label, detail, now);
      }
      return saved;
    }),
  );
}

export function changeOrderStatus(
  id: number,
  status: OrderStatus,
): Promise<Order | null> {
  return commit(
    withTransaction(tx => {
      const existing = getOrderById(tx, id);
      if (!existing) {
        throw new Error('This order could not be found.');
      }
      const fields = validateOrder({...existing, status});
      if (fields.status) {
        throw validationError(fields);
      }
      const now = nowISO();
      updateOrder(tx, {
        ...existing,
        status,
        readyAt: readyTimestamp(existing, status, now),
        updatedAt: now,
      });
      const saved = getOrderById(tx, existing.id);
      if (saved && existing.status !== status) {
        recordEvent(tx, saved, 'Status changed', `${existing.status} → ${status}`, now);
      }
      return saved;
    }),
  );
}
