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
    <section className="section doctor-consultations-page">
      <div className="doctor-consult-panel">
        <header className="doctor-consult-titlebar">
          <h1>Consultation History</h1>
          <span>{items.length} {items.length === 1 ? 'consultation' : 'consultations'}</span>
        </header>
        <div className="doctor-consult-body">
        <nav className="doctor-consult-tabs" aria-label="Consultation status">
          {TABS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => selectTab(t)}
              className={tab === t ? 'active' : ''}
              aria-pressed={tab === t}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </nav>

        <div className="doctor-consult-filters">
          <label className="doctor-consult-search">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">Search patient name</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient name…" />
          </label>
          <label className="sr-only" htmlFor="consult-date-filter">Date range</label>
          <select id="consult-date-filter" value={dateFilter} onChange={e => setDateFilter(e.target.value as DateFilter)}>
            <option value="ALL">All time</option>
            <option value="LAST_7">Last 7 Days</option>
            <option value="LAST_30">Last 30 Days (1 Month)</option>
            <option value="CUSTOM">Custom Date Range</option>
          </select>
          {dateFilter === 'CUSTOM' && (
            <div className="doctor-custom-dates">
              <label>From<input type="date" value={fromDate} max={toDate || undefined} onChange={e => setFromDate(e.target.value)} /></label>
              <label>To<input type="date" value={toDate} min={fromDate || undefined} onChange={e => setToDate(e.target.value)} /></label>
              {(fromDate || toDate) && <button type="button" onClick={() => { setFromDate(''); setToDate('') }}>× Clear</button>}
            </div>
          )}
        </div>

        <p className="doctor-consult-results" aria-live="polite">{loading ? 'Updating consultations…' : `${items.length} consultations match your filters`}</p>

      {!loading && items.length === 0 && (
        <div className="doctor-consult-empty">
          <strong>No consultations found</strong>
          <span>Try changing the patient name or date range.</span>
        </div>
      )}

      {!loading && items.length > 0 && <div className="doctor-consult-table" role="table">
        <div className="doctor-consult-row doctor-consult-row-head" role="row">
          <span>Date &amp; time</span><span>Patient</span><span>Status</span><span className="sr-only">Action</span>
        </div>
        {items.map(it => {
          const dt = new Date(it.createdAt)
          return <div key={it.id} className="doctor-consult-row" role="row">
            <time dateTime={it.createdAt}><strong>{dt.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}</strong><small>{dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></time>
            <span className="doctor-patient"><strong>{it.patientName || it.patientEmail || 'Unknown patient'}</strong><small>Consultation #{it.id}</small></span>
            <span><span className={`doctor-status doctor-status-${it.status.toLowerCase()}`}>{it.status === 'PENDING' ? 'Confirmed' : it.status.replace('_', ' ')}</span></span>
            <Link to={`/doctor/consultations/${it.id}`} className="doctor-consult-action">{it.status === 'COMPLETED' ? 'View' : 'Open'}<span aria-hidden="true">→</span></Link>
          </div>
        })}
      </div>}
        </div>
      </div>
    </section>
  )
}
