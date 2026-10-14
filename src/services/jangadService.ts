import {getDatabase, withTransaction} from '../database/database';
import {
  getJangadById,
  insertJangad,
  listJangadTagNumbers,
  replaceJangadMoves,
  replaceJangadPieces,
  searchJangads,
  updateJangad,
} from '../database/jangadRepository';
import {lastInsertId} from '../database/rows';
import type {Jangad, JangadInput, JangadMoveInput, JangadPieceInput, JangadStatus} from '../types';
import {JANGAD_DIRECTIONS, JANGAD_STATUSES} from '../types';
import {nowDateTime, nowISO} from '../utils/dates';
import {notifyShopChanged} from './shopEvents';
import {formatTagNumber} from '../utils/tags';
import {hasFieldErrors, validateJangad, validationError, wholeQuantity} from '../utils/validation';

function commit<T>(result: Promise<T>): Promise<T> {
  return result.then(value => {
    notifyShopChanged();
    return value;
  });
}

function normalizePieces(input: JangadInput): JangadPieceInput[] {
  const source = input.pieces?.length
    ? input.pieces
    : [{tagNumber: '', itemName: '', quantity: 0}];
  return source.map(piece => ({
    tagNumber: formatTagNumber(piece.tagNumber),
    itemName: String(piece.itemName || '').trim(),
    quantity: wholeQuantity(piece.quantity),
  }));
}

function normalizeMoves(input: JangadInput): JangadMoveInput[] {
  return (input.moves || []).map(move => ({
    direction: (JANGAD_DIRECTIONS as readonly string[]).includes(move.direction)
      ? move.direction
      : 'Exit',
    quantity: wholeQuantity(move.quantity),
    movedAt: String(move.movedAt || '').trim(),
    note: String(move.note || '').trim(),
  }));
}

function statusFromMoves(moves: JangadMoveInput[], fallback: JangadStatus): JangadStatus {
  if (
    moves.length === 0 ||
    moves.some(move => move.quantity < 1 || !move.movedAt)
  ) {
    return (JANGAD_STATUSES as readonly string[]).includes(fallback) ? fallback : 'Given';
  }
  const stillOut = moves.reduce(
    (sum, move) => sum + (move.direction === 'Exit' ? move.quantity : -move.quantity),
    0,
  );
  return stillOut > 0 ? 'Given' : 'Returned';
}

function cleanJangad(input: JangadInput): JangadInput {
  const moves = normalizeMoves(input);
  return {
    shopName: String(input.shopName || '').trim(),
    givenBy: String(input.givenBy || '').trim(),
    receivedBy: String(input.receivedBy || '').trim(),
    handedAt: String(input.handedAt || '').trim(),
    note: String(input.note || '').trim(),
    status: statusFromMoves(moves, input.status),
    pieces: normalizePieces(input),
    moves,
  };
}

export function jangadQuantity(jangad: Jangad): number {
  return jangad.pieces.reduce((sum, piece) => sum + (piece.quantity || 0), 0);
}

/** Pieces still out. A return entry brings this back to zero. */
export function outstandingJangad(jangad: Jangad): number {
  return jangad.moves.reduce(
    (sum, move) => sum + (move.direction === 'Exit' ? move.quantity : -move.quantity),
    0,
  );
}

export function listJangads(query = '', status = ''): Jangad[] {
  return searchJangads(getDatabase(), query, status);
}

export function getJangad(id: number): Jangad | null {
  return getJangadById(getDatabase(), id);
}

export function jangadTagNumbers(): string[] {
  return listJangadTagNumbers(getDatabase());
}

export function createJangad(input: JangadInput): Promise<Jangad | null> {
  const jangad = cleanJangad(input);
  const fields = validateJangad(jangad);
  if (hasFieldErrors(fields)) {
    throw validationError(fields);
  }
  return commit(
    withTransaction(tx => {
      const now = nowISO();
      insertJangad(tx, {...jangad, createdAt: now, updatedAt: now});
      const jangadId = lastInsertId(tx);
      replaceJangadPieces(tx, jangadId, jangad.pieces || [], now);
      replaceJangadMoves(tx, jangadId, jangad.moves || [], now);
      return getJangadById(tx, jangadId);
    }),
  );
}

/** Records a return entry for every piece still out, at the current date and time. */
export function returnJangad(id: number): Promise<Jangad | null> {
  const existing = getJangad(id);
  if (!existing) {
    return Promise.reject(new Error('This jangad could not be found.'));
  }
  const outstanding = outstandingJangad(existing);
  if (outstanding < 1) {
    return Promise.reject(new Error('This jangad is already back.'));
  }
  return saveJangad(id, {
    shopName: existing.shopName,
    givenBy: existing.givenBy,
    receivedBy: existing.receivedBy,
    handedAt: existing.handedAt,
    note: existing.note,
    status: 'Given',
    pieces: existing.pieces.map(piece => ({
      tagNumber: piece.tagNumber,
      itemName: piece.itemName,
      quantity: piece.quantity,
    })),
    moves: [
      ...existing.moves.map(move => ({
        direction: move.direction,
        quantity: move.quantity,
        movedAt: move.movedAt,
        note: move.note,
      })),
      {direction: 'Entry', quantity: outstanding, movedAt: nowDateTime(), note: ''},
    ],
  });
}

export function saveJangad(id: number, input: JangadInput): Promise<Jangad | null> {
  const jangad = cleanJangad(input);
  const fields = validateJangad(jangad);
  if (hasFieldErrors(fields)) {
    throw validationError(fields);
  }
  return commit(
    withTransaction(tx => {
      const existing = getJangadById(tx, id);
      if (!existing) {
        throw new Error('This jangad could not be found.');
      }
      const now = nowISO();
      updateJangad(tx, {...jangad, id, updatedAt: now});
      replaceJangadPieces(tx, id, jangad.pieces || [], now);
      replaceJangadMoves(tx, id, jangad.moves || [], now);
      return getJangadById(tx, id);
    }),
  );
}
