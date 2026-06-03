import type { VercelRequest, VercelResponse } from '@vercel/node';
import { triggerPusherEvent, getPusher } from './_pusher.js';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const pusher = getPusher();
    
    // Check keys (masking secret for security)
    const appId = process.env.PUSHER_APP_ID || process.env.app_id || '';
    const key = process.env.PUSHER_KEY || process.env.key || '';
    const secret = process.env.PUSHER_SECRET || process.env.secret || '';
    const cluster = process.env.PUSHER_CLUSTER || process.env.cluster || 'mt1';

    const debugInfo = {
      pusherInitialized: !!pusher,
      env: {
        app_id_length: appId.length,
        key_length: key.length,
        secret_length: secret.length,
        cluster: cluster,
        has_app_id: !!appId,
        has_key: !!key,
        has_secret: !!secret,
      }
    };

    if (!pusher) {
      return res.status(500).json({
        success: false,
        error: 'Pusher instance is null. Check Vercel environment variables.',
        debugInfo
      });
    }

    console.log('Sending diagnostic test event to Pusher...');
    await pusher.trigger('menu-updates', 'service-updated', { id: 9999, isDiagnostic: true });

    return res.json({
      success: true,
      message: 'Diagnostic test event triggered successfully!',
      debugInfo
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error triggering diagnostic event',
      stack: error.stack
    });
  }
}
