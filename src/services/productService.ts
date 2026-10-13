import {getDatabase, getMeta, withTransaction} from '../database/database';
import {dashboardCounts} from '../database/orderRepository';
import {
  getFeaturedCollection,
  getProductById,
  listProducts,
  setProductFavorite,
} from '../database/productRepository';
import type {Collection, Product} from '../types';

export type HomeContent = {
  collection: Collection | null;
  products: Product[];
  displayName: string;
  readyCount: number;
};

export function getHomeContent(): HomeContent {
  const db = getDatabase();
  return {
    collection: getFeaturedCollection(db),
    products: listProducts(db),
    displayName: getMeta('display_name', 'Ananya'),
    readyCount: dashboardCounts(db).ready,
  };
}

export function getProduct(id: number): Product | null {
  return getProductById(getDatabase(), id);
}

export function toggleProductFavorite(id: number): Promise<Product | null> {
  return withTransaction(tx => {
    const existing = getProductById(tx, id);
    if (!existing) {
      throw new Error('This piece could not be found.');
    }
    setProductFavorite(tx, existing.id, !existing.isFavorite);
    return getProductById(tx, existing.id);
  });
}
