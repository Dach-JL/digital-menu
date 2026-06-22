import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db.js';
import { roomOrders, orderItems, services } from './_schema.js';
import { eq, desc, or, inArray } from 'drizzle-orm';
import { triggerPusherEvent } from './_pusher.js';
import { checkRateLimitByRoomOrIp } from './_rate-limit.js';

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
        const orderIdParam = req.query.id ? parseInt(req.query.id as string, 10) : null;
        const roomParam = req.query.room as string || null;

        let rows;
        if (orderIdParam) {
          rows = await db.select({
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
          .where(eq(roomOrders.id, orderIdParam))
          .orderBy(desc(roomOrders.created_at));
        } else if (roomParam) {
          rows = await db.select({
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
          .where(eq(roomOrders.room_number, roomParam))
          .orderBy(desc(roomOrders.created_at));
        } else {
          rows = await db.select({
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
          .orderBy(desc(roomOrders.created_at));
        }

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

        // Rate limit: Max 8 order placements per 60 seconds per Room/IP address
        const rate = await checkRateLimitByRoomOrIp(req, 'place-order', roomNumber, 8, 60);
        if (!rate.success) {
          return res.status(429).json({ error: 'Too many requests. Please wait before placing another order.' });
        }

        let total_price = 0;
        for (const item of items) {
          total_price += item.price * item.quantity;
        }

        const orderId = await db.transaction(async (tx) => {
          const [insertResult] = await tx.insert(roomOrders).values({
            room_number: roomNumber,
            total_price: String(total_price)
          });
          const newOrderId = insertResult.insertId;

          for (const item of items) {
            await tx.insert(orderItems).values({
              order_id: newOrderId,
              service_id: item.id,
              quantity: item.quantity,
              price: String(item.price)
            });
          }
          return newOrderId;
        });

        // Fetch detailed order data with items joined to broadcast
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
      }

      case 'PATCH': {
        const { id, status } = req.body;
        if (!id || !status) return res.status(400).json({ error: 'Missing order ID or status.' });
        await db.update(roomOrders).set({ status }).where(eq(roomOrders.id, id));
        
        // Broadcast status update
        await triggerPusherEvent('admin-orders', 'order-status-changed', { id, status });
        
        return res.json({ success: true });
      }

      case 'DELETE': {
        // Find completed/cancelled orders
        const targetOrders = await db.select({ id: roomOrders.id })
          .from(roomOrders)
          .where(
            or(
              eq(roomOrders.status, 'completed'),
              eq(roomOrders.status, 'cancelled')
            )
          );
        
        if (targetOrders.length > 0) {
          const ids = targetOrders.map((o: { id: number }) => o.id);
          await db.transaction(async (tx) => {
            // Delete from orderItems first to avoid orphans
            await tx.delete(orderItems).where(inArray(orderItems.order_id, ids));
            // Delete from roomOrders
            await tx.delete(roomOrders).where(inArray(roomOrders.id, ids));
          });
        }

        // Broadcast to trigger refetches in real-time
        await triggerPusherEvent('admin-orders', 'orders-cleared', {});

        return res.json({ success: true, clearedCount: targetOrders.length });
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}

