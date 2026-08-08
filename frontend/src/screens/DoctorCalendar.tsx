// src/screens/DoctorCalendar.tsx — My Calendar (Day / Week / Month)
import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL, authFetch } from '../api'
import { clinicDateKey, clinicDateTime, clinicTime } from '../lib/appointmentTime'

type Appointment = {
  id: number
  startTime: string
  endTime: string
  documentationEndTime: string
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  patientName: string
  patientEmail?: string
  contactPhone?: string
  contactAddress?: string
  consultationId: number
  reason?: string
}
type Availability = { id: number; startDate: string; endDate: string; startTime: string; endTime: string; activeDays: number[] }
type TimeBlock = { id: number; startTime: string; endTime: string; reason?: string }
type Schedule = { availability: Availability[]; blocks: TimeBlock[] }

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SLOT_MINUTES = 15
const DEFAULT_START = '09:00'
const DEFAULT_END = '17:00'

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function mondayOf(d: Date) {
  const copy = new Date(d)
  const day = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - day)
  return copy
}
function addDays(d: Date, n: number) {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}
function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
function fromMinutes(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** The clinic operates on Europe/London wall-clock time regardless of the viewer's own timezone. */
const CLINIC_ZONE = 'Europe/London'
function londonOffsetMinutes(utcMs: number) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: CLINIC_ZONE, timeZoneName: 'shortOffset' }).formatToParts(new Date(utcMs))
  const raw = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+0'
  const match = raw.match(/GMT([+-]\d+)(?::(\d+))?/)
  if (!match) return 0
  const sign = match[1].startsWith('-') ? -1 : 1
  const hours = Math.abs(parseInt(match[1], 10))
  const mins = match[2] ? parseInt(match[2], 10) : 0
  return sign * (hours * 60 + mins)
}
/** Absolute ms for a given clinic-local date key + minutes-from-midnight (Europe/London wall clock). */
function londonInstantMs(dateKeyStr: string, minutesFromMidnight: number) {
  const [y, mo, d] = dateKeyStr.split('-').map(Number)
  const guessUtc = Date.UTC(y, mo - 1, d, Math.floor(minutesFromMidnight / 60), minutesFromMidnight % 60)
  const offset = londonOffsetMinutes(guessUtc)
  return guessUtc - offset * 60000
}

/** Windows (in minutes-from-midnight) this doctor is configured to work on a given date. */
function dayWindows(key: string, weekday: number, availability: Availability[]): Array<[number, number]> {
  const configured = availability.filter(a => key >= a.startDate && key <= a.endDate)
  if (configured.length === 0) {
    return [[toMinutes(DEFAULT_START), toMinutes(DEFAULT_END)]]
  }
  return configured
    .filter(a => a.activeDays.includes(weekday))
    .map(a => [toMinutes(a.startTime.slice(0, 5)), toMinutes(a.endTime.slice(0, 5))])
}

function isBlocked(dateKeyForDay: string, slotStartMin: number, slotEndMin: number, blocks: TimeBlock[]) {
  const slotStart = londonInstantMs(dateKeyForDay, slotStartMin)
  const slotEnd = londonInstantMs(dateKeyForDay, slotEndMin)
  return blocks.some(b => new Date(b.startTime).getTime() < slotEnd && new Date(b.endTime).getTime() > slotStart)
}

function bookedAppointment(dateKeyForDay: string, slotStartMin: number, slotEndMin: number, items: Appointment[]) {
  const slotStart = londonInstantMs(dateKeyForDay, slotStartMin)
  const slotEnd = londonInstantMs(dateKeyForDay, slotEndMin)
  return items.find(a => a.status !== 'CANCELLED' && new Date(a.startTime).getTime() < slotEnd && new Date(a.endTime).getTime() > slotStart)
}

type SlotState = { startMin: number; endMin: number; state: 'available' | 'booked' | 'blocked'; appointment?: Appointment }

