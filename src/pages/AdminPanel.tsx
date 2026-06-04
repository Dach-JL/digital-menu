import React, { useState, useEffect, useMemo } from "react";
import { apiUrl, uploadsUrl } from '@/config/api';
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import QRCode from "react-qr-code";
import { MessageSquare, Plus, Star, Trash2, Edit, X, Clock, ShoppingBag, CheckCircle, BellRing, Eye, EyeOff, QrCode, ChevronRight, ChevronLeft, Bell, Utensils } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";
import { useUser, type AdminRole } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CategoryTabs } from "@/components/CategoryTabs";
import { foodSubcategories, drinkSubcategories } from "@/constants/categories";
import {
  getCachedAdminServices, setCachedAdminServices, invalidateCachedAdminServices,
  getCachedAdminFeedback, setCachedAdminFeedback,
  getCachedAdminOrders, setCachedAdminOrders,
  getCachedAdminCalls, setCachedAdminCalls,
} from '@/lib/pageCache';
import { pusherClient } from '@/config/pusher';

// Updated Service type
interface Service {
  id: number;
  name_en: string;
  description_en: string;
  price: string;
  type: string;
  image_url: string;
  ingredients: string; // JSON string
  macro_kcal: number | null;
  macro_protein: number | null;
  macro_fat: number | null;
  macro_carbs: number | null;
  beds: number | null;
  max_guests: number | null;
  room_number: string | null;
  subcategory?: string | null;
  is_available: boolean;
}

interface Feedback {
  id: number;
  comment: string;
  rating: number;
  created_at: string;
  category: string;
  username: string | null;
  service_name: string | null;
}

import { subscribeToNotifications } from "@/lib/firebase";

interface RoomOrder {
  id: number;
  room_number: string;
  total_price: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  items: any[];
}

interface WaiterCall {
  id: number;
  room_number: string;
  status: 'pending' | 'completed';
  created_at: string;
}

// Define which tabs each role can see
const ROLE_TABS: Record<string, string[]> = {
  admin: ['services', 'orders', 'calls', 'feedback', 'qrcodes'],
  admin_room: ['services', 'qrcodes'],
  admin_food: ['services', 'orders'],
  admin_waiter: ['calls'],
};

// Define which service types each role can manage
const ROLE_SERVICE_TYPES: Record<string, string[]> = {
  admin: ['food', 'drink', 'room'],
  admin_room: ['room'],
  admin_food: ['food', 'drink'],
  admin_waiter: [],
};

// Friendly names for tabs
const TAB_LABELS: Record<string, string> = {
  services: 'admin.services_tab',
  orders: 'Orders',
  calls: 'Calls',
  feedback: 'admin.feedback_tab',
  qrcodes: 'QR Codes',
};

