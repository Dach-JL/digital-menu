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

// ─── Admin Panel Caches ────────────────────────────────────────────────────

let adminServicesCache: any[] | null = null;
export function getCachedAdminServices(): any[] | null { return adminServicesCache; }
export function setCachedAdminServices(data: any[]) { adminServicesCache = data; }
export function invalidateCachedAdminServices() { adminServicesCache = null; }

let adminFeedbackCache: any[] | null = null;
export function getCachedAdminFeedback(): any[] | null { return adminFeedbackCache; }
export function setCachedAdminFeedback(data: any[]) { adminFeedbackCache = data; }

let adminOrdersCache: any[] | null = null;
export function getCachedAdminOrders(): any[] | null { return adminOrdersCache; }
export function setCachedAdminOrders(data: any[]) { adminOrdersCache = data; }

let adminCallsCache: any[] | null = null;
export function getCachedAdminCalls(): any[] | null { return adminCallsCache; }
export function setCachedAdminCalls(data: any[]) { adminCallsCache = data; }
