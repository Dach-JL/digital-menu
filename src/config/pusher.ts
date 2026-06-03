import Pusher from 'pusher-js';

// Pusher public key and cluster config
const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY || '0a0f8de2b39ee7774e0b';
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER || 'mt1';

// Initialize Pusher Client
export const pusherClient = new Pusher(PUSHER_KEY, {
  cluster: PUSHER_CLUSTER,
  forceTLS: true,
});
