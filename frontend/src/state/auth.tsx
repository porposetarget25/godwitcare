// src/state/auth.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { getMe, type UserDto } from '../api';

type AuthState = {
  user: UserDto | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<AuthState>({
  user: null,
  loading: true,
  refresh: async () => {},
});

export function useAuth() {
  return useContext(AuthCtx);
}

// Helper: normalize DOCTOR vs ROLE_DOCTOR etc.
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
      try {
        localStorage.setItem('gc_user', JSON.stringify(u ?? null));
      } catch {
        // ignore
      }
    } catch {
      setUser(null);
      try {
        localStorage.removeItem('gc_user');
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, refresh: load }}>
      {children}
    </AuthCtx.Provider>
  );
}
