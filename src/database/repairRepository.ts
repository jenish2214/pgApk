import type {
  Repair,
  RepairInput,
  RepairPiece,
  RepairPieceInput,
  RepairStatus,
  SqlExecutor,
  SqlRow,
} from '../types';
import {REPAIR_STATUSES} from '../types';
import {groupByParent, rowsOf} from './rows';

function blankToNull(value: string | null | undefined): string | null {
  const text = String(value || '').trim();
  return text ? text : null;
}

function statusOf(value: unknown): RepairStatus {
  const status = String(value || '');
  if ((REPAIR_STATUSES as readonly string[]).includes(status)) {
    return status as RepairStatus;
  }
  return 'Received';
}

export function mapRepair(row: SqlRow | undefined): Repair | null {
  if (!row) {
    return null;
  }
  return {
    id: Number(row.id),
    customerId: row.customer_id == null ? null : Number(row.customer_id),
    customerName: String(row.customer_name ?? ''),
    phone: row.phone ? String(row.phone) : '',
    address: row.address ? String(row.address) : '',
    itemName: String(row.item_name ?? ''),
    weight: row.weight ? String(row.weight) : '',
    metal: String(row.metal ?? 'Gold'),
    repairKind: String(row.repair_kind ?? ''),
    details: row.details ? String(row.details) : '',
    pieces: [],
    receivedDate: String(row.received_date ?? ''),
    status: statusOf(row.status),
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

export function insertRepair(
  executor: SqlExecutor,
  repair: RepairInput & {createdAt: string; updatedAt: string},
): void {
  executor.execute(
    `INSERT INTO repairs (
      customer_id, customer_name, phone, address, item_name, weight, metal,
      repair_kind, details, received_date, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      repair.customerId || null,
      repair.customerName,
      blankToNull(repair.phone),
      blankToNull(repair.address),
      repair.itemName,
      blankToNull(repair.weight),
      repair.metal,
      repair.repairKind,
      blankToNull(repair.details),
      repair.receivedDate,
      repair.status,
      repair.createdAt,
      repair.updatedAt,
    ],
  );
}

export function updateRepair(
  executor: SqlExecutor,
  repair: RepairInput & {id: number; updatedAt: string},
): void {
  executor.execute(
    `UPDATE repairs
     SET customer_id = ?, customer_name = ?, phone = ?, address = ?, item_name = ?,
         weight = ?, metal = ?, repair_kind = ?, details = ?, received_date = ?,
         status = ?, updated_at = ?
     WHERE id = ?`,
    [
      repair.customerId || null,
      repair.customerName,
      blankToNull(repair.phone),
      blankToNull(repair.address),
      repair.itemName,
      blankToNull(repair.weight),
      repair.metal,
      repair.repairKind,
      blankToNull(repair.details),
      repair.receivedDate,
      repair.status,
      repair.updatedAt,
      repair.id,
    ],
  );
}

function mapPiece(row: SqlRow): RepairPiece {
  return {
    id: Number(row.id),
    repairId: Number(row.repair_id),
    itemName: String(row.item_name ?? ''),
    weight: row.weight ? String(row.weight) : '',
    metal: String(row.metal ?? 'Gold'),
    repairKind: String(row.repair_kind ?? ''),
    details: row.details ? String(row.details) : '',
  };
}

export function listRepairPieces(executor: SqlExecutor, repairId: number): RepairPiece[] {
  return rowsOf(
    executor.execute(
      `SELECT * FROM repair_items WHERE repair_id = ? ORDER BY id ASC`,
      [Number(repairId)],
    ),
  ).map(mapPiece);
}

export function replaceRepairPieces(
  executor: SqlExecutor,
  repairId: number,
  pieces: RepairPieceInput[],
  now: string,
): void {
  executor.execute('DELETE FROM repair_items WHERE repair_id = ?', [Number(repairId)]);
  pieces.forEach(piece => {
    executor.execute(
      `INSERT INTO repair_items (
         repair_id, item_name, weight, metal, repair_kind, details, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(repairId),
        piece.itemName.trim(),
        blankToNull(piece.weight),
        piece.metal,
        piece.repairKind,
        blankToNull(piece.details),
        now,
        now,
      ],
    );
  });
}

function attachRepairPieces(executor: SqlExecutor, repairs: Repair[]): Repair[] {
  if (repairs.length === 0) {
    return repairs;
  }
  const ids = repairs.map(item => item.id);
  const pieces = groupByParent(
    rowsOf(
      executor.execute(
        `SELECT * FROM repair_items WHERE repair_id IN (${ids.map(() => '?').join(', ')}) ORDER BY id ASC`,
        ids,
      ),
    ),
    'repair_id',
    mapPiece,
  );
  return repairs.map(item => ({...item, pieces: pieces.get(item.id) ?? []}));
}

function withPieces(executor: SqlExecutor, repair: Repair | null): Repair | null {
  if (!repair) {
    return null;
  }
  return {...repair, pieces: listRepairPieces(executor, repair.id)};
}

export function getRepairById(executor: SqlExecutor, id: number): Repair | null {
  const rows = rowsOf(executor.execute('SELECT * FROM repairs WHERE id = ?', [Number(id)]));
  return withPieces(executor, mapRepair(rows[0]));
}

export function listRepairsByCustomer(executor: SqlExecutor, customerId: number): Repair[] {
  const rows = rowsOf(
    executor.execute(
      `SELECT * FROM repairs WHERE customer_id = ? ORDER BY received_date DESC, id DESC`,
      [Number(customerId)],
    ),
  ).map(row => mapRepair(row) as Repair);
  return attachRepairPieces(executor, rows);
}

export function searchRepairs(executor: SqlExecutor, query = ''): Repair[] {
  const term = `%${String(query || '').trim()}%`;
  const hasQuery = String(query || '').trim().length > 0;
  const rows = rowsOf(
    executor.execute(
      `SELECT * FROM repairs
       WHERE (? = 0) OR customer_name LIKE ? OR phone LIKE ? OR address LIKE ?
          OR item_name LIKE ? OR repair_kind LIKE ? OR metal LIKE ?
          OR id IN (
            SELECT repair_id FROM repair_items
            WHERE item_name LIKE ? OR repair_kind LIKE ? OR metal LIKE ?
          )
       ORDER BY CASE status
         WHEN 'In repair' THEN 0
         WHEN 'Received' THEN 1
         WHEN 'Ready' THEN 2
         ELSE 3
       END, received_date DESC, id DESC`,
      [hasQuery ? 1 : 0, term, term, term, term, term, term, term, term, term],
    ),
  ).map(row => mapRepair(row) as Repair);
  return attachRepairPieces(executor, rows);
}
