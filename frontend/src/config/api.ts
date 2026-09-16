/**
 * Central API configuration.
 * In production (Vercel) and development, the API is served via Node.js serverless functions.
 */

const isDev = import.meta.env.DEV;

// In dev mode, point to local server. In production, default to backend Vercel URL.
export const API_BASE = (
  import.meta.env.VITE_API_URL ||
  (isDev ? `http://${window.location.hostname}:8000/api` : 'https://backend-jet-eta-93.vercel.app/api')
).replace(/\/+$/, '');

// For uploaded images: serve them from the frontend origin (since they are in the public/ folder)
export const UPLOADS_BASE = '';

/**
 * Build full API url.
 * Usage: apiUrl('/services') => http://localhost:8000/api/services
 */
export function apiUrl(path: string): string {
  const cleanPath = path.replace(/\.php$/, '').replace(/\.php\?/, '?');
  return `${API_BASE}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
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

