import type {
  Inquiry,
  InquiryInput,
  InquiryPiece,
  InquiryPieceInput,
  InquiryStatus,
  SqlExecutor,
  SqlRow,
} from '../types';
import {groupByParent, rowsOf} from './rows';

function blankToNull(value: string | null | undefined): string | null {
  const text = String(value || '').trim();
  return text ? text : null;
}

function statusOf(value: unknown): InquiryStatus {
  const status = String(value || '');
  if (status === 'Bought' || status === 'Closed' || status === 'Waiting') {
    return status;
  }
  return 'Waiting';
}

export function mapInquiry(row: SqlRow | undefined): Inquiry | null {
  if (!row) {
    return null;
  }
  return {
    id: Number(row.id),
    customerId: row.customer_id == null ? null : Number(row.customer_id),
    customerName: String(row.customer_name ?? ''),
    phone: row.phone ? String(row.phone) : '',
    itemName: String(row.item_name ?? ''),
    note: row.note ? String(row.note) : '',
    followUpDate: String(row.follow_up_date ?? ''),
    status: statusOf(row.status),
    pieces: [],
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

export function insertInquiry(
  executor: SqlExecutor,
  inquiry: InquiryInput & {createdAt: string; updatedAt: string},
): void {
  executor.execute(
    `INSERT INTO inquiries (
      customer_id, customer_name, phone, item_name, note,
      follow_up_date, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      inquiry.customerId || null,
      inquiry.customerName,
      blankToNull(inquiry.phone),
      inquiry.itemName,
      blankToNull(inquiry.note),
      inquiry.followUpDate,
      inquiry.status,
      inquiry.createdAt,
      inquiry.updatedAt,
    ],
  );
}

export function updateInquiry(
  executor: SqlExecutor,
  inquiry: InquiryInput & {id: number; updatedAt: string},
): void {
  executor.execute(
    `UPDATE inquiries
     SET customer_id = ?, customer_name = ?, phone = ?, item_name = ?,
         note = ?, follow_up_date = ?, status = ?, updated_at = ?
     WHERE id = ?`,
    [
      inquiry.customerId || null,
      inquiry.customerName,
      blankToNull(inquiry.phone),
      inquiry.itemName,
      blankToNull(inquiry.note),
      inquiry.followUpDate,
      inquiry.status,
      inquiry.updatedAt,
      inquiry.id,
    ],
  );
}

function mapPiece(row: SqlRow): InquiryPiece {
  return {
    id: Number(row.id),
    inquiryId: Number(row.inquiry_id),
    tagNumber: String(row.tag_number ?? ''),
    itemName: String(row.item_name ?? ''),
    imageUri: row.image_uri ? String(row.image_uri) : '',
  };
}

export function listInquiryPieces(executor: SqlExecutor, inquiryId: number): InquiryPiece[] {
  return rowsOf(
    executor.execute(
      `SELECT * FROM inquiry_items WHERE inquiry_id = ? ORDER BY id ASC`,
      [Number(inquiryId)],
    ),
  ).map(mapPiece);
}

export function listTagNumbers(executor: SqlExecutor): string[] {
  return rowsOf(executor.execute('SELECT tag_number FROM inquiry_items')).map(row =>
    String(row.tag_number ?? ''),
  );
}

export function replaceInquiryPieces(
  executor: SqlExecutor,
  inquiryId: number,
  pieces: InquiryPieceInput[],
  now: string,
): void {
  executor.execute('DELETE FROM inquiry_items WHERE inquiry_id = ?', [Number(inquiryId)]);
  pieces.forEach(piece => {
    executor.execute(
      `INSERT INTO inquiry_items (
         inquiry_id, tag_number, item_name, image_uri, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        Number(inquiryId),
        piece.tagNumber.trim(),
        piece.itemName.trim(),
        blankToNull(piece.imageUri),
        now,
        now,
      ],
    );
  });
}

function attachInquiryPieces(executor: SqlExecutor, inquiries: Inquiry[]): Inquiry[] {
  if (inquiries.length === 0) {
    return inquiries;
  }
  const ids = inquiries.map(item => item.id);
  const pieces = groupByParent(
    rowsOf(
      executor.execute(
        `SELECT * FROM inquiry_items WHERE inquiry_id IN (${ids.map(() => '?').join(', ')}) ORDER BY id ASC`,
        ids,
      ),
    ),
    'inquiry_id',
    mapPiece,
  );
  return inquiries.map(item => ({...item, pieces: pieces.get(item.id) ?? []}));
}

function withPieces(executor: SqlExecutor, inquiry: Inquiry | null): Inquiry | null {
  if (!inquiry) {
    return null;
  }
  return {...inquiry, pieces: listInquiryPieces(executor, inquiry.id)};
}

export function getInquiryById(executor: SqlExecutor, id: number): Inquiry | null {
  const rows = rowsOf(
    executor.execute('SELECT * FROM inquiries WHERE id = ?', [Number(id)]),
  );
  return withPieces(executor, mapInquiry(rows[0]));
}

export function listInquiriesByCustomer(
  executor: SqlExecutor,
  customerId: number,
): Inquiry[] {
  const rows = rowsOf(
    executor.execute(
      `SELECT * FROM inquiries
       WHERE customer_id = ?
       ORDER BY follow_up_date ASC, id DESC`,
      [Number(customerId)],
    ),
  ).map(row => mapInquiry(row) as Inquiry);
  return attachInquiryPieces(executor, rows);
}

export function searchInquiries(executor: SqlExecutor, query = ''): Inquiry[] {
  const term = `%${String(query || '').trim()}%`;
  const hasQuery = String(query || '').trim().length > 0;
  const rows = rowsOf(
    executor.execute(
      `SELECT * FROM inquiries
       WHERE (? = 0) OR customer_name LIKE ? OR phone LIKE ? OR item_name LIKE ?
          OR id IN (
            SELECT inquiry_id FROM inquiry_items
            WHERE tag_number LIKE ? OR item_name LIKE ?
          )
       ORDER BY CASE status WHEN 'Waiting' THEN 0 WHEN 'Bought' THEN 1 ELSE 2 END,
                follow_up_date ASC, id DESC`,
      [hasQuery ? 1 : 0, term, term, term, term, term],
    ),
  ).map(row => mapInquiry(row) as Inquiry);
  return attachInquiryPieces(executor, rows);
}
