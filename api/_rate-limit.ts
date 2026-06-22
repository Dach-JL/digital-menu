import { Redis } from '@upstash/redis';
import type { VercelRequest } from '@vercel/node';

let redis: Redis | null = null;

try {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    redis = new Redis({ url, token });
  } else {
    console.warn('Upstash Redis credentials are not fully configured in env.');
  }
} catch (e) {
  console.warn('Failed to initialize Upstash Redis:', e);
}

/**
 * Helper to safely extract client IP address from Vercel headers.
 */
export function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp;
  }
  return '127.0.0.1';
}

/**
 * Resilient fixed-window rate-limiter.
 * If Redis is unavailable or fails, it will fail-open (returns success: true)
 * to ensure that guest service remains functional.
 */
export async function checkRateLimit(
  action: string,
  identifier: string,
  limit: number,
  windowSeconds: number
) {
  if (!redis) {
    return { success: true, limit, remaining: limit };
  }

  const now = Math.floor(Date.now() / 1000);
  const windowKey = Math.floor(now / windowSeconds);
  const key = `rate:limit:${action}:${identifier}:${windowKey}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds + 10); // add a 10s buffer to expire time
    }
    return {
      success: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
    };
  } catch (err) {
    console.error('Rate limiter check failed, failing open:', err);
    return { success: true, limit, remaining: limit };
  }
}

/**
 * High-concurrency room rate limiter.
 * Groups limits by room identifier (e.g. room:101) to avoid NAT / Shared Hotel Wi-Fi conflicts.
 * Falls back to client IP grouping (e.g. ip:127.0.0.1) if no room number is available.
 */
export async function checkRateLimitByRoomOrIp(
  req: VercelRequest,
  action: string,
  roomNumber: string | undefined | null,
  limit: number,
  windowSeconds: number
) {
  const cleanRoom = roomNumber?.toString().trim();
  const identifier = cleanRoom ? `room:${cleanRoom}` : `ip:${getClientIp(req)}`;
  return checkRateLimit(action, identifier, limit, windowSeconds);
}

