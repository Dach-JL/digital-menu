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
import { invalidateCachedAdminServices } from '@/lib/pageCache';
import { subscribeToNotifications } from "@/lib/firebase";
import { useServiceStore, type Service } from "@/stores/serviceStore";
import { useAdminQueueStore, type RoomOrder, type WaiterCall, type Feedback } from "@/stores/adminQueueStore";
import { useShallow } from "zustand/shallow";

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

  const { services, loading, error, fetchServices, toggleAvailability, deleteService } = useServiceStore(
    useShallow((state) => ({
      services: state.services,
      loading: state.loading,
      error: state.error,
      fetchServices: state.fetchServices,
      toggleAvailability: state.toggleAvailability,
      deleteService: state.deleteService,
    }))
  );

  const {
    orders,
    calls,
    feedback,
    roomLoading,
    feedbackLoading,
    feedbackError,
    fetchRoomData,
    fetchFeedback,
    updateOrderStatus,
    updateCallStatus,
  } = useAdminQueueStore(
    useShallow((state) => ({
      orders: state.orders,
      calls: state.calls,
      feedback: state.feedback,
      roomLoading: state.roomLoading,
      feedbackLoading: state.feedbackLoading,
      feedbackError: state.feedbackError,
      fetchRoomData: state.fetchRoomData,
      fetchFeedback: state.fetchFeedback,
      updateOrderStatus: state.updateOrderStatus,
      updateCallStatus: state.updateCallStatus,
    }))
  );

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

  useEffect(() => {
    if (!isAnyAdmin()) {
      toast.error("Access Denied: You are not an administrator.");
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!isAnyAdmin() || !activeTab) return;

    if (activeTab === 'services' || activeTab === 'qrcodes') {
      fetchServices(services.length > 0);
    } else if (activeTab === 'feedback') {
      fetchFeedback(feedback.length > 0);
    } else if (activeTab === 'orders' || activeTab === 'calls') {
      fetchRoomData(orders.length > 0 && calls.length > 0);
    }
  }, [activeTab, user, fetchServices, fetchFeedback, fetchRoomData, services.length, feedback.length, orders.length, calls.length]);

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
          fetchServices(true);
          setIsFormOpen(false);
          return `Service ${editingService ? 'updated' : 'added'} successfully!`;
      },
      error: 'Failed to save service.',
    });
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
                          <AlertDialogAction onClick={() => deleteService(service.id)}>{t('admin.delete')}</AlertDialogAction>
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

  const renderDesktopServicesTab = () => {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <CategoryTabs 
            onCategoryChange={setServiceCategory} 
            hideAll={true}
            allowedCategories={userRole === 'admin' ? ['food', 'drink', 'room'] : allowedServiceTypes}
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">{t('messages.loading')}</div>
        ) : error ? (
          <div className="text-destructive text-center py-12">{error}</div>
        ) : (
          <Card className="overflow-hidden border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 font-semibold text-muted-foreground select-none">
                    <th className="p-4">Item</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Subcategory</th>
                    <th className="p-4">Price</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredServices.map((service) => (
                    <tr key={service.id} className={`hover:bg-muted/10 transition-colors ${!service.is_available ? 'opacity-60 bg-muted/5' : ''}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={uploadsUrl(service.image_url)}
                            alt={service.name_en}
                            className="w-12 h-12 object-cover rounded-md border shrink-0"
                            onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                          />
                          <div>
                            <p className="font-bold text-foreground">{service.name_en}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-[300px]">{service.description_en}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 capitalize font-medium">{service.type}</td>
                      <td className="p-4 text-muted-foreground">{service.subcategory || 'N/A'}</td>
                      <td className="p-4 font-bold text-foreground">{formatPrice(Number(service.price))}</td>
                      <td className="p-4 text-center">
                        <Badge
                          variant={service.is_available ? "default" : "outline"}
                          className={`cursor-pointer uppercase text-[9px] py-0.5 px-2 select-none ${
                            service.is_available
                              ? "bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20"
                              : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20"
                          }`}
                          onClick={() => toggleAvailability(service)}
                        >
                          {service.is_available ? "Active" : "Hidden"}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={() => openEditForm(service)}>
                            <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" className="h-8 px-2.5">
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                              </Button>
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
                                <AlertDialogAction onClick={() => deleteService(service.id)}>{t('admin.delete')}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredServices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-muted-foreground">
                        No service items found for this category.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderDesktopOrdersTab = () => {
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const completedOrders = orders.filter(o => o.status !== 'pending');

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {roomLoading && <div className="text-center text-muted-foreground">{t('messages.loading')}</div>}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Column 1: Pending Queue */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                <Clock className="h-4 w-4 text-blue-500" /> Pending Queue
              </h3>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold">
                {pendingOrders.length} Orders
              </Badge>
            </div>
            
            {pendingOrders.length === 0 && (
              <div className="bg-card p-12 rounded-xl border border-dashed text-center text-muted-foreground text-sm">
                No pending orders in the queue.
              </div>
            )}
            
            <div className="space-y-4">
              {pendingOrders.map((order) => (
                <Card key={order.id} className="border-blue-500/30 bg-blue-500/5 hover:shadow-sm transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base font-bold">Room {order.room_number}</CardTitle>
                        <p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{formatPrice(order.total_price)}</p>
                        <p className="text-[10px] text-muted-foreground">{order.items.length} items</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="space-y-2 mt-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs py-1 border-b border-dashed last:border-0 border-border/50">
                          <span className="font-medium">{item.quantity}x {item.name_en}</span>
                          <span className="text-muted-foreground">{(item.price * item.quantity).toLocaleString()} ETB</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <div className="px-6 pb-4 flex gap-2">
                    <Button size="sm" className="flex-1 gap-1" onClick={() => updateOrderStatus(order.id, 'completed')}>
                      <CheckCircle className="w-3.5 h-3.5" /> Complete Order
                    </Button>
                    <Button size="sm" variant="outline" className="bg-background" onClick={() => updateOrderStatus(order.id, 'cancelled')}>
                      Cancel
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Column 2: Completed History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" /> Completed & Log
              </h3>
              <Badge variant="outline" className="bg-zinc-100 dark:bg-zinc-800 text-muted-foreground">
                {completedOrders.length} Total
              </Badge>
            </div>
            
            {completedOrders.length === 0 && (
              <div className="bg-card p-12 rounded-xl border border-dashed text-center text-muted-foreground text-sm">
                No archived orders.
              </div>
            )}
            
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {completedOrders.map((order) => (
                <Card key={order.id} className="opacity-75 hover:opacity-100 transition-opacity">
                  <CardContent className="py-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">Room {order.room_number}</span>
                          <Badge variant={order.status === 'completed' ? 'default' : 'destructive'} className="text-[8px] h-4 leading-none uppercase font-bold">
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xs">{formatPrice(order.total_price)}</p>
                        <p className="text-[9px] text-muted-foreground">{order.items.length} items</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDesktopCallsTab = () => {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {roomLoading && <div className="text-center text-muted-foreground">{t('messages.loading')}</div>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {calls.map((call) => (
            <Card key={call.id} className={`transition-all hover:shadow-md ${call.status === 'pending' ? 'border-amber-500/40 bg-amber-500/5' : 'opacity-70'}`}>
              <CardContent className="py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-full ${call.status === 'pending' ? 'bg-amber-500/20 animate-pulse' : 'bg-muted'}`}>
                      <BellRing className={`h-6 w-6 ${call.status === 'pending' ? 'text-amber-500' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <h4 className="font-bold text-base">Room {call.room_number}</h4>
                      <p className="text-xs text-muted-foreground">{new Date(call.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  {call.status === 'pending' ? (
                    <Button size="sm" onClick={() => updateCallStatus(call.id, 'completed')} className="bg-amber-500 hover:bg-amber-600 text-white border-0 font-semibold shadow-sm">
                      Resolve Call
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-[10px] py-1 border-green-500/30 text-green-600 bg-green-500/5 uppercase font-bold">Resolved</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {calls.length === 0 && (
            <div className="col-span-full bg-card p-12 rounded-xl border border-dashed text-center text-muted-foreground text-sm">
              No service or waiter calls listed.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDesktopFeedbackTab = () => {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {feedbackLoading && <div className="text-center text-muted-foreground">{t('messages.loading')}</div>}
        {feedbackError && <div className="text-destructive text-center">{feedbackError}</div>}
        
        {!feedbackLoading && !feedbackError && feedback.length === 0 && (
          <div className="bg-card p-12 rounded-xl border border-dashed text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="text-base font-bold text-foreground mb-1">{t('admin.no_feedback_title')}</h3>
            <p className="text-sm text-muted-foreground">{t('admin.no_feedback_description')}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {feedback.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow flex flex-col justify-between h-[180px]">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground truncate max-w-[200px]">
                      {t('admin.feedback_on', { category: item.service_name || item.category })}
                    </CardTitle>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      By {item.username || t('admin.anonymous')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                    <span className="font-bold text-xs">{item.rating}</span>
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <p className="text-xs text-foreground italic">"{item.comment}"</p>
              </CardContent>
              <div className="px-6 py-3 border-t bg-muted/10 text-[10px] text-muted-foreground flex justify-between">
                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                <span>{new Date(item.created_at).toLocaleTimeString()}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderDesktopQRCodesTab = () => {
    const roomServices = services.filter(s => s.type === 'room');
    
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {loading ? (
           <div className="text-center text-muted-foreground">{t('messages.loading')}</div>
        ) : roomServices.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed">
            <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">No room catalog items found. Add some rooms to generate QR codes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {roomServices.map((room) => {
              const roomIdentifier = room.room_number || room.name_en;
              const qrUrl = `https://royalhotelmenu.vercel.app/?mode=room&room=${encodeURIComponent(roomIdentifier)}`;
              return (
                <div key={room.id} className="bg-card border p-6 rounded-xl flex flex-col items-center text-center shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" size="sm" className="h-7 text-[10px] shadow-sm bg-background" onClick={() => {
                          navigator.clipboard.writeText(qrUrl);
                          toast.success("URL copied to clipboard");
                      }}>Copy Link</Button>
                  </div>
                  
                  <h3 className="font-bold text-base mb-1 truncate w-full px-2">{room.name_en}</h3>
                  {room.room_number && (
                      <Badge variant="secondary" className="mb-4 text-[10px] py-0">Room {room.room_number}</Badge>
                  )}
                  <div className="bg-white p-3 rounded-lg border mb-3 shadow-inner">
                    <QRCode id={`qr-svg-${roomIdentifier}`} value={qrUrl} size={140} />
                  </div>
                  <p className="text-[9px] text-muted-foreground break-all mb-4 px-2 line-clamp-2 min-h-[30px]">{qrUrl}</p>
                  <Button variant="default" className="w-full font-bold h-9 text-xs" onClick={() => downloadQR(roomIdentifier)}>
                    Download PNG
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
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col border-r border-border bg-card p-6 min-h-screen sticky top-0 shrink-0 select-none">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
            <Utensils className="h-4.5 w-4.5 text-background" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-none text-foreground tracking-tight">Royal Home</h1>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Admin Portal</span>
          </div>
        </div>

        {/* User Card */}
        <div className="mb-6 p-4 rounded-xl bg-muted/40 border border-border/50">
          <p className="text-xs font-semibold text-foreground truncate">{user?.username || 'Administrator'}</p>
          <p className="text-[10px] text-muted-foreground truncate mb-2">{user?.email}</p>
          <div className="inline-block bg-zinc-900 dark:bg-zinc-100 text-background px-2.5 py-0.5 rounded-full text-[9px] font-bold">
            {getRoleBadgeLabel()}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 space-y-1">
          {allowedTabs.includes('services') && (
            <button
              onClick={() => setActiveTab('services')}
              className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium transition-all ${
                activeTab === 'services'
                  ? 'bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950'
                  : 'hover:bg-accent hover:text-foreground text-muted-foreground'
              }`}
            >
              <Utensils className="h-4 w-4 shrink-0" />
              <span>Manage Services</span>
            </button>
          )}
          {allowedTabs.includes('orders') && (
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium transition-all ${
                activeTab === 'orders'
                  ? 'bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950'
                  : 'hover:bg-accent hover:text-foreground text-muted-foreground'
              }`}
            >
              <ShoppingBag className="h-4 w-4 shrink-0" />
              <span>Orders Queue</span>
              {orders.filter(o => o.status === 'pending').length > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {orders.filter(o => o.status === 'pending').length}
                </span>
              )}
            </button>
          )}
          {allowedTabs.includes('calls') && (
            <button
              onClick={() => setActiveTab('calls')}
              className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium transition-all ${
                activeTab === 'calls'
                  ? 'bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950'
                  : 'hover:bg-accent hover:text-foreground text-muted-foreground'
              }`}
            >
              <Bell className="h-4 w-4 shrink-0" />
              <span>Waiter Calls</span>
              {calls.filter(c => c.status === 'pending').length > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {calls.filter(c => c.status === 'pending').length}
                </span>
              )}
            </button>
          )}
          {allowedTabs.includes('qrcodes') && (
            <button
              onClick={() => setActiveTab('qrcodes')}
              className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium transition-all ${
                activeTab === 'qrcodes'
                  ? 'bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950'
                  : 'hover:bg-accent hover:text-foreground text-muted-foreground'
              }`}
            >
              <QrCode className="h-4 w-4 shrink-0" />
              <span>QR Code Generator</span>
            </button>
          )}
          {allowedTabs.includes('feedback') && (
            <button
              onClick={() => setActiveTab('feedback')}
              className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium transition-all ${
                activeTab === 'feedback'
                  ? 'bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950'
                  : 'hover:bg-accent hover:text-foreground text-muted-foreground'
              }`}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span>Customer Feedback</span>
            </button>
          )}
        </nav>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-border mt-auto space-y-1">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium hover:bg-accent hover:text-foreground text-muted-foreground transition-all"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
            <span>Go to Portal</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Layout Wrapper */}
        <div className="md:hidden bg-background flex max-w-[480px] w-full flex-col overflow-hidden items-center mx-auto pt-4 min-h-screen">
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

        {/* Desktop Layout Wrapper */}
        <main className="hidden md:flex flex-col flex-1 p-8 lg:p-10 w-full max-w-7xl mx-auto">
          {/* HEADER SECTION */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground capitalize">
                {activeTab ? activeTab.replace('qrcodes', 'QR Codes').replace('feedback', 'Customer Feedback') : 'Overview Dashboard'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {activeTab ? `Manage and view active ${activeTab} configurations.` : 'Real-time overview of hotel and restaurant services.'}
              </p>
            </div>
            {activeTab === 'services' && allowedServiceTypes.length > 0 && (
              <Button onClick={openAddForm} className="gap-2 font-bold shadow-md">
                <Plus className="h-4 w-4" /> Add New Item
              </Button>
            )}
            {activeTab && (
              <Button variant="outline" size="sm" onClick={() => setActiveTab(null)} className="h-9">
                Back to Overview
              </Button>
            )}
          </div>

          {/* METRICS DASHBOARD GRID */}
          {!activeTab && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Active Calls */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Calls</CardTitle>
                  <Bell className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{calls.filter(c => c.status === 'pending').length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Guest waiter/room calls pending</p>
                </CardContent>
              </Card>

              {/* Pending Orders */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pending Orders</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{orders.filter(o => o.status === 'pending').length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Room service orders to process</p>
                </CardContent>
              </Card>

              {/* Average Feedback Rating */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Feedback Score</CardTitle>
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {feedback.length > 0
                      ? (feedback.reduce((acc, f) => acc + f.rating, 0) / feedback.length).toFixed(1)
                      : '0.0'} / 5
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Based on {feedback.length} customer reviews</p>
                </CardContent>
              </Card>

              {/* Active Services count */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Catalog</CardTitle>
                  <Utensils className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{services.filter(s => s.is_available).length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Available products in active menu</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* DASHBOARD SUMMARY SECTIONS */}
          {!activeTab && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
              {/* Active Calls List */}
              <Card className="flex flex-col h-[400px]">
                <CardHeader className="border-b pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider">Active Waiter Calls</CardTitle>
                    <Badge variant="outline">{calls.filter(c => c.status === 'pending').length} pending</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto py-4">
                  {calls.filter(c => c.status === 'pending').length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                      <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                      All calls resolved!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {calls.filter(c => c.status === 'pending').slice(0, 5).map(call => (
                        <div key={call.id} className="flex justify-between items-center p-3 rounded-lg border bg-muted/20">
                          <div>
                            <p className="font-bold text-sm">Room {call.room_number}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(call.created_at).toLocaleTimeString()}</p>
                          </div>
                          <Button size="sm" onClick={() => updateCallStatus(call.id, 'completed')}>Resolve</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pending Orders List */}
              <Card className="flex flex-col h-[400px]">
                <CardHeader className="border-b pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider">Recent Orders</CardTitle>
                    <Badge variant="outline">{orders.filter(o => o.status === 'pending').length} pending</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto py-4">
                  {orders.filter(o => o.status === 'pending').length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                      <ShoppingBag className="h-8 w-8 text-blue-500 mb-2 opacity-40" />
                      No pending orders
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.filter(o => o.status === 'pending').slice(0, 5).map(order => (
                        <div key={order.id} className="p-3 rounded-lg border bg-muted/20 space-y-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-bold text-sm">Room {order.room_number}</p>
                              <p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleTimeString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-xs text-primary">{formatPrice(order.total_price)}</p>
                              <p className="text-[9px] text-muted-foreground">{order.items.length} items</p>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground border-t pt-1 border-dashed">
                            {order.items.map((it, i) => `${it.quantity}x ${it.name_en}`).join(', ')}
                          </div>
                          <div className="flex gap-2 justify-end pt-1">
                            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => updateOrderStatus(order.id, 'cancelled')}>Cancel</Button>
                            <Button size="sm" className="h-7 text-[10px]" onClick={() => updateOrderStatus(order.id, 'completed')}>Complete</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB DETAILED CONTENTS */}
          {activeTab === 'services' && renderDesktopServicesTab()}
          {activeTab === 'orders' && renderDesktopOrdersTab()}
          {activeTab === 'calls' && renderDesktopCallsTab()}
          {activeTab === 'feedback' && renderDesktopFeedbackTab()}
          {activeTab === 'qrcodes' && renderDesktopQRCodesTab()}
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;