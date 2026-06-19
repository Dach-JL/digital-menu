/**
 * Central API configuration.
 * In production (Vercel) and development, the API is served via Node.js serverless functions.
 */

const isDev = import.meta.env.DEV;

// In dev mode, point to Node.js local API server using the current hostname.
export const API_BASE = isDev ? `http://${window.location.hostname}:8000/api` : '/api';

// For uploaded images: serve them from the frontend origin (since they are in the public/ folder)
export const UPLOADS_BASE = '';

/**
 * Build full API url.
 * Usage: apiUrl('/services.php') => http://localhost:8000/api/services
 *        apiUrl('/services') => /api/services
 */
export function apiUrl(path: string): string {
  // Strip .php extension unconditionally (Node API doesn't use .php extensions)
  const cleanPath = path.replace('.php', '');
  return `${API_BASE}${cleanPath}`;
}

/**
 * Build full URL for uploaded images.
 * Usage: uploadsUrl('uploads/foo.jpg') => /uploads/foo.jpg
 *        uploadsUrl('https://...') => https://...
 */
export function uploadsUrl(path: string): string {
  if (!path) return '/placeholder.svg';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${UPLOADS_BASE}/${path}`;
}

