// src/screens/DoctorAvailability.tsx — Availability Setup (list)
import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE_URL, authFetch } from '../api'

export type AvailabilityRow = { id: number; startDate: string; endDate: string; startTime: string; endTime: string; activeDays: number[] }

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function countWorkDays(startDate: string, endDate: string, activeDays: number[]) {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (end < start) return 0
  let count = 0
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const weekday = ((d.getDay() + 6) % 7) + 1
    if (activeDays.includes(weekday)) count++
  }
  return count
}

function slotsFor(row: AvailabilityRow) {
  const [sh, sm] = row.startTime.slice(0, 5).split(':').map(Number)
  const [eh, em] = row.endTime.slice(0, 5).split(':').map(Number)
  const minutes = Math.max(0, (eh * 60 + em) - (sh * 60 + sm))
  const perDay = Math.floor(minutes / 15)
  return perDay * countWorkDays(row.startDate, row.endDate, row.activeDays)
}

export default function DoctorAvailability() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<AvailabilityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await authFetch(`${API_BASE_URL}/doctor/schedule`, { cache: 'no-store' })
      const j = res.ok ? await res.json() : { availability: [] }
      setRows(Array.isArray(j.availability) ? j.availability : [])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  async function remove(id: number) {
    setBusyId(id)
    try {
      await authFetch(`${API_BASE_URL}/doctor/schedule/availability/${id}`, { method: 'DELETE' })
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const active = rows.filter(r => r.endDate >= today)
  const past = rows.filter(r => r.endDate < today)

  function Row({ row, expired }: { row: AvailabilityRow; expired?: boolean }) {
    return (
      <tr>
        <td>{row.startDate} – {row.endDate}</td>
        <td>{row.startTime.slice(0, 5)} – {row.endTime.slice(0, 5)}</td>
        <td>{row.activeDays.slice().sort().map(d => DAY_NAMES[d - 1]).join(', ')}</td>
        <td>{slotsFor(row)}</td>
        <td><span className={`tag ${expired ? 'tmute' : 'tok'}`}>{expired ? 'Expired' : 'Active'}</span></td>
        <td style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          {!expired && (
            <button type="button" className="bg" onClick={() => navigate('/doctor/availability/new', { state: { row } })}>Edit</button>
          )}
          <button type="button" className="bg" onClick={() => remove(row.id)} disabled={busyId === row.id}>
            {busyId === row.id ? '…' : 'Delete'}
          </button>
        </td>
      </tr>
    )
  }

  return (
    <>
      <div className="page-head">
        <div className="page-title">Availability Setup</div>
        <Link to="/doctor/availability/new" className="bp"><i className="ti ti-plus" aria-hidden="true" /> New Availability</Link>
      </div>

      {loading ? <div className="card">Loading…</div> : (
        <>
          <div className="card">
            <div className="ct">Active schedules — {active.length} {active.length === 1 ? 'block' : 'blocks'} · {active.reduce((n, r) => n + slotsFor(r), 0)} total slots</div>
            {active.length === 0 ? (
              <p className="fi-hint">No availability configured. The default 09:00–17:00 clinic schedule remains active.</p>
            ) : (
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead><tr><th>Date range</th><th>Time window</th><th>Active days</th><th>Slots</th><th>Status</th><th /></tr></thead>
                  <tbody>{active.map(r => <Row key={r.id} row={r} />)}</tbody>
                </table>
              </div>
            )}
          </div>

          {past.length > 0 && (
            <div className="card" style={{ opacity: 0.75 }}>
              <div className="ct">Past schedules — {past.length} {past.length === 1 ? 'block' : 'blocks'}</div>
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead><tr><th>Date range</th><th>Time window</th><th>Active days</th><th>Slots</th><th>Status</th><th /></tr></thead>
                  <tbody>{past.map(r => <Row key={r.id} row={r} expired />)}</tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
