import { Router, Request, Response } from 'express';
import { triggerPusherEvent, getPusher } from '../pusher.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const pusher = getPusher();
    const appId = (process.env.PUSHER_APP_ID || process.env.app_id || '').trim();
    const key = (process.env.PUSHER_KEY || process.env.key || '').trim();
    const secret = (process.env.PUSHER_SECRET || process.env.secret || '').trim();
    const cluster = (process.env.PUSHER_CLUSTER || process.env.cluster || 'mt1').trim();

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
        error: 'Pusher instance is null. Check environment variables.',
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
});

export default router;
