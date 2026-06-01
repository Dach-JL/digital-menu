import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db';
import { roomOrders, orderItems, services } from './_schema';
import { eq, desc } from 'drizzle-orm';

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
        const rows = await db.select({
          order_id: roomOrders.id,
          room_number: roomOrders.roomNumber,
          total_price: roomOrders.totalPrice,
          status: roomOrders.status,
          created_at: roomOrders.createdAt,
          item_id: orderItems.id,
          service_id: orderItems.serviceId,
          quantity: orderItems.quantity,
          price: orderItems.price,
          name_en: services.nameEn,
          image_url: services.imageUrl
        })
        .from(roomOrders)
        .leftJoin(orderItems, eq(orderItems.orderId, roomOrders.id))
        .leftJoin(services, eq(services.id, orderItems.serviceId))
        .orderBy(desc(roomOrders.createdAt));

        // Group the flat query results by order ID
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
      }

      case 'POST': {
        const { roomNumber, items } = req.body;
        if (!roomNumber || !items || items.length === 0) {
          return res.status(400).json({ error: 'Room number and items are required.' });
        }

        let total_price = 0;
        for (const item of items) {
          total_price += item.price * item.quantity;
        }

        const [insertResult] = await db.insert(roomOrders).values({
          roomNumber,
          totalPrice: String(total_price)
        });
        const orderId = insertResult.insertId;

        for (const item of items) {
          await db.insert(orderItems).values({
            orderId,
            serviceId: item.id,
            quantity: item.quantity,
            price: String(item.price)
          });
        }

        return res.json({ success: true, order_id: orderId });
      }

      case 'PATCH': {
        const { id, status } = req.body;
        if (!id || !status) return res.status(400).json({ error: 'Missing order ID or status.' });
        await db.update(roomOrders).set({ status }).where(eq(roomOrders.id, id));
        return res.json({ success: true });
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
