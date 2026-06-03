import Pusher from 'pusher';

let pusherInstance: Pusher | null = null;

export function getPusher(): Pusher | null {
  if (!pusherInstance) {
    // Read Pusher credentials from environment variables (supporting both lowercase and uppercase keys)
    const appId = process.env.PUSHER_APP_ID || process.env.app_id || '';
    const key = process.env.PUSHER_KEY || process.env.key || '';
    const secret = process.env.PUSHER_SECRET || process.env.secret || '';
    const cluster = process.env.PUSHER_CLUSTER || process.env.cluster || 'mt1';

    // Remove quotes if present
    const cleanAppId = appId.replace(/['"]/g, '').trim();
    const cleanKey = key.replace(/['"]/g, '').trim();
    const cleanSecret = secret.replace(/['"]/g, '').trim();
    const cleanCluster = cluster.replace(/['"]/g, '').trim();

    if (!cleanAppId || !cleanKey || !cleanSecret) {
      console.warn('Pusher environment variables are not fully configured. Real-time updates disabled.');
      return null;
    }

    pusherInstance = new Pusher({
      appId: cleanAppId,
      key: cleanKey,
      secret: cleanSecret,
      cluster: cleanCluster,
      useTLS: true,
    });
  }
  return pusherInstance;
}

function cleanPayload(data: any): any {
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'string') {
    // If it is a base64 string or too long to be a normal URL, strip it to keep payload size under 10KB
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
