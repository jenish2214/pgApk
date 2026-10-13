import {
  FieldValidationError,
  INQUIRY_STATUSES,
  REPAIR_KINDS,
  REPAIR_METALS,
  REPAIR_STATUSES,
  type CustomerInput,
  type FieldErrors,
  type InquiryInput,
  type OrderInput,
  type RepairInput,
} from '../types';
import {isProductCategory} from './categories';
import {dayKey, isValidDay, parseShopDate} from './dates';
import {isOrderStatus} from './orderStatus';
import {formatTagNumber} from './tags';

export function phoneDigits(phone: string): string {
  return String(phone || '').replace(/\D/g, '');
}

export function isValidPhone(phone: string): boolean {
  const digits = phoneDigits(phone);
  return digits.length >= 10 && digits.length <= 15;
}

export function hasFieldErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function validationError(fields: FieldErrors): FieldValidationError {
  return new FieldValidationError(fields);
}

export function validateCustomer(input: CustomerInput): FieldErrors {
  const errors: FieldErrors = {};
  const name = String(input.name || '').trim();
  if (name.length < 2) {
    errors.name = "Enter the customer's full name.";
  }
  if (!isValidPhone(input.phone)) {
    errors.phone = 'Enter a phone number with 10 to 15 digits.';
  }
  return errors;
}

export function validateOrder(input: OrderInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!Number(input.customerId)) {
    errors.customerId = 'Choose the customer for this order.';
  }
  const pieces = input.pieces?.length
    ? input.pieces
    : [{itemName: input.itemName, category: input.category}];
  if (pieces.some(piece => !String(piece.itemName || '').trim())) {
    errors.itemName = 'Enter every jewellery item.';
  }
  if (pieces.some(piece => !isProductCategory(piece.category))) {
    errors.category = 'Choose a category for every piece.';
  }
  if (!isValidDay(input.orderDate)) {
    errors.orderDate = 'Choose the order date.';
  }
  const delivery = String(input.expectedDeliveryDate || '').trim();
  const orderAt = parseShopDate(input.orderDate);
  const deliveryAt = delivery ? parseShopDate(delivery) : null;
  if (delivery && !deliveryAt) {
    errors.expectedDeliveryDate = 'Choose a valid delivery date.';
  } else if (orderAt && deliveryAt && dayKey(delivery) < dayKey(input.orderDate)) {
    errors.expectedDeliveryDate =
      'Expected delivery cannot be before the order date.';
  }
  if (!isOrderStatus(input.status)) {
    errors.status = 'Choose a valid order status.';
  }
  return errors;
}

export function validateInquiry(input: InquiryInput): FieldErrors {
  const errors: FieldErrors = {};
  if (String(input.customerName || '').trim().length < 2) {
    errors.customerName = "Enter the customer's name.";
  }
  const phone = String(input.phone || '').trim();
  if (phone && !isValidPhone(phone)) {
    errors.phone = 'Enter a phone number with 10 to 15 digits.';
  }
  const pieces = input.pieces?.length
    ? input.pieces
    : [{tagNumber: '', itemName: input.itemName}];
  if (pieces.some(piece => !String(piece.itemName || '').trim())) {
    errors.itemName = 'Enter every jewellery item.';
  }
  if (pieces.some(piece => !formatTagNumber(piece.tagNumber))) {
    errors.itemName = 'Enter a tag number for every piece. Letters and digits are allowed.';
  }
  const tags = pieces.map(piece => formatTagNumber(piece.tagNumber)).filter(Boolean);
  if (new Set(tags).size !== tags.length) {
    errors.itemName = 'Each piece needs its own tag number.';
  }
  if (!isValidDay(input.followUpDate)) {
    errors.followUpDate = 'Choose the follow-up date.';
  }
  if (!(INQUIRY_STATUSES as readonly string[]).includes(input.status)) {
    errors.status = 'Choose what the customer decided.';
  }
  return errors;
}

export function validateRepair(input: RepairInput): FieldErrors {
  const errors: FieldErrors = {};
  if (String(input.customerName || '').trim().length < 2) {
    errors.customerName = "Enter the customer's name.";
  }
  const phone = String(input.phone || '').trim();
  if (phone && !isValidPhone(phone)) {
    errors.phone = 'Enter a phone number with 10 to 15 digits.';
  }
  const pieces = input.pieces?.length
    ? input.pieces
    : [
        {
          itemName: input.itemName,
          weight: input.weight,
          metal: input.metal,
          repairKind: input.repairKind,
        },
      ];
  if (pieces.some(piece => !String(piece.itemName || '').trim())) {
    errors.itemName = 'Enter every jewellery item.';
  }
  if (
    pieces.some(piece => {
      const weight = String(piece.weight || '').trim();
      return !weight || Number.isNaN(Number(weight)) || Number(weight) <= 0;
    })
  ) {
    errors.weight = 'Enter the weight in grams for every piece.';
  }
  if (pieces.some(piece => !(REPAIR_METALS as readonly string[]).includes(piece.metal))) {
    errors.metal = 'Choose the metal for every piece.';
  }
  if (pieces.some(piece => !(REPAIR_KINDS as readonly string[]).includes(piece.repairKind))) {
    errors.repairKind = 'Choose the kind of repair for every piece.';
  }
  if (!isValidDay(input.receivedDate)) {
    errors.receivedDate = 'Choose the date the piece was received.';
  }
  if (!(REPAIR_STATUSES as readonly string[]).includes(input.status)) {
    errors.status = 'Choose the repair status.';
  }
  return errors;
}
