import Pusher from 'pusher';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

let pusherInstance: Pusher | null = null;

export function getPusher(): Pusher | null {
  if (!pusherInstance) {
    const appId = (process.env.PUSHER_APP_ID || process.env.app_id || '').replace(/['"]/g, '').trim();
    const key = (process.env.PUSHER_KEY || process.env.key || '').replace(/['"]/g, '').trim();
    const secret = (process.env.PUSHER_SECRET || process.env.secret || '').replace(/['"]/g, '').trim();
    const cluster = (process.env.PUSHER_CLUSTER || process.env.cluster || 'mt1').replace(/['"]/g, '').trim();

    if (!appId || !key || !secret) {
      return null;
    }

    pusherInstance = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
  }
  return pusherInstance;
}

function cleanPayload(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    if (data.startsWith('data:') || data.length > 500) {
      return '';
    }
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(cleanPayload);
  }
  if (typeof data === 'object') {
    const cleaned: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        cleaned[key] = cleanPayload(data[key]);
      }
    }
    return cleaned;
  }
  return data;
}

export async function triggerPusherEvent(channel: string, event: string, data: any): Promise<void> {
  try {
    const pusher = getPusher();
    if (!pusher) return;
    const cleanedData = cleanPayload(data);
    await pusher.trigger(channel, event, cleanedData);
  } catch (error) {
    console.error(`Failed to trigger Pusher event [${event}] on channel [${channel}]:`, error);
  }
}
