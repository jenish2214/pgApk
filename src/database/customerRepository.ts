import type {Customer, CustomerInput, SqlExecutor, SqlRow} from '../types';
import {rowsOf} from './rows';

function blankToNull(value: string | null | undefined): string | null {
  const text = String(value || '').trim();
  return text ? text : null;
}

export function mapCustomer(row: SqlRow | undefined): Customer | null {
  if (!row) {
    return null;
  }
  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    phone: String(row.phone ?? ''),
    address: row.address ? String(row.address) : '',
    notes: row.notes ? String(row.notes) : '',
    createdAt: String(row.created_at ?? ''),
  };
}

export function insertCustomer(
  executor: SqlExecutor,
  customer: CustomerInput & {createdAt: string},
): void {
  executor.execute(
    `INSERT INTO customers (name, phone, address, notes, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      customer.name,
      customer.phone,
      blankToNull(customer.address),
      blankToNull(customer.notes),
      customer.createdAt,
    ],
  );
}

export function updateCustomer(
  executor: SqlExecutor,
  customer: CustomerInput & {id: number},
): void {
  executor.execute(
    `UPDATE customers
     SET name = ?, phone = ?, address = ?, notes = ?
     WHERE id = ?`,
    [
      customer.name,
      customer.phone,
      blankToNull(customer.address),
      blankToNull(customer.notes),
      customer.id,
    ],
  );
}

export function deleteCustomer(executor: SqlExecutor, id: number): void {
  executor.execute('DELETE FROM customers WHERE id = ?', [id]);
}

export function getCustomerById(
  executor: SqlExecutor,
  id: number,
): Customer | null {
  const rows = rowsOf(
    executor.execute('SELECT * FROM customers WHERE id = ?', [Number(id)]),
  );
  return mapCustomer(rows[0]);
}

export function searchCustomers(executor: SqlExecutor, query = ''): Customer[] {
  const term = String(query || '').trim();
  if (!term) {
    return rowsOf(
      executor.execute(
        'SELECT * FROM customers ORDER BY name COLLATE NOCASE ASC, id DESC',
      ),
    ).map(row => mapCustomer(row) as Customer);
  }
  const like = `%${term.replace(/[\\%_]/g, char => `\\${char}`)}%`;
  return rowsOf(
    executor.execute(
      `SELECT * FROM customers
       WHERE name LIKE ? ESCAPE '\\'
          OR phone LIKE ? ESCAPE '\\'
          OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE ? ESCAPE '\\'
       ORDER BY name COLLATE NOCASE ASC, id DESC`,
      [like, like, like],
    ),
  ).map(row => mapCustomer(row) as Customer);
}

export function countCustomers(executor: SqlExecutor): number {
  const rows = rowsOf(executor.execute('SELECT COUNT(*) AS total FROM customers'));
  return Number(rows[0]?.total || 0);
}

export function countOrdersForCustomer(
  executor: SqlExecutor,
  customerId: number,
): number {
  const rows = rowsOf(
    executor.execute(
      'SELECT COUNT(*) AS total FROM orders WHERE customer_id = ?',
      [Number(customerId)],
    ),
  );
  return Number(rows[0]?.total || 0);
}
