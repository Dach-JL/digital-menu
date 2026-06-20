import { create } from 'zustand';
import { apiUrl } from '@/config/api';
import { toast } from 'sonner';
import { notifyAdmin } from '@/lib/firebase';

export interface CartItem {
  id: number;
  name_en: string;
  price: number;
  quantity: number;
  image_url: string;
}

interface RoomState {
  isRoomMode: boolean;
  roomNumber: string | null;
  cart: CartItem[];
  setRoomMode: (isRoomMode: boolean, roomNumber: string | null) => void;
  addToCart: (item: any) => void;
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  placeOrder: (navigate?: (path: string) => void) => Promise<void>;
  callWaiter: () => Promise<void>;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  isRoomMode: false,
  roomNumber: null,
  cart: [],
  
  setRoomMode: (isRoomMode, roomNumber) => {
    set({ isRoomMode, roomNumber });
  },

  addToCart: (item) => {
    set((state) => {
      const existing = state.cart.find((i) => i.id === item.id);
      let updatedCart;
      if (existing) {
        updatedCart = state.cart.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        updatedCart = [...state.cart, { ...item, quantity: 1 }];
      }
      return { cart: updatedCart };
    });
    toast.success(`${item.name_en} added to order`);
  },

  removeFromCart: (id) => {
    set((state) => ({
      cart: state.cart.filter((i) => i.id !== id)
    }));
  },

  updateQuantity: (id, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(id);
      return;
    }
    set((state) => ({
      cart: state.cart.map((i) => (i.id === id ? { ...i, quantity } : i))
    }));
  },

  clearCart: () => set({ cart: [] }),

  placeOrder: async (navigate) => {
    const { roomNumber, cart, clearCart } = get();
    if (!roomNumber || cart.length === 0) return;

    try {
      const response = await fetch(apiUrl('/orders.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomNumber,
          items: cart,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Order placed successfully!', {
          action: {
            label: 'Track Order',
            onClick: () => {
              if (navigate) {
                navigate('/order-status');
              } else {
                window.location.href = '/order-status';
              }
            }
          }
        });
        
        // Notify admin in real-time
        notifyAdmin('order', { 
          roomNumber, 
          orderId: result.order_id,
          totalPrice: cart.reduce((acc, item) => acc + item.price * item.quantity, 0)
        });
        
        clearCart();

        setTimeout(() => {
          if (navigate) {
            navigate('/order-status');
          } else {
            window.location.href = '/order-status';
          }
        }, 1200);
      } else {
        toast.error(result.error || 'Failed to place order');
      }
    } catch (error) {
      toast.error('Error connecting to server');
    }
  },

  callWaiter: async () => {
    const { roomNumber } = get();
    if (!roomNumber) return;

    try {
      const response = await fetch(apiUrl('/calls.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomNumber }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Waiter called. Someone will be with you shortly.');
        
        // Notify admin in real-time
        notifyAdmin('call', { roomNumber, callId: result.call_id });
      } else {
        toast.error(result.error || 'Failed to call waiter');
      }
    } catch (error) {
      toast.error('Error connecting to server');
    }
  },
}));
