import {getCustomerById, insertCustomer} from '../database/customerRepository';
import {getDatabase, withTransaction} from '../database/database';
import {
  getRepairById,
  insertRepair,
  listRepairsByCustomer,
  replaceRepairPieces,
  searchRepairs,
  updateRepair,
} from '../database/repairRepository';
import {lastInsertId} from '../database/rows';
import type {Repair, RepairInput, RepairPieceInput, SqlExecutor} from '../types';
import {REPAIR_KINDS, REPAIR_METALS, REPAIR_STATUSES} from '../types';
import {nowISO} from '../utils/dates';
import {notifyShopChanged} from './shopEvents';
import {hasFieldErrors, isValidPhone, validateRepair, validationError} from '../utils/validation';

function commit<T>(result: Promise<T>): Promise<T> {
  return result.then(value => {
    notifyShopChanged();
    return value;
  });
}

function normalizePieces(input: RepairInput): RepairPieceInput[] {
  const source = input.pieces?.length
    ? input.pieces
    : [
        {
          itemName: input.itemName,
          weight: input.weight,
          metal: input.metal,
          repairKind: input.repairKind,
          details: input.details,
        },
      ];
  return source.map(piece => ({
    itemName: String(piece.itemName || '').trim(),
    weight: String(piece.weight || '').trim(),
    metal: (REPAIR_METALS as readonly string[]).includes(piece.metal) ? piece.metal : 'Gold',
    repairKind: (REPAIR_KINDS as readonly string[]).includes(piece.repairKind)
      ? piece.repairKind
      : 'Other',
    details: String(piece.details || '').trim(),
  }));
}

function cleanRepair(input: RepairInput): RepairInput {
  const status = (REPAIR_STATUSES as readonly string[]).includes(input.status)
    ? input.status
    : 'Received';
  const pieces = normalizePieces(input);
  const first = pieces[0] || {
    itemName: '',
    weight: '',
    metal: 'Gold',
    repairKind: 'Other',
    details: '',
  };
  const more = Math.max(pieces.length - 1, 0);
  const weights = pieces
    .map(piece => Number(piece.weight))
    .filter(value => !Number.isNaN(value));
  const total = weights.reduce((sum, value) => sum + value, 0);
  return {
    customerId: input.customerId ? Number(input.customerId) : null,
    customerName: String(input.customerName || '').trim(),
    phone: String(input.phone || '').trim(),
    address: String(input.address || '').trim(),
    itemName: more > 0 ? `${first.itemName} + ${more} more` : first.itemName,
    weight: weights.length ? String(Math.round(total * 100) / 100) : first.weight,
    metal: first.metal,
    repairKind: first.repairKind,
    details: pieces
      .map(piece => piece.details || '')
      .filter(Boolean)
      .join('\n'),
    receivedDate: String(input.receivedDate || '').trim(),
    status,
    pieces,
  };
}

function resolveCustomer(tx: SqlExecutor, input: RepairInput, allowCreate: boolean): RepairInput {
  if (input.customerId) {
    const customer = getCustomerById(tx, input.customerId);
    if (!customer) {
      throw new Error('That customer is no longer in the shop records.');
    }
    return {
      ...input,
      customerId: customer.id,
      customerName: input.customerName || customer.name,
      phone: input.phone || customer.phone,
      address: input.address || customer.address,
    };
  }
  if (allowCreate && isValidPhone(input.phone || '') && input.customerName.trim().length >= 2) {
    insertCustomer(tx, {
      name: input.customerName,
      phone: String(input.phone),
      address: input.address || '',
      notes: 'Opened from a repair.',
      createdAt: nowISO(),
    });
    return {...input, customerId: lastInsertId(tx)};
  }
  return {...input, customerId: null};
}

export function listRepairs(query = ''): Repair[] {
  return searchRepairs(getDatabase(), query);
}

export function listCustomerRepairs(customerId: number): Repair[] {
  return listRepairsByCustomer(getDatabase(), customerId);
}

export function getRepair(id: number): Repair | null {
  return getRepairById(getDatabase(), id);
}

export function createRepair(input: RepairInput): Promise<Repair | null> {
  const repair = cleanRepair(input);
  const fields = validateRepair(repair);
  if (hasFieldErrors(fields)) {
    throw validationError(fields);
  }
  return commit(
    withTransaction(tx => {
      const linked = resolveCustomer(tx, repair, true);
      const now = nowISO();
      insertRepair(tx, {...linked, createdAt: now, updatedAt: now});
      const repairId = lastInsertId(tx);
      replaceRepairPieces(tx, repairId, linked.pieces || [], now);
      return getRepairById(tx, repairId);
    }),
  );
}

export function saveRepair(id: number, input: RepairInput): Promise<Repair | null> {
  const repair = cleanRepair(input);
  const fields = validateRepair(repair);
  if (hasFieldErrors(fields)) {
    throw validationError(fields);
  }
  return commit(
    withTransaction(tx => {
      const existing = getRepairById(tx, id);
      if (!existing) {
        throw new Error('This repair could not be found.');
      }
      const linked = resolveCustomer(tx, repair, !repair.customerId);
      const now = nowISO();
      updateRepair(tx, {...linked, id, updatedAt: now});
      replaceRepairPieces(tx, id, linked.pieces || [], now);
      return getRepairById(tx, id);
    }),
  );
}
