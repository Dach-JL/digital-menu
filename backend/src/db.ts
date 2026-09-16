import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory or parent directory
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

let _sql: NeonQueryFunction<false, false> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (!_sql) {
    const conn = process.env.DATABASE_URL;
    if (!conn) {
      throw new Error('DATABASE_URL environment variable is missing. Please configure DATABASE_URL in Vercel Project Settings > Environment Variables.');
    }
    _sql = neon(conn);
  }
  return _sql;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getSql(), { schema });
  }
  return _db;
}

// Proxies so existing imports like `db.select()...` and `sql\`...\`` continue to work seamlessly
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  }
});

export const sql = new Proxy((() => {}) as any, {
  apply(_target, thisArg, argArray) {
    return Reflect.apply(getSql() as any, thisArg, argArray);
  }
});
