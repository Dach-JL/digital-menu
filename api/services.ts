import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db.js';
import { services, orderItems } from './_schema.js';
import { eq, desc } from 'drizzle-orm';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function setCors(res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const db = getDb();

  try {
    switch (req.method) {
      case 'GET': {
        const isAdmin = req.query.admin === '1';
        let rows;
        if (isAdmin) {
          rows = await db.select().from(services).orderBy(desc(services.created_at));
        } else {
          rows = await db.select().from(services).where(eq(services.is_available, true)).orderBy(desc(services.created_at));
        }
        return res.json(rows);
      }

      case 'PATCH': {
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
          await db.update(services).set(updateData).where(eq(services.id, id));
        }
        return res.json({ success: true });
      }

      case 'POST': {
        const { id: updateId, name_en, description_en, name_am, description_am, name_om, description_om, type, subcategory, price, image_url, ingredients, macro_kcal, macro_protein, macro_fat, macro_carbs, beds, max_guests, room_number } = req.body;

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
          // Update
          await db.update(services).set(values).where(eq(services.id, updateId));
          return res.json({ success: true });
        } else {
          // Create
          const [insertResult] = await db.insert(services).values(values);
          const insertId = insertResult.insertId;
          const rows = await db.select().from(services).where(eq(services.id, insertId));
          return res.json({ success: true, service: rows[0] });
        }
      }

      case 'DELETE': {
        const { id: deleteId } = req.body;
        if (!deleteId) return res.status(400).json({ error: 'Missing service ID' });
        // Delete related order items first to prevent foreign key violations
        await db.delete(orderItems).where(eq(orderItems.service_id, deleteId));
        await db.delete(services).where(eq(services.id, deleteId));
        return res.json({ success: true });
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
