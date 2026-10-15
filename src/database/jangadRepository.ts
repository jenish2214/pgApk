import type {
  Jangad,
  JangadDirection,
  JangadInput,
  JangadMove,
  JangadMoveInput,
  JangadPiece,
  JangadPieceInput,
  JangadStatus,
  SqlExecutor,
  SqlRow,
} from '../types';
import {JANGAD_DIRECTIONS, JANGAD_STATUSES} from '../types';
import {groupByParent, likeTerm, rowsOf} from './rows';

function blankToNull(value: string | null | undefined): string | null {
  const text = String(value || '').trim();
  return text ? text : null;
}

function statusOf(value: unknown): JangadStatus {
  const status = String(value || '');
  if ((JANGAD_STATUSES as readonly string[]).includes(status)) {
    return status as JangadStatus;
  }
  return 'Given';
}

export function mapJangad(row: SqlRow | undefined): Jangad | null {
  if (!row) {
    return null;
  }
  return {
    id: Number(row.id),
    shopName: String(row.shop_name ?? ''),
    givenBy: String(row.given_by ?? ''),
    receivedBy: String(row.received_by ?? ''),
    handedAt: String(row.handed_at ?? ''),
    note: row.note ? String(row.note) : '',
    status: statusOf(row.status),
    pieces: [],
    moves: [],
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

export function insertJangad(
  executor: SqlExecutor,
  jangad: JangadInput & {createdAt: string; updatedAt: string},
): void {
  executor.execute(
    `INSERT INTO jangads (
      shop_name, given_by, received_by, handed_at, note, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      jangad.shopName,
      jangad.givenBy,
      jangad.receivedBy,
      jangad.handedAt,
      blankToNull(jangad.note),
      jangad.status,
      jangad.createdAt,
      jangad.updatedAt,
    ],
  );
}

export function updateJangad(
  executor: SqlExecutor,
  jangad: JangadInput & {id: number; updatedAt: string},
): void {
  executor.execute(
    `UPDATE jangads
     SET shop_name = ?, given_by = ?, received_by = ?, handed_at = ?, note = ?,
         status = ?, updated_at = ?
     WHERE id = ?`,
    [
      jangad.shopName,
      jangad.givenBy,
      jangad.receivedBy,
      jangad.handedAt,
      blankToNull(jangad.note),
      jangad.status,
      jangad.updatedAt,
      jangad.id,
    ],
  );
}

function mapPiece(row: SqlRow): JangadPiece {
  return {
    id: Number(row.id),
    jangadId: Number(row.jangad_id),
    tagNumber: String(row.tag_number ?? ''),
    itemName: String(row.item_name ?? ''),
    quantity: Number(row.quantity ?? 1) || 1,
  };
}

function directionOf(value: unknown): JangadDirection {
  const direction = String(value || '');
  if ((JANGAD_DIRECTIONS as readonly string[]).includes(direction)) {
    return direction as JangadDirection;
  }
  return 'Exit';
}

function mapMove(row: SqlRow): JangadMove {
  return {
    id: Number(row.id),
    jangadId: Number(row.jangad_id),
    direction: directionOf(row.direction),
    quantity: Number(row.quantity ?? 1) || 1,
    movedAt: String(row.moved_at ?? ''),
    note: row.note ? String(row.note) : '',
  };
}

export function listJangadPieces(executor: SqlExecutor, jangadId: number): JangadPiece[] {
  return rowsOf(
    executor.execute(
      'SELECT * FROM jangad_items WHERE jangad_id = ? ORDER BY id ASC',
      [Number(jangadId)],
    ),
  ).map(mapPiece);
}

export function replaceJangadPieces(
  executor: SqlExecutor,
  jangadId: number,
  pieces: JangadPieceInput[],
  now: string,
): void {
  executor.execute('DELETE FROM jangad_items WHERE jangad_id = ?', [Number(jangadId)]);
  pieces.forEach(piece => {
    executor.execute(
      `INSERT INTO jangad_items (
         jangad_id, tag_number, item_name, quantity, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        Number(jangadId),
        piece.tagNumber.trim(),
        piece.itemName.trim(),
        piece.quantity,
        now,
        now,
      ],
    );
  });
}

