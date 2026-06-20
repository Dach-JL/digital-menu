import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { pusherClient } from '@/config/pusher';
import { toast } from 'sonner';

export const QueryPusherSync = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // 1. Subscribe to menu-updates
    const menuChannel = pusherClient.subscribe('menu-updates');

    const handleServiceCreated = () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    };

    const handleServiceUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    };

    const handleServiceDeleted = () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
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

    ordersChannel.bind('order-placed', handleOrderPlaced);
    ordersChannel.bind('order-status-changed', handleOrderStatusChanged);

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
