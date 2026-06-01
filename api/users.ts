import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db';
import { users } from './_schema';
import { eq, inArray, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function setCors(res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const db = getDb();
  const action = req.query.action as string;

  try {
    // LOGIN
    if (action === 'login') {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

      const rows = await db.select().from(users).where(eq(users.email, email));
      const user = rows[0];
      if (user && await bcrypt.compare(password, user.password)) {
        const { password: _, ...safeUser } = user;
        return res.json({ success: true, user: safeUser });
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // REGISTER
    if (action === 'register') {
      const { email, username, password } = req.body;
      if (!email || !username || !password) return res.status(400).json({ error: 'Missing required fields' });

      const hash = await bcrypt.hash(password, 10);
      try {
        const [insertResult] = await db.insert(users).values({
          email,
          username,
          password: hash,
          role: 'user'
        });
        const insertId = insertResult.insertId;
        const rows = await db.select({
          id: users.id,
          email: users.email,
          username: users.username,
          role: users.role
        }).from(users).where(eq(users.id, insertId));
        return res.json({ success: true, user: rows[0] });
      } catch (e: any) {
        if (e.message?.includes('unique') || e.message?.includes('duplicate')) {
          return res.status(409).json({ error: 'Email or username already exists.' });
        }
        throw e;
      }
    }

    // LIST ADMINS
    if (action === 'list_admins') {
      const rows = await db.select({
        id: users.id,
        email: users.email,
        username: users.username,
        role: users.role,
        createdAt: users.createdAt
      })
      .from(users)
      .where(inArray(users.role, ['admin', 'admin_room', 'admin_food', 'admin_waiter']))
      .orderBy(desc(users.createdAt));
      return res.json(rows);
    }

    // CREATE ADMIN
    if (action === 'create_admin') {
      const { email, username, password, role } = req.body;
      if (!email || !username || !password || !role) return res.status(400).json({ error: 'Missing required fields' });

      const validRoles = ['admin', 'admin_room', 'admin_food', 'admin_waiter'];
      if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid admin role' });

      const hash = await bcrypt.hash(password, 10);
      try {
        const [insertResult] = await db.insert(users).values({
          email,
          username,
          password: hash,
          role
        });
        const insertId = insertResult.insertId;
        const rows = await db.select({
          id: users.id,
          email: users.email,
          username: users.username,
          role: users.role
        }).from(users).where(eq(users.id, insertId));
        return res.json({ success: true, admin: rows[0] });
      } catch (e: any) {
        if (e.message?.includes('unique') || e.message?.includes('duplicate')) {
          return res.status(409).json({ error: 'Email or username already exists.' });
        }
        throw e;
      }
    }

    // DELETE ADMIN
    if (action === 'delete_admin') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing admin ID' });
      await db.delete(users).where(eq(users.id, id));
      return res.json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
