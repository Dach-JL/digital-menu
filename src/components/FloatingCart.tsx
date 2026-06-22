import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useServices } from '@/hooks/useQueries';
import { uploadsUrl } from '@/config/api';
import { useRoomMode } from '@/contexts/RoomContext';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Plus, Minus, X, CreditCard } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export const FloatingCart = () => {
  const navigate = useNavigate();
  const { isRoomMode, cart, updateQuantity, removeFromCart, placeOrder } = useRoomMode();
  
  // Retrieve the cached services list
  const { data: services = [] } = useServices();

  // Proactively check cart items against database availability
  useEffect(() => {
    if (services.length === 0 || cart.length === 0) return;

    const serviceMap = new Map(services.map(s => [s.id, s]));
    const unavailableIds: number[] = [];

    cart.forEach(item => {
      const dbService = serviceMap.get(Number(item.id));
      if (!dbService || !dbService.is_available) {
        unavailableIds.push(Number(item.id));
      }
    });

    if (unavailableIds.length > 0) {
      // Remove all hidden/deleted items from the cart
      unavailableIds.forEach(id => {
        removeFromCart(id);
      });
      toast.warning('Some items in your cart are currently out of stock and have been removed.', {
        id: 'cart-sync-warning', // Prevents showing duplicate warning toasts
      });
    }
  }, [services, cart, removeFromCart]);

  if (!isRoomMode || cart.length === 0) return null;

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="fixed bottom-24 right-5 z-50 animate-in slide-in-from-bottom-10 duration-500">
      <Drawer>
        <DrawerTrigger asChild>
          <Button size="icon" className="h-14 w-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90 relative group">
            <ShoppingCart className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-background group-hover:scale-110 transition-transform">
              {totalItems}
            </span>
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-w-[480px] mx-auto px-6 pb-6">
          <DrawerHeader className="px-0">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-xl font-bold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Your Room Order
              </DrawerTitle>
              <Badge variant="outline" className="text-xs uppercase tracking-widest bg-muted font-medium">Items: {totalItems}</Badge>
            </div>
          </DrawerHeader>
          
          <ScrollArea className="h-[40vh] py-4">
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-xl bg-muted overflow-hidden flex-shrink-0 border">
                    <img src={uploadsUrl(item.image_url)} alt={item.name_en} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{item.name_en}</h4>
                    <p className="text-xs text-primary font-bold">{item.price.toLocaleString()} ETB</p>
                  </div>
                  <div className="flex items-center gap-3 bg-muted/50 rounded-full px-2 py-1 border">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-background transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-background transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>

          <Separator className="my-4" />
          
          <div className="space-y-2 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{totalPrice.toLocaleString()} ETB</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span className="font-medium text-green-600">FREE</span>
            </div>
            <Separator className="my-1 border-dashed" />
            <div className="flex justify-between items-center pt-1">
              <span className="font-bold">Total Amount</span>
              <span className="font-bold text-lg text-primary">{totalPrice.toLocaleString()} ETB</span>
            </div>
          </div>

          <DrawerFooter className="px-0 pt-0 gap-3">
            <Button className="w-full h-12 text-md font-bold gap-2 shadow-lg" onClick={() => placeOrder(navigate)}>
              <CreditCard className="h-5 w-5" />
              Order to Room
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full h-12">Continue Browsing</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

const Badge = ({ children, variant, className }: any) => (
  <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${variant === 'outline' ? 'border border-current' : ''} ${className}`}>
    {children}
  </div>
);