function computeDaySlots(key: string, weekday: number, availability: Availability[], blocks: TimeBlock[], items: Appointment[]): SlotState[] {
  const windows = dayWindows(key, weekday, availability)
  // Overlapping/duplicate availability rules can yield overlapping windows; de-dupe by slot start.
  const slotsByStart = new Map<number, SlotState>()
  for (const [winStart, winEnd] of windows) {
    for (let m = winStart; m + SLOT_MINUTES <= winEnd; m += SLOT_MINUTES) {
      if (slotsByStart.has(m)) continue
      const startMin = m
      const endMin = m + SLOT_MINUTES
      const appt = bookedAppointment(key, startMin, endMin, items)
      const state: SlotState['state'] = appt ? 'booked' : isBlocked(key, startMin, endMin, blocks) ? 'blocked' : 'available'
      slotsByStart.set(m, { startMin, endMin, state, appointment: appt })
    }
  }
  return Array.from(slotsByStart.values()).sort((a, b) => a.startMin - b.startMin)
}

export default function DoctorCalendar() {
  const [view, setView] = useState<'day' | 'week' | 'month'>('day')
  const [items, setItems] = useState<Appointment[]>([])
  const [schedule, setSchedule] = useState<Schedule>({ availability: [], blocks: [] })
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => clinicDateKey())
  const [month, setMonth] = useState(() => {
    const [y, m] = clinicDateKey().split('-').map(Number)
    return new Date(y, m - 1, 1)
  })
  const [selected, setSelected] = useState<Appointment | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([
      authFetch(`${API_BASE_URL}/doctor/appointments`, { cache: 'no-store' }).then(r => r.ok ? r.json() : []),
      authFetch(`${API_BASE_URL}/doctor/schedule`, { cache: 'no-store' }).then(r => r.ok ? r.json() : { availability: [], blocks: [] }),
    ]).then(([a, s]) => {
      if (!alive) return
      setItems(Array.isArray(a) ? a : [])
      setSchedule(s || { availability: [], blocks: [] })
    }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const todayKey = clinicDateKey()
  const selectedDateObj = useMemo(() => new Date(`${selectedDate}T00:00:00`), [selectedDate])
  const selectedWeekday = ((selectedDateObj.getDay() + 6) % 7) + 1
  const weekStart = mondayOf(selectedDateObj)
  const weekDays = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const daySlots = useMemo(
    () => computeDaySlots(selectedDate, selectedWeekday, schedule.availability, schedule.blocks, items),
    [selectedDate, selectedWeekday, schedule],
  )
  const morningSlots = daySlots.filter(s => s.startMin < 12 * 60)
  const afternoonSlots = daySlots.filter(s => s.startMin >= 12 * 60)
  const availableCount = daySlots.filter(s => s.state === 'available').length
  const bookedCount = daySlots.filter(s => s.state === 'booked').length

  function slotLabel(mins: number) {
    return fromMinutes(mins)
  }

  function openDay(key: string) {
    setSelectedDate(key)
    setView('day')
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">My Calendar</div>
          <div className="page-sub">
            {view === 'day' ? clinicDateTime(selectedDateObj).split(',')[0] + ', ' + selectedDateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
              : view === 'week' ? `Week of ${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
              : month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div className="page-head-actions">
          <button type="button" className={view === 'day' ? 'bp' : 'bs'} onClick={() => setView('day')}>Day</button>
          <button type="button" className={view === 'week' ? 'bp' : 'bs'} onClick={() => setView('week')}>Week</button>
          <button type="button" className={view === 'month' ? 'bp' : 'bs'} onClick={() => setView('month')}>Month</button>
        </div>
      </div>

      {loading ? <div className="card">Loading calendar…</div> : (
        <>
          {view === 'day' && (
            <div className="card">
              <div className="day-picker">
                {weekDays.map(d => {
                  const key = dateKey(d)
                  const isLeave = dayWindows(key, ((d.getDay() + 6) % 7) + 1, schedule.availability).length === 0
                  return (
                    <button key={key} type="button" className={`day-pill${key === selectedDate ? ' on' : ''}${isLeave ? ' warn' : ''}`} onClick={() => setSelectedDate(key)}>
                      {d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </button>
                  )
                })}
              </div>
              <div className="legend" style={{ marginBottom: 12 }}>
                <span><b style={{ background: 'var(--bg-success)' }} />{availableCount} available</span>
                <span><b style={{ background: 'var(--bg-accent)' }} />{bookedCount} booked</span>
              </div>
              {daySlots.length === 0 ? (
                <div className="fi-hint">No working hours configured for this day.</div>
              ) : (
                <>
                  {morningSlots.length > 0 && <div className="session-label">Morning</div>}
                  {morningSlots.map(s => (
                    <SlotRow key={s.startMin} slot={s} onOpen={() => s.appointment && setSelected(s.appointment)} />
                  ))}
                  {afternoonSlots.length > 0 && <div className="session-label">Afternoon</div>}
                  {afternoonSlots.map(s => (
                    <SlotRow key={s.startMin} slot={s} onOpen={() => s.appointment && setSelected(s.appointment)} />
                  ))}
                </>
              )}
            </div>
          )}

          {view === 'week' && (
            <WeekGrid weekDays={weekDays} schedule={schedule} items={items} todayKey={todayKey} onOpenDay={openDay} />
          )}

          {view === 'month' && (
            <MonthGrid month={month} setMonth={setMonth} schedule={schedule} items={items} todayKey={todayKey} selectedDate={selectedDate} onSelect={openDay} />
          )}

          {selected && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div className="ct" style={{ marginBottom: 0 }}>Appointment Details</div>
                <button type="button" className="bs" onClick={() => setSelected(null)}>Close</button>
              </div>
              <div className="dr"><div className="dk">Patient</div><div className="dv">{selected.patientName}</div></div>
              <div className="dr"><div className="dk">Date/time</div><div className="dv">{clinicDateTime(selected.startTime)} – {clinicTime(selected.endTime)}</div></div>
              <div className="dr"><div className="dk">Status</div><div className="dv"><span className="tag tinfo">{selected.status}</span></div></div>
              <div className="dr"><div className="dk">Consultation</div><div className="dv"><Link to={`/doctor/consultations/${selected.consultationId}`}>#{selected.consultationId}</Link></div></div>
              <div className="dr"><div className="dk">Reason</div><div className="dv">{selected.reason || '—'}</div></div>
              <div className="dr"><div className="dk">Contact</div><div className="dv">{[selected.contactPhone, selected.patientEmail, selected.contactAddress].filter(Boolean).join(' · ') || '—'}</div></div>
            </div>
          )}
        </>
      )}
    </>
  )
}

function SlotRow({ slot, onOpen }: { slot: SlotState; onOpen: () => void }) {
  const label = `${fromMinutes(slot.startMin)} – ${fromMinutes(slot.endMin)}`
  return (
    <div className="ar" onClick={slot.state === 'booked' ? onOpen : undefined} style={{ cursor: slot.state === 'booked' ? 'pointer' : 'default' }}>
      <span className="at">{label}</span>
      <span className="ap">{slot.state === 'booked' ? slot.appointment?.patientName || 'Patient' : slot.state === 'blocked' ? 'Blocked' : ''}</span>
      <span className={`tag ${slot.state === 'booked' ? 'tinfo' : slot.state === 'blocked' ? 'tmute' : 'tok'}`}>
        {slot.state === 'booked' ? 'Booked' : slot.state === 'blocked' ? 'Blocked' : 'Available'}
      </span>
    </div>
  )
}

function WeekGrid({ weekDays, schedule, items, todayKey, onOpenDay }: {
  weekDays: Date[]; schedule: Schedule; items: Appointment[]; todayKey: string; onOpenDay: (key: string) => void
}) {
  const rangeMinutes = useMemo(() => {
    let min = toMinutes(DEFAULT_START)
    let max = toMinutes(DEFAULT_END)
    weekDays.forEach((d, i) => {
      dayWindows(dateKey(d), i + 1, schedule.availability).forEach(([s, e]) => {
        min = Math.min(min, s)
        max = Math.max(max, e)
      })
    })
    return { min, max }
  }, [weekDays, schedule.availability])

  const rows = useMemo(() => {
    const out: number[] = []
    for (let m = rangeMinutes.min; m < rangeMinutes.max; m += SLOT_MINUTES) out.push(m)
    return out
  }, [rangeMinutes])

  const perDaySlots = useMemo(
    () => weekDays.map((d, i) => computeDaySlots(dateKey(d), i + 1, schedule.availability, schedule.blocks, items)),
    [weekDays, schedule, items],
  )

  return (
    <div className="card">
      <div className="cal-wrap">
        <div className="cal-head">
          <div className="ch-time" />
          {weekDays.map(d => (
            <div key={dateKey(d)} className={`ch${dateKey(d) === todayKey ? ' tod' : ''}`} onClick={() => onOpenDay(dateKey(d))}>
              {d.toLocaleDateString('en-GB', { weekday: 'short' })} {d.getDate()}
            </div>
          ))}
        </div>
        <div className="cal-body">
          {rows.map(rowMin => (
            <React.Fragment key={rowMin}>
              <div className="ct2">{rowMin % 60 === 0 ? fromMinutes(rowMin) : ''}</div>
              {weekDays.map((d, i) => {
                const slot = perDaySlots[i].find(s => s.startMin === rowMin)
                const cls = !slot ? 'em' : slot.state === 'booked' ? 'bk' : slot.state === 'blocked' ? 'co' : 'av'
                return (
                  <div
                    key={dateKey(d) + rowMin}
                    className={`cs ${cls}`}
                    title={slot?.appointment?.patientName}
                  >
                    {slot?.state === 'booked' ? (slot.appointment?.patientName || '').split(' ').pop() : ''}
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="legend">
        <span><b style={{ background: 'var(--bg-success)' }} />Available</span>
        <span><b style={{ background: 'var(--bg-accent)' }} />Booked</span>
        <span><b style={{ background: 'var(--bg-danger)' }} />Blocked</span>
      </div>
    </div>
  )
}

function MonthGrid({ month, setMonth, schedule, items, todayKey, selectedDate, onSelect }: {
  month: Date; setMonth: (d: Date) => void; schedule: Schedule; items: Appointment[]; todayKey: string; selectedDate: string; onSelect: (key: string) => void
}) {
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const start = mondayOf(first)
    return Array.from({ length: 42 }, (_, i) => addDays(start, i))
  }, [month])

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button type="button" className="date-nav-btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
        <strong style={{ fontSize: 14 }}>{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</strong>
        <button type="button" className="date-nav-btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
      </div>
      <div className="mini-cal">
        {DAY_NAMES.map(d => <div key={d} className="mch">{d}</div>)}
        {days.map(d => {
          const key = dateKey(d)
          const weekday = ((d.getDay() + 6) % 7) + 1
          const windows = dayWindows(key, weekday, schedule.availability)
          const isOtherMonth = d.getMonth() !== month.getMonth()
          const bookedCount = items.filter(a => a.status !== 'CANCELLED' && clinicDateKey(a.startTime) === key).length
          const fullyBlocked = windows.length > 0 && windows.every(([s, e]) => isBlocked(key, s, e, schedule.blocks))
          return (
            <div
              key={key}
              className={`mcc${key === selectedDate ? ' sel' : ''}${fullyBlocked ? ' warn' : bookedCount > 0 ? ' range' : ''}${isOtherMonth ? '' : ''}`}
              style={isOtherMonth ? { opacity: 0.4 } : undefined}
              onClick={() => onSelect(key)}
            >
              <span>{d.getDate()}</span>
              <span className="mcc-sub">{fullyBlocked ? 'Leave' : bookedCount > 0 ? `${bookedCount} booked` : ''}</span>
            </div>
          )
        })}
      </div>
      <div className="legend">
        <span><b style={{ background: 'var(--bg-accent)' }} />Has bookings</span>
        <span><b style={{ background: 'var(--bg-danger)' }} />On leave</span>
      </div>
    </div>
  )
}
