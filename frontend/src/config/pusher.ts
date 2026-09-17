import Pusher from 'pusher-js';

// Enable Pusher logging to the browser console for debugging
Pusher.logToConsole = true;

// Pusher public key and cluster config
const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY || '96746325bdd803e483f4';
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER || 'mt1';

// Initialize Pusher Client
export const pusherClient = new Pusher(PUSHER_KEY, {
  cluster: PUSHER_CLUSTER,
  forceTLS: true,
});

pusherClient.connection.bind('state_change', (states: any) => {
  console.log('Pusher connection state changed:', states.previous, '->', states.current);
});

pusherClient.connection.bind('error', (err: any) => {
  console.error('Pusher connection error:', err);
});

