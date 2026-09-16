import { create } from 'zustand';
import { apiUrl } from '@/config/api';
import { toast } from 'sonner';
import { pusherClient } from '@/config/pusher';
import {
  getCachedAdminFeedback, setCachedAdminFeedback,
  getCachedAdminOrders, setCachedAdminOrders,
  getCachedAdminCalls, setCachedAdminCalls,
} from '@/lib/pageCache';

export interface RoomOrder {
  id: number;
  room_number: string;
  total_price: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  items: any[];
}

export interface WaiterCall {
  id: number;
  room_number: string;
  status: 'pending' | 'completed';
  created_at: string;
}

export interface Feedback {
  id: number;
  comment: string;
  rating: number;
  created_at: string;
  category: string;
  username: string | null;
  service_name: string | null;
}

interface AdminQueueState {
  orders: RoomOrder[];
  calls: WaiterCall[];
  feedback: Feedback[];
  roomLoading: boolean;
  feedbackLoading: boolean;
  feedbackError: string;

  fetchRoomData: (silent?: boolean) => Promise<void>;
  fetchFeedback: (silent?: boolean) => Promise<void>;
  updateOrderStatus: (id: number, status: string) => Promise<void>;
  updateCallStatus: (id: number, status: string) => Promise<void>;
}

const playChime = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playNote = (freq: number, start: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };
    const now = audioCtx.currentTime;
    playNote(587.33, now, 0.4);       // D5 note
    playNote(880.00, now + 0.12, 0.6); // A5 note
  } catch (e) {
    console.error("Audio Context playback failed:", e);
  }
};

export const useAdminQueueStore = create<AdminQueueState>((set, get) => ({
  orders: getCachedAdminOrders() || [],
  calls: getCachedAdminCalls() || [],
  feedback: getCachedAdminFeedback() || [],
  roomLoading: false,
  feedbackLoading: false,
  feedbackError: '',

  fetchRoomData: async (silent = false) => {
    if (!silent) set({ roomLoading: true });
    try {
      const [ordersRes, callsRes] = await Promise.all([
        fetch(apiUrl('/orders')),
        fetch(apiUrl('/calls'))
      ]);

      let ordersData: RoomOrder[] = [];
      let callsData: WaiterCall[] = [];

      if (ordersRes.ok) {
        ordersData = await ordersRes.json();
        setCachedAdminOrders(ordersData);
      }
      if (callsRes.ok) {
        callsData = await callsRes.json();
        setCachedAdminCalls(callsData);
      }

      set({ orders: ordersData, calls: callsData, roomLoading: false });
    } catch (e) {
      console.error('Failed to fetch room data', e);
      set({ roomLoading: false });
    }
  },

  fetchFeedback: async (silent = false) => {
    if (!silent) set({ feedbackLoading: true });
    set({ feedbackError: '' });
    try {
      const res = await fetch(apiUrl('/feedback'));
      if (!res.ok) throw new Error('Could not fetch feedback.');
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setCachedAdminFeedback(data);
      set({ feedback: data, feedbackLoading: false });
    } catch (e: any) {
      set({ feedbackError: e.message || 'Failed to load feedback', feedbackLoading: false });
    }
  },

  updateOrderStatus: async (id, status) => {
    const originalOrders = [...get().orders];

    // Optimistic UI Update
    const updated = get().orders.map(o => o.id === id ? { ...o, status: status as any } : o);
    set({ orders: updated });
    setCachedAdminOrders(updated);

    try {
      const res = await fetch(apiUrl('/orders'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (!res.ok) throw new Error();
      
      toast.success(`Order status updated to ${status}`);
      get().fetchRoomData(true); // Sync silently
    } catch {
      // Rollback on failure
      set({ orders: originalOrders });
      setCachedAdminOrders(originalOrders);
      toast.error('Failed to update order status');
    }
  },

  updateCallStatus: async (id, status) => {
    const originalCalls = [...get().calls];

    // Optimistic UI Update
    const updated = get().calls.map(c => c.id === id ? { ...c, status: status as any } : c);
    set({ calls: updated });
    setCachedAdminCalls(updated);

    try {
      const res = await fetch(apiUrl('/calls'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (!res.ok) throw new Error();

      toast.success(`Call marked as ${status}`);
      get().fetchRoomData(true); // Sync silently
    } catch {
      // Rollback on failure
      set({ calls: originalCalls });
      setCachedAdminCalls(originalCalls);
      toast.error('Failed to update call status');
    }
  },
}));

// Bind Pusher real-time updates directly to the store
if (typeof window !== 'undefined') {
  // 1. Subscribe to admin-orders
  const ordersChannel = pusherClient.subscribe('admin-orders');

  ordersChannel.bind('order-placed', (newOrder: any) => {
    const { orders } = useAdminQueueStore.getState();
    if (orders.some((o) => String(o.id) === String(newOrder.id))) return;
    
    const updated = [newOrder, ...orders];
    useAdminQueueStore.setState({ orders: updated });
    setCachedAdminOrders(updated);

    playChime();
    toast.info(`New Order received from Room/Table ${newOrder.room_number}!`, {
      icon: '🛍️',
      duration: 8000,
    });
  });

  ordersChannel.bind('order-status-changed', (data: any) => {
    const { orders } = useAdminQueueStore.getState();
    const updated = orders.map((o) => (String(o.id) === String(data.id) ? { ...o, status: data.status } : o));
    useAdminQueueStore.setState({ orders: updated });
    setCachedAdminOrders(updated);
  });

  // 2. Subscribe to admin-calls
  const callsChannel = pusherClient.subscribe('admin-calls');

  callsChannel.bind('call-placed', (newCall: any) => {
    const { calls } = useAdminQueueStore.getState();
    if (calls.some((c) => String(c.id) === String(newCall.id))) return;

    const updated = [newCall, ...calls];
    useAdminQueueStore.setState({ calls: updated });
    setCachedAdminCalls(updated);

    playChime();
    toast.info(`New Waiter Call from Room/Table ${newCall.room_number}!`, {
      icon: '🔔',
      duration: 8000,
    });
  });

  callsChannel.bind('call-completed', (data: any) => {
    const { calls } = useAdminQueueStore.getState();
    const updated = calls.map((c) => (String(c.id) === String(data.id) ? { ...c, status: data.status } : c));
    useAdminQueueStore.setState({ calls: updated });
    setCachedAdminCalls(updated);
  });

  // 3. Subscribe to admin-feedback
  const feedbackChannel = pusherClient.subscribe('admin-feedback');

  feedbackChannel.bind('feedback-submitted', (newFeedback: any) => {
    const { feedback } = useAdminQueueStore.getState();
    if (feedback.some((f) => String(f.id) === String(newFeedback.id))) return;

    const updated = [newFeedback, ...feedback];
    useAdminQueueStore.setState({ feedback: updated });
    setCachedAdminFeedback(updated);

    toast.success('New customer feedback submitted!', {
      icon: '💬',
      duration: 5000,
    });
  });
}