export function listJangadMoves(executor: SqlExecutor, jangadId: number): JangadMove[] {
  return rowsOf(
    executor.execute(
      'SELECT * FROM jangad_moves WHERE jangad_id = ? ORDER BY moved_at ASC, id ASC',
      [Number(jangadId)],
    ),
  ).map(mapMove);
}

export function replaceJangadMoves(
  executor: SqlExecutor,
  jangadId: number,
  moves: JangadMoveInput[],
  now: string,
): void {
  executor.execute('DELETE FROM jangad_moves WHERE jangad_id = ?', [Number(jangadId)]);
  moves.forEach(move => {
    executor.execute(
      `INSERT INTO jangad_moves (
         jangad_id, direction, quantity, moved_at, note, created_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        Number(jangadId),
        move.direction,
        move.quantity,
        move.movedAt.trim(),
        blankToNull(move.note),
        now,
      ],
    );
  });
}

function attachJangadChildren(executor: SqlExecutor, jangads: Jangad[]): Jangad[] {
  if (jangads.length === 0) {
    return jangads;
  }
  const ids = jangads.map(item => item.id);
  const marks = ids.map(() => '?').join(', ');
  const pieces = groupByParent(
    rowsOf(
      executor.execute(
        `SELECT * FROM jangad_items WHERE jangad_id IN (${marks}) ORDER BY id ASC`,
        ids,
      ),
    ),
    'jangad_id',
    mapPiece,
  );
  const moves = groupByParent(
    rowsOf(
      executor.execute(
        `SELECT * FROM jangad_moves WHERE jangad_id IN (${marks}) ORDER BY moved_at ASC, id ASC`,
        ids,
      ),
    ),
    'jangad_id',
    mapMove,
  );
  return jangads.map(item => ({
    ...item,
    pieces: pieces.get(item.id) ?? [],
    moves: moves.get(item.id) ?? [],
  }));
}

function withPieces(executor: SqlExecutor, jangad: Jangad | null): Jangad | null {
  if (!jangad) {
    return null;
  }
  return {
    ...jangad,
    pieces: listJangadPieces(executor, jangad.id),
    moves: listJangadMoves(executor, jangad.id),
  };
}

export function getJangadById(executor: SqlExecutor, id: number): Jangad | null {
  const rows = rowsOf(executor.execute('SELECT * FROM jangads WHERE id = ?', [Number(id)]));
  return withPieces(executor, mapJangad(rows[0]));
}

export function searchJangads(executor: SqlExecutor, query = '', status = ''): Jangad[] {
  const term = likeTerm(query);
  const hasQuery = String(query || '').trim().length > 0;
  const statusFilter = (JANGAD_STATUSES as readonly string[]).includes(status) ? status : '';
  const rows = rowsOf(
    executor.execute(
      `SELECT * FROM jangads
       WHERE ((? = 0) OR shop_name LIKE ? ESCAPE '\\' OR given_by LIKE ? ESCAPE '\\' OR received_by LIKE ? ESCAPE '\\' OR note LIKE ? ESCAPE '\\'
          OR id IN (
            SELECT jangad_id FROM jangad_items
            WHERE tag_number LIKE ? ESCAPE '\\' OR item_name LIKE ? ESCAPE '\\'
          ))
         AND (? = '' OR status = ?)
       ORDER BY CASE status WHEN 'Given' THEN 0 ELSE 1 END, handed_at DESC, id DESC`,
      [
        hasQuery ? 1 : 0,
        term,
        term,
        term,
        term,
        term,
        term,
        statusFilter,
        statusFilter,
      ],
    ),
  ).map(row => mapJangad(row) as Jangad);
  return attachJangadChildren(executor, rows);
}

export function listJangadTagNumbers(executor: SqlExecutor): string[] {
  return rowsOf(
    executor.execute('SELECT tag_number FROM jangad_items WHERE tag_number != \'\''),
  ).map(row => String(row.tag_number ?? ''));
}
