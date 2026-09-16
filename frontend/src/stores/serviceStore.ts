import { create } from 'zustand';
import { apiUrl, uploadsUrl } from '@/config/api';
import { pusherClient } from '@/config/pusher';
import { toast } from 'sonner';
import { invalidateCachedAdminServices } from '@/lib/pageCache';

export interface Service {
  id: number;
  name_en: string;
  name_am?: string | null;
  name_om?: string | null;
  name_sid?: string | null;
  description_en: string;
  description_am?: string | null;
  description_om?: string | null;
  description_sid?: string | null;
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
  created_at?: string;
}

interface ServiceState {
  services: Service[];
  loading: boolean;
  error: string;
  fetchServices: (silent?: boolean) => Promise<void>;
  toggleAvailability: (service: Service) => Promise<void>;
  deleteService: (serviceId: number) => Promise<void>;
}

export const useServiceStore = create<ServiceState>((set, get) => ({
  services: [],
  loading: false,
  error: '',

  fetchServices: async (silent = false) => {
    if (!silent) set({ loading: true, error: '' });
    try {
      // Query with admin=1 to fetch all items (available and hidden) for complete sync
      const res = await fetch(apiUrl('/services?admin=1'));
      if (!res.ok) throw new Error('Failed to fetch services data.');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      set({ services: data, loading: false });
    } catch (e: any) {
      if (!silent) set({ error: e.message || 'Failed to load services', loading: false });
    }
  },

  toggleAvailability: async (service) => {
    const originalServices = [...get().services];
    const originalAvailability = service.is_available;
    const newAvailability = !originalAvailability;

    // Optimistic UI Update
    set((state) => ({
      services: state.services.map((s) =>
        s.id === service.id ? { ...s, is_available: newAvailability } : s
      ),
    }));

    try {
      const res = await fetch(apiUrl('/services'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: service.id, is_available: newAvailability }),
      });
      if (!res.ok) throw new Error();
      
      toast.success(
        newAvailability ? `"${service.name_en}" is now available` : `"${service.name_en}" is now hidden`
      );
    } catch {
      // Rollback on failure
      set({ services: originalServices });
      toast.error('Failed to toggle availability');
    }
  },

  deleteService: async (serviceId) => {
    const originalServices = [...get().services];

    // Optimistic UI Update
    set((state) => ({
      services: state.services.filter((s) => s.id !== serviceId),
    }));
    invalidateCachedAdminServices();

    try {
      const response = await fetch(apiUrl('/services'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: serviceId }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Service deleted successfully!');
      } else {
        throw new Error(result.error || 'Failed to delete service.');
      }
    } catch (error: any) {
      // Rollback on failure
      set({ services: originalServices });
      toast.error(error.message || 'Error deleting service.');
    }
  },
}));

// Bind Pusher real-time updates directly to the store
if (typeof window !== 'undefined') {
  const channel = pusherClient.subscribe('menu-updates');

  channel.bind('service-created', (newService: any) => {
    const { services, fetchServices } = useServiceStore.getState();
    if (services.some((s) => String(s.id) === String(newService.id))) return;

    const updated = [newService, ...services];
    useServiceStore.setState({ services: updated });
    
    // Refresh to get full Base64 images (since Pusher payload strips large strings)
    fetchServices(true);
  });

  channel.bind('service-updated', (updatedService: any) => {
    const { services } = useServiceStore.getState();
    const updated = services.map((s) => {
      if (String(s.id) === String(updatedService.id)) {
        return {
          ...s,
          ...updatedService,
          // Reuse existing image if Pusher payload has stripped image_url
          image_url: updatedService.image_url || s.image_url || '',
        };
      }
      return s;
    });
    useServiceStore.setState({ services: updated });
  });

  channel.bind('service-deleted', (data: { id: number }) => {
    const { services } = useServiceStore.getState();
    const updated = services.filter((s) => String(s.id) !== String(data.id));
    useServiceStore.setState({ services: updated });
  });
}
