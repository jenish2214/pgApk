import type {NavigatorScreenParams} from '@react-navigation/native';
import type {NitroSQLiteConnection, Transaction} from 'react-native-nitro-sqlite';

export const ORDER_STATUSES = [
  'Pending',
  'In Preparation',
  'Ready for Collection',
  'Delivered',
  'Cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const READY_STATUS: OrderStatus = 'Ready for Collection';

export type SqlExecutor = Pick<NitroSQLiteConnection | Transaction, 'execute'>;

export type SqlRow = Record<string, string | number | null | undefined>;

export type Customer = {
  id: number;
  name: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
};

export type CustomerInput = {
  name: string;
  phone: string;
  address?: string;
  notes?: string;
};

export type OrderPiece = {
  id: number;
  orderId: number;
  tagNumber: string;
  itemName: string;
  category: string;
  description: string;
  imageUri: string;
};

export type OrderPieceInput = {
  tagNumber: string;
  itemName: string;
  category: string;
  description?: string;
  imageUri?: string;
};

export type Order = {
  id: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  itemName: string;
  description: string;
  orderDate: string;
  expectedDeliveryDate: string;
  status: OrderStatus;
  readyAt: string;
  employeeNotes: string;
  category: string;
  pieces: OrderPiece[];
  createdAt: string;
  updatedAt: string;
};

export type OrderEvent = {
  id: number;
  orderId: number;
  label: string;
  detail: string;
  happenedAt: string;
};

export const INQUIRY_STATUSES = ['Waiting', 'Bought', 'Closed'] as const;

export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export type InquiryPiece = {
  id: number;
  inquiryId: number;
  tagNumber: string;
  itemName: string;
  imageUri: string;
};

export type InquiryPieceInput = {
  tagNumber: string;
  itemName: string;
  imageUri?: string;
};

export type Inquiry = {
  id: number;
  customerId: number | null;
  customerName: string;
  phone: string;
  itemName: string;
  note: string;
  followUpDate: string;
  status: InquiryStatus;
  pieces: InquiryPiece[];
  createdAt: string;
  updatedAt: string;
};

export type InquiryInput = {
  customerId?: number | null;
  customerName: string;
  phone?: string;
  itemName: string;
  note?: string;
  followUpDate: string;
  status: InquiryStatus;
  pieces?: InquiryPieceInput[];
};

export type OrderInput = {
  customerId: number;
  itemName: string;
  description?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  status: OrderStatus;
  employeeNotes?: string;
  category: string;
  pieces?: OrderPieceInput[];
};

export type Product = {
  id: number;
  name: string;
  metal: string;
  price: number;
  badge: string;
  category: string;
  imageKey: string;
  description: string;
  isFavorite: boolean;
};

export type Collection = {
  id: number;
  kicker: string;
  title: string;
  actionLabel: string;
  category: string;
  imageKey: string;
};

export const REPAIR_STATUSES = ['Received', 'In repair', 'Ready', 'Returned'] as const;

export type RepairStatus = (typeof REPAIR_STATUSES)[number];

export const REPAIR_KINDS = [
  'Polish',
  'Soldering',
  'Resizing',
  'Stone setting',
  'Chain',
  'Other',
] as const;

export type RepairKind = (typeof REPAIR_KINDS)[number];

export const REPAIR_METALS = ['Gold', 'Silver', 'Diamond', 'Other'] as const;

export type RepairMetal = (typeof REPAIR_METALS)[number];

export type RepairPiece = {
  id: number;
  repairId: number;
  itemName: string;
  weight: string;
  metal: string;
  repairKind: string;
  details: string;
};

export type RepairPieceInput = {
  itemName: string;
  weight: string;
  metal: string;
  repairKind: string;
  details?: string;
};

export type Repair = {
  id: number;
  customerId: number | null;
  customerName: string;
  phone: string;
  address: string;
  itemName: string;
  weight: string;
  metal: string;
  repairKind: string;
  details: string;
  pieces: RepairPiece[];
  receivedDate: string;
  status: RepairStatus;
  createdAt: string;
  updatedAt: string;
};

export type RepairInput = {
  customerId?: number | null;
  customerName: string;
  phone?: string;
  address?: string;
  itemName: string;
  weight: string;
  metal: string;
  repairKind: string;
  details?: string;
  receivedDate: string;
  status: RepairStatus;
  pieces?: RepairPieceInput[];
};

export const JANGAD_STATUSES = ['Given', 'Returned'] as const;

export type JangadStatus = (typeof JANGAD_STATUSES)[number];

export const JANGAD_DIRECTIONS = ['Exit', 'Entry'] as const;

export type JangadDirection = (typeof JANGAD_DIRECTIONS)[number];

export type JangadPiece = {
  id: number;
  jangadId: number;
  tagNumber: string;
  itemName: string;
  quantity: number;
};

export type JangadPieceInput = {
  tagNumber: string;
  itemName: string;
  quantity: number;
};

export type JangadMove = {
  id: number;
  jangadId: number;
  direction: JangadDirection;
  quantity: number;
  movedAt: string;
  note: string;
};

export type JangadMoveInput = {
  direction: JangadDirection;
  quantity: number;
  movedAt: string;
  note?: string;
};

export type Jangad = {
  id: number;
  shopName: string;
  givenBy: string;
  receivedBy: string;
  handedAt: string;
  note: string;
  status: JangadStatus;
  pieces: JangadPiece[];
  moves: JangadMove[];
  createdAt: string;
  updatedAt: string;
};

export type JangadInput = {
  shopName: string;
  givenBy: string;
  receivedBy: string;
  handedAt: string;
  note?: string;
  status: JangadStatus;
  pieces?: JangadPieceInput[];
  moves?: JangadMoveInput[];
};

export type FieldErrors = Partial<
  Record<
    | keyof CustomerInput
    | keyof OrderInput
    | keyof InquiryInput
    | keyof RepairInput
    | keyof JangadInput
    | 'customerId'
    | 'tagNumber'
    | 'quantity'
    | 'direction'
    | 'movedAt',
    string
  >
>;

export class FieldValidationError extends Error {
  fields: FieldErrors;

  constructor(fields: FieldErrors) {
    super('Please correct the highlighted fields.');
    this.name = 'FieldValidationError';
    this.fields = fields;
  }
}

export function isFieldValidationError(
  error: unknown,
): error is FieldValidationError {
  return error instanceof FieldValidationError;
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export type ShopStackParamList = {
  DeskHome: undefined;
  ManageHome: undefined;
  CustomersHome: undefined;
  ReadyHome: undefined;
  CustomerDetails: {customerId: number};
  AddEditCustomer: {customerId?: number} | undefined;
  Orders: {status?: string} | undefined;
  CalendarHome: undefined;
  OrderDetails: {orderId: number};
  AddEditOrder:
    | {
        orderId?: number;
        customerId?: number;
        itemName?: string;
        orderDate?: string;
      }
    | undefined;
  InquiryHome: undefined;
  AddEditInquiry: {inquiryId?: number; customerId?: number} | undefined;
  RepairHome: undefined;
  AddEditRepair: {repairId?: number; customerId?: number} | undefined;
  JangadHome: undefined;
  AddEditJangad: {jangadId?: number} | undefined;
};

export type TabParamList = {
  Dashboard: NavigatorScreenParams<ShopStackParamList> | undefined;
  Calendar: NavigatorScreenParams<ShopStackParamList> | undefined;
  Customers: NavigatorScreenParams<ShopStackParamList> | undefined;
  Manage: NavigatorScreenParams<ShopStackParamList> | undefined;
};

export type TabRouteName = keyof TabParamList;
