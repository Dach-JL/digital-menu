import { drizzle, MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './_schema.js';

let pool: mysql.Pool | null = null;
let db: MySql2Database<typeof schema> | null = null;

export function getDb() {
  if (!pool) {
    pool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 2, // Low limit optimized for serverless scaling (prevent DB pool exhaustion)
      maxIdle: 2, // Maximum idle connections to retain in pool
      idleTimeout: 15000, // Close idle connections after 15s to release DB resources
      queueLimit: 0,
      ssl: {
        rejectUnauthorized: false
      }
    });
    db = drizzle(pool, { schema, mode: 'default' });
  }
  return db!;
}

export function getPool() {
  if (!pool) {
    getDb();
  }
  return pool!;
}

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

export function handleOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
