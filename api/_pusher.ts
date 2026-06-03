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

export async function triggerPusherEvent(channel: string, event: string, data: any): Promise<void> {
  try {
    const pusher = getPusher();
    if (!pusher) return;
    await pusher.trigger(channel, event, data);
  } catch (error) {
    console.error(`Failed to trigger Pusher event [${event}] on channel [${channel}]:`, error);
  }
}
