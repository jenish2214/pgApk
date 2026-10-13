import type {Inquiry, Order, Repair} from '../types';
import {dayKey, formatDateValue, parseShopDate} from './dates';

export type HistoryEntry = {
  key: string;
  day: string;
  title: string;
  lines: string[];
  phone: string;
  imageUri?: string;
  category?: string;
  orderId?: number;
  inquiryId?: number;
  repairId?: number;
};

function calendarDay(value: string): string {
  const shopDay = dayKey(value);
  if (shopDay) {
    return shopDay;
  }
  const parsed = parseShopDate(value);
  if (parsed) {
    return formatDateValue(parsed);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return formatDateValue(date);
}

function pieceLines(order: Order): string[] {
  if (order.pieces.length === 0) {
    return [`${order.category || 'Other'} · ${order.itemName}`];
  }
  return order.pieces.map(piece => {
    const tag = piece.tagNumber ? `Tag ${piece.tagNumber} · ` : '';
    const note = piece.description ? ` · ${piece.description}` : '';
    return `${tag}${piece.category || 'Other'} · ${piece.itemName}${note}`;
  });
}

/** Every order and inquiry for one customer, newest day first. */
export function customerHistory(
  orders: Order[],
  inquiries: Inquiry[],
  repairs: Repair[] = [],
): HistoryEntry[] {
  const rows: HistoryEntry[] = [
    ...orders.map(order => ({
      key: `order-${order.id}`,
      day: calendarDay(order.orderDate) || calendarDay(order.createdAt),
      title: order.orderNumber,
      lines: [
        order.status,
        ...pieceLines(order),
        order.expectedDeliveryDate
          ? `Delivery ${order.expectedDeliveryDate}`
          : 'Delivery not set',
        order.employeeNotes ? `Notes ${order.employeeNotes}` : '',
      ].filter(Boolean),
      phone: order.customerPhone,
      imageUri: order.pieces.find(piece => piece.imageUri)?.imageUri || '',
      category: order.category,
      orderId: order.id,
    })),
    ...inquiries.map(inquiry => ({
      key: `inquiry-${inquiry.id}`,
      day: calendarDay(inquiry.createdAt) || calendarDay(inquiry.followUpDate),
      title: inquiry.itemName || 'Inquiry',
      lines: [
        `Inquiry · ${inquiry.status}`,
        inquiry.followUpDate ? `Follow-up ${inquiry.followUpDate}` : 'Follow-up not set',
        ...(inquiry.pieces.length
          ? inquiry.pieces.map(
              piece =>
                `Tag ${piece.tagNumber || '—'} · ${piece.itemName}`,
            )
          : []),
        inquiry.note ? `Notes ${inquiry.note}` : '',
        inquiry.phone ? inquiry.phone : '',
      ].filter(Boolean),
      phone: inquiry.phone,
      imageUri: inquiry.pieces.find(piece => piece.imageUri)?.imageUri || '',
      inquiryId: inquiry.id,
    })),
    ...repairs.map(repair => ({
      key: `repair-${repair.id}`,
      day: calendarDay(repair.receivedDate) || calendarDay(repair.createdAt),
      title: repair.itemName,
      lines: [
        `Repair · ${repair.status}`,
        ...(repair.pieces?.length
          ? repair.pieces.map(
              piece =>
                `${piece.itemName} · ${piece.repairKind} · ${piece.metal}${piece.weight ? ` · ${piece.weight} g` : ''}`,
            )
          : [`${repair.repairKind} · ${repair.metal}${repair.weight ? ` · ${repair.weight} g` : ''}`]),
        repair.address ? repair.address : '',
        repair.details ? repair.details : '',
      ].filter(Boolean),
      phone: repair.phone,
      category: 'Other',
      repairId: repair.id,
    })),
  ];
  return rows.sort((left, right) => {
    if (left.day === right.day) {
      return right.key.localeCompare(left.key);
    }
    return right.day.localeCompare(left.day);
  });
}
