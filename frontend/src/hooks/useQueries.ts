import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiUrl } from '@/config/api';
import { toast } from 'sonner';

// Re-export type shapes
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

export interface OrderItem {
  quantity: number;
  name_en: string;
  price: number;
}

export interface RoomOrder {
  id: number;
  room_number: string;
  total_price: number;
  status: 'pending' | 'preparing' | 'on_the_way' | 'completed' | 'cancelled';
  created_at: string;
  items: OrderItem[];
}

export interface WaiterCall {
  id: number;
  room_number: string;
  status: 'pending' | 'completed';
  created_at: string;
}

export interface Feedback {
  id: number;
  comment: string;
  rating: number;
  created_at: string;
  category: string;
  username: string | null;
  service_name: string | null;
}

// ─── Query Hooks ────────────────────────────────────────────────────────────

// 1. Fetch menu catalog (available and unavailable items for admin sync)
export function useServices(adminMode = false) {
  return useQuery<Service[]>({
    queryKey: ['services', { admin: adminMode }],
    queryFn: async () => {
      const url = adminMode ? '/services?admin=1' : '/services';
      const res = await fetch(apiUrl(url));
      if (!res.ok) throw new Error('Failed to fetch services.');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

// 2. Fetch guest favorites
export function useFavorites(userId?: number) {
  return useQuery<number[]>({
    queryKey: ['favorites', userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(apiUrl(`/favorites?user_id=${userId}`));
      if (!res.ok) throw new Error('Failed to fetch favorites.');
      const data = await res.json();
      if (data && !data.error) {
        return data.map((fav: { service_id: number | string }) => Number(fav.service_id));
      }
      return [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

// 3. Fetch admin queues in parallel
export function useAdminOrders() {
  return useQuery<RoomOrder[]>({
    queryKey: ['admin', 'orders'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/orders'));
      if (!res.ok) throw new Error('Failed to fetch orders.');
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminCalls() {
  return useQuery<WaiterCall[]>({
    queryKey: ['admin', 'calls'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/calls'));
      if (!res.ok) throw new Error('Failed to fetch calls.');
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminFeedback() {
  return useQuery<Feedback[]>({
    queryKey: ['admin', 'feedback'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/feedback'));
      if (!res.ok) throw new Error('Failed to fetch feedback.');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Mutation Hooks ─────────────────────────────────────────────────────────

// 1. Optimistic Favorite Toggle Mutation
export function useToggleFavoriteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, serviceId }: { userId: number; serviceId: number }) => {
      const res = await fetch(apiUrl('/favorites'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, service_id: serviceId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to update favorite.');
      return data;
    },
    onMutate: async ({ userId, serviceId }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['favorites', userId] });

      // Snapshot previous value
      const previousFavorites = queryClient.getQueryData<number[]>(['favorites', userId]) || [];

      // Optimistically update
      const isCurrentlyFav = previousFavorites.includes(serviceId);
      const updatedFavorites = isCurrentlyFav
        ? previousFavorites.filter(id => id !== serviceId)
        : [...previousFavorites, serviceId];

      queryClient.setQueryData(['favorites', userId], updatedFavorites);

      return { previousFavorites, isCurrentlyFav };
    },
    onError: (err, variables, context) => {
      if (context) {
        queryClient.setQueryData(['favorites', variables.userId], context.previousFavorites);
      }
      toast.error('Failed to update favorites.');
    },
    onSuccess: (data, variables, context) => {
      // Success toast is shown in components to get exact translated name
    },
    onSettled: (data, err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['favorites', variables.userId] });
    },
  });
}

// 2. Toggle Service Availability
export function useToggleAvailabilityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serviceId, isAvailable }: { serviceId: number; isAvailable: boolean }) => {
      const res = await fetch(apiUrl('/services'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: serviceId, is_available: isAvailable }),
      });
      if (!res.ok) throw new Error('Failed to toggle availability.');
      return res.json();
    },
    onMutate: async ({ serviceId, isAvailable }) => {
      // Snapshot query key collections for admin and customer mode
      await queryClient.cancelQueries({ queryKey: ['services'] });

      const prevAdmin = queryClient.getQueryData<Service[]>(['services', { admin: true }]) || [];
      const prevCustomer = queryClient.getQueryData<Service[]>(['services', { admin: false }]) || [];

      // Optimistic update
      queryClient.setQueryData<Service[]>(
        ['services', { admin: true }],
        prevAdmin.map(s => s.id === serviceId ? { ...s, is_available: isAvailable } : s)
      );
      queryClient.setQueryData<Service[]>(
        ['services', { admin: false }],
        prevCustomer.map(s => s.id === serviceId ? { ...s, is_available: isAvailable } : s)
      );

      return { prevAdmin, prevCustomer };
    },
    onError: (err, variables, context) => {
      if (context) {
        queryClient.setQueryData(['services', { admin: true }], context.prevAdmin);
        queryClient.setQueryData(['services', { admin: false }], context.prevCustomer);
      }
      toast.error('Failed to update availability.');
    },
    onSuccess: (data, variables) => {
      toast.success(variables.isAvailable ? 'Item is now available' : 'Item is now hidden');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['services', { admin: true }] });
    },
  });
}

// 3. Delete Service Catalog Item
export function useDeleteServiceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceId: number) => {
      const res = await fetch(apiUrl('/services'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: serviceId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete service.');
      return data;
    },
    onMutate: async (serviceId) => {
      await queryClient.cancelQueries({ queryKey: ['services'] });

      const prevAdmin = queryClient.getQueryData<Service[]>(['services', { admin: true }]) || [];
      const prevCustomer = queryClient.getQueryData<Service[]>(['services', { admin: false }]) || [];

      // Optimistic delete
      queryClient.setQueryData<Service[]>(
        ['services', { admin: true }],
        prevAdmin.filter(s => s.id !== serviceId)
      );
      queryClient.setQueryData<Service[]>(
        ['services', { admin: false }],
        prevCustomer.filter(s => s.id !== serviceId)
      );

      return { prevAdmin, prevCustomer };
    },
    onError: (err, serviceId, context) => {
      if (context) {
        queryClient.setQueryData(['services', { admin: true }], context.prevAdmin);
        queryClient.setQueryData(['services', { admin: false }], context.prevCustomer);
      }
      toast.error(err.message || 'Failed to delete service.');
    },
    onSuccess: () => {
      toast.success('Service deleted successfully!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['services', { admin: true }] });
    },
  });
}

// 4. Update Order Status
export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const res = await fetch(apiUrl('/orders'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status }),
      });
      if (!res.ok) throw new Error('Failed to update status.');
      return res.json();
    },
    onMutate: async ({ orderId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'orders'] });
      const previousOrders = queryClient.getQueryData<RoomOrder[]>(['admin', 'orders']) || [];

      // Optimistic update
      queryClient.setQueryData<RoomOrder[]>(
        ['admin', 'orders'],
        previousOrders.map(o => o.id === orderId ? { ...o, status: status as RoomOrder['status'] } : o)
      );

      return { previousOrders };
    },
    onError: (err, variables, context) => {
      if (context) {
        queryClient.setQueryData(['admin', 'orders'], context.previousOrders);
      }
      toast.error('Failed to update order status.');
    },
    onSuccess: (data, variables) => {
      toast.success(`Order status updated to ${variables.status}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
  });
}

// 5. Update Waiter Call Status
export function useUpdateCallStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ callId, status }: { callId: number; status: string }) => {
      const res = await fetch(apiUrl('/calls'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: callId, status }),
      });
      if (!res.ok) throw new Error('Failed to resolve call.');
      return res.json();
    },
    onMutate: async ({ callId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'calls'] });
      const previousCalls = queryClient.getQueryData<WaiterCall[]>(['admin', 'calls']) || [];

      // Optimistic update
      queryClient.setQueryData<WaiterCall[]>(
        ['admin', 'calls'],
        previousCalls.map(c => c.id === callId ? { ...c, status: status as WaiterCall['status'] } : c)
      );

      return { previousCalls };
    },
    onError: (err, variables, context) => {
      if (context) {
        queryClient.setQueryData(['admin', 'calls'], context.previousCalls);
      }
      toast.error('Failed to update call status.');
    },
    onSuccess: (data, variables) => {
      toast.success(`Call marked as ${variables.status}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'calls'] });
    },
  });
}

