import React, { useState } from 'react';
import { useRoomMode } from '@/contexts/RoomContext';
import { Button } from '@/components/ui/button';
import { Bell, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const FloatingCallWaiter = () => {
  const { isRoomMode, callWaiter } = useRoomMode();
  const [isCalling, setIsCalling] = useState(false);
  const [called, setCalled] = useState(false);

  if (!isRoomMode) return null;

  const handleCall = async () => {
    setIsCalling(true);
    try {
      await callWaiter();
      setCalled(true);
      setTimeout(() => setCalled(false), 5000); // Reset after 5 seconds
    } catch (error) {
      toast.error("Could not call waiter at this moment.");
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div className="fixed bottom-24 left-5 z-50 animate-in slide-in-from-bottom-10 duration-500 delay-100">
      <Button 
        size="icon" 
        className={`h-14 w-14 rounded-full shadow-2xl transition-all duration-300 ${
          called 
            ? "bg-green-500 hover:bg-green-600 scale-110" 
            : "bg-golden hover:bg-golden/90 hover:scale-105"
        }`}
        onClick={handleCall}
        disabled={isCalling || called}
      >
        {isCalling ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : called ? (
          <CheckCircle2 className="h-6 w-6 text-white" />
        ) : (
          <Bell className="h-6 w-6 text-golden-foreground animate-pulse" />
        )}
      </Button>
      <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-popover/90 backdrop-blur px-3 py-1.5 rounded-full border shadow-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Call Waiter</span>
      </div>
    </div>
  );
};
