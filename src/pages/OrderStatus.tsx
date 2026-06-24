import React from 'react';
import { useRoomStore } from '@/stores/roomStore';
import { useRoomOrders } from '@/hooks/useQueries';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ShoppingBag, 
  Clock, 
  Utensils, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  RefreshCw 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const OrderStatus = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { roomNumber } = useRoomStore();
  const { data: orders = [], isLoading, refetch, isRefetching } = useRoomOrders(roomNumber);

  // Group active vs history orders
  const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  const pastOrders = orders.filter(o => o.status === 'completed' || o.status === 'cancelled');

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'pending': return 1;
      case 'preparing': return 2;
      case 'on_the_way': return 3;
      case 'completed': return 4;
      default: return 0;
    }
  };

  return (
    <div className="bg-background flex max-w-[480px] md:max-w-full w-full flex-col overflow-hidden mx-auto min-h-screen pb-28 page-transition">
      <header className="fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-md z-40 border-b border-border/40">
        <div className="flex items-center justify-between px-5 h-14 max-w-[480px] md:max-w-full mx-auto">
          <button onClick={() => navigate('/')} className="p-1 -ml-1 rounded-full hover:bg-accent transition-colors">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <span className="font-bold text-base">Order Progress</span>
          <button 
            onClick={() => refetch()} 
            disabled={isLoading || isRefetching}
            className="p-1 -mr-1 rounded-full hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-foreground ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="flex flex-col w-full flex-1 px-5 md:px-8 lg:px-12 xl:px-16 pt-20">
        {/* Room Header */}
        <div className="bg-muted/30 border border-border/40 p-4 rounded-2xl mb-6 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Your Table / Room</h2>
            <p className="text-xl font-extrabold text-foreground">{roomNumber ? `Room ${roomNumber}` : 'Not Connected'}</p>
          </div>
          <Badge variant="secondary" className="px-3 py-1 font-bold text-xs bg-primary/5 text-primary border-primary/20">
            Live Updates
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <p className="text-sm">Fetching your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 px-4">
            <ShoppingBag className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-1">No Orders Placed</h3>
            <p className="text-sm text-muted-foreground mb-6">
              You haven't ordered anything from this room yet. Head back to the menu to place an order.
            </p>
            <Button onClick={() => navigate('/')} className="font-bold">
              Browse Menu
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Orders Section */}
            {activeOrders.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-extrabold text-sm text-muted-foreground uppercase tracking-wider pl-1">Active Orders</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeOrders.map((order) => {
                    const currentStep = getStepIndex(order.status);
                    
                    return (
                      <Card key={order.id} className="border-border/60 shadow-sm overflow-hidden">
                        <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-sm font-extrabold">Order #{order.id}</CardTitle>
                              <span className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-sm text-primary">{Number(order.total_price).toLocaleString()} ETB</span>
                              <p className="text-[10px] text-muted-foreground">{order.items.length} items</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="py-5 space-y-6">
                          {/* Status tracker visual */}
                          <div className="relative flex justify-between items-center w-full px-2">
                            {/* Progress Line */}
                            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-muted -translate-y-1/2 z-0" />
                            <div 
                              className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-700" 
                              style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                            />

                            {/* Step 1: Placed */}
                            <div className="flex flex-col items-center z-10">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                currentStep >= 1 ? 'bg-primary text-primary-foreground scale-110 shadow-sm' : 'bg-muted text-muted-foreground'
                              }`}>
                                <Clock className="w-4 h-4" />
                              </div>
                              <span className="text-[9px] font-bold mt-1 text-center">Placed</span>
                            </div>

                            {/* Step 2: Preparing */}
                            <div className="flex flex-col items-center z-10">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                currentStep >= 2 ? 'bg-primary text-primary-foreground scale-110 shadow-sm' : 'bg-muted text-muted-foreground'
                              }`}>
                                <Utensils className="w-4 h-4" />
                              </div>
                              <span className="text-[9px] font-bold mt-1 text-center">Kitchen</span>
                            </div>

                            {/* Step 3: On the Way */}
                            <div className="flex flex-col items-center z-10">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                currentStep >= 3 ? 'bg-primary text-primary-foreground scale-110 shadow-sm' : 'bg-muted text-muted-foreground'
                              }`}>
                                <Truck className="w-4 h-4" />
                              </div>
                              <span className="text-[9px] font-bold mt-1 text-center">Delivery</span>
                            </div>

                            {/* Step 4: Completed */}
                            <div className="flex flex-col items-center z-10">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                currentStep >= 4 ? 'bg-primary text-primary-foreground scale-110 shadow-sm' : 'bg-muted text-muted-foreground'
                              }`}>
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                              <span className="text-[9px] font-bold mt-1 text-center">Served</span>
                            </div>
                          </div>

                          {/* Status Label Description */}
                          <div className="bg-accent/40 rounded-xl p-3 text-xs text-center border border-border/30">
                            {order.status === 'pending' && (
                              <p className="text-amber-600 dark:text-amber-400 font-medium">
                                We have received your order. Standard preparation time is 15-25 minutes.
                              </p>
                            )}
                            {order.status === 'preparing' && (
                              <p className="text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                                Our chefs are preparing your delicious meal in the kitchen!
                              </p>
                            )}
                            {order.status === 'on_the_way' && (
                              <p className="text-indigo-600 dark:text-indigo-400 font-medium animate-pulse">
                                Your order is ready and on the way to Room/Table {roomNumber}!
                              </p>
                            )}
                          </div>

                          {/* Items summary */}
                          <div className="space-y-2 border-t pt-4 border-border/40">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Order Items</p>
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-xs py-1">
                                <span>{item.quantity}x {item.name_en}</span>
                                <span className="text-muted-foreground">{(item.price * item.quantity).toLocaleString()} ETB</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Past Orders Section */}
            {pastOrders.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-extrabold text-sm text-muted-foreground uppercase tracking-wider pl-1">Past Orders</h3>
                {pastOrders.map((order) => (
                  <Card key={order.id} className="border-border/40 opacity-80 hover:opacity-100 transition-opacity">
                    <CardContent className="py-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-full ${
                            order.status === 'completed' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                          }`}>
                            {order.status === 'completed' ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <XCircle className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm">Order #{order.id}</h4>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-foreground">{Number(order.total_price).toLocaleString()} ETB</p>
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${
                            order.status === 'completed' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};

export default OrderStatus;
