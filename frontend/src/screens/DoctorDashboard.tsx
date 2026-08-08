// src/screens/DoctorDashboard.tsx — Today's Schedule (doctor landing page)
import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL, authFetch } from '../api'
import { clinicDateKey, clinicTime, clinicTodayLabel } from '../lib/appointmentTime'

type Appointment = {
  id: number
  startTime: string
  endTime: string
  documentationEndTime: string
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  patientName: string
  consultationId: number
}

function appointmentCountdown(startTime: string) {
  const minutes = Math.ceil((new Date(startTime).getTime() - Date.now()) / 60000)
  if (minutes <= 0) return 'Ready now'
  if (minutes < 60) return `in ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return `in ${hours}h${remainder ? ` ${remainder}m` : ''}`
}

export default function DoctorDashboard() {
  const [items, setItems] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    authFetch(`${API_BASE_URL}/doctor/appointments`, { cache: 'no-store' })
      .then(res => res.ok ? res.json() : [])
      .then(data => { if (alive) setItems(Array.isArray(data) ? data : []) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const todayKey = clinicDateKey()
  const todayItems = useMemo(
    () => items.filter(a => clinicDateKey(a.startTime) === todayKey && a.status !== 'CANCELLED').sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [items, todayKey],
  )
  const nextAppointment = todayItems.find(a => new Date(a.endTime).getTime() > Date.now())
  const queue = nextAppointment ? todayItems.filter(a => a.id !== nextAppointment.id) : todayItems

  return (
    <>
      <div className="page-head">
        <div className="page-title">Today&apos;s Schedule</div>
        <div className="page-sub">{clinicTodayLabel()}</div>
      </div>

      {loading ? (
        <div className="card">Loading…</div>
      ) : (
        <>
          {nextAppointment ? (
            <div className="card" style={{ borderLeft: '3px solid var(--fill-accent)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div className="fi-hint" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <i className="ti ti-player-play" aria-hidden="true" /> NEXT UP — {appointmentCountdown(nextAppointment.startTime)}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{nextAppointment.patientName || 'Patient'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {clinicTime(nextAppointment.startTime)} – {clinicTime(nextAppointment.endTime)} <span className="tag tinfo" style={{ marginLeft: 6 }}>{nextAppointment.status}</span>
                  </div>
                </div>
                <Link to={`/doctor/consultations/${nextAppointment.consultationId}`} className="bp">
                  <i className="ti ti-player-play" aria-hidden="true" /> Start
                </Link>
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No more appointments today — your schedule is clear.</div>
          )}

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div className="ct" style={{ marginBottom: 0 }}>Today&apos;s Queue</div>
              <span className="fi-hint">{queue.length} remaining</span>
            </div>
            {queue.length === 0 ? (
              <p className="fi-hint">There are no other appointments in today&apos;s queue.</p>
            ) : (
              queue.map(a => (
                <div key={a.id} className="ar">
                  <span className="at">{clinicTime(a.startTime)} – {clinicTime(a.endTime)}</span>
                  <span className="ap">{a.patientName || 'Patient'} · Documentation until {clinicTime(a.documentationEndTime)}</span>
                  <Link to={`/doctor/consultations/${a.consultationId}`} className="bs">View</Link>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </>
  )
}
