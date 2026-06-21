import React from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL, authFetch } from '../api'

type Appointment = {
  id: number
  startTime: string
  endTime: string
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
  patientName: string
  patientEmail?: string
  contactPhone?: string
  contactAddress?: string
  consultationId: number
  reason?: string
}

function formatWhen(value: string) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

export default function DoctorAppointments() {
  const [items, setItems] = React.useState<Appointment[]>([])
  const [selected, setSelected] = React.useState<Appointment | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const res = await authFetch(`${API_BASE_URL}/doctor/appointments`, { cache: 'no-store' })
        const data = res.ok ? ((await res.json()) as Appointment[]) : []
        if (alive) setItems(Array.isArray(data) ? data : [])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const grouped = items.reduce<Record<string, Appointment[]>>((acc, appt) => {
    const key = appt.startTime.slice(0, 10)
    acc[key] = acc[key] || []
    acc[key].push(appt)
    return acc
  }, {})

  return (
    <section className="section">
      <div className="page-head page-head--split">
        <h1 className="page-title">Appointment Calendar</h1>
        <Link className="btn secondary" to="/doctor/consultations">Consultation Requests</Link>
      </div>

      {loading && <div className="muted">Loading appointments…</div>}
      {!loading && items.length === 0 && <div className="card"><div className="muted">No upcoming appointments booked.</div></div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {Object.entries(grouped).map(([date, appts]) => (
          <div key={date} className="card" style={{ padding: 16 }}>
            <h2 className="h3" style={{ marginTop: 0 }}>{new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {appts.map(appt => (
                <button key={appt.id} type="button" className="btn secondary" onClick={() => setSelected(appt)} style={{ textAlign: 'left', justifyContent: 'flex-start' }}>
                  {formatWhen(appt.startTime).split(', ').slice(-1)[0]} • {appt.patientName || 'Patient'} • {appt.status}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="card" style={{ marginTop: 18, border: '1px solid #bfdbfe' }}>
          <div className="page-head page-head--split" style={{ marginBottom: 8 }}>
            <h2 className="h3" style={{ margin: 0 }}>Appointment Details</h2>
            <button className="btn secondary" type="button" onClick={() => setSelected(null)}>Close</button>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <div><strong>Patient:</strong> {selected.patientName || '—'}</div>
            <div><strong>Date/time:</strong> {formatWhen(selected.startTime)}</div>
            <div><strong>Status:</strong> {selected.status}</div>
            <div><strong>Consultation:</strong> <Link to={`/doctor/consultations/${selected.consultationId}`}>#{selected.consultationId}</Link></div>
            <div><strong>Reason/details:</strong> {selected.reason || '—'}</div>
            <div><strong>Contact:</strong> {[selected.contactPhone, selected.patientEmail, selected.contactAddress].filter(Boolean).join(' • ') || '—'}</div>
          </div>
        </div>
      )}
    </section>
  )
}
