// src/screens/ConsultationTracker.tsx — Consultations history list (completed consultations)
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authFetch, API_BASE_URL } from '../api'
import { usePatient, type PatientContextOption } from '../state/patient'
import PatientChips from '../components/portal/PatientChips'

type CareHistoryItem = {
  consultationId: number
  date: string
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'LOGGED'
  locationTravellingTo?: string
  presentingComplaint?: string
  diagnosis?: string
  medicines?: string
  recommendations?: string
}

type Row = CareHistoryItem & { patientName: string; patientQuery: string }

function queryForPatient(p: PatientContextOption) {
  const qp = new URLSearchParams()
  if (p.id !== 'PRIMARY') qp.set('travelerId', p.id)
  qp.set('patientId', p.patientId)
  return qp.toString()
}

const STATUS_META: Record<string, { label: string; tag: string }> = {
  COMPLETED: { label: 'Completed', tag: 'tmute' },
  IN_PROGRESS: { label: 'In Progress', tag: 'tinfo' },
  PENDING: { label: 'Pending', tag: 'twarn' },
  LOGGED: { label: 'Completed', tag: 'tmute' },
}

export default function ConsultationTracker() {
  const { patients, loading: patientsLoading } = usePatient()
  const navigate = useNavigate()
  const [filterPatientId, setFilterPatientId] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (patientsLoading) return
    const targets = filterPatientId ? patients.filter(p => p.patientId === filterPatientId) : patients
    if (targets.length === 0) { setRows([]); setLoading(false); return }
    let alive = true
    setLoading(true)
    ;(async () => {
      const results = await Promise.all(targets.map(async p => {
        const res = await authFetch(`${API_BASE_URL}/care-history/mine?${queryForPatient(p)}`, { cache: 'no-store' }).catch(() => null)
        if (!res || !res.ok || res.status === 204) return [] as Row[]
        const j = await res.json().catch(() => null)
        const items: CareHistoryItem[] = Array.isArray(j?.items) ? j.items : []
        return items.map(it => ({ ...it, patientName: p.name, patientQuery: queryForPatient(p) }))
      }))
      if (!alive) return
      const merged = results.flat().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setRows(merged)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [patients, patientsLoading, filterPatientId])

  function openRow(row: Row) {
    const qp = new URLSearchParams(row.patientQuery)
    qp.set('cid', String(row.consultationId))
    navigate(`/consultation?${qp.toString()}`)
  }

  return (
    <>
      <div className="page-title">Consultations</div>
      <div className="page-sub">Your completed consultation history. Active consultations appear on Home.</div>

      <PatientChips
        patients={patients}
        activeId={filterPatientId}
        onSelect={setFilterPatientId}
      />

      {loading || patientsLoading ? (
        <div className="card">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          No completed consultations{filterPatientId ? ' for this traveller' : ''} yet.
        </div>
      ) : (
        <div className="history-list">
          {rows.map(row => {
            const dateStr = new Date(row.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
            const statusMeta = STATUS_META[row.status || 'COMPLETED'] || STATUS_META.COMPLETED
            return (
              <div key={row.consultationId} className="history-row status-completed" onClick={() => openRow(row)}>
                <div className="ava">{row.patientName.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()}</div>
                <div className="history-info">
                  <div className="history-name">{row.patientName} · {dateStr}</div>
                  <div className="history-detail">{row.diagnosis || row.presentingComplaint || 'Consultation completed'}</div>
                </div>
                <span className={`tag ${statusMeta.tag}`}>{statusMeta.label}</span>
                <i className="ti ti-chevron-right history-chevron" aria-hidden="true" />
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
