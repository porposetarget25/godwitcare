// src/components/portal/PatientShell.tsx
import React from 'react'
import PortalShell, { type PortalNavSection } from './PortalShell'

export const PATIENT_NAV_SECTIONS: PortalNavSection[] = [
  {
    label: 'Main',
    items: [
      { id: 'home', label: 'Home', icon: 'home', to: '/home' },
      { id: 'tracker', label: 'Consultations', icon: 'route', to: '/consultation/tracker' },
      { id: 'carehistory', label: 'Care History', icon: 'history', to: '/care-history' },
      { id: 'documents', label: 'Documents', icon: 'file-check', to: '/documents' },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'profile', label: 'Profile', icon: 'user', to: '/profile' },
      { id: 'paymenthistory', label: 'Payment History', icon: 'receipt', to: '/payment-history' },
    ],
  },
]

export type PatientNavId = 'home' | 'tracker' | 'carehistory' | 'documents' | 'profile' | 'paymenthistory'

export default function PatientShell({ activeId, wide, children }: { activeId: PatientNavId; wide?: boolean; children: React.ReactNode }) {
  return (
    <PortalShell navSections={PATIENT_NAV_SECTIONS} activeId={activeId} roleLabel="Primary Member" wide={wide}>
      {children}
    </PortalShell>
  )
}
