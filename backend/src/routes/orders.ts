import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { roomOrders, orderItems, services } from '../schema.js';
import { eq, desc, or, inArray } from 'drizzle-orm';
import { triggerPusherEvent } from '../pusher.js';
import { checkRateLimitByRoomOrIp } from '../rate-limit.js';

const router = Router();

// GET /api/orders
router.get('/', async (req: Request, res: Response) => {
  try {
    const orderIdParam = req.query.id ? parseInt(req.query.id as string, 10) : null;
    const roomParam = (req.query.room as string) || null;

    let query = db.select({
      order_id: roomOrders.id,
      room_number: roomOrders.room_number,
      total_price: roomOrders.total_price,
      status: roomOrders.status,
      created_at: roomOrders.created_at,
      item_id: orderItems.id,
      service_id: orderItems.service_id,
      quantity: orderItems.quantity,
      price: orderItems.price,
      name_en: services.name_en,
      image_url: services.image_url
    })
    .from(roomOrders)
    .leftJoin(orderItems, eq(orderItems.order_id, roomOrders.id))
    .leftJoin(services, eq(services.id, orderItems.service_id));

    let rows;
    if (orderIdParam) {
      rows = await query.where(eq(roomOrders.id, orderIdParam)).orderBy(desc(roomOrders.created_at));
    } else if (roomParam) {
      rows = await query.where(eq(roomOrders.room_number, roomParam)).orderBy(desc(roomOrders.created_at));
    } else {
      rows = await query.orderBy(desc(roomOrders.created_at));
    }

    const ordersMap = new Map();
    for (const row of rows) {
      if (!ordersMap.has(row.order_id)) {
        ordersMap.set(row.order_id, {
          id: row.order_id,
          room_number: row.room_number,
          total_price: Number(row.total_price),
          status: row.status,
          created_at: row.created_at,
          items: []
        });
      }
      if (row.item_id) {
        ordersMap.get(row.order_id).items.push({
          id: row.item_id,
          service_id: row.service_id,
          quantity: Number(row.quantity),
          price: Number(row.price),
          name_en: row.name_en,
          image_url: row.image_url
        });
      }
    }

    return res.json(Array.from(ordersMap.values()));
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/orders
router.post('/', async (req: Request, res: Response) => {
  try {
    const { roomNumber, items } = req.body;
    if (!roomNumber || !items || items.length === 0) {
      return res.status(400).json({ error: 'Room number and items are required.' });
    }

    const rate = await checkRateLimitByRoomOrIp(req, 'place-order', roomNumber, 8, 60);
    if (!rate.success) {
      return res.status(429).json({ error: 'Too many requests. Please wait before placing another order.' });
    }

    const itemIds: number[] = Array.from(new Set(items.map((item: any) => Number(item.id))));
    const activeServices = await db.select({
      id: services.id,
      name_en: services.name_en,
      is_available: services.is_available
    })
    .from(services)
    .where(inArray(services.id, itemIds));

    const serviceMap = new Map(activeServices.map(s => [s.id, s]));
    const unavailableItems: Array<{ id: number; name_en: string }> = [];

    for (const item of items) {
      const dbService = serviceMap.get(Number(item.id));
      if (!dbService || !dbService.is_available) {
        unavailableItems.push({
          id: item.id,
          name_en: item.name_en || (dbService ? dbService.name_en : 'Unknown Item')
        });
      }
    }

    if (unavailableItems.length > 0) {
      return res.status(422).json({
        error: 'UNAVAILABLE_ITEMS',
        message: `${unavailableItems.map(i => i.name_en).join(', ')} is currently out of stock.`,
        unavailableIds: unavailableItems.map(i => i.id)
      });
    }

    let total_price = 0;
    for (const item of items) {
      total_price += Number(item.price) * Number(item.quantity);
    }

    // Insert order header
    const [insertedOrder] = await db.insert(roomOrders).values({
      room_number: String(roomNumber),
      total_price: String(total_price)
    }).returning();

    const orderId = insertedOrder.id;

    // Insert line items
    for (const item of items) {
      await db.insert(orderItems).values({
        order_id: orderId,
        service_id: Number(item.id),
        quantity: Number(item.quantity),
        price: String(item.price)
      });
    }

    // Broadcast order placed
    const joinedRows = await db.select({
      order_id: roomOrders.id,
      room_number: roomOrders.room_number,
      total_price: roomOrders.total_price,
      status: roomOrders.status,
      created_at: roomOrders.created_at,
      item_id: orderItems.id,
      service_id: orderItems.service_id,
      quantity: orderItems.quantity,
      price: orderItems.price,
      name_en: services.name_en,
      image_url: services.image_url
    })
    .from(roomOrders)
    .leftJoin(orderItems, eq(orderItems.order_id, roomOrders.id))
    .leftJoin(services, eq(services.id, orderItems.service_id))
    .where(eq(roomOrders.id, orderId));

    if (joinedRows.length > 0) {
      const firstRow = joinedRows[0];
      const orderData = {
        id: orderId,
        room_number: firstRow.room_number,
        total_price: Number(firstRow.total_price),
        status: firstRow.status || 'pending',
        created_at: firstRow.created_at,
        items: joinedRows.filter((row: any) => row.item_id).map((row: any) => ({
          id: row.item_id,
          service_id: row.service_id,
          quantity: Number(row.quantity),
          price: Number(row.price),
          name_en: row.name_en,
          image_url: row.image_url
        }))
      };
      await triggerPusherEvent('admin-orders', 'order-placed', orderData);
    }

    return res.json({ success: true, order_id: orderId });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return res.status(500).json({ error: error.message });
  }
});

// PATCH /api/orders
router.patch('/', async (req: Request, res: Response) => {
  try {
    const { id, status } = req.body;
    if (!id || !status) return res.status(400).json({ error: 'Missing order ID or status.' });

    await db.update(roomOrders).set({ status }).where(eq(roomOrders.id, Number(id)));
    await triggerPusherEvent('admin-orders', 'order-status-changed', { id: Number(id), status });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating order:', error);
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/orders
router.delete('/', async (req: Request, res: Response) => {
  try {
    const targetOrders = await db.select({ id: roomOrders.id })
      .from(roomOrders)
      .where(or(eq(roomOrders.status, 'completed'), eq(roomOrders.status, 'cancelled')));

    if (targetOrders.length > 0) {
      const ids = targetOrders.map((o: { id: number }) => o.id);
      await db.delete(orderItems).where(inArray(orderItems.order_id, ids));
      await db.delete(roomOrders).where(inArray(roomOrders.id, ids));
    }

    await triggerPusherEvent('admin-orders', 'orders-cleared', {});
    return res.json({ success: true, clearedCount: targetOrders.length });
  } catch (error: any) {
    console.error('Error clearing orders:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
