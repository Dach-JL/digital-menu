import React, { useEffect, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRoomStore, type CartItem } from '@/stores/roomStore';
import { useShallow } from 'zustand/react/shallow';

export type { CartItem };

export const RoomProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams] = useSearchParams();
  const setRoomMode = useRoomStore((state) => state.setRoomMode);

  useEffect(() => {
    const mode = searchParams.get('mode');
    const room = searchParams.get('room');

    if (mode === 'room' && room) {
      setRoomMode(true, room);
      sessionStorage.setItem('room_service_mode', 'true');
      sessionStorage.setItem('room_number', room);
    } else {
      const savedMode = sessionStorage.getItem('room_service_mode');
      const savedRoom = sessionStorage.getItem('room_number');
      if (savedMode === 'true' && savedRoom) {
        setRoomMode(true, savedRoom);
      }
    }
  }, [searchParams, setRoomMode]);

  return <>{children}</>;
};

export const useRoomMode = () => {
  return useRoomStore(
    useShallow((state) => ({
      isRoomMode: state.isRoomMode,
      roomNumber: state.roomNumber,
      cart: state.cart,
      addToCart: state.addToCart,
      removeFromCart: state.removeFromCart,
      updateQuantity: state.updateQuantity,
      clearCart: state.clearCart,
      placeOrder: state.placeOrder,
      callWaiter: state.callWaiter
    }))
  );
};
