import type {ImageSourcePropType} from 'react-native';

export const PRODUCT_CATEGORIES = [
  'Necklaces',
  'Earrings',
  'Bangles',
  'Rings',
  'Other',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

const IMAGES: Record<ProductCategory, ImageSourcePropType> = {
  Necklaces: require('../assets/jewel-necklace.jpg'),
  Earrings: require('../assets/jewel-earrings.jpg'),
  Bangles: require('../assets/jewel-bangles.jpg'),
  Rings: require('../assets/gold-ring.jpg'),
  Other: require('../assets/polki-choker.jpg'),
};

export function isProductCategory(value: string): value is ProductCategory {
  return (PRODUCT_CATEGORIES as readonly string[]).includes(value);
}

export function categoryImage(category: string): ImageSourcePropType {
  return isProductCategory(category) ? IMAGES[category] : IMAGES.Other;
}
