import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db.js';
import { waiterCalls } from './_schema.js';
import { eq, desc } from 'drizzle-orm';
import { triggerPusherEvent } from './_pusher.js';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
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
        const rows = await db.select().from(waiterCalls).orderBy(desc(waiterCalls.created_at));
        return res.json(rows);
      }

      case 'POST': {
        const { roomNumber } = req.body;
        if (!roomNumber) return res.status(400).json({ error: 'Room number is required.' });
        const [insertResult] = await db.insert(waiterCalls).values({
          room_number: roomNumber
        });
        
        // Fetch call row and broadcast event
        const rows = await db.select().from(waiterCalls).where(eq(waiterCalls.id, insertResult.insertId));
        if (rows.length > 0) {
          await triggerPusherEvent('admin-calls', 'call-placed', rows[0]);
        }
        
        return res.json({ success: true, call_id: insertResult.insertId });
      }

      case 'PATCH': {
        const { id, status } = req.body;
        if (!id || !status) return res.status(400).json({ error: 'Missing call ID or status.' });
        await db.update(waiterCalls).set({ status }).where(eq(waiterCalls.id, id));
        
        // Broadcast completion / status update
        await triggerPusherEvent('admin-calls', 'call-completed', { id, status });
        
        return res.json({ success: true });
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}

