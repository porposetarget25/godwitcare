// src/state/auth.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getMe, logout as apiLogout, type UserDto } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthState = {
  user: UserDto | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<AuthState>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthCtx);
}

export function isDoctorUser(user: UserDto | null | undefined): boolean {
  return !!user?.roles?.some(
    (r) => typeof r === 'string' && r.toUpperCase().includes('DOCTOR'),
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const u = await getMe();
      setUser(u);
      await AsyncStorage.setItem('gc_user', JSON.stringify(u ?? null));
    } catch {
      setUser(null);
      await AsyncStorage.removeItem('gc_user');
    } finally {
      setLoading(false);
    }
  };

  const doLogout = async () => {
    try {
      await apiLogout();
    } catch {}
    // Always clear local state regardless of API response
    setUser(null);
    await AsyncStorage.multiRemove(['gc_user', 'gc_session', 'reg-draft']);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, refresh: load, logout: doLogout }}>
      {children}
    </AuthCtx.Provider>
  );
}
