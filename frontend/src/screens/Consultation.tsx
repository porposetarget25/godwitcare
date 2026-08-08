// src/screens/Consultation.tsx — active consultation detail (4-5 step journey)
import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authFetch, API_BASE_URL, resolveApiUrl, openAuthenticatedFile } from '../api'
import { clinicDateTime, clinicTime } from '../lib/appointmentTime'
import { usePatient } from '../state/patient'
import Modal from '../components/portal/Modal'

type Slot = { startTime: string; endTime: string; label: string; available: boolean }
type AvailabilityDay = { date: string; slots: Slot[] }
type AvailabilityResponse = { days?: AvailabilityDay[]; timeZone?: string }
type Appointment = { id: number; consultationId: number; consultationPatientId?: string; status?: string; startTime: string; endTime: string }

function dayShort(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00`)
  return { dow: d.toLocaleDateString('en-GB', { weekday: 'short' }), dnum: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
}

function AppointmentBooking({ consultationId, consultationActive, patientId, onBookingChange }: { consultationId: number; consultationActive: boolean; patientId: string; onBookingChange?: (appointment: Appointment | null) => void }) {
  const [days, setDays] = useState<AvailabilityDay[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bookedAppointment, setBookedAppointment] = useState<Appointment | null>(null)
  const [historicalAppointment, setHistoricalAppointment] = useState<Appointment | null>(null)
  const [rescheduling, setRescheduling] = useState(false)
  const [changing, setChanging] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [confirmedBooking, setConfirmedBooking] = useState<{ startTime: string; endTime: string } | null>(null)

  const matchesThisConsultation = React.useCallback((item: unknown): item is Appointment => {
    const appointment = item as Partial<Appointment>
    return appointment.consultationId === consultationId && appointment.consultationPatientId === patientId
  }, [consultationId, patientId])

  const loadBookedAppointment = React.useCallback(async (signal?: AbortSignal) => {
    const res = await authFetch(`${API_BASE_URL}/appointments/mine`, { cache: 'no-store', signal })
    const items: unknown[] = res.ok ? await res.json().catch(() => []) : []
    const mine = (Array.isArray(items) ? items : []).filter(matchesThisConsultation) as Appointment[]
    const next = mine.find(a => a.status === 'SCHEDULED') ?? null
    setBookedAppointment(next)
    setHistoricalAppointment(mine.sort((a, b) => b.id - a.id)[0] ?? null)
    onBookingChange?.(next)
    return next
  }, [matchesThisConsultation, onBookingChange])

  useEffect(() => {
    const controller = new AbortController()
    loadBookedAppointment(controller.signal).catch(() => undefined)
    return () => controller.abort()
  }, [loadBookedAppointment])

  const loadAvailability = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch(`${API_BASE_URL}/appointments/availability`, { cache: 'no-store' })
      const data = await res.json().catch(() => null) as AvailabilityResponse | null
      if (!res.ok) throw new Error((data as any)?.message || 'Unable to load appointment slots.')
      const nextDays = Array.isArray(data?.days) ? data.days : []
      setDays(nextDays)
      // Default to the first day that actually still has slots left (e.g. today
      // may already be past its 2-hour booking cutoff) instead of always today.
      const firstWithSlots = nextDays.find(d => d.slots.some(s => s.available))
      setSelectedDate((firstWithSlots ?? nextDays[0])?.date ?? '')
      setSelectedSlot('')
    } catch (e: any) {
      setError(e?.message || 'Unable to load appointment slots.')
      setDays([])
      setSelectedDate('')
      setSelectedSlot('')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (consultationActive) loadAvailability() }, [loadAvailability, consultationActive])

  const selectedDay = useMemo(() => days.find(d => d.date === selectedDate) ?? null, [days, selectedDate])
  // `label` is already the clinic-local (Europe/London) time (e.g. "09:00"); deriving the hour from
  // `startTime` via Date.getHours() used the *browser's* local timezone instead and misfiled slots
  // between Morning/Afternoon whenever the viewer wasn't in the UK.
  const morningSlots = useMemo(() => selectedDay?.slots.filter(s => Number(s.label.split(':')[0]) < 12) ?? [], [selectedDay])
  const afternoonSlots = useMemo(() => selectedDay?.slots.filter(s => Number(s.label.split(':')[0]) >= 12) ?? [], [selectedDay])

  async function confirmBooking() {
    if (!selectedSlot) return
    setBooking(true)
    setError(null)
    setMessage(null)
    try {
      const res = await authFetch(rescheduling ? `${API_BASE_URL}/appointments/${bookedAppointment!.id}/reschedule` : `${API_BASE_URL}/appointments`, {
        method: rescheduling ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId, startTime: selectedSlot, patientId }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.message || 'Unable to book that slot.')
      const confirmed = await loadBookedAppointment().catch(() => data as Appointment)
      setBookedAppointment(confirmed)
      onBookingChange?.(confirmed)
      setRescheduling(false)
      setSelectedSlot('')
      setConfirmedBooking({ startTime: data.startTime, endTime: data.endTime })
      await loadAvailability()
    } catch (e: any) {
      setError(e?.message || 'Unable to book that slot.')
    } finally {
      setBooking(false)
    }
  }

  async function cancelAppointment() {
    if (!bookedAppointment) return
    setChanging(true)
    setError(null)
    try {
      const res = await authFetch(`${API_BASE_URL}/appointments/${bookedAppointment.id}/cancel`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.message || 'Unable to cancel this appointment.')
      setBookedAppointment(null)
      onBookingChange?.(null)
      setRescheduling(false)
      setShowCancelModal(false)
      setMessage('Appointment cancelled. The reserved slot is available again.')
      await loadAvailability()
    } catch (e: any) {
      setError(e?.message || 'Unable to cancel this appointment.')
    } finally {
      setChanging(false)
    }
  }

  const canChangeAppointment = !!bookedAppointment && bookedAppointment.status === 'SCHEDULED'
    && consultationActive && new Date(bookedAppointment.startTime).getTime() > Date.now()
  const showBookingFlow = consultationActive && (!bookedAppointment || rescheduling)

  const historicalStatusLabel = (status?: string) => {
    switch (status) {
      case 'COMPLETED': return 'Completed'
      case 'CANCELLED': return 'Cancelled'
      case 'NO_SHOW': return 'No-show'
      case 'SCHEDULED': return 'Scheduled'
      default: return status || 'Recorded'
    }
  }

  return (
    <>
      {bookedAppointment && !rescheduling ? (
        <div className="notice n-info">
          <i className="ti ti-circle-check" aria-hidden="true" />
          <div>
            <strong>Upcoming Appointment</strong>
            <div>{clinicDateTime(bookedAppointment.startTime)} – {clinicTime(bookedAppointment.endTime)}</div>
            <div className="fi-hint">We&apos;ll remind you over WhatsApp before your appointment.</div>
          </div>
        </div>
      ) : null}

      {bookedAppointment && !rescheduling && canChangeAppointment && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button type="button" className="bs" onClick={() => { setRescheduling(true); setMessage(null); void loadAvailability() }} disabled={changing}>
            <i className="ti ti-refresh" aria-hidden="true" /> Reschedule
          </button>
          <button type="button" className="bd" onClick={() => setShowCancelModal(true)} disabled={changing}>
            <i className="ti ti-x" aria-hidden="true" /> Cancel Appointment
          </button>
        </div>
      )}

      {rescheduling && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <strong style={{ fontSize: 13 }}>Choose a replacement appointment</strong>
          <button type="button" className="bs" onClick={() => { setRescheduling(false); setSelectedSlot('') }}>Keep Original</button>
        </div>
      )}

      {showBookingFlow && (
        <>
          {loading && <div className="fi-hint">Loading available slots…</div>}
          {error && <div className="notice n-warn"><i className="ti ti-alert-triangle" aria-hidden="true" />{error}</div>}
          {message && <div className="notice n-info"><i className="ti ti-circle-check" aria-hidden="true" />{message}</div>}

          <div className="fi-hint" style={{ marginBottom: 8 }}>Choose a future appointment slot. You&apos;ll be connected with the next available doctor — you don&apos;t need to pick one.</div>

          <div className="date-strip">
            {days.map(day => {
              const { dow, dnum } = dayShort(day.date)
              const availableCount = day.slots.filter(s => s.available).length
              return (
                <div
                  key={day.date}
                  className={`date-pill${availableCount > 0 ? ' has-slots' : ''}${selectedDate === day.date ? ' on' : ''}`}
                  onClick={() => { setSelectedDate(day.date); setSelectedSlot('') }}
                >
                  <span className="dow">{dow}</span>
                  <span className="dnum">{dnum}</span>
                  <div className="avail-row">
                    <span className="avail-dot" />
                    <span className="avail-count">{availableCount > 0 ? `${availableCount} slots` : 'Full'}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {selectedDay && selectedDay.slots.length === 0 && (
            <div className="notice n-warn"><i className="ti ti-calendar-off" aria-hidden="true" />No doctors are available on this date.</div>
          )}

          {selectedDay && selectedDay.slots.length > 0 && (
            <>
              {morningSlots.length > 0 && (
                <>
                  <div className="session-label">Morning</div>
                  <div className="slot-grid">
                    {morningSlots.map(slot => (
                      <button
                        key={slot.startTime}
                        type="button"
                        disabled={!slot.available}
                        className={`slot-chip${!slot.available ? ' unavailable' : ''}${selectedSlot === slot.startTime ? ' on' : ''}`}
                        onClick={() => setSelectedSlot(slot.startTime)}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {afternoonSlots.length > 0 && (
                <>
                  <div className="session-label">Afternoon</div>
                  <div className="slot-grid">
                    {afternoonSlots.map(slot => (
                      <button
                        key={slot.startTime}
                        type="button"
                        disabled={!slot.available}
                        className={`slot-chip${!slot.available ? ' unavailable' : ''}${selectedSlot === slot.startTime ? ' on' : ''}`}
                        onClick={() => setSelectedSlot(slot.startTime)}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="fi-hint" style={{ marginTop: 10 }}>
                <span className="legend-dot" />Available &nbsp; <span className="legend-dot unavailable" />No slots
              </div>
            </>
          )}

          <button
            type="button"
            className="bp btn-block"
            style={{ marginTop: 14 }}
            disabled={!selectedSlot || booking || !consultationActive}
            onClick={confirmBooking}
          >
            {!consultationActive ? 'Consultation expired' : booking ? (rescheduling ? 'Rescheduling…' : 'Booking…') : rescheduling ? 'Confirm Reschedule' : 'Confirm Appointment'}
          </button>
        </>
      )}

      {!consultationActive && !bookedAppointment && (
        historicalAppointment ? (
          <div className={`notice ${historicalAppointment.status === 'CANCELLED' || historicalAppointment.status === 'NO_SHOW' ? 'n-warn' : 'n-info'}`}>
            <i className={`ti ${historicalAppointment.status === 'CANCELLED' || historicalAppointment.status === 'NO_SHOW' ? 'ti-alert-triangle' : 'ti-circle-check'}`} aria-hidden="true" />
            <div>
              <strong>Appointment {historicalStatusLabel(historicalAppointment.status)}</strong>
              <div>{clinicDateTime(historicalAppointment.startTime)} – {clinicTime(historicalAppointment.endTime)}</div>
            </div>
          </div>
        ) : (
          <div className="fi-hint">No appointment was booked for this consultation.</div>
        )
      )}

      {showCancelModal && bookedAppointment && (
        <Modal
          title="Cancel Appointment"
          onClose={() => setShowCancelModal(false)}
          footer={(
            <>
              <button type="button" className="bs" onClick={() => setShowCancelModal(false)}>Keep Appointment</button>
              <button type="button" className="bd" onClick={cancelAppointment} disabled={changing}>{changing ? 'Cancelling…' : 'Cancel Appointment'}</button>
            </>
          )}
        >
          <p style={{ fontSize: 13 }}>
            Are you sure you want to cancel your appointment on <strong>{clinicDateTime(bookedAppointment.startTime)}</strong>? This slot will be released back to other patients.
          </p>
        </Modal>
      )}

      {confirmedBooking && (
        <Modal
          title="Appointment Confirmed"
          onClose={() => setConfirmedBooking(null)}
          footer={<button type="button" className="bp" onClick={() => setConfirmedBooking(null)}>Done</button>}
        >
          <p style={{ fontSize: 13 }}>
            <i className="ti ti-circle-check" aria-hidden="true" style={{ color: 'var(--text-success)', marginRight: 6 }} />
            Your appointment is booked for <strong>{clinicDateTime(confirmedBooking.startTime)} – {clinicTime(confirmedBooking.endTime)}</strong>. We&apos;ll remind you over WhatsApp before your appointment.
          </p>
        </Modal>
      )}
    </>
  )
}

export default function Consultation() {
  const { activePatient, loading: patientContextLoading, queryString: travelerQuery } = usePatient()
  const [searchParams] = useSearchParams()
  const viewCid = searchParams.get('cid')
  const travelerId = activePatient?.id === 'PRIMARY' ? null : activePatient?.id || null
  const patientId = activePatient?.patientId || null

  const [latestCid, setLatestCid] = useState<number | null>(null)
  const [latestStatus, setLatestStatus] = useState<'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | null>(null)
  const [latestActive, setLatestActive] = useState(false)
  const [completedAt, setCompletedAt] = useState<string | null>(null)
  const [loadingConsultation, setLoadingConsultation] = useState(true)
  const [appointmentBooked, setAppointmentBooked] = useState(false)

  const [summary, setSummary] = useState<{
    presentingComplaint?: string
    diagnosis?: string
    recommendations?: string
    medicines?: string
  } | null>(null)

  const [rxUrl, setRxUrl] = useState<string | null>(null)
  const [findingPharmacy, setFindingPharmacy] = useState(false)
  const [openingRx, setOpeningRx] = useState(false)
  const [rxErr, setRxErr] = useState<string | null>(null)

  async function openPrescription() {
    if (!rxUrl) return
    setOpeningRx(true)
    setRxErr(null)
    try {
      await openAuthenticatedFile(rxUrl)
    } catch (e: any) {
      setRxErr(e?.message || 'Unable to open the PDF.')
    } finally {
      setOpeningRx(false)
    }
  }

  useEffect(() => {
    if (patientContextLoading || !activePatient) return
    let alive = true
    setLoadingConsultation(true)
    ;(async () => {
      try {
        const qp = new URLSearchParams()
        if (travelerId) qp.set('travelerId', travelerId)
        if (patientId) qp.set('patientId', patientId)
        if (viewCid) qp.set('cid', viewCid)
        const res = await authFetch(`${API_BASE_URL}/consultations/mine/latest?${qp.toString()}`, { cache: 'no-store' })
        if (!alive) return
        if (res.status === 204 || !res.ok) {
          setLatestCid(null)
          setLatestStatus(null)
          setLatestActive(false)
          setCompletedAt(null)
          return
        }
        const j = await res.json()
        setLatestCid(typeof j?.id === 'number' ? j.id : null)
        setLatestStatus(typeof j?.status === 'string' ? j.status : null)
        setLatestActive(j?.active === true)
        setCompletedAt(typeof j?.completedAt === 'string' ? j.completedAt : null)
      } finally {
        if (alive) setLoadingConsultation(false)
      }
    })()
    return () => { alive = false }
  }, [activePatient, patientContextLoading, patientId, travelerId, viewCid])

  useEffect(() => {
    if (patientContextLoading || !activePatient) return
    let ignore = false
    ;(async () => {
      try {
        const qp = new URLSearchParams()
        if (travelerId) qp.set('travelerId', travelerId)
        if (patientId) qp.set('patientId', patientId)
        const res = await authFetch(`${API_BASE_URL}/prescriptions/latest?${qp.toString()}`, { cache: 'no-store' })
        if (ignore) return
        if (res.status === 204 || !res.ok) { setRxUrl(null); return }
        const j = await res.json().catch(() => null)
        // When viewing a specific (historical) consultation, only use the prescription if it's actually THIS one's.
        const matches = !viewCid || String(j?.consultationId) === viewCid
        setRxUrl(j?.pdfUrl && matches ? resolveApiUrl(API_BASE_URL, j.pdfUrl) : null)
      } catch {
        if (!ignore) setRxUrl(null)
      }
    })()
    return () => { ignore = true }
  }, [activePatient, patientContextLoading, patientId, travelerId, viewCid])

  useEffect(() => {
    if (patientContextLoading || !activePatient || latestStatus !== 'COMPLETED' || !latestCid) { setSummary(null); return }
    let ignore = false
    ;(async () => {
      try {
        const qp = new URLSearchParams()
        if (travelerId) qp.set('travelerId', travelerId)
        if (patientId) qp.set('patientId', patientId)
        const res = await authFetch(`${API_BASE_URL}/care-history/mine?${qp.toString()}`, { cache: 'no-store' })
        if (ignore) return
        if (res.status === 204 || !res.ok) { setSummary(null); return }
        const j = await res.json().catch(() => null)
        const items: any[] = Array.isArray(j?.items) ? j.items : []
        const match = items.find(it => it.consultationId === latestCid)
        setSummary(match ? {
          presentingComplaint: match.presentingComplaint,
          diagnosis: match.diagnosis,
          recommendations: match.recommendations,
          medicines: match.medicines,
        } : null)
      } catch {
        if (!ignore) setSummary(null)
      }
    })()
    return () => { ignore = true }
  }, [activePatient, patientContextLoading, patientId, travelerId, latestStatus, latestCid])

  function openNearbyPharmacies() {
    setFindingPharmacy(true)
    const open = (url: string) => window.open(url, '_blank', 'noopener,noreferrer')
    const fallback = 'https://www.google.com/maps/search/pharmacy'
    if (!('geolocation' in navigator)) { open(fallback); setFindingPharmacy(false); return }
    navigator.geolocation.getCurrentPosition(
      pos => { open(`https://www.google.com/maps/search/pharmacy/@${pos.coords.latitude},${pos.coords.longitude},14z`); setFindingPharmacy(false) },
      () => { open(fallback); setFindingPharmacy(false) },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    )
  }

  const hasLatestConsultation = !!latestCid
  const isLatestCompleted = latestStatus === 'COMPLETED'
  const canViewPrescription = isLatestCompleted && !!rxUrl
  // Never got an appointment booked before the 48h consultation window closed.
  const isExpiredPending = hasLatestConsultation && !latestActive && !isLatestCompleted && !appointmentBooked

  const backHref = viewCid
    ? (travelerQuery ? `/consultation/tracker?${travelerQuery}` : '/consultation/tracker')
    : (travelerQuery ? `/home?${travelerQuery}` : '/home')

  if (patientContextLoading || loadingConsultation) {
    return <div className="card">Loading consultation…</div>
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">{activePatient?.name ? `${activePatient.name}'s Consultation` : 'Your Consultation'}</div>
          <div className="page-sub">
            {isLatestCompleted ? 'A summary of this completed consultation.'
              : isExpiredPending ? 'This consultation has expired.'
              : 'Follow these steps to complete your consultation.'}
          </div>
        </div>
        <Link to={backHref} className="bs">‹ {viewCid ? 'Consultations' : 'Home'}</Link>
      </div>

      {!hasLatestConsultation ? (
        <div className="card">
          <div className="ct">No active consultation</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Start a new consultation from the Home screen to begin the pre-consultation checklist.</p>
          <Link to="/home" className="bp">Go to Home</Link>
        </div>
      ) : (
        <>
          {isExpiredPending && (
            <div className="notice n-warn">
              <i className="ti ti-alert-triangle" aria-hidden="true" />No appointment was booked within the consultation window, so it has expired. Start a new consultation from Home to continue.
            </div>
          )}

          {isLatestCompleted ? (
            /* Completed consultations collapse to a single summary card — booking is no longer relevant. */
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
                <div className="ct" style={{ marginBottom: 0 }}>Consultation #{latestCid}</div>
                <span className="tag tmute">Completed</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                {completedAt ? `Completed on ${clinicDateTime(completedAt)}.` : 'This consultation is complete.'} View your checklist, prescription, and find a pharmacy below.
              </p>

              {summary && (summary.presentingComplaint || summary.diagnosis || summary.medicines || summary.recommendations) && (
                <div style={{ marginBottom: 12 }}>
                  {summary.presentingComplaint && <div className="dr"><div className="dk">Presenting Complaint</div><div className="dv">{summary.presentingComplaint}</div></div>}
                  {summary.diagnosis && <div className="dr"><div className="dk">Diagnosis</div><div className="dv">{summary.diagnosis}</div></div>}
                  {summary.medicines && <div className="dr"><div className="dk">Medicines</div><div className="dv">{summary.medicines.split(/\r?\n/).filter(Boolean).join(', ')}</div></div>}
                  {summary.recommendations && <div className="dr"><div className="dk">Recommendations</div><div className="dv">{summary.recommendations}</div></div>}
                </div>
              )}

              {rxErr && <div className="notice n-warn" style={{ marginBottom: 12 }}><i className="ti ti-alert-triangle" aria-hidden="true" />{rxErr}</div>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link to={`/consultation/questionnaire?cid=${latestCid}${travelerQuery ? `&${travelerQuery}` : ''}&locked=1`} className="bs">
                  View Checklist
                </Link>
                {canViewPrescription ? (
                  <button type="button" className="bp" onClick={openPrescription} disabled={openingRx}>
                    {openingRx ? 'Opening…' : 'View Prescription'}
                  </button>
                ) : (
                  <button type="button" className="bs" disabled>No Prescription</button>
                )}
                <button type="button" className="bp" onClick={openNearbyPharmacies} disabled={findingPharmacy}>
                  {findingPharmacy ? 'Finding…' : 'Find Nearby Pharmacies'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Checklist */}
              <div className="card">
                <div style={{ display: 'flex', gap: 12 }}>
                  <div className="mini-step done"><i className="ti ti-check" aria-hidden="true" /></div>
                  <div style={{ flex: 1 }}>
                    <div className="ct">Pre-Consultation Checklist</div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
                      Health questionnaire and consent forms completed before your session.
                    </p>
                    <Link to={`/consultation/questionnaire?cid=${latestCid}${travelerQuery ? `&${travelerQuery}` : ''}${(appointmentBooked || isExpiredPending) ? '&locked=1' : ''}`} className="bs">
                      {appointmentBooked || isExpiredPending ? 'View Checklist' : 'Edit Checklist'}
                    </Link>
                    {appointmentBooked && (
                      <div className="fi-hint" style={{ marginTop: 6 }}>Locked while your appointment is booked — cancel it to make changes.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 2: Book an Appointment */}
              <div className="card">
                <div style={{ display: 'flex', gap: 12 }}>
                  <div className={`mini-step${appointmentBooked ? ' done' : ''}`}>{appointmentBooked ? <i className="ti ti-check" aria-hidden="true" /> : 2}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ct">Book an Appointment</div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
                      Choose a future 10-minute appointment slot with an available doctor.
                    </p>
                    {latestCid ? (
                      <AppointmentBooking consultationId={latestCid} consultationActive={latestActive} patientId={patientId || ''} onBookingChange={appt => setAppointmentBooked(!!appt)} />
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Step 3: Prescription */}
              <div className="card">
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div className="mini-step">3</div>
                  <div style={{ flex: 1 }}>
                    <div className="ct">Prescription Issued</div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
                      Your digital prescription with dosage instructions and medication details.
                    </p>
                    <button type="button" className="bs" disabled>Upcoming</button>
                  </div>
                </div>
              </div>

              {/* Step 4: Pharmacy */}
              <div className="card">
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div className="mini-step">4</div>
                  <div style={{ flex: 1 }}>
                    <div className="ct">Locate Pharmacy</div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
                      Find the nearest pharmacy to pick up your prescribed medication.
                    </p>
                    <button type="button" className="bs" disabled>Upcoming</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}
