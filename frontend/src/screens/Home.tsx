// src/screens/Home.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePatient, type PatientContextOption } from '../state/patient'
import { authFetch, API_BASE_URL, getActivationPaymentSummary, type ActivationPaymentSummary } from '../api'
import { useAuth } from '../state/auth'
import Modal from '../components/portal/Modal'
import MiniStepTrail from '../components/portal/MiniStepTrail'
import { clinicDateTime12, clinicDateKey } from '../lib/appointmentTime'

type Traveler = { id?: number; fullName: string; dateOfBirth?: string }

type RegApi = {
  id: number
  travellingFrom?: string
  travellingTo?: string
  travelStartDate?: string
  travelEndDate?: string
  packageDays?: number
  travelers?: Traveler[]
  ['Travelling From']?: string
  ['Travelling To (UK & Europe)']?: string
  ['Travel Start Date']?: string
  ['Travel End Date']?: string
}

function normalizeReg(r: RegApi | null | undefined) {
  if (!r) return null
  const from = r['Travelling From'] ?? r.travellingFrom ?? ''
  const to = r['Travelling To (UK & Europe)'] ?? r.travellingTo ?? ''
  const start = r['Travel Start Date'] ?? r.travelStartDate ?? ''
  const end = r['Travel End Date'] ?? r.travelEndDate ?? ''
  return { id: r.id, from, to, start, end, packageDays: r.packageDays || 0 }
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase()
}

function queryForPatient(p: PatientContextOption) {
  const qp = new URLSearchParams()
  if (p.id !== 'PRIMARY') qp.set('travelerId', p.id)
  qp.set('patientId', p.patientId)
  return qp.toString()
}

const STAGE_LABELS = ['Checklist', 'Appointment Booked', 'Prescription', 'Pharmacy']

type ActiveConsultation = {
  patient: PatientContextOption
  consultationId: number
  stage: number
  detail: string
  expired: boolean
  appointment: { startTime: string; endTime: string } | null
}

