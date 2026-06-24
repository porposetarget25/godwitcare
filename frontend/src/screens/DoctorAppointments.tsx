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

function formatTime(value: string) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(d)
}

function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function readableDate(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`)
  return Number.isNaN(date.getTime()) ? dateKey : date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function buildCalendarDays(month: Date) {
  const first = startOfMonth(month)
  const firstWeekday = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - firstWeekday)

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return day
  })
}

export default function DoctorAppointments() {
  const [items, setItems] = React.useState<Appointment[]>([])
  const [selected, setSelected] = React.useState<Appointment | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [visibleMonth, setVisibleMonth] = React.useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = React.useState(() => formatDateKey(new Date()))

  React.useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const res = await authFetch(`${API_BASE_URL}/doctor/appointments`, { cache: 'no-store' })
        const data = res.ok ? ((await res.json()) as Appointment[]) : []
        if (alive) {
          const nextItems = Array.isArray(data) ? data : []
          setItems(nextItems)
          if (nextItems.length > 0) {
            const firstAppointment = [...nextItems].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0]
            const firstDate = firstAppointment.startTime.slice(0, 10)
            setSelectedDate(firstDate)
            setVisibleMonth(startOfMonth(new Date(`${firstDate}T00:00:00`)))
          }
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const grouped = React.useMemo(() => {
    return items.reduce<Record<string, Appointment[]>>((acc, appt) => {
      const key = appt.startTime.slice(0, 10)
      acc[key] = acc[key] || []
      acc[key].push(appt)
      acc[key].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      return acc
    }, {})
  }, [items])

  const calendarDays = React.useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth])
  const selectedAppointments = grouped[selectedDate] || []
  const todayKey = formatDateKey(new Date())
  const monthLabel = visibleMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  function moveMonth(offset: number) {
    setVisibleMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1))
  }

  function selectDay(day: Date) {
    const key = formatDateKey(day)
    setSelectedDate(key)
    setSelected(null)
    if (day.getMonth() !== visibleMonth.getMonth() || day.getFullYear() !== visibleMonth.getFullYear()) {
      setVisibleMonth(startOfMonth(day))
    }
  }

  return (
    <section className="section doctor-appointments-page">
      <div className="page-head page-head--split">
        <h1 className="page-title">Appointment Calendar</h1>
        <Link className="btn secondary" to="/doctor/consultations">Consultation Requests</Link>
      </div>

      {loading && <div className="muted doctor-appointments-status">Loading appointments…</div>}
      {!loading && items.length === 0 && <div className="card doctor-appointments-status"><div className="muted">No upcoming appointments booked.</div></div>}

      <div className="doctor-calendar-layout">
        <div className="card doctor-calendar-card">
          <div className="doctor-calendar-toolbar">
            <button className="doctor-calendar-nav" type="button" onClick={() => moveMonth(-1)} aria-label="Previous month">‹</button>
            <div>
              <div className="kicker">Monthly view</div>
              <h2 className="h2 doctor-calendar-title">{monthLabel}</h2>
            </div>
            <button className="doctor-calendar-nav" type="button" onClick={() => moveMonth(1)} aria-label="Next month">›</button>
          </div>

          <div className="doctor-calendar-weekdays" aria-hidden="true">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}
          </div>

          <div className="doctor-calendar-grid">
            {calendarDays.map(day => {
              const key = formatDateKey(day)
              const appointments = grouped[key] || []
              const isSelected = key === selectedDate
              const isOutsideMonth = day.getMonth() !== visibleMonth.getMonth()
              return (
                <button
                  key={key}
                  type="button"
                  className={['doctor-calendar-day', appointments.length ? 'has-appointments' : '', isSelected ? 'is-selected' : '', isOutsideMonth ? 'is-muted' : '', key === todayKey ? 'is-today' : ''].filter(Boolean).join(' ')}
                  onClick={() => selectDay(day)}
                  aria-pressed={isSelected}
                >
                  <span className="doctor-calendar-date-number">{day.getDate()}</span>
                  {appointments.length > 0 && <span className="doctor-calendar-badge">{appointments.length}</span>}
                </button>
              )
            })}
          </div>
        </div>

        <aside className="card doctor-day-panel">
          <div className="doctor-day-panel-head">
            <div>
              <div className="kicker">Selected date</div>
              <h2 className="h3">{readableDate(selectedDate)}</h2>
            </div>
            <span className="doctor-day-count">{selectedAppointments.length} appointment{selectedAppointments.length === 1 ? '' : 's'}</span>
          </div>

          {selectedAppointments.length === 0 ? (
            <div className="muted doctor-empty-day">No appointments scheduled for this date.</div>
          ) : (
            <div className="doctor-appointment-list">
              {selectedAppointments.map(appt => (
                <article key={appt.id} className="doctor-appointment-item">
                  <div className="doctor-appointment-time">{formatTime(appt.startTime)}</div>
                  <div className="doctor-appointment-summary">
                    <strong>{appt.patientName || 'Patient'}</strong>
                    <span>Consultation #{appt.consultationId || '—'}</span>
                    <span className={`doctor-status doctor-status--${appt.status.toLowerCase()}`}>{appt.status}</span>
                  </div>
                  <button className="btn secondary doctor-view-details" type="button" onClick={() => setSelected(appt)}>View details</button>
                </article>
              ))}
            </div>
          )}
        </aside>
      </div>

      {selected && (
        <div className="card doctor-appointment-details">
          <div className="page-head page-head--split doctor-detail-head">
            <h2 className="h3">Appointment Details</h2>
            <button className="btn secondary" type="button" onClick={() => setSelected(null)}>Close</button>
          </div>
          <div className="doctor-detail-grid">
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
