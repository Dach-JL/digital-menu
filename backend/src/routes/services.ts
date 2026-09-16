import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { services } from '../schema.js';
import { eq, desc } from 'drizzle-orm';
import { triggerPusherEvent } from '../pusher.js';

const router = Router();

// GET /api/services
router.get('/', async (req: Request, res: Response) => {
  try {
    const isAdmin = req.query.admin === '1';
    let rows;
    if (isAdmin) {
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      rows = await db.select().from(services).orderBy(desc(services.created_at));
    } else {
      rows = await db.select().from(services).where(eq(services.is_available, true)).orderBy(desc(services.created_at));
    }
    return res.json(rows);
  } catch (error: any) {
    console.error('Error fetching services:', error);
    return res.status(500).json({ error: error.message });
  }
});

// PATCH /api/services
router.patch('/', async (req: Request, res: Response) => {
  try {
    const { id, is_available, name_am, name_om, description_am, description_om, subcategory } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing ID' });

    const updateData: any = {};
    if (is_available !== undefined) updateData.is_available = is_available;
    if (subcategory !== undefined) updateData.subcategory = subcategory || null;
    if (name_am !== undefined) updateData.name_am = name_am;
    if (name_om !== undefined) updateData.name_om = name_om;
    if (description_am !== undefined) updateData.description_am = description_am;
    if (description_om !== undefined) updateData.description_om = description_om;

    if (Object.keys(updateData).length > 0) {
      await db.update(services).set(updateData).where(eq(services.id, Number(id)));
    }

    const rows = await db.select().from(services).where(eq(services.id, Number(id)));
    if (rows.length > 0) {
      await triggerPusherEvent('menu-updates', 'service-updated', rows[0]);
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating service:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/services
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      id: updateId,
      name_en,
      description_en,
      name_am,
      description_am,
      name_om,
      description_om,
      type,
      subcategory,
      price,
      image_url,
      ingredients,
      macro_kcal,
      macro_protein,
      macro_fat,
      macro_carbs,
      beds,
      max_guests,
      room_number
    } = req.body;

    const values = {
      name_en,
      description_en,
      name_am: name_am || null,
      description_am: description_am || null,
      name_om: name_om || null,
      description_om: description_om || null,
      type,
      subcategory: subcategory || null,
      price: String(price),
      image_url: image_url || null,
      ingredients: ingredients || null,
      macro_kcal: macro_kcal ? String(macro_kcal) : null,
      macro_protein: macro_protein ? String(macro_protein) : null,
      macro_fat: macro_fat ? String(macro_fat) : null,
      macro_carbs: macro_carbs ? String(macro_carbs) : null,
      beds: beds !== undefined && beds !== '' ? Number(beds) : null,
      max_guests: max_guests !== undefined && max_guests !== '' ? Number(max_guests) : null,
      room_number: room_number || null,
    };

    if (updateId) {
      await db.update(services).set(values).where(eq(services.id, Number(updateId)));
      const rows = await db.select().from(services).where(eq(services.id, Number(updateId)));
      if (rows.length > 0) {
        await triggerPusherEvent('menu-updates', 'service-updated', rows[0]);
      }
      return res.json({ success: true });
    } else {
      const [newRow] = await db.insert(services).values(values).returning();
      if (newRow) {
        await triggerPusherEvent('menu-updates', 'service-added', newRow);
      }
      return res.json({ success: true, insertId: newRow?.id });
    }
  } catch (error: any) {
    console.error('Error saving service:', error);
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/services
router.delete('/', async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing service ID' });

    await db.delete(services).where(eq(services.id, Number(id)));
    await triggerPusherEvent('menu-updates', 'service-deleted', { id: Number(id) });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting service:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
