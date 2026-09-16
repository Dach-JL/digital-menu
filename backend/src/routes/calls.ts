import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { waiterCalls } from '../schema.js';
import { eq, desc } from 'drizzle-orm';
import { triggerPusherEvent } from '../pusher.js';
import { checkRateLimitByRoomOrIp } from '../rate-limit.js';

const router = Router();

// GET /api/calls
router.get('/', async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(waiterCalls).orderBy(desc(waiterCalls.created_at));
    return res.json(rows);
  } catch (error: any) {
    console.error('Error fetching waiter calls:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/calls
router.post('/', async (req: Request, res: Response) => {
  try {
    const { roomNumber } = req.body;
    if (!roomNumber) return res.status(400).json({ error: 'Room number is required.' });

    const rate = await checkRateLimitByRoomOrIp(req, 'waiter-call', roomNumber, 5, 60);
    if (!rate.success) {
      return res.status(429).json({ error: 'Too many requests. Please wait before calling the waiter again.' });
    }

    const [inserted] = await db.insert(waiterCalls).values({
      room_number: String(roomNumber)
    }).returning();

    if (inserted) {
      await triggerPusherEvent('admin-calls', 'call-placed', inserted);
    }

    return res.json({ success: true, call_id: inserted?.id });
  } catch (error: any) {
    console.error('Error placing waiter call:', error);
    return res.status(500).json({ error: error.message });
  }
});

// PATCH /api/calls
router.patch('/', async (req: Request, res: Response) => {
  try {
    const { id, status } = req.body;
    if (!id || !status) return res.status(400).json({ error: 'Missing call ID or status.' });

    await db.update(waiterCalls).set({ status }).where(eq(waiterCalls.id, Number(id)));
    await triggerPusherEvent('admin-calls', 'call-completed', { id: Number(id), status });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating call status:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
