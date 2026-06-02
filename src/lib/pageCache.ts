import type { Product } from '@/types/Product';

/**
 * Module-level cache shared across all pages.
 * Lives as long as the browser tab is open (survives React route changes).
 */
export let cachedProducts: Product[] | null = null;

export function setCachedProducts(products: Product[]) {
  cachedProducts = products;
}

export function getCachedProducts(): Product[] | null {
  return cachedProducts;
}

/** Per-user favorites cache: userId -> Product[] */
const favoritesCache: Map<number, Product[]> = new Map();

export function getCachedFavorites(userId: number): Product[] | null {
  return favoritesCache.get(userId) ?? null;
}

export function setCachedFavorites(userId: number, favorites: Product[]) {
  favoritesCache.set(userId, favorites);
}
