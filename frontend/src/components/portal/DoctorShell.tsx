// src/components/portal/DoctorShell.tsx
import React, { useEffect, useState } from 'react'
import PortalShell, { type PortalNavSection } from './PortalShell'
import { authFetch, API_BASE_URL } from '../../api'
import { useAuth } from '../../state/auth'

export type DoctorNavId = 'dashboard' | 'calendar' | 'consultations' | 'availability' | 'leave' | 'settings'

export default function DoctorShell({ activeId, wide, children }: { activeId: DoctorNavId; wide?: boolean; children: React.ReactNode }) {
  const { user } = useAuth()
  const [pendingCount, setPendingCount] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!user) { setPendingCount(undefined); return }
    let alive = true
    authFetch(`${API_BASE_URL}/doctor/consultations?status=PENDING`, { cache: 'no-store' })
      .then(res => res.ok ? res.json() : [])
      .then(items => { if (alive) setPendingCount(Array.isArray(items) && items.length > 0 ? items.length : undefined) })
      .catch(() => { if (alive) setPendingCount(undefined) })
    return () => { alive = false }
  }, [user])

  const navSections: PortalNavSection[] = [
    {
      label: 'Main',
      items: [
        { id: 'dashboard', label: "Today's Schedule", icon: 'sun', to: '/doctor/dashboard' },
        { id: 'calendar', label: 'My Calendar', icon: 'calendar', to: '/doctor/calendar' },
        { id: 'consultations', label: 'Consultations', icon: 'clipboard-list', to: '/doctor/consultations', badge: pendingCount },
      ],
    },
    {
      label: 'Availability',
      items: [
        { id: 'availability', label: 'Availability Setup', icon: 'calendar-check', to: '/doctor/availability' },
        { id: 'leave', label: 'Leave & Exceptions', icon: 'calendar-off', to: '/doctor/leave' },
      ],
    },
    {
      label: 'Account',
      items: [
        { id: 'settings', label: 'Settings', icon: 'settings', to: '/doctor/settings' },
      ],
    },
  ]

  return (
    <PortalShell navSections={navSections} activeId={activeId} roleLabel="Doctor" profileHref="/doctor/settings" wide={wide}>
      {children}
    </PortalShell>
  )
}
