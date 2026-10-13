import type {
  Order,
  OrderEvent,
  OrderInput,
  OrderPiece,
  OrderPieceInput,
  OrderStatus,
  SqlExecutor,
  SqlRow,
} from '../types';
import {formatOrderNumber, nextSequence} from '../utils/orderNumbers';
import {READY_STATUS} from '../utils/orderStatus';
import {rowsOf} from './rows';

const ORDER_SELECT = `
  SELECT
    orders.*,
    customers.name AS customer_name,
    customers.phone AS customer_phone
  FROM orders
  LEFT JOIN customers ON customers.id = orders.customer_id
`;

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed : null;
}

function text(value: SqlRow[string]): string {
  return value == null || value === '' ? '' : String(value);
}

export function mapOrder(row: SqlRow | undefined): Order | null {
  if (!row) {
    return null;
  }
  return {
    id: Number(row.id),
    orderNumber: text(row.order_number),
    customerId: Number(row.customer_id),
    customerName: text(row.customer_name),
    customerPhone: text(row.customer_phone),
    itemName: text(row.item_name),
    description: text(row.description),
    orderDate: text(row.order_date),
    expectedDeliveryDate: text(row.expected_delivery_date),
    status: text(row.status) as OrderStatus,
    readyAt: text(row.ready_at),
    employeeNotes: text(row.employee_notes),
    category: text(row.category) || 'Other',
    pieces: [],
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

export function nextOrderNumber(executor: SqlExecutor): string {
  const year = new Date().getFullYear();
  const prefix = `PG-${year}-`;
  const rows = rowsOf(
    executor.execute(
      `SELECT order_number
       FROM orders
       WHERE order_number LIKE ?
       ORDER BY order_number DESC
       LIMIT 1`,
      [`${prefix}%`],
    ),
  );
  return formatOrderNumber(
    year,
    nextSequence(
      rows[0]?.order_number == null ? undefined : String(rows[0].order_number),
      prefix,
    ),
  );
}

type OrderWrite = OrderInput & {
  orderNumber?: string;
  readyAt: string | null;
  createdAt?: string;
  updatedAt: string;
  id?: number;
};

export function insertOrder(executor: SqlExecutor, order: OrderWrite): void {
  executor.execute(
    `INSERT INTO orders (
      order_number, customer_id, item_name, description, order_date,
      expected_delivery_date, status, ready_at, employee_notes, category,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      order.orderNumber,
      order.customerId,
      order.itemName,
      blankToNull(order.description),
      order.orderDate,
      blankToNull(order.expectedDeliveryDate),
      order.status,
      order.readyAt,
      blankToNull(order.employeeNotes),
      order.category || 'Other',
      order.createdAt,
      order.updatedAt,
    ],
  );
}

export function updateOrder(executor: SqlExecutor, order: OrderWrite): void {
  executor.execute(
    `UPDATE orders
     SET customer_id = ?, item_name = ?, description = ?, order_date = ?,
         expected_delivery_date = ?, status = ?, ready_at = ?, employee_notes = ?,
         category = ?, updated_at = ?
     WHERE id = ?`,
    [
      order.customerId,
      order.itemName,
      blankToNull(order.description),
      order.orderDate,
      blankToNull(order.expectedDeliveryDate),
      order.status,
      order.readyAt,
      blankToNull(order.employeeNotes),
      order.category || 'Other',
      order.updatedAt,
      order.id,
    ],
  );
}

function mapPiece(row: SqlRow): OrderPiece {
  return {
    id: Number(row.id),
    orderId: Number(row.order_id),
    tagNumber: text(row.tag_number),
    itemName: text(row.item_name),
    category: text(row.category) || 'Other',
    description: text(row.description),
    imageUri: row.image_uri ? String(row.image_uri) : '',
  };
}

export function listOrderTagNumbers(executor: SqlExecutor): string[] {
  return rowsOf(executor.execute('SELECT tag_number FROM order_items')).map(row =>
    text(row.tag_number),
  );
}

export function listPieces(executor: SqlExecutor, orderId: number): OrderPiece[] {
  return rowsOf(
    executor.execute(
      `SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC`,
      [Number(orderId)],
    ),
  ).map(mapPiece);
}

export function replacePieces(
  executor: SqlExecutor,
  orderId: number,
  pieces: OrderPieceInput[],
  now: string,
): void {
  executor.execute('DELETE FROM order_items WHERE order_id = ?', [Number(orderId)]);
  pieces.forEach(piece => {
    executor.execute(
      `INSERT INTO order_items (
         order_id, tag_number, item_name, category, description, image_uri, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(orderId),
        piece.tagNumber.trim(),
        piece.itemName,
        piece.category || 'Other',
        blankToNull(piece.description),
        blankToNull(piece.imageUri),
        now,
        now,
      ],
    );
  });
}

