import {insertCustomer, getCustomerById} from '../database/customerRepository';
import {getDatabase, withTransaction} from '../database/database';
import {
  getInquiryById,
  insertInquiry,
  listInquiriesByCustomer,
  listTagNumbers,
  replaceInquiryPieces,
  searchInquiries,
  updateInquiry,
} from '../database/inquiryRepository';
import {lastInsertId} from '../database/rows';
import type {Inquiry, InquiryInput, InquiryPieceInput, SqlExecutor} from '../types';
import {INQUIRY_STATUSES} from '../types';
import {nowISO} from '../utils/dates';
import {notifyShopChanged} from './shopEvents';
import {isValidPhone} from '../utils/validation';
import {
  hasFieldErrors,
  validateInquiry,
  validationError,
} from '../utils/validation';

function commit<T>(result: Promise<T>): Promise<T> {
  return result.then(value => {
    notifyShopChanged();
    return value;
  });
}

function normalizePieces(input: InquiryInput): InquiryPieceInput[] {
  const source = input.pieces?.length
    ? input.pieces
    : [{tagNumber: '', itemName: input.itemName, imageUri: ''}];
  return source.map(piece => ({
    tagNumber: String(piece.tagNumber || '').trim(),
    itemName: String(piece.itemName || '').trim(),
    imageUri: String(piece.imageUri || '').trim(),
  }));
}

function cleanInquiry(input: InquiryInput): InquiryInput {
  const status = INQUIRY_STATUSES.includes(input.status as (typeof INQUIRY_STATUSES)[number])
    ? input.status
    : 'Waiting';
  const pieces = normalizePieces(input);
  const names = pieces.map(piece => piece.itemName).filter(Boolean);
  const itemName =
    names.length > 1 ? `${names[0]} + ${names.length - 1} more` : names[0] || '';
  return {
    customerId: input.customerId ? Number(input.customerId) : null,
    customerName: String(input.customerName || '').trim(),
    phone: String(input.phone || '').trim(),
    itemName,
    note: String(input.note || '').trim(),
    followUpDate: String(input.followUpDate || '').trim(),
    status,
    pieces,
  };
}

function resolveCustomer(
  tx: SqlExecutor,
  input: InquiryInput,
  allowCreate: boolean,
): InquiryInput {
  if (input.customerId) {
    const customer = getCustomerById(tx, input.customerId);
    if (!customer) {
      throw new Error('That customer is no longer in the shop records.');
    }
    return {
      ...input,
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
    };
  }
  if (
    allowCreate &&
    isValidPhone(input.phone || '') &&
    input.customerName.trim().length >= 2
  ) {
    insertCustomer(tx, {
      name: input.customerName,
      phone: String(input.phone),
      address: '',
      notes: 'Opened from an inquiry.',
      createdAt: nowISO(),
    });
    return {...input, customerId: lastInsertId(tx)};
  }
  return {...input, customerId: null};
}

export function listInquiries(query = ''): Inquiry[] {
  return searchInquiries(getDatabase(), query);
}

export function listCustomerInquiries(customerId: number): Inquiry[] {
  return listInquiriesByCustomer(getDatabase(), customerId);
}

export function getInquiry(id: number): Inquiry | null {
  return getInquiryById(getDatabase(), id);
}

export function shopTagNumbers(): string[] {
  return listTagNumbers(getDatabase());
}

export function createInquiry(input: InquiryInput): Promise<Inquiry | null> {
  const inquiry = cleanInquiry(input);
  const fields = validateInquiry(inquiry);
  if (hasFieldErrors(fields)) {
    throw validationError(fields);
  }
  return commit(
    withTransaction(tx => {
      const linked = resolveCustomer(tx, inquiry, true);
      const now = nowISO();
      insertInquiry(tx, {...linked, createdAt: now, updatedAt: now});
      const inquiryId = lastInsertId(tx);
      replaceInquiryPieces(tx, inquiryId, linked.pieces || [], now);
      return getInquiryById(tx, inquiryId);
    }),
  );
}

export function saveInquiry(id: number, input: InquiryInput): Promise<Inquiry | null> {
  const inquiry = cleanInquiry(input);
  const fields = validateInquiry(inquiry);
  if (hasFieldErrors(fields)) {
    throw validationError(fields);
  }
  return commit(
    withTransaction(tx => {
      const existing = getInquiryById(tx, id);
      if (!existing) {
        throw new Error('This inquiry could not be found.');
      }
      const linked = resolveCustomer(tx, inquiry, !inquiry.customerId);
      const now = nowISO();
      updateInquiry(tx, {...linked, id, updatedAt: now});
      replaceInquiryPieces(tx, id, linked.pieces || [], now);
      return getInquiryById(tx, id);
    }),
  );
}
