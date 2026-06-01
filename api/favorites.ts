import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db.js';
import { favorites, services } from './_schema.js';
import { eq, and } from 'drizzle-orm';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
      const userId = req.query.user_id;
      if (!userId) return res.status(400).json({ error: 'Missing user_id' });
      const rows = await db.select({
        id: favorites.id,
        service_id: favorites.serviceId,
        name_en: services.nameEn,
        name_am: services.nameAm,
        name_om: services.nameOm,
        description_en: services.descriptionEn,
        description_am: services.descriptionAm,
        description_om: services.descriptionOm,
        type: services.type,
        price: services.price,
        image_url: services.imageUrl
      })
      .from(favorites)
      .innerJoin(services, eq(favorites.serviceId, services.id))
      .where(eq(favorites.userId, Number(userId)));
      return res.json(rows);
    }

    if (req.method === 'POST') {
      const { user_id, service_id } = req.body;
      try {
        const [insertResult] = await db.insert(favorites).values({
          userId: Number(user_id),
          serviceId: Number(service_id)
        });
        return res.json({ success: true, id: insertResult.insertId });
      } catch (e: any) {
        return res.status(409).json({ error: 'Already favorited' });
      }
    }

    if (req.method === 'DELETE') {
      const { user_id, service_id } = req.body;
      await db.delete(favorites).where(
        and(
          eq(favorites.userId, Number(user_id)),
          eq(favorites.serviceId, Number(service_id))
        )
      );
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
