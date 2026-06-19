import React, { ReactNode } from 'react';
import { useUserStore, type AdminRole, type UserRole, type User } from '@/stores/userStore';
import { useShallow } from 'zustand/react/shallow';

export type { AdminRole, UserRole, User };

export const UserProvider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

export const useUser = () => {
  return useUserStore(
    useShallow((state) => ({
      user: state.user,
      setUser: state.setUser,
      isAnyAdmin: state.isAnyAdmin,
    }))
  );
};
