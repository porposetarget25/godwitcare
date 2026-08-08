// src/screens/DoctorLeave.tsx — Leave & Exceptions (list)
import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE_URL, authFetch } from '../api'
import { clinicDateTime, clinicTime } from '../lib/appointmentTime'

export type LeaveRow = { id: number; startTime: string; endTime: string; reason?: string }

export default function DoctorLeave() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<LeaveRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await authFetch(`${API_BASE_URL}/doctor/schedule`, { cache: 'no-store' })
      const j = res.ok ? await res.json() : { blocks: [] }
      setRows(Array.isArray(j.blocks) ? j.blocks : [])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  async function remove(id: number) {
    setBusyId(id)
    try {
      await authFetch(`${API_BASE_URL}/doctor/schedule/blocks/${id}`, { method: 'DELETE' })
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const now = new Date()
  const upcoming = rows.filter(r => new Date(r.endTime) >= now).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const past = rows.filter(r => new Date(r.endTime) < now).sort((a, b) => b.startTime.localeCompare(a.startTime))

  function isSingleDay(row: LeaveRow) {
    return new Date(row.startTime).toDateString() === new Date(row.endTime).toDateString()
  }

  function Row({ row, expired }: { row: LeaveRow; expired?: boolean }) {
    return (
      <tr>
        <td>{clinicDateTime(row.startTime).split(',')[0]} <span className="fi-hint">{isSingleDay(row) ? 'Single day' : 'Date range'}</span></td>
        <td>{clinicTime(row.startTime)} – {clinicTime(row.endTime)}</td>
        <td>{row.reason || '—'}</td>
        <td><span className={`tag ${expired ? 'tmute' : 'tok'}`}>{expired ? 'Expired' : 'Blocked'}</span></td>
        <td style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          {!expired && <button type="button" className="bg" onClick={() => navigate('/doctor/leave/new', { state: { row } })}>Edit</button>}
          <button type="button" className="bg" onClick={() => remove(row.id)} disabled={busyId === row.id}>{busyId === row.id ? '…' : 'Remove'}</button>
        </td>
      </tr>
    )
  }

  return (
    <>
      <div className="page-head">
        <div className="page-title">Leave &amp; Exceptions</div>
        <Link to="/doctor/leave/new" className="bp"><i className="ti ti-plus" aria-hidden="true" /> New Entry</Link>
      </div>

      {loading ? <div className="card">Loading…</div> : (
        <>
          <div className="card">
            <div className="ct">Upcoming blocked periods — {upcoming.length} {upcoming.length === 1 ? 'entry' : 'entries'}</div>
            {upcoming.length === 0 ? (
              <p className="fi-hint">No upcoming blocked periods.</p>
            ) : (
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead><tr><th>Date</th><th>Time window</th><th>Reason</th><th>Status</th><th /></tr></thead>
                  <tbody>{upcoming.map(r => <Row key={r.id} row={r} />)}</tbody>
                </table>
              </div>
            )}
          </div>

          {past.length > 0 && (
            <div className="card" style={{ opacity: 0.75 }}>
              <div className="ct">Past blocked periods — {past.length} {past.length === 1 ? 'entry' : 'entries'}</div>
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead><tr><th>Date</th><th>Time window</th><th>Reason</th><th>Status</th><th /></tr></thead>
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