const AdminPanel = () => {
  const { user, isAnyAdmin } = useUser();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const userRole = user?.role || 'user';
  const allowedTabs = ROLE_TABS[userRole] || [];
  const allowedServiceTypes = ROLE_SERVICE_TYPES[userRole] || [];

  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [serviceCategory, setServiceCategory] = useState((userRole === 'admin' ? 'food' : allowedServiceTypes[0]) || 'food');
  
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  const [orders, setOrders] = useState<RoomOrder[]>([]);
  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const [roomLoading, setRoomLoading] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  const defaultType = allowedServiceTypes[0] || 'food';
  const initialFormData = { 
    name_en: "", description_en: "", 
    price: "", type: defaultType, subcategory: "",
    macro_kcal: "", macro_protein: "", macro_fat: "", macro_carbs: "",
    beds: "1", max_guests: "2", room_number: ""
  };
  const [formData, setFormData] = useState(initialFormData);
  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Play a dual-tone chime sound for new orders and calls (browser-native, no download required)
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

  // Real-time updates subscription via Pusher
  useEffect(() => {
    // 1. Subscribe to menu-updates
    const menuChannel = pusherClient.subscribe('menu-updates');

    menuChannel.bind('service-created', (newService: any) => {
      setServices((prev) => {
        if (prev.some((s) => String(s.id) === String(newService.id))) return prev;
        const updated = [newService, ...prev];
        setCachedAdminServices(updated);
        return updated;
      });
      // Trigger a silent background fetch to retrieve the full Base64 image
      fetchServices(true);
    });

    menuChannel.bind('service-updated', (updatedService: any) => {
      setServices((prev) => {
        const updated = prev.map((s) => {
          if (String(s.id) === String(updatedService.id)) {
            return {
              ...s,
              ...updatedService,
              // Reuse existing image if Pusher payload has stripped image_url
              image_url: updatedService.image_url || s.image_url || ""
            };
          }
          return s;
        });
        setCachedAdminServices(updated);
        return updated;
      });
      // Trigger a silent background fetch to retrieve the full Base64 image
      fetchServices(true);
    });

    menuChannel.bind('service-deleted', (data: { id: number }) => {
      setServices((prev) => {
        const updated = prev.filter((s) => String(s.id) !== String(data.id));
        setCachedAdminServices(updated);
        return updated;
      });
      // Keep list in sync
      fetchServices(true);
    });

    // 2. Subscribe to admin-orders
    const ordersChannel = pusherClient.subscribe('admin-orders');

    ordersChannel.bind('order-placed', (newOrder: any) => {
      setOrders((prev) => {
        if (prev.some((o) => String(o.id) === String(newOrder.id))) return prev;
        const updated = [newOrder, ...prev];
        setCachedAdminOrders(updated);
        return updated;
      });
      playChime();
      toast.info(`New Order received from Room/Table ${newOrder.room_number}!`, {
        icon: '🛍️',
        duration: 8000,
      });
    });

    ordersChannel.bind('order-status-changed', (data: any) => {
      setOrders((prev) => {
        const updated = prev.map((o) => (String(o.id) === String(data.id) ? { ...o, status: data.status } : o));
        setCachedAdminOrders(updated);
        return updated;
      });
    });

    // 3. Subscribe to admin-calls
    const callsChannel = pusherClient.subscribe('admin-calls');

    callsChannel.bind('call-placed', (newCall: any) => {
      setCalls((prev) => {
        if (prev.some((c) => String(c.id) === String(newCall.id))) return prev;
        const updated = [newCall, ...prev];
        setCachedAdminCalls(updated);
        return updated;
      });
      playChime();
      toast.info(`New Waiter Call from Room/Table ${newCall.room_number}!`, {
        icon: '🔔',
        duration: 8000,
      });
    });

    callsChannel.bind('call-completed', (data: any) => {
      setCalls((prev) => {
        const updated = prev.map((c) => (String(c.id) === String(data.id) ? { ...c, status: data.status } : c));
        setCachedAdminCalls(updated);
        return updated;
      });
    });

    // 4. Subscribe to admin-feedback
    const feedbackChannel = pusherClient.subscribe('admin-feedback');

    feedbackChannel.bind('feedback-submitted', (newFeedback: any) => {
      setFeedback((prev) => {
        if (prev.some((f) => String(f.id) === String(newFeedback.id))) return prev;
        const updated = [newFeedback, ...prev];
        setCachedAdminFeedback(updated);
        return updated;
      });
      toast.success('New customer feedback submitted!', {
        icon: '💬',
        duration: 5000,
      });
    });

    return () => {
      pusherClient.unsubscribe('menu-updates');
      pusherClient.unsubscribe('admin-orders');
      pusherClient.unsubscribe('admin-calls');
      pusherClient.unsubscribe('admin-feedback');
    };
  }, []);

  // Remove auto-setting active tab so it defaults to Master Menu
  useEffect(() => {
    // Menu is default view
  }, [userRole]);

  useEffect(() => {
    if (!isAnyAdmin()) {
      toast.error("Access Denied: You are not an administrator.");
      navigate('/');
    }
  }, [user, navigate]);


  const fetchServices = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(apiUrl("/services.php?admin=1"));
      if (!res.ok) throw new Error("Failed to fetch services data.");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCachedAdminServices(data);
      setServices(data);
    } catch (e: any) {
      if (!silent) setError(e.message);
    }
    if (!silent) setLoading(false);
  };
  
  const fetchFeedback = async (silent = false) => {
    if (!silent) setFeedbackLoading(true);
    setFeedbackError("");
    try {
      const res = await fetch(apiUrl("/feedback.php"));
      if (!res.ok) throw new Error("Could not fetch feedback.");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCachedAdminFeedback(data);
      setFeedback(data);
    } catch (e: any) {
      if (!silent) setFeedbackError(e.message);
    }
    if (!silent) setFeedbackLoading(false);
  };

  const fetchRoomData = async (silent = false) => {
    if (!silent) setRoomLoading(true);
    try {
      const [ordersRes, callsRes] = await Promise.all([
        fetch(apiUrl("/orders.php")),
        fetch(apiUrl("/calls.php"))
      ]);
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setCachedAdminOrders(ordersData);
        setOrders(ordersData);
      }
      if (callsRes.ok) {
        const callsData = await callsRes.json();
        setCachedAdminCalls(callsData);
        setCalls(callsData);
      }
    } catch (e) {
      console.error("Failed to fetch room data", e);
    }
    if (!silent) setRoomLoading(false);
  };

  const updateOrderStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(apiUrl("/orders.php"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        toast.success(`Order status updated to ${status}`);
        fetchRoomData();
      }
    } catch (e) {
      toast.error("Failed to update order status");
    }
  };

  const updateCallStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(apiUrl("/calls.php"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        toast.success(`Call marked as ${status}`);
        fetchRoomData();
      }
    } catch (e) {
      toast.error("Failed to update call status");
    }
  };

  // Toggle service availability
  const toggleAvailability = async (service: Service) => {
    const newAvailability = !service.is_available;
    try {
      const res = await fetch(apiUrl("/services.php"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: service.id, is_available: newAvailability })
      });
      if (res.ok) {
        toast.success(newAvailability ? `"${service.name_en}" is now available` : `"${service.name_en}" is now hidden`);
        setServices(prev => prev.map(s => s.id === service.id ? { ...s, is_available: newAvailability } : s));
      }
    } catch (e) {
      toast.error("Failed to toggle availability");
    }
  };

  useEffect(() => {
    if (!isAnyAdmin() || !activeTab) return;

    const servicesTabActive = activeTab === 'services' || activeTab === 'qrcodes';

    if (servicesTabActive) {
      const cached = getCachedAdminServices();
      if (cached) { setServices(cached); setLoading(false); fetchServices(true); }
      else fetchServices(false);
    } else if (activeTab === 'feedback') {
      const cached = getCachedAdminFeedback();
      if (cached) { setFeedback(cached); setFeedbackLoading(false); fetchFeedback(true); }
      else fetchFeedback(false);
    } else if (activeTab === 'orders' || activeTab === 'calls') {
      const cachedOrders = getCachedAdminOrders();
      const cachedCalls = getCachedAdminCalls();
      if (cachedOrders) setOrders(cachedOrders);
      if (cachedCalls) setCalls(cachedCalls);
      if (cachedOrders && cachedCalls) { setRoomLoading(false); fetchRoomData(true); }
      else fetchRoomData(false);
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (!isAnyAdmin()) return;

    const unsubscribe = subscribeToNotifications((notification) => {
      // Only show order notifications to admin and admin_food
      if (notification.type === 'order' && (userRole === 'admin' || userRole === 'admin_food')) {
        toast.info(`New Order! Room ${notification.roomNumber} - ${notification.totalPrice} ETB`, {
          description: "A new room service order has been placed.",
          action: {
            label: "View",
            onClick: () => setActiveTab("orders")
          }
        });
        if (activeTab === 'orders') fetchRoomData();
      // Only show call notifications to admin and admin_waiter
      } else if (notification.type === 'call' && (userRole === 'admin' || userRole === 'admin_waiter')) {
        toast.warning(`Waiter Call! Room ${notification.roomNumber}`, {
          description: "A guest is requesting assistance.",
          action: {
            label: "View",
            onClick: () => setActiveTab("calls")
          }
        });
        if (activeTab === 'calls') fetchRoomData();
      }
    });

    return () => unsubscribe();
  }, [user, activeTab]);

  const openAddForm = () => {
    setEditingService(null);
    setFormData({ ...initialFormData, type: allowedServiceTypes[0] || 'food' });
    setIngredients([""]);
    setImageFile(null);
    setIsFormOpen(true);
  };

  const openEditForm = (service: Service) => {
    setEditingService(service);
    setFormData({
      name_en: service.name_en,
      description_en: service.description_en,
      price: service.price,
      type: service.type,
      subcategory: service.subcategory || "",
      macro_kcal: service.macro_kcal?.toString() || "",
      macro_protein: service.macro_protein?.toString() || "",
      macro_fat: service.macro_fat?.toString() || "",
      macro_carbs: service.macro_carbs?.toString() || "",
      beds: service.beds?.toString() || "1",
      max_guests: service.max_guests?.toString() || "2",
      room_number: service.room_number || ""
    });
    
    try {
      const parsedIngs = JSON.parse(service.ingredients || "[]");
      setIngredients(parsedIngs.length > 0 ? parsedIngs : [""]);
    } catch (e) {
      setIngredients([""]);
    }
    
    setImageFile(null);
    setIsFormOpen(true);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleIngredientChange = (index: number, value: string) => {
    const newIngs = [...ingredients];
    newIngs[index] = value;
    setIngredients(newIngs);
  };

  const addIngredientField = () => {
    setIngredients([...ingredients, ""]);
  };

  const removeIngredientField = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload: Record<string, any> = { ...formData };
    
    // Send ingredients as JSON string
    const filteredIngs = ingredients.filter(i => i.trim() !== "");
    payload.ingredients = JSON.stringify(filteredIngs);
    
    if (imageFile) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(imageFile);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
        payload.image_url = base64;
      } catch (err) {
        console.error("Failed to read image", err);
      }
    } else if (editingService?.image_url) {
      payload.image_url = editingService.image_url;
    }

    const endpoint = apiUrl("/services.php");
    
    if (editingService) {
        payload.id = editingService.id;
    }

    const promise = fetch(endpoint, { 
      method: "POST", 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload) 
    });

    toast.promise(promise, {
      loading: `${editingService ? 'Updating' : 'Adding'} service...`,
      success: (res: any) => {
          invalidateCachedAdminServices();
          fetchServices();
          setIsFormOpen(false);
          return `Service ${editingService ? 'updated' : 'added'} successfully!`;
      },
      error: 'Failed to save service.',
    });
  };

  const handleDelete = async (serviceId: number) => {
    try {
      const response = await fetch(apiUrl("/services.php"), {
        method: "DELETE",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: serviceId }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success("Service deleted successfully!");
        invalidateCachedAdminServices();
        setServices(services.filter(s => s.id !== serviceId));
      } else {
        toast.error(result.error || "Failed to delete service.");
      }
    } catch (error) {
      toast.error("Error deleting service.");
    }
  };

  // Filter services based on admin role and category
  const filteredServices = useMemo(() => {
    let list = services;
    if (userRole !== 'admin') {
      list = list.filter(s => allowedServiceTypes.includes(s.type));
    }
    if (serviceCategory !== 'all') {
      list = list.filter(s => s.type === serviceCategory);
    }
    return list;
  }, [services, userRole, allowedServiceTypes, serviceCategory]);

  const formTitle = useMemo(() => editingService ? t('admin.form_edit_title') : t('admin.form_add_title'), [editingService, t]);

  // Role label for the admin badge
  const getRoleBadgeLabel = () => {
    switch (userRole) {
      case 'admin': return 'General Admin';
      case 'admin_room': return 'Room Manager';
      case 'admin_food': return 'F&B Manager';
      case 'admin_waiter': return 'Waiter Manager';
      default: return 'Admin';
    }
  };

  const renderServicesTab = () => (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">
          {t('admin.manage_services')}
        </h2>
      </div>

      <div className="mt-2">
        <CategoryTabs 
          onCategoryChange={setServiceCategory} 
          hideAll={true}
          allowedCategories={userRole === 'admin' ? ['food', 'drink', 'room'] : allowedServiceTypes}
        />
      </div>

      <div className="mt-4 pb-20">
        {loading && <div>{t('messages.loading')}</div>}
        {error && <div className="text-red-500">{error}</div>}
        {!loading && !error && (
          <ul className="space-y-3">
            {filteredServices.map((service) => (
              <li 
                key={service.id} 
                className={`bg-card border p-3 rounded-lg flex items-center justify-between gap-4 transition-all duration-300 ${
                  !service.is_available ? 'opacity-50 border-dashed' : ''
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative">
                    <img 
                      src={uploadsUrl(service.image_url)} 
                      alt={service.name_en} 
                      className={`w-20 h-20 object-cover rounded-md transition-all ${!service.is_available ? 'grayscale' : ''}`}
                      onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                    />
                    {!service.is_available && (
                      <div className="absolute inset-0 bg-background/40 rounded-md flex items-center justify-center">
                        <EyeOff className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{service.name_en}</p>
                    <p className="text-sm text-muted-foreground capitalize">{service.type}</p>
                    <p className="text-sm font-bold text-foreground">{formatPrice(Number(service.price))}</p>
                    {!service.is_available && (
                      <Badge variant="outline" className="mt-1 text-[9px] border-amber-500/40 text-amber-600 dark:text-amber-400">
                        HIDDEN
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                    {/* Availability Toggle */}
                    <Button 
                      variant={service.is_available ? "outline" : "secondary"} 
                      size="icon" 
                      onClick={() => toggleAvailability(service)}
                      title={service.is_available ? "Hide from customers" : "Show to customers"}
                      className={`transition-all ${service.is_available ? 'hover:bg-green-50 hover:border-green-500 dark:hover:bg-green-950' : 'hover:bg-amber-50 hover:border-amber-500 dark:hover:bg-amber-950'}`}
                    >
                      {service.is_available ? (
                        <Eye className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      )}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => openEditForm(service)}><Edit className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('admin.delete_dialog_title')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('admin.delete_dialog_description', { name: service.name_en })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('admin.cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(service.id)}>{t('admin.delete')}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Floating Action Button */}
      {allowedServiceTypes.length > 0 && (
         <button 
           onClick={openAddForm}
           className="fixed bottom-24 right-5 w-14 h-14 bg-foreground text-background rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
         >
           <Plus className="h-6 w-6" />
         </button>
      )}
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 z-50 bg-background/90 backdrop-blur-md pb-4 pt-1 border-b mb-6 border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between w-full px-1">
                    <DialogTitle className="text-xl font-bold tracking-tight">{formTitle}</DialogTitle>
                    <DialogClose className="p-2 rounded-full hover:bg-muted transition-all active:scale-90 border border-transparent hover:border-border shadow-sm">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </DialogClose>
                </div>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                {/* Category Selection - Restricted by role */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold font-montserrat">Category</Label>
                      <Select value={formData.type} onValueChange={(value) => { handleInputChange("type", value); handleInputChange("subcategory", ""); }}>
                        <SelectTrigger className="h-12 border-2 focus:ring-zinc-500"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {allowedServiceTypes.includes('food') && <SelectItem value="food">{t('categories.food')}</SelectItem>}
                          {allowedServiceTypes.includes('drink') && <SelectItem value="drink">{t('categories.drink')}</SelectItem>}
                          {allowedServiceTypes.includes('room') && <SelectItem value="room">{t('categories.room')}</SelectItem>}
                        </SelectContent>
                      </Select>
                  </div>
                  {(formData.type === 'food' || formData.type === 'drink') && (
                    <div className="space-y-2 animate-in fade-in zoom-in-95">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold font-montserrat">Sub Category</Label>
                      <Select value={formData.subcategory || "Other"} onValueChange={(value) => handleInputChange("subcategory", value)}>
                        <SelectTrigger className="h-12 border-2 focus:ring-zinc-500">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Other">Other</SelectItem>
                          {formData.type === 'food' && foodSubcategories.map(sub => (
                            <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                          ))}
                          {formData.type === 'drink' && drinkSubcategories.map(sub => (
                            <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <hr className="opacity-50" />

                 {/* Content Section */}
                 <div className="space-y-4 p-4 bg-muted/30 rounded-xl border">
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Service Information</Label>
                        <Input placeholder="Service Name (e.g. Traditional Doro Wat)" value={formData.name_en} onChange={(e) => handleInputChange("name_en", e.target.value)} required className="h-12 text-base" />
                        <Textarea placeholder="Describe your service in detail..." value={formData.description_en} onChange={(e) => handleInputChange("description_en", e.target.value)} className="min-h-[100px] resize-none" />
                    </div>
                </div>

                {/* Pricing & Image */}
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{t('admin.form_price')}</Label>
                     <div className="relative">
                        <Input type="number" placeholder="0.00" value={formData.price} onChange={(e) => handleInputChange("price", e.target.value)} required className="h-12 pl-4" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">ETB</span>
                     </div>
                   </div>
                   <div className="space-y-2">
                     <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{t('admin.form_image')}</Label>
                     <Input type="file" accept="image/*" onChange={handleFileChange} className="h-12 pt-3 text-[10px]" />
                   </div>
                 </div>

                 {/* Room Specialization Section */}
                 {formData.type === 'room' && (
                  <div className="space-y-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-tight font-montserrat">Room Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Label className="text-xs text-muted-foreground">Room Number (For QR Code)</Label>
                        <Input type="text" placeholder="e.g. 101, 204B" value={formData.room_number || ""} onChange={(e) => handleInputChange("room_number", e.target.value)} className="bg-background" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Number of Beds</Label>
                        <Input type="number" value={formData.beds} onChange={(e) => handleInputChange("beds", e.target.value)} className="bg-background" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Max Guests</Label>
                        <Input type="number" value={formData.max_guests} onChange={(e) => handleInputChange("max_guests", e.target.value)} className="bg-background" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground text-[10px] uppercase font-bold">Quick-Add Features</Label>
                      <div className="flex flex-wrap gap-2">
                        {['WiFi', 'King Bed', 'Mini Bar', 'AC', 'Smart TV', 'Balcony', 'Sea View', 'Single Bed', 'Desk'].map(feature => (
                          <button
                            key={feature}
                            type="button"
                            onClick={() => {
                              if (!ingredients.includes(feature)) {
                                if (ingredients.length === 1 && ingredients[0] === "") {
                                  setIngredients([feature]);
                                } else {
                                  setIngredients([...ingredients, feature]);
                                }
                              }
                            }}
                            className="px-3 py-1.5 bg-background border border-border rounded-lg text-[10px] font-bold text-foreground hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all shadow-sm"
                          >
                            + {feature}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                 {/* Macros - ONLY for food */}
                 {formData.type === 'food' && (
                   <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border animate-in fade-in zoom-in-95">
                       <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest italic">Nutrition Facts (Optional)</Label>
                       <div className="grid grid-cols-2 gap-3">
                           <div className="space-y-1">
                               <span className="text-[9px] uppercase font-bold opacity-50 px-1">Calories</span>
                               <Input type="number" placeholder="Kcal" value={formData.macro_kcal} onChange={(e) => handleInputChange("macro_kcal", e.target.value)} />
                           </div>
                           <div className="space-y-1">
                               <span className="text-[9px] uppercase font-bold opacity-50 px-1">Protein</span>
                               <Input type="number" placeholder="Grams" value={formData.macro_protein} onChange={(e) => handleInputChange("macro_protein", e.target.value)} />
                           </div>
                           <div className="space-y-1">
                               <span className="text-[9px] uppercase font-bold opacity-50 px-1">Fat</span>
                               <Input type="number" placeholder="Grams" value={formData.macro_fat} onChange={(e) => handleInputChange("macro_fat", e.target.value)} />
                           </div>
                           <div className="space-y-1">
                               <span className="text-[9px] uppercase font-bold opacity-50 px-1">Carbs</span>
                               <Input type="number" placeholder="Grams" value={formData.macro_carbs} onChange={(e) => handleInputChange("macro_carbs", e.target.value)} />
                           </div>
                       </div>
                   </div>
                 )}

                 {/* Ingredients - Hide for drinks */}
                 {formData.type !== 'drink' && (
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{formData.type === 'room' ? 'Room Features' : 'Ingredients'}</Label>
                    {ingredients.map((ing, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                            <Input 
                                placeholder={formData.type === 'room' ? "e.g. High-speed WiFi" : "e.g. Chicken breast"} 
                                value={ing} 
                                onChange={(e) => handleIngredientChange(idx, e.target.value)} 
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeIngredientField(idx)} disabled={ingredients.length <= 1}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addIngredientField} className="w-full h-10 border-dashed">
                        <Plus className="h-3 w-3 mr-1" /> Add {formData.type === 'room' ? 'Feature' : 'Ingredient'}
                    </Button>
                </div>
                )}

                 {/* Auto-Translation Activated Badge */}
                <div className="flex items-center gap-2 py-2 px-4 bg-muted/30 text-muted-foreground/60 rounded-full justify-center w-fit mx-auto border border-border/40 mb-2">
                    <div className="w-1.5 h-1.5 bg-green-500/30 rounded-full" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em]">Global Auto-Translation Active</span>
                </div>
                
                <DialogFooter>
                    <Button type="submit" className="w-full h-12 text-base font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white active:scale-[0.98] transition-all">
                      {editingService ? t('admin.form_save_button') : t('admin.add_service')}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderFeedbackTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">{t('admin.user_feedback')}</h2>
        <span className="text-sm text-muted-foreground">{t('admin.reviews', {count: feedback.length})}</span>
      </div>
      {feedbackLoading && <p>{t('messages.loading')}</p>}
      {feedbackError && <p className="text-destructive">{feedbackError}</p>}
      {!feedbackLoading && !feedbackError && feedback.length === 0 && (
        <div className="bg-card p-12 rounded-lg border text-center">
          <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('admin.no_feedback_title')}</h3>
          <p className="text-muted-foreground">{t('admin.no_feedback_description')}</p>
        </div>
      )}
      <div className="space-y-4">
        {feedback.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">
                    {t('admin.feedback_on', { category: item.service_name || item.category })}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground pt-1">
                    {t('admin.feedback_by', { user: item.username || t('admin.anonymous') })}
                  </p>
                  <p className="text-xs text-muted-foreground pt-1">{new Date(item.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1 text-yellow-500">
                  <span className="font-bold">{item.rating}</span>
                  <Star className="h-4 w-4 fill-current" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">{item.comment}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderOrdersTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Room Orders</h2>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
          <Clock className="w-3 h-3 mr-1" />
          {orders.filter(o => o.status === 'pending').length} Pending
        </Badge>
      </div>

      {roomLoading && <p>{t('messages.loading')}</p>}
      {!roomLoading && orders.length === 0 && (
        <div className="bg-card p-12 rounded-2xl border text-center">
          <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-1">No orders yet</h3>
          <p className="text-sm text-muted-foreground">New room orders will appear here.</p>
        </div>
      )}

      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id} className={order.status === 'pending' ? 'border-primary/30 bg-primary/5' : ''}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-lg">Room {order.room_number}</CardTitle>
                    <Badge variant={order.status === 'completed' ? 'default' : order.status === 'pending' ? 'secondary' : 'outline'} className="text-[10px] h-5">
                      {order.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{formatPrice(order.total_price)}</p>
                  <p className="text-[10px] text-muted-foreground">{order.items.length} items</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="space-y-2 mt-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs py-1 border-b border-dashed last:border-0 border-border/50">
                    <span>{item.quantity}x {item.name_en}</span>
                    <span className="text-muted-foreground">{(item.price * item.quantity).toLocaleString()} ETB</span>
                  </div>
                ))}
              </div>
            </CardContent>
            {order.status === 'pending' && (
              <div className="px-6 pb-4 flex gap-2">
                <Button size="sm" className="flex-1 gap-1" onClick={() => updateOrderStatus(order.id, 'completed')}>
                  <CheckCircle className="w-3.5 h-3.5" /> Mark as Completed
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, 'cancelled')}>
                  Cancel
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );

  const renderCallsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Waiter Calls</h2>
        <Badge variant="outline" className="bg-zinc-100 dark:bg-zinc-800 text-foreground border-border">
          <BellRing className="w-3 h-3 mr-1" />
          {calls.filter(c => c.status === 'pending').length} Active
        </Badge>
      </div>

      {roomLoading && <p>{t('messages.loading')}</p>}
      {!roomLoading && calls.length === 0 && (
        <div className="bg-card p-12 rounded-2xl border text-center">
          <BellRing className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-1">No active calls</h3>
          <p className="text-sm text-muted-foreground">Waiter requests will appear here.</p>
        </div>
      )}

      <div className="space-y-4">
        {calls.map((call) => (
          <Card key={call.id} className={call.status === 'pending' ? 'border-zinc-500/30 bg-zinc-500/5' : ''}>
            <CardContent className="py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${call.status === 'pending' ? 'bg-zinc-500/20 animate-pulse' : 'bg-muted'}`}>
                    <BellRing className={`h-5 w-5 ${call.status === 'pending' ? 'text-zinc-500' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <h4 className="font-bold">Room {call.room_number}</h4>
                    <p className="text-xs text-muted-foreground">{new Date(call.created_at).toLocaleString()}</p>
                  </div>
                </div>
                {call.status === 'pending' ? (
                  <Button size="sm" onClick={() => updateCallStatus(call.id, 'completed')}>
                    Resolve Call
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-[10px] uppercase">Resolved</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const downloadQR = (roomIdentifier: string) => {
    const svg = document.getElementById(`qr-svg-${roomIdentifier}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = 1024;
      canvas.height = 1024;
      if (ctx) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const pngFile = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.download = `Room_${roomIdentifier}_QR.png`;
          downloadLink.href = pngFile;
          downloadLink.click();
      }
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const renderQRCodesTab = () => {
    const roomServices = services.filter(s => s.type === 'room');
    
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <h2 className="text-xl font-semibold text-foreground">Room QR Codes</h2>
        {loading ? (
           <div>{t('messages.loading')}</div>
        ) : roomServices.length === 0 ? (
          <div className="text-center py-10 bg-card rounded-xl border border-dashed">
            <QrCode className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
            <p className="text-muted-foreground">No rooms found. Add some rooms to generate QR codes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roomServices.map((room) => {
              const roomIdentifier = room.room_number || room.name_en;
              const qrUrl = `https://royalhotelmenu.vercel.app/?mode=room&room=${encodeURIComponent(roomIdentifier)}`;
              return (
                <div key={room.id} className="bg-card border p-6 rounded-xl flex flex-col items-center text-center shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" size="sm" className="h-8 shadow-sm" onClick={() => {
                          navigator.clipboard.writeText(qrUrl);
                          toast.success("URL copied to clipboard");
                      }}>Copy URL</Button>
                  </div>
                  
                  <h3 className="font-bold text-lg mb-2">{room.name_en}</h3>
                  {room.room_number && (
                      <Badge variant="secondary" className="mb-4">Room {room.room_number}</Badge>
                  )}
                  <div className="bg-white p-4 rounded-xl border mb-4 shadow-sm">
                    <QRCode id={`qr-svg-${roomIdentifier}`} value={qrUrl} size={150} />
                  </div>
                  <p className="text-[10px] text-muted-foreground break-all mb-4 px-2">{qrUrl}</p>
                  <Button variant="default" className="w-full font-bold" onClick={() => downloadQR(roomIdentifier)}>
                    Download High Quality QR
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (!isAnyAdmin()) {
    return (
        <div className="bg-background flex max-w-[480px] w-full flex-col items-center justify-center mx-auto min-h-screen">
            <p>{t('messages.loading')}</p>
        </div>
    )
  }

  return (
    <div className="bg-background flex max-w-[480px] w-full flex-col overflow-hidden items-center mx-auto pt-4 min-h-screen">
      <Header />
      <main className="flex flex-col w-full flex-1 px-6 py-6 pb-24">
        {/* Master Details Routing */}
        {!activeTab ? (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between mb-6 gap-2">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigate('/profile')} 
                  className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/20 transition-colors border border-border/50 shrink-0"
                >
                  <ChevronLeft className="w-5 h-5 text-foreground" />
                </button>
                <h1 className="text-2xl font-bold text-foreground leading-none">{t('admin.title')}</h1>
              </div>
              <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 px-3 py-1 rounded-full text-[10px] font-medium whitespace-nowrap">
                {getRoleBadgeLabel()}
              </div>
            </div>
            
            <h2 className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-widest px-1 mt-4">Menu</h2>
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden mb-5 shadow-sm">
              {/* Rows */}
              {allowedTabs.includes('services') && (
                <button onClick={() => setActiveTab('services')} className="flex items-center gap-4 px-4 py-3.5 w-full hover:bg-accent/50 transition-colors border-b border-border/40">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Utensils className="h-4 w-4 text-emerald-500" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-foreground text-left">Manage Services</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              {allowedTabs.includes('orders') && (
                <button onClick={() => setActiveTab('orders')} className="flex items-center gap-4 px-4 py-3.5 w-full hover:bg-accent/50 transition-colors border-b border-border/40">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <ShoppingBag className="h-4 w-4 text-blue-500" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-foreground text-left">Orders</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              {allowedTabs.includes('calls') && (
                <button onClick={() => setActiveTab('calls')} className="flex items-center gap-4 px-4 py-3.5 w-full hover:bg-accent/50 transition-colors border-b border-border/40">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Bell className="h-4 w-4 text-amber-500" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-foreground text-left">Calls</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              {allowedTabs.includes('qrcodes') && (
                <button onClick={() => setActiveTab('qrcodes')} className="flex items-center gap-4 px-4 py-3.5 w-full hover:bg-accent/50 transition-colors border-b border-border/40">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <QrCode className="h-4 w-4 text-indigo-500" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-foreground text-left">QR Codes</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              {allowedTabs.includes('feedback') && (
                <button onClick={() => setActiveTab('feedback')} className="flex items-center gap-4 px-4 py-3.5 w-full hover:bg-accent/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-purple-500" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-foreground text-left">Feedback</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-right-4 fade-in duration-500">
            <button 
              onClick={() => setActiveTab(null)} 
              className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center mb-6 hover:bg-black/10 dark:hover:bg-white/20 transition-colors border border-border/50"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            {activeTab === "services" && renderServicesTab()}
            {activeTab === "orders" && renderOrdersTab()}
            {activeTab === "calls" && renderCallsTab()}
            {activeTab === "feedback" && renderFeedbackTab()}
            {activeTab === "qrcodes" && renderQRCodesTab()}
          </div>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
};

export default AdminPanel;