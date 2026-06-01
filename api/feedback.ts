import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db.js';
import { feedback, users, services } from './_schema.js';
import { eq, desc } from 'drizzle-orm';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function setCors(res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const db = getDb();

  try {
    if (req.method === 'GET') {
      const rows = await db.select({
        id: feedback.id,
        comment: feedback.comment,
        rating: feedback.rating,
        created_at: feedback.created_at,
        category: feedback.category,
        username: users.username,
        service_name: services.name_en
      })
      .from(feedback)
      .leftJoin(users, eq(feedback.user_id, users.id))
      .leftJoin(services, eq(feedback.service_id, services.id))
      .orderBy(desc(feedback.created_at));
      return res.json(rows);
    }

    if (req.method === 'POST') {
      const { user_id, service_id, category, comment, rating } = req.body;
      if (!category || !comment || !rating) {
        return res.status(400).json({ error: 'Missing required fields: category, comment, and rating.' });
      }
      const [insertResult] = await db.insert(feedback).values({
        user_id: user_id || null,
        service_id: service_id || null,
        category,
        comment,
        rating: Number(rating)
      });
      return res.json({ success: true, id: insertResult.insertId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
