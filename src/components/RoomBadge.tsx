import React from 'react';
import { useRoomMode } from '@/contexts/RoomContext';
import { Badge } from '@/components/ui/badge';
import { Bed, ArrowRight } from 'lucide-react';
import { useRoomOrders } from '@/hooks/useQueries';
import { useNavigate } from 'react-router-dom';

export const RoomBadge = () => {
  const { isRoomMode, roomNumber } = useRoomMode();
  const { data: orders = [] } = useRoomOrders(roomNumber);
  const navigate = useNavigate();

  if (!isRoomMode || !roomNumber) return null;

  const hasActiveOrders = orders.some(o => o.status !== 'completed' && o.status !== 'cancelled');

  return (
    <div className="flex items-center justify-between w-full px-5 py-3 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-top duration-500">
      <div className="flex items-center gap-2">
        <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 p-1.5 rounded-lg shadow-sm">
          <Bed className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground font-montserrat">Room {roomNumber}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Room Service Active</p>
        </div>
      </div>
      {orders.length > 0 ? (
        <button 
          onClick={() => navigate('/order-status')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all shadow-sm ${
            hasActiveOrders 
              ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse' 
              : 'bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950'
          }`}
        >
          {hasActiveOrders ? 'Track Order' : 'Order History'}
          <ArrowRight className="h-3 w-3" />
        </button>
      ) : (
        <Badge variant="outline" className="bg-white dark:bg-zinc-800 text-foreground border-border font-bold text-[10px] uppercase">
          Premium
        </Badge>
      )}
    </div>
  );
};