export function getOrderById(executor: SqlExecutor, id: number): Order | null {
  const rows = rowsOf(
    executor.execute(`${ORDER_SELECT} WHERE orders.id = ?`, [Number(id)]),
  );
  const order = mapOrder(rows[0]);
  if (!order) {
    return null;
  }
  return {...order, pieces: listPieces(executor, order.id)};
}

export function listOrdersByCustomer(
  executor: SqlExecutor,
  customerId: number,
): Order[] {
  return rowsOf(
    executor.execute(
      `${ORDER_SELECT} WHERE orders.customer_id = ? ORDER BY orders.updated_at DESC`,
      [Number(customerId)],
    ),
  ).map(row => {
    const order = mapOrder(row) as Order;
    return {...order, pieces: listPieces(executor, order.id)};
  });
}

export function searchOrders(
  executor: SqlExecutor,
  query = '',
  status = '',
  category = '',
): Order[] {
  const term = String(query || '').trim();
  const like = `%${term.replace(/[\\%_]/g, char => `\\${char}`)}%`;
  const statusFilter = status || '';
  return rowsOf(
    executor.execute(
      `${ORDER_SELECT}
       WHERE (? = '' OR orders.order_number LIKE ? ESCAPE '\\'
          OR orders.item_name LIKE ? ESCAPE '\\'
          OR customers.name LIKE ? ESCAPE '\\'
          OR customers.phone LIKE ? ESCAPE '\\')
         AND (? = '' OR orders.status = ?)
         AND (? = '' OR orders.category = ?)
       ORDER BY orders.updated_at DESC, orders.id DESC`,
      [term, like, like, like, like, statusFilter, statusFilter, category, category],
    ),
  ).map(row => mapOrder(row) as Order);
}

export function insertOrderEvent(
  executor: SqlExecutor,
  event: {orderId: number; label: string; detail: string; happenedAt: string},
): void {
  executor.execute(
    `INSERT INTO order_events (order_id, label, detail, happened_at)
     VALUES (?, ?, ?, ?)`,
    [event.orderId, event.label, blankToNull(event.detail), event.happenedAt],
  );
}

export function listOrderEvents(executor: SqlExecutor, orderId: number): OrderEvent[] {
  return rowsOf(
    executor.execute(
      `SELECT * FROM order_events
       WHERE order_id = ?
       ORDER BY happened_at ASC, id ASC`,
      [Number(orderId)],
    ),
  ).map(row => ({
    id: Number(row.id),
    orderId: Number(row.order_id),
    label: text(row.label),
    detail: text(row.detail),
    happenedAt: text(row.happened_at),
  }));
}

export function listReadyOrders(executor: SqlExecutor): Order[] {
  return rowsOf(
    executor.execute(
      `${ORDER_SELECT}
       WHERE orders.status = ?
       ORDER BY orders.ready_at DESC, orders.id DESC`,
      [READY_STATUS],
    ),
  ).map(row => mapOrder(row) as Order);
}

export function dashboardCounts(executor: SqlExecutor): {
  customers: number;
  pending: number;
  preparing: number;
  ready: number;
} {
  const rows = rowsOf(
    executor.execute(
      `SELECT
        (SELECT COUNT(*) FROM customers) AS customers,
        (SELECT COUNT(*) FROM orders WHERE status = 'Pending') AS pending,
        (SELECT COUNT(*) FROM orders WHERE status = 'In Preparation') AS preparing,
        (SELECT COUNT(*) FROM orders WHERE status = 'Ready for Collection') AS ready`,
    ),
  );
  const row = rows[0] || {};
  return {
    customers: Number(row.customers || 0),
    pending: Number(row.pending || 0),
    preparing: Number(row.preparing || 0),
    ready: Number(row.ready || 0),
  };
}
