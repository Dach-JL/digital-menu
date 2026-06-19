import { create } from 'zustand';
import { apiUrl } from '@/config/api';
import { toast } from 'sonner';

interface FavoritesState {
  favorites: number[]; // Array of service IDs that are favorited
  loading: boolean;
  error: string;
  fetchFavorites: (userId: number) => Promise<void>;
  toggleFavorite: (userId: number, serviceId: number) => Promise<void>;
  isFavorited: (serviceId: number) => boolean;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  loading: false,
  error: '',

  fetchFavorites: async (userId) => {
    // Attempt to load from localStorage for quick offline initial display
    try {
      const cached = localStorage.getItem(`favs_${userId}`);
      if (cached) {
        set({ favorites: JSON.parse(cached) });
      }
    } catch {}

    set({ loading: true, error: '' });
    try {
      const res = await fetch(apiUrl(`/favorites.php?user_id=${userId}`));
      if (!res.ok) throw new Error('Failed to fetch favorites');
      const data = await res.json();
      if (data && !data.error) {
        const ids = data.map((fav: any) => Number(fav.service_id));
        set({ favorites: ids, loading: false });
        localStorage.setItem(`favs_${userId}`, JSON.stringify(ids));
      } else {
        set({ favorites: [], loading: false });
      }
    } catch (e: any) {
      set({ error: e.message || 'Failed to fetch favorites', loading: false });
    }
  },

  toggleFavorite: async (userId, serviceId) => {
    const originalFavorites = [...get().favorites];
    const isCurrentlyFavorited = originalFavorites.includes(serviceId);
    const updatedFavorites = isCurrentlyFavorited
      ? originalFavorites.filter((id) => id !== serviceId)
      : [...originalFavorites, serviceId];
    
    // Optimistic UI Update
    set({ favorites: updatedFavorites });
    localStorage.setItem(`favs_${userId}`, JSON.stringify(updatedFavorites));

    try {
      const res = await fetch(apiUrl('/favorites.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, service_id: serviceId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update favorites');
      }
    } catch {
      // Rollback on failure
      set({ favorites: originalFavorites });
      localStorage.setItem(`favs_${userId}`, JSON.stringify(originalFavorites));
      toast.error('Failed to update favorites');
    }
  },

  isFavorited: (serviceId) => {
    return get().favorites.includes(serviceId);
  }
}));
