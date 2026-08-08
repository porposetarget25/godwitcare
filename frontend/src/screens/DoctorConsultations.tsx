// src/screens/DoctorConsultations.tsx
import React from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { authFetch, API_BASE_URL } from '../api'

type Item = {
  id: number
  patientName: string
  patientEmail: string
  createdAt: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
}

const TABS = ['PENDING', 'COMPLETED', 'ALL'] as const
type Tab = typeof TABS[number]
type DateFilter = 'ALL' | 'LAST_7' | 'LAST_30' | 'CUSTOM'

const TAB_LABELS: Record<Tab, string> = {
  PENDING: 'Upcoming',
  COMPLETED: 'Completed',
  ALL: 'All',
}

function dateInputValue(date: Date) {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export default function DoctorConsultations() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const initialTab = (params.get('status')?.toUpperCase() as Tab) || 'PENDING'
  const [tab, setTab] = React.useState<Tab>(initialTab)
  const [items, setItems] = React.useState<Item[]>([])
  const [loading, setLoading] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [dateFilter, setDateFilter] = React.useState<DateFilter>('ALL')
  const [fromDate, setFromDate] = React.useState('')
  const [toDate, setToDate] = React.useState('')

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  const load = React.useCallback(async (which: Tab) => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (which !== 'ALL') query.set('status', which)
      if (debouncedSearch) query.set('patientName', debouncedSearch)
      if (dateFilter === 'CUSTOM') {
        if (fromDate) query.set('from', fromDate)
        if (toDate) query.set('to', toDate)
      } else if (dateFilter === 'LAST_7' || dateFilter === 'LAST_30') {
        const from = new Date()
        from.setDate(from.getDate() - (dateFilter === 'LAST_7' ? 6 : 29))
        query.set('from', dateInputValue(from))
        query.set('to', dateInputValue(new Date()))
      }
      const q = query.toString()
      const res = await authFetch(`${API_BASE_URL}/doctor/consultations${q ? `?${q}` : ''}`, {})
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const j = (await res.json()) as Item[]
      setItems(Array.isArray(j) ? j : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [dateFilter, debouncedSearch, fromDate, toDate])

  React.useEffect(() => {
    load(tab)
  }, [tab, load])

  function selectTab(t: Tab) {
    setTab(t)
    // keep the tab in URL for refresh/share
    navigate(`/doctor/consultations?status=${t}`, { replace: true })
  }

  return (
    <>
      <div className="page-head">
        <div className="page-title">Consultation History</div>
        <div className="page-sub">{items.length} {items.length === 1 ? 'consultation' : 'consultations'}</div>
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t} type="button" onClick={() => selectTab(t)} className={`tab${tab === t ? ' on' : ''}`} aria-pressed={tab === t}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="cons-filterbar">
        <label className="cons-search">
          <i className="ti ti-search" aria-hidden="true" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient name…" />
        </label>
        <select value={dateFilter} onChange={e => setDateFilter(e.target.value as DateFilter)}>
          <option value="ALL">All time</option>
          <option value="LAST_7">Last 7 Days</option>
          <option value="LAST_30">Last 30 Days (1 Month)</option>
          <option value="CUSTOM">Custom Date Range</option>
        </select>
        {dateFilter === 'CUSTOM' && (
          <>
            <input type="date" value={fromDate} max={toDate || undefined} onChange={e => setFromDate(e.target.value)} />
            <input type="date" value={toDate} min={fromDate || undefined} onChange={e => setToDate(e.target.value)} />
            {(fromDate || toDate) && <button type="button" className="bg" onClick={() => { setFromDate(''); setToDate('') }}>× Clear</button>}
          </>
        )}
      </div>

      <p className="fi-hint" aria-live="polite">{loading ? 'Updating consultations…' : `${items.length} consultations match your filters`}</p>

      {!loading && items.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          No consultations match your filters — try changing the patient name or date range.
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="card">
          <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr><th>Date &amp; time</th><th>Patient</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {items.map(it => {
                const dt = new Date(it.createdAt)
                const statusTag = it.status === 'PENDING' ? 'tinfo' : it.status === 'COMPLETED' ? 'tmute' : 'twarn'
                return (
                  <tr key={it.id}>
                    <td>{dt.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })} <span className="fi-hint">{dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
                    <td><strong>{it.patientName || it.patientEmail || 'Unknown patient'}</strong><br /><span className="fi-hint">Consultation #{it.id}</span></td>
                    <td><span className={`tag ${statusTag}`}>{it.status === 'PENDING' ? 'Confirmed' : it.status.replace('_', ' ')}</span></td>
                    <td><Link to={`/doctor/consultations/${it.id}`} className="bs">{it.status === 'COMPLETED' ? 'View' : 'Open'}</Link></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </>
  )
}
