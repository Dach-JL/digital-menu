import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { feedback, users, services } from '../schema.js';
import { eq, desc } from 'drizzle-orm';
import { triggerPusherEvent } from '../pusher.js';

const router = Router();

// GET /api/feedback
router.get('/', async (req: Request, res: Response) => {
  try {
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
  } catch (error: any) {
    console.error('Error fetching feedback:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/feedback
router.post('/', async (req: Request, res: Response) => {
  try {
    const { user_id, service_id, category, comment, rating } = req.body;
    if (!category || !comment || !rating) {
      return res.status(400).json({ error: 'Missing required fields: category, comment, and rating.' });
    }

    const [inserted] = await db.insert(feedback).values({
      user_id: user_id ? Number(user_id) : null,
      service_id: service_id ? Number(service_id) : null,
      category: String(category),
      comment: String(comment),
      rating: Number(rating)
    }).returning();

    if (inserted) {
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
      .where(eq(feedback.id, inserted.id));

      if (rows.length > 0) {
        await triggerPusherEvent('admin-feedback', 'feedback-submitted', rows[0]);
      }
    }

    return res.json({ success: true, id: inserted?.id });
  } catch (error: any) {
    console.error('Error submitting feedback:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
