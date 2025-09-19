import React from 'react'
import { Navigate } from 'react-router-dom'
import type { UserDto } from '../api'

/** Simple in-memory gate; assumes parent already loaded user. */
export function RequireRole({
  user,
  role,
  children,
}: {
  user: UserDto | null
  role: string
  children: React.ReactNode
}) {
  if (!user) return <Navigate to="/login" replace />
  if (!user.roles?.includes(role)) return <Navigate to="/home" replace />
  return <>{children}</>
}
