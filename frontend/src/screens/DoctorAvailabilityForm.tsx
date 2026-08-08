// src/screens/DoctorAvailabilityForm.tsx — new/edit availability block
import React, { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { API_BASE_URL, authFetch } from '../api'
import type { AvailabilityRow } from './DoctorAvailability'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function timeOptions() {
  const out: string[] = []
  for (let m = 6 * 60; m <= 22 * 60; m += 30) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }
  return out
}
const TIME_OPTIONS = timeOptions()

function countWorkDays(startDate: string, endDate: string, activeDays: number[]) {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (!startDate || !endDate || end < start) return 0
  let count = 0
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const weekday = ((d.getDay() + 6) % 7) + 1
    if (activeDays.includes(weekday)) count++
  }
  return count
}

export default function DoctorAvailabilityForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const editing = (location.state as { row?: AvailabilityRow } | null)?.row || null

  const today = new Date().toISOString().slice(0, 10)
  const [startDate, setStartDate] = useState(editing?.startDate || today)
  const [endDate, setEndDate] = useState(editing?.endDate || today)
  const [startTime, setStartTime] = useState(editing?.startTime.slice(0, 5) || '09:00')
  const [endTime, setEndTime] = useState(editing?.endTime.slice(0, 5) || '17:00')
  const [activeDays, setActiveDays] = useState<number[]>(editing?.activeDays || [1, 2, 3, 4, 5])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function toggleDay(d: number) {
    setActiveDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  const workDays = countWorkDays(startDate, endDate, activeDays)
  const windowMinutes = useMemo(() => {
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    return Math.max(0, (eh * 60 + em) - (sh * 60 + sm))
  }, [startTime, endTime])
  const slotsPerDay = Math.floor(windowMinutes / 15)
  const totalSlots = workDays * slotsPerDay

  async function save() {
    setErr(null)
    if (activeDays.length === 0) { setErr('Select at least one active day.'); return }
    if (endTime <= startTime) { setErr('Closing time must be after opening time.'); return }
    if (endDate < startDate) { setErr('End date must be on or after the start date.'); return }
    setSaving(true)
    try {
      if (editing) {
        await authFetch(`${API_BASE_URL}/doctor/schedule/availability/${editing.id}`, { method: 'DELETE' })
      }
      const res = await authFetch(`${API_BASE_URL}/doctor/schedule/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, startTime, endTime, activeDays }),
      })
      if (!res.ok) {
        const t = await res.json().catch(() => null)
        throw new Error(t?.message || `HTTP ${res.status}`)
      }
      navigate('/doctor/availability')
    } catch (e: any) {
      setErr(e?.message || 'Unable to save availability.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/doctor/availability" className="bs" style={{ marginBottom: 8, display: 'inline-flex' }}>‹ Availability Setup</Link>
          <div className="page-title">{editing ? 'Edit Availability' : 'New Availability'}</div>
        </div>
        <div className="page-head-actions">
          <Link to="/doctor/availability" className="bs">Discard</Link>
          <button type="button" className="bp" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Availability'}</button>
        </div>
      </div>

      {err && <div className="notice n-warn"><i className="ti ti-alert-triangle" aria-hidden="true" />{err}</div>}

      <div className="g2">
        <div>
          <div className="card">
            <div className="ct">Date Range</div>
            <div className="g2">
              <div className="fi"><label className="fl2">From</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
              <div className="fi"><label className="fl2">To</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            </div>
            <div className="fi-hint">For a single day, set the same date for From and To.</div>
          </div>

          <div className="card">
            <div className="ct">Time Window</div>
            <div className="g2">
              <div className="fi">
                <label className="fl2">Opens at</label>
                <select value={startTime} onChange={e => setStartTime(e.target.value)}>
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="fi">
                <label className="fl2">Closes at</label>
                <select value={endTime} onChange={e => setEndTime(e.target.value)}>
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="fi-hint">For more than one session per day (e.g. morning + afternoon), save this block, then add a second one for the same dates/days.</div>
          </div>

          <div className="card">
            <div className="ct">Active Days</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DAY_NAMES.map((d, i) => (
                <button key={d} type="button" className={`patient-chip${activeDays.includes(i + 1) ? ' on' : ''}`} onClick={() => toggleDay(i + 1)}>{d}</button>
              ))}
            </div>
            <div className="fi-hint" style={{ marginTop: 8 }}>Active: {activeDays.length ? activeDays.slice().sort().map(d => DAY_NAMES[d - 1]).join(', ') : 'none selected'}</div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="ct">Schedule Preview</div>
            <div className="notice n-info">
              <i className="ti ti-info-circle" aria-hidden="true" />
              {workDays} working day{workDays === 1 ? '' : 's'} · {slotsPerDay} slots per day · {totalSlots} total slots
            </div>
          </div>
          <div className="notice n-warn">
            <i className="ti ti-alert-triangle" aria-hidden="true" />
            Changing this schedule will not affect already confirmed consultations.
          </div>
        </div>
      </div>
    </>
  )
}
