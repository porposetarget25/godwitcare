// src/screens/RequireRole.tsx
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { UserDto } from '../api'

export function RequireRole({
  user,
  role,
  children,
}: {
  user: UserDto | null
  role: string
  children: React.ReactNode
}) {
  const location = useLocation()

  // If user not present yet (first paint), show a tiny placeholder.
  // AuthProvider will populate soon after mount.
  if (user === null) {
    return <div style={{ padding: 16 }} className="muted">Loading…</div>
  }

  const hasRole =
    Array.isArray(user.roles) && user.roles.some(r => r?.toUpperCase() === role.toUpperCase())

  if (!hasRole) {
    // Not a doctor → send to login and remember where to return
    return <Navigate to="/doctor/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
