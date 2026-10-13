import type {Collection, Product, SqlExecutor, SqlRow} from '../types';
import {rowsOf} from './rows';

export function mapProduct(row: SqlRow | undefined): Product | null {
  if (!row) {
    return null;
  }
  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    metal: String(row.metal ?? ''),
    price: Number(row.price),
    badge: row.badge ? String(row.badge) : '',
    category: String(row.category ?? ''),
    imageKey: String(row.image_key ?? ''),
    description: row.description ? String(row.description) : '',
    isFavorite: Number(row.is_favorite) === 1,
  };
}

export function mapCollection(row: SqlRow | undefined): Collection | null {
  if (!row) {
    return null;
  }
  return {
    id: Number(row.id),
    kicker: String(row.kicker ?? ''),
    title: String(row.title ?? ''),
    actionLabel: String(row.action_label ?? ''),
    category: String(row.category ?? ''),
    imageKey: String(row.image_key ?? ''),
  };
}

export function getFeaturedCollection(executor: SqlExecutor): Collection | null {
  const rows = rowsOf(
    executor.execute('SELECT * FROM collections ORDER BY id ASC LIMIT 1'),
  );
  return mapCollection(rows[0]);
}

export function listProducts(executor: SqlExecutor): Product[] {
  return rowsOf(
    executor.execute('SELECT * FROM products ORDER BY sort_order ASC, id ASC'),
  ).map(row => mapProduct(row) as Product);
}

export function getProductById(
  executor: SqlExecutor,
  id: number,
): Product | null {
  const rows = rowsOf(
    executor.execute('SELECT * FROM products WHERE id = ?', [Number(id)]),
  );
  return mapProduct(rows[0]);
}

export function setProductFavorite(
  executor: SqlExecutor,
  id: number,
  isFavorite: boolean,
): void {
  executor.execute('UPDATE products SET is_favorite = ? WHERE id = ?', [
    isFavorite ? 1 : 0,
    Number(id),
  ]);
}
