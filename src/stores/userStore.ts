import { create } from 'zustand';

export type AdminRole = 'admin' | 'admin_room' | 'admin_food' | 'admin_waiter';
export type UserRole = 'user' | AdminRole;

export interface User {
  id: number;
  email: string;
  username: string;
  role: UserRole;
}

interface UserState {
  user: User | null;
  setUser: (newUser: User | null) => void;
  isAnyAdmin: () => boolean;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: (() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  })(),
  setUser: (newUser) => {
    set({ user: newUser });
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('user');
    }
  },
  isAnyAdmin: () => {
    const role = get().user?.role || '';
    return ['admin', 'admin_room', 'admin_food', 'admin_waiter'].includes(role);
  },
}));
