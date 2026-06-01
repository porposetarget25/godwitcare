// src/state/auth.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { clearAuthToken, getMe, getTokenExpiresAt, type UserDto } from '../api';

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

  const clearUser = useCallback(() => {
    clearAuthToken();
    setUser(null);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const u = await getMe();
      setUser(u);
      try {
        if (u) localStorage.setItem('gc_user', JSON.stringify(u));
        else localStorage.removeItem('gc_user');
      } catch {
        // ignore
      }
    } catch {
      clearUser();
    } finally {
      setLoading(false);
    }
  }, [clearUser]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;

    const expiresAt = getTokenExpiresAt();
    if (!expiresAt) {
      clearUser();
      return;
    }

    const timeoutMs = Math.max(0, expiresAt - Date.now());
    const timeout = window.setTimeout(() => {
      clearUser();
      window.location.hash = '#/login';
    }, timeoutMs);

    return () => window.clearTimeout(timeout);
  }, [clearUser, user]);

  useEffect(() => {
    const handleAuthExpired = () => {
      clearUser();
      window.location.hash = '#/login';
    };

    window.addEventListener('godwitcare:auth-expired', handleAuthExpired);
    return () => window.removeEventListener('godwitcare:auth-expired', handleAuthExpired);
  }, [clearUser]);

  return (
    <AuthCtx.Provider value={{ user, loading, refresh: load }}>
      {children}
    </AuthCtx.Provider>
  );
}