function formatCountdown(startTimeIso: string, now: number): string {
  const diffMs = new Date(startTimeIso).getTime() - now
  if (diffMs <= 0) return 'Starting shortly'
  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (days > 0) return `in ${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `in ${hours}h ${minutes}m ${seconds}s`
  return `in ${minutes}m ${seconds}s`
}

export default function Home() {
  return <PatientHome />
}

function PatientHome() {
  const { user } = useAuth()
  const { patients, loading: patientsLoading } = usePatient()
  const navigate = useNavigate()
  const [reg, setReg] = useState<ReturnType<typeof normalizeReg> | null>(null)
  const [activation, setActivation] = useState<ActivationPaymentSummary | null>(null)
  const [active, setActive] = useState<ActiveConsultation[]>([])
  const [loadingActive, setLoadingActive] = useState(true)
  const [showNewConsultModal, setShowNewConsultModal] = useState(false)
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!user?.email) return
    let alive = true
    ;(async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/registrations?email=${encodeURIComponent(user.email)}`, {})
        let latest: RegApi | null = null
        if (res.status === 200) {
          const data = await res.json()
          if (Array.isArray(data)) latest = data.length ? data[data.length - 1] : null
          else if (data && typeof data === 'object') latest = data as RegApi
        }
        if (alive) setReg(normalizeReg(latest))
      } catch {
        if (alive) setReg(null)
      }
    })()
    return () => { alive = false }
  }, [user?.email])

  useEffect(() => {
    if (!user?.email) return
    let alive = true
    getActivationPaymentSummary().then(s => { if (alive) setActivation(s) }).catch(() => { if (alive) setActivation(null) })
    return () => { alive = false }
  }, [user?.email])

  useEffect(() => {
    if (patientsLoading) return
    if (patients.length === 0) { setActive([]); setLoadingActive(false); return }
    let alive = true
    setLoadingActive(true)
    ;(async () => {
      const appointmentsRes = await authFetch(`${API_BASE_URL}/appointments/mine`, { cache: 'no-store' }).catch(() => null)
      const appointments = appointmentsRes && appointmentsRes.ok ? await appointmentsRes.json().catch(() => []) : []
      const appointmentList: any[] = Array.isArray(appointments) ? appointments : []

      const results = await Promise.all(patients.map(async (p): Promise<ActiveConsultation | null> => {
        const qs = queryForPatient(p)
        const res = await authFetch(`${API_BASE_URL}/consultations/mine/latest?${qs}`, { cache: 'no-store' }).catch(() => null)
        if (!res || !res.ok || res.status === 204) return null
        const c = await res.json().catch(() => null)
        if (!c) return null
        // Consultations completed today should still surface here, not just while the 48h window is open.
        const completedToday = c.status === 'COMPLETED' && c.createdAt && clinicDateKey(c.createdAt) === clinicDateKey(new Date())

        const matchedAppointment = appointmentList.find(a => a.consultationId === c.id && a.consultationPatientId === p.patientId && a.status === 'SCHEDULED')
        const hasAppointment = !!matchedAppointment
        // Never got an appointment booked before the window closed — surface it as Expired instead of
        // silently disappearing, so the patient understands why it's gone rather than being left to wonder.
        const expiredPending = !c.active && !hasAppointment && c.status !== 'COMPLETED'
        if (!c.active && !completedToday && !expiredPending) return null

        let stage = hasAppointment ? 2 : 1

        if (hasAppointment) {
          const rxRes = await authFetch(`${API_BASE_URL}/prescriptions/latest?${qs}`, { cache: 'no-store' }).catch(() => null)
          if (rxRes && rxRes.ok && rxRes.status !== 204) {
            const j = await rxRes.json().catch(() => null)
            // Only count the prescription toward THIS consultation, not a stale one from a prior completed visit.
            if (j?.pdfUrl && j?.consultationId === c.id) stage = 3
          }
        }
        if (c.status === 'COMPLETED') stage = 4

        const detail = expiredPending ? 'Expired'
          : stage === 1 ? 'Checklist Pending'
          : stage === 2 ? 'Appointment Booked'
          : stage === 3 ? 'Prescription Ready'
          : 'Consultation Completed'

        return {
          patient: p,
          consultationId: c.id,
          stage,
          detail,
          expired: expiredPending,
          appointment: matchedAppointment ? { startTime: matchedAppointment.startTime, endTime: matchedAppointment.endTime } : null,
        }
      }))

      if (alive) setActive(results.filter((r): r is ActiveConsultation => !!r))
    })().finally(() => { if (alive) setLoadingActive(false) })
    return () => { alive = false }
  }, [patients, patientsLoading])

  function goToConsultation(patient: PatientContextOption, consultationId?: number) {
    const qp = new URLSearchParams(queryForPatient(patient))
    if (consultationId) qp.set('cid', String(consultationId))
    navigate(`/consultation?${qp.toString()}`)
  }

  function startNewConsultation(patient: PatientContextOption) {
    setShowNewConsultModal(false)
    navigate(`/consultation/questionnaire?${queryForPatient(patient)}`)
  }

  const today = useMemo(() => new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date()), [])
  const hero = active[0]
  const rest = active.slice(1)

  const todayKey = clinicDateKey(new Date())
  const isExpired = !!reg?.end && todayKey > reg.end
  const daysLeft = reg?.end ? Math.max(0, Math.ceil((new Date(`${reg.end}T23:59:59`).getTime() - now) / 86400000)) : null
  const packageDaysPurchased = activation?.packageDays || reg?.packageDays || 0

  return (
    <>
      <div className="page-title">Welcome back{user?.firstName ? `, ${user.firstName}` : ''}</div>
      <div className="page-sub">{today}{reg?.to ? ` · Currently travelling in ${reg.to}` : ''}</div>

      {loadingActive || patientsLoading ? (
        <div className="card">Loading your consultations…</div>
      ) : active.length === 0 ? (
        <div className="card" style={{ background: 'var(--bg-accent)', borderColor: 'var(--border-accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Need to speak to a doctor?</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Start a consultation and we&apos;ll guide you through a short checklist, then book you an appointment.
              </div>
            </div>
            <button
              type="button"
              className="bp"
              style={{ padding: '12px 22px', fontSize: 14 }}
              onClick={() => setShowNewConsultModal(true)}
              disabled={isExpired}
              title={isExpired ? 'Your coverage has expired — renew your package to start a new consultation.' : undefined}
            >
              <i className="ti ti-stethoscope" aria-hidden="true" /> I Need a Consultation
            </button>
          </div>
          {isExpired && (
            <div className="notice n-warn" style={{ marginTop: 12 }}>
              <i className="ti ti-alert-triangle" aria-hidden="true" />Your coverage has expired. Renew your package to start a new consultation.
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
            <div className="ct" style={{ marginBottom: 0 }}>Your Active Consultations</div>
            <button
              type="button"
              className="bp"
              style={{ boxShadow: '0 0 0 3px var(--bg-accent)' }}
              onClick={() => setShowNewConsultModal(true)}
              disabled={isExpired}
              title={isExpired ? 'Your coverage has expired — renew your package to start a new consultation.' : undefined}
            >
              <i className="ti ti-plus" aria-hidden="true" /> New Consultation
            </button>
          </div>
          {isExpired && (
            <div className="notice n-warn" style={{ marginBottom: 10 }}>
              <i className="ti ti-alert-triangle" aria-hidden="true" />Your coverage has expired. Renew your package to start a new consultation.
            </div>
          )}

          {hero && (
            <div className={`hero-consult-card${hero.expired ? '' : ' pulse'}`} onClick={() => goToConsultation(hero.patient, hero.consultationId)}>
              <div className="hero-consult-top">
                <span className="hero-eyebrow">{hero.patient.name}</span>
                <span className={`tag ${hero.expired ? 'twarn' : 'tinfo'}`}>{hero.expired ? 'Expired' : STAGE_LABELS[hero.stage - 1]}</span>
              </div>
              <div className="hero-consult-time urgent">
                <i className="ti ti-stethoscope" aria-hidden="true" />{hero.detail}
              </div>
              <div className="hero-consult-trail">
                <MiniStepTrail steps={STAGE_LABELS} activeStage={hero.stage} />
              </div>
              {hero.expired && (
                <div className="notice n-warn">
                  <i className="ti ti-alert-triangle" aria-hidden="true" />No appointment was booked within the consultation window, so it has expired. Start a new consultation to continue.
                </div>
              )}
              {hero.appointment && hero.stage === 2 && (
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ti ti-calendar" aria-hidden="true" /> {clinicDateTime12(hero.appointment.startTime)}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fill-accent)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <i className="ti ti-brand-whatsapp" aria-hidden="true" /> {formatCountdown(hero.appointment.startTime, now)}
                  </div>
                </div>
              )}
              <div className="hero-consult-patient">
                <div className="ava hero-ava">{initials(hero.patient.name)}</div>
                <div>
                  <div className="hero-patient-name">{hero.patient.name}</div>
                  <div className="hero-patient-sub">
                    {hero.expired ? 'This consultation window has closed'
                      : hero.stage === 1 ? 'Complete your pre-consultation checklist to proceed'
                      : hero.stage === 2 ? "We'll remind you over WhatsApp before your appointment"
                      : hero.stage === 3 ? 'Your prescription is ready to view'
                      : 'Connected with the next available doctor'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="bp btn-block hero-consult-btn"
                onClick={e => { e.stopPropagation(); goToConsultation(hero.patient, hero.consultationId) }}
              >
                {hero.expired ? 'View Details' : hero.stage === 1 ? 'Continue Checklist' : 'View Details'}
              </button>
            </div>
          )}

          {rest.length > 0 && (
            <div className="card">
              {rest.map(item => (
                <div key={item.patient.patientId} className="consult-row" onClick={() => goToConsultation(item.patient, item.consultationId)}>
                  <div className="ava">{initials(item.patient.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.patient.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.detail}</div>
                  </div>
                  <span className={`tag ${item.expired ? 'twarn' : 'tinfo'}`}>{item.expired ? 'Expired' : STAGE_LABELS[item.stage - 1]}</span>
                  <i className="ti ti-chevron-right" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', borderColor: 'var(--border-danger)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 20, color: 'var(--text-danger)' }} aria-hidden="true" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Medical emergency?</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              For life-threatening symptoms, please contact emergency services directly — GodwitCare&apos;s team is not equipped to respond to emergencies.
            </div>
          </div>
        </div>
        <button type="button" className="bd" style={{ whiteSpace: 'nowrap' }} onClick={() => setShowEmergencyModal(true)}>
          <i className="ti ti-phone" aria-hidden="true" /> Call 999 (NHS Emergency)
        </button>
      </div>

      {reg && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <div className="ct" style={{ marginBottom: 0 }}>Coverage Status</div>
            <span className={`tag ${isExpired ? 'twarn' : activation?.activated ? 'tok' : 'tmute'}`}>
              {isExpired ? 'Expired' : activation?.activated ? 'Activated' : 'Not Activated'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <i className="ti ti-map-pin" style={{ color: 'var(--text-accent)' }} aria-hidden="true" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{reg.to || '—'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <i className="ti ti-calendar" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{reg.start || '—'} – {reg.end || '—'}</span>
          </div>
          <div className="g2" style={{ marginBottom: 12 }}>
            <div>
              <div className="fi-hint">Days Purchased</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{packageDaysPurchased ? `${packageDaysPurchased} days` : '—'}</div>
            </div>
            <div>
              <div className="fi-hint">Days Left</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: isExpired ? 'var(--text-danger)' : 'var(--text-primary)' }}>
                {daysLeft === null ? '—' : isExpired ? 'Expired' : `${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
              </div>
            </div>
          </div>
          {isExpired && (
            <div className="notice n-warn" style={{ marginBottom: 12 }}>
              <i className="ti ti-alert-triangle" aria-hidden="true" />Your coverage has expired. Renew your package to book new consultations.
            </div>
          )}
          <div className="fi-hint" style={{ marginBottom: 8 }}>Members Covered</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {patients.map(p => (
              <div key={p.patientId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="ava" style={{ width: 26, height: 26, fontSize: 10 }}>{initials(p.name)}</div>
                <span style={{ fontSize: 13 }}>{p.name}</span>
                {p.id === 'PRIMARY' && <span className="tag tinfo" style={{ marginLeft: 'auto' }}>Primary</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div className="ct" style={{ marginBottom: 0 }}>Travel Support</div>
          <span className="tag tok"><span className="live-dot" />Online Now</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <i className="ti ti-clock" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>9:00 AM – 5:00 PM local time</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <i className="ti ti-brand-whatsapp" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Video and audio consultations are conducted over WhatsApp</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-route" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>To book an appointment, use the &quot;New Consultation&quot; button</span>
        </div>
      </div>

      {showNewConsultModal && (
        <Modal title="Who is this consultation for?" onClose={() => setShowNewConsultModal(false)}>
          {patients.map(p => (
            <button key={p.patientId} type="button" className="traveler-pick" onClick={() => startNewConsultation(p)}>
              <div className="ava" style={{ width: 26, height: 26, fontSize: 10 }}>{initials(p.name)}</div>
              {p.name}
            </button>
          ))}
        </Modal>
      )}

      {showEmergencyModal && (
        <Modal
          title="Medical emergency"
          onClose={() => setShowEmergencyModal(false)}
          footer={(
            <>
              <button type="button" className="bs" onClick={() => setShowEmergencyModal(false)}>Cancel</button>
              <a className="bd" href="tel:999">Call 999 Now</a>
            </>
          )}
        >
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            If this is a life-threatening emergency, call 999 immediately. GodwitCare&apos;s clinicians are not able to respond to emergencies in real time.
          </p>
        </Modal>
      )}
    </>
  )
}
