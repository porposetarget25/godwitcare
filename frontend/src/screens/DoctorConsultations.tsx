// src/screens/DoctorConsultations.tsx
import React from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../api'

type Item = {
  id: number
  patientName: string
  patientEmail: string
  createdAt: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
}

const TABS = ['PENDING', 'COMPLETED', 'ALL'] as const
type Tab = typeof TABS[number]

export default function DoctorConsultations() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const initialTab = (params.get('status')?.toUpperCase() as Tab) || 'PENDING'
  const [tab, setTab] = React.useState<Tab>(initialTab)
  const [items, setItems] = React.useState<Item[]>([])
  const [loading, setLoading] = React.useState(false)

  const load = React.useCallback(async (which: Tab) => {
    setLoading(true)
    try {
      const q = which === 'ALL' ? '' : `?status=${encodeURIComponent(which)}`
      const res = await fetch(`${API_BASE_URL}/doctor/consultations${q}`, { credentials: 'include' })
      const j = (await res.json()) as Item[]
      setItems(Array.isArray(j) ? j : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load(tab)
  }, [tab, load])

  function selectTab(t: Tab) {
    setTab(t)
    // keep the tab in URL for refresh/share
    navigate(`/doctor/consultations?status=${t}`, { replace: true })
  }

  return (
    <section className="section">
      <div className="page-head doctor-consult-head">
        <h1 className="page-title">Consultation Requests</h1>
        <nav className="tabs doctor-consult-tabs">
          {TABS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => selectTab(t)}
              className={'btn ' + (tab === t ? '' : 'secondary')}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {loading && <div className="muted">Loading…</div>}

      {!loading && items.length === 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="muted">No consultations found.</div>
        </div>
      )}

      {!loading && items.map(it => {
        const dt = new Date(it.createdAt)
        const when = `${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}`
        return (
          <div key={it.id} className="card doctor-consult-card" style={{ marginTop: 12 }}>
            <div className="doctor-consult-card-content">
              <div style={{ fontWeight: 700 }}>{it.patientName || it.patientEmail}</div>
              <div className="muted small">
                #{it.id} • {when} • {it.status}
              </div>
            </div>
            <Link to={`/doctor/consultations/${it.id}`} className="btn doctor-consult-open-btn">Open</Link>
          </div>
        )
      })}
    </section>
  )
}
