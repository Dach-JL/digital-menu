import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { pusherClient } from '@/config/pusher';
import { toast } from 'sonner';

export const QueryPusherSync = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // 1. Subscribe to menu-updates
    const menuChannel = pusherClient.subscribe('menu-updates');

    const handleServiceCreated = (newService: any) => {
      // 1. Update guest menu services list (admin: false)
      queryClient.setQueryData<any[]>(['services', { admin: false }], (oldData) => {
        if (!oldData) return oldData;
        const isAvailable = newService.is_available === true || Number(newService.is_available) === 1;
        if (!isAvailable) return oldData;
        if (oldData.some(s => String(s.id) === String(newService.id))) return oldData;
        return [newService, ...oldData];
      });

      // 2. Update admin services list (admin: true)
      queryClient.setQueryData<any[]>(['services', { admin: true }], (oldData) => {
        if (!oldData) return oldData;
        if (oldData.some(s => String(s.id) === String(newService.id))) return oldData;
        return [newService, ...oldData];
      });

      queryClient.invalidateQueries({ queryKey: ['services', { admin: true }] });
    };

    const handleServiceUpdated = (updatedService: any) => {
      // 1. Update guest menu services list (admin: false)
      queryClient.setQueryData<any[]>(['services', { admin: false }], (oldData) => {
        if (!oldData) return oldData;
        const isAvailable = updatedService.is_available === true || Number(updatedService.is_available) === 1;
        if (!isAvailable) {
          // Remove if made unavailable (hidden)
          return oldData.filter(s => String(s.id) !== String(updatedService.id));
        }
        
        const exists = oldData.some(s => String(s.id) === String(updatedService.id));
        if (exists) {
          return oldData.map(s => String(s.id) === String(updatedService.id) ? { ...s, ...updatedService } : s);
        } else {
          // Add if it was previously hidden and is now available
          return [updatedService, ...oldData];
        }
      });

      // 2. Update admin services list (admin: true)
      queryClient.setQueryData<any[]>(['services', { admin: true }], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(s => String(s.id) === String(updatedService.id) ? { ...s, ...updatedService } : s);
      });

      queryClient.invalidateQueries({ queryKey: ['services', { admin: true }] });
    };

    const handleServiceDeleted = (data: { id: number }) => {
      const deletedId = data.id;

      // 1. Update guest menu services list (admin: false)
      queryClient.setQueryData<any[]>(['services', { admin: false }], (oldData) => {
        if (!oldData) return oldData;
        return oldData.filter(s => String(s.id) !== String(deletedId));
      });

      // 2. Update admin services list (admin: true)
      queryClient.setQueryData<any[]>(['services', { admin: true }], (oldData) => {
        if (!oldData) return oldData;
        return oldData.filter(s => String(s.id) !== String(deletedId));
      });

      queryClient.invalidateQueries({ queryKey: ['services', { admin: true }] });
    };

    menuChannel.bind('service-created', handleServiceCreated);
    menuChannel.bind('service-updated', handleServiceUpdated);
    menuChannel.bind('service-deleted', handleServiceDeleted);

    // Helper to play dual-tone chime sound
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
        console.error('Audio Context playback failed:', e);
      }
    };

    // 2. Subscribe to admin-orders
    const ordersChannel = pusherClient.subscribe('admin-orders');

    const handleOrderPlaced = (newOrder: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      playChime();
      toast.info(`New Order received from Room/Table ${newOrder.room_number}!`, {
        icon: '🛍️',
        duration: 8000,
      });
    };

    const handleOrderStatusChanged = () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    };

    const handleOrdersCleared = () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    };

    ordersChannel.bind('order-placed', handleOrderPlaced);
    ordersChannel.bind('order-status-changed', handleOrderStatusChanged);
    ordersChannel.bind('orders-cleared', handleOrdersCleared);

    // 3. Subscribe to admin-calls
    const callsChannel = pusherClient.subscribe('admin-calls');

    const handleCallPlaced = (newCall: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'calls'] });
      playChime();
      toast.info(`New Waiter Call from Room/Table ${newCall.room_number}!`, {
        icon: '🔔',
        duration: 8000,
      });
    };

    const handleCallCompleted = () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'calls'] });
    };

    callsChannel.bind('call-placed', handleCallPlaced);
    callsChannel.bind('call-completed', handleCallCompleted);

    // 4. Subscribe to admin-feedback
    const feedbackChannel = pusherClient.subscribe('admin-feedback');

    const handleFeedbackSubmitted = () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] });
      toast.success('New customer feedback submitted!', {
        icon: '💬',
        duration: 5000,
      });
    };

    feedbackChannel.bind('feedback-submitted', handleFeedbackSubmitted);

    return () => {
      menuChannel.unbind('service-created', handleServiceCreated);
      menuChannel.unbind('service-updated', handleServiceUpdated);
      menuChannel.unbind('service-deleted', handleServiceDeleted);
      pusherClient.unsubscribe('menu-updates');

      ordersChannel.unbind('order-placed', handleOrderPlaced);
      ordersChannel.unbind('order-status-changed', handleOrderStatusChanged);
      ordersChannel.unbind('orders-cleared', handleOrdersCleared);
      pusherClient.unsubscribe('admin-orders');

      callsChannel.unbind('call-placed', handleCallPlaced);
      callsChannel.unbind('call-completed', handleCallCompleted);
      pusherClient.unsubscribe('admin-calls');

      feedbackChannel.unbind('feedback-submitted', handleFeedbackSubmitted);
      pusherClient.unsubscribe('admin-feedback');
    };
  }, [queryClient]);

  return null;
};
