import {
  countOrdersForCustomer,
  deleteCustomer,
  getCustomerById,
  insertCustomer,
  searchCustomers,
  updateCustomer,
} from '../database/customerRepository';
import {listOrdersByCustomer} from '../database/orderRepository';
import {getDatabase, withTransaction} from '../database/database';
import {lastInsertId} from '../database/rows';
import type {Customer, CustomerInput, Order} from '../types';
import {nowISO} from '../utils/dates';
import {notifyShopChanged} from './shopEvents';
import {
  hasFieldErrors,
  validateCustomer,
  validationError,
} from '../utils/validation';

function commit<T>(result: Promise<T>): Promise<T> {
  return result.then(value => {
    notifyShopChanged();
    return value;
  });
}

function cleanCustomer(input: CustomerInput): CustomerInput {
  return {
    name: String(input.name || '').trim(),
    phone: String(input.phone || '').trim(),
    address: String(input.address || '').trim(),
    notes: String(input.notes || '').trim(),
  };
}

export function listCustomers(query = ''): Customer[] {
  return searchCustomers(getDatabase(), query);
}

export function getCustomer(id: number): Customer | null {
  return getCustomerById(getDatabase(), id);
}

export function getCustomerOrders(customerId: number): Order[] {
  return listOrdersByCustomer(getDatabase(), customerId);
}

export function createCustomer(input: CustomerInput): Promise<Customer | null> {
  const customer = cleanCustomer(input);
  const fields = validateCustomer(customer);
  if (hasFieldErrors(fields)) {
    throw validationError(fields);
  }
  return commit(
    withTransaction(tx => {
      insertCustomer(tx, {...customer, createdAt: nowISO()});
      return getCustomerById(tx, lastInsertId(tx));
    }),
  );
}

export function saveCustomer(
  id: number,
  input: CustomerInput,
): Promise<Customer | null> {
  const customer = cleanCustomer(input);
  const fields = validateCustomer(customer);
  if (hasFieldErrors(fields)) {
    throw validationError(fields);
  }
  return commit(
    withTransaction(tx => {
      const existing = getCustomerById(tx, id);
      if (!existing) {
        throw new Error('This customer could not be found.');
      }
      updateCustomer(tx, {...customer, id: existing.id});
      return getCustomerById(tx, existing.id);
    }),
  );
}

export function removeCustomer(id: number): Promise<boolean> {
  return commit(withTransaction(tx => {
    const existing = getCustomerById(tx, id);
    if (!existing) {
      throw new Error('This customer could not be found.');
    }
    const orderCount = countOrdersForCustomer(tx, existing.id);
    if (orderCount > 0) {
      const label = orderCount === 1 ? 'order' : 'orders';
      throw new Error(
        `${existing.name} has ${orderCount} ${label}. Those orders stay in the shop records, so this customer cannot be deleted.`,
      );
    }
    deleteCustomer(tx, existing.id);
    return true;
  }));
}
