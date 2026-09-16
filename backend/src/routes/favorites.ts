import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { favorites, services } from '../schema.js';
import { eq, and } from 'drizzle-orm';

const router = Router();

// GET /api/favorites
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.query.user_id;
    if (!userId) return res.status(400).json({ error: 'Missing user_id' });

    const rows = await db.select({
      id: favorites.id,
      service_id: favorites.service_id,
      name_en: services.name_en,
      name_am: services.name_am,
      name_om: services.name_om,
      description_en: services.description_en,
      description_am: services.description_am,
      description_om: services.description_om,
      type: services.type,
      price: services.price,
      image_url: services.image_url
    })
    .from(favorites)
    .innerJoin(services, eq(favorites.service_id, services.id))
    .where(eq(favorites.user_id, Number(userId)));

    return res.json(rows);
  } catch (error: any) {
    console.error('Error fetching favorites:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/favorites
router.post('/', async (req: Request, res: Response) => {
  try {
    const { user_id, service_id } = req.body;
    if (!user_id || !service_id) {
      return res.status(400).json({ error: 'Missing user_id or service_id' });
    }

    try {
      const [inserted] = await db.insert(favorites).values({
        user_id: Number(user_id),
        service_id: Number(service_id)
      }).returning();
      return res.json({ success: true, id: inserted?.id });
    } catch (e: any) {
      return res.status(409).json({ error: 'Already favorited' });
    }
  } catch (error: any) {
    console.error('Error adding favorite:', error);
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/favorites
router.delete('/', async (req: Request, res: Response) => {
  try {
    const { user_id, service_id } = req.body;
    if (!user_id || !service_id) {
      return res.status(400).json({ error: 'Missing user_id or service_id' });
    }

    await db.delete(favorites).where(
      and(
        eq(favorites.user_id, Number(user_id)),
        eq(favorites.service_id, Number(service_id))
      )
    );
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error removing favorite:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
