// src/screens/RequireRole.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import type { UserDto } from '../api';

type Props = {
  user: UserDto | null;
  role: string;
  loading?: boolean;
  children: React.ReactNode;
};

export function RequireRole({ user, role, loading, children }: Props) {
  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div className="muted">Loading…</div>
      </div>
    );
  }

  if (!user) {
    // not logged in – send to doctor login (or normal login)
    return <Navigate to="/doctor/login" replace />;
  }

  const hasRole = !!user.roles?.some(
    (r) => typeof r === 'string' && r.toUpperCase().includes(role.toUpperCase())
  );

  if (!hasRole) {
    // logged in but wrong role
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}

type RequireAuthProps = {
  user: UserDto | null;
  loading?: boolean;
  children: React.ReactNode;
};

/** Any authenticated user (patient or doctor) — used for patient-shell routes that aren't role-specific. */
export function RequireAuth({ user, loading, children }: RequireAuthProps) {
  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div className="muted">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