export function useClearOrdersMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl('/orders'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to clear completed/cancelled orders.');
      return res.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'orders'] });
      const previousOrders = queryClient.getQueryData<RoomOrder[]>(['admin', 'orders']) || [];

      // Optimistically keep only active orders
      const updatedOrders = previousOrders.filter(o => 
        o.status !== 'completed' && o.status !== 'cancelled'
      );
      queryClient.setQueryData<RoomOrder[]>(['admin', 'orders'], updatedOrders);

      return { previousOrders };
    },
    onError: (err, variables, context) => {
      if (context) {
        queryClient.setQueryData(['admin', 'orders'], context.previousOrders);
      }
      toast.error('Failed to clear completed/cancelled orders.');
    },
    onSuccess: (data) => {
      toast.success(`Cleared ${data.clearedCount || 0} completed/cancelled orders.`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
  });
}

export function useRoomOrders(roomNumber: string | null) {
  return useQuery<RoomOrder[]>({
    queryKey: ['orders', 'room', roomNumber],
    queryFn: async () => {
      if (!roomNumber) return [];
      const res = await fetch(apiUrl(`/orders?room=${encodeURIComponent(roomNumber)}`));
      if (!res.ok) throw new Error('Failed to fetch room orders.');
      return res.json();
    },
    enabled: !!roomNumber,
    staleTime: 30 * 1000,
  });
}
