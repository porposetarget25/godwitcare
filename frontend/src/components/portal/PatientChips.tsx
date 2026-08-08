// src/components/portal/PatientChips.tsx
import React from 'react'
import type { PatientContextOption } from '../../state/patient'

export default function PatientChips({
  patients,
  activeId,
  onSelect,
  allLabel = 'All',
}: {
  patients: PatientContextOption[]
  /** null/'' means the "All" chip is active */
  activeId: string | null
  onSelect: (patientId: string | null) => void
  allLabel?: string
}) {
  if (patients.length <= 1) return null
  return (
    <div className="patient-chip-row" role="tablist" aria-label="Filter by traveller">
      <button
        type="button"
        role="tab"
        aria-selected={!activeId}
        className={`patient-chip${!activeId ? ' on' : ''}`}
        onClick={() => onSelect(null)}
      >
        {allLabel}
      </button>
      {patients.map(p => (
        <button
          key={p.patientId}
          type="button"
          role="tab"
          aria-selected={activeId === p.patientId}
          className={`patient-chip${activeId === p.patientId ? ' on' : ''}`}
          onClick={() => onSelect(p.patientId)}
        >
          {p.name}
        </button>
      ))}
    </div>
  )
}
