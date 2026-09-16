import { Redis } from '@upstash/redis';
import type { Request } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

let redis: Redis | null = null;

try {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    redis = new Redis({ url, token });
  }
} catch (e) {
  console.warn('Failed to initialize Upstash Redis:', e);
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

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
      await redis.expire(key, windowSeconds + 10);
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

export async function checkRateLimitByRoomOrIp(
  req: Request,
  action: string,
  roomNumber: string | undefined | null,
  limit: number,
  windowSeconds: number
) {
  const cleanRoom = roomNumber?.toString().trim();
  const identifier = cleanRoom ? `room:${cleanRoom}` : `ip:${getClientIp(req)}`;
  return checkRateLimit(action, identifier, limit, windowSeconds);
}
