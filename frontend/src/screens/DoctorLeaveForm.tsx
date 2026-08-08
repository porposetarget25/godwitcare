// src/screens/DoctorLeaveForm.tsx — new/edit leave & exception entry
import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { API_BASE_URL, authFetch } from '../api'
import type { LeaveRow } from './DoctorLeave'

function dateKeyOf(iso: string) {
  return new Date(iso).toISOString().slice(0, 10)
}
function timeOf(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function localInstant(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString()
}

export default function DoctorLeaveForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const editing = (location.state as { row?: LeaveRow } | null)?.row || null

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const [date, setDate] = useState(editing ? dateKeyOf(editing.startTime) : tomorrow)
  const [startTime, setStartTime] = useState(editing ? timeOf(editing.startTime) : '09:00')
  const [endTime, setEndTime] = useState(editing ? timeOf(editing.endTime) : '17:00')
  const [reason, setReason] = useState(editing?.reason || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setErr(null)
    if (endTime <= startTime) { setErr('End time must be after start time.'); return }
    setSaving(true)
    try {
      if (editing) {
        await authFetch(`${API_BASE_URL}/doctor/schedule/blocks/${editing.id}`, { method: 'DELETE' })
      }
      const res = await authFetch(`${API_BASE_URL}/doctor/schedule/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime: localInstant(date, startTime), endTime: localInstant(date, endTime), reason: reason.trim() }),
      })
      if (!res.ok) {
        const t = await res.json().catch(() => null)
        throw new Error(t?.message || `HTTP ${res.status}`)
      }
      navigate('/doctor/leave')
    } catch (e: any) {
      setErr(e?.message || 'Unable to save this entry.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/doctor/leave" className="bs" style={{ marginBottom: 8, display: 'inline-flex' }}>‹ Leave &amp; Exceptions</Link>
          <div className="page-title">{editing ? 'Edit Entry' : 'New Entry'}</div>
        </div>
        <div className="page-head-actions">
          <Link to="/doctor/leave" className="bs">Discard</Link>
          <button type="button" className="bd" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Entry'}</button>
        </div>
      </div>

      {err && (
        <div className="notice n-warn">
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          {err.toLowerCase().includes('confirmed') ? `${err} Reschedule or cancel the affected consultation first.` : err}
        </div>
      )}

      <div className="g2">
        <div>
          <div className="card">
            <div className="ct">Date &amp; Time</div>
            <div className="fi"><label className="fl2">Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div className="g2">
              <div className="fi"><label className="fl2">From</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
              <div className="fi"><label className="fl2">To</label><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
            </div>
            <div className="fi-hint">For a single day off, this is all you need.</div>
          </div>

          <div className="card">
            <div className="ct">Reason (optional)</div>
            <input value={reason} maxLength={255} placeholder="Conference, annual leave…" onChange={e => setReason(e.target.value)} />
          </div>
        </div>

        <div>
          <div className="notice n-info">
            <i className="ti ti-info-circle" aria-hidden="true" />
            If this period contains a confirmed consultation, saving will be rejected — reschedule or cancel it first, then try again.
          </div>
        </div>
      </div>
    </>
  )
}
