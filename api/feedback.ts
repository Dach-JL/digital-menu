import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db';
import { feedback, users, services } from './_schema';
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
        created_at: feedback.createdAt,
        category: feedback.category,
        username: users.username,
        service_name: services.nameEn
      })
      .from(feedback)
      .leftJoin(users, eq(feedback.userId, users.id))
      .leftJoin(services, eq(feedback.serviceId, services.id))
      .orderBy(desc(feedback.createdAt));
      return res.json(rows);
    }

    if (req.method === 'POST') {
      const { user_id, service_id, category, comment, rating } = req.body;
      if (!category || !comment || !rating) {
        return res.status(400).json({ error: 'Missing required fields: category, comment, and rating.' });
      }
      const [insertResult] = await db.insert(feedback).values({
        userId: user_id || null,
        serviceId: service_id || null,
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
