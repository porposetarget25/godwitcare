// src/screens/PreConsultation.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { API_BASE_URL } from '../api'

type YesNo = 'Yes' | 'No'
type Ans = YesNo | undefined

function sanitizeAscii(input: string): string {
  if (!input) return input

  // Normalize accents (ā → a) and remove remaining non-ASCII chars
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^\x20-\x7E]/g, '')    // remove non-printable / non-ASCII
}


function Toggle({
  label,
  value,
  onChange,
  critical = false,
}: {
  label: string
  value: Ans
  onChange: (v: YesNo) => void
  /** when true, render the label bold + red; when false, bold + green */
  critical?: boolean
}) {
  const isUnset = value === undefined
  return (
    <div className="field" style={{ marginBottom: 12 }}>
      <label
        className="strong"
        style={critical ? { color: '#991b1b', fontWeight: 700 } : { color: '#166534', fontWeight: 700 }}
      >
        {label}
      </label>
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button
          type="button"
          className={'btn ' + (value === 'No' ? '' : 'secondary')}
          onClick={() => onChange('No')}
          aria-pressed={value === 'No'}
        >
          No
        </button>
        <button
          type="button"
          className={'btn ' + (value === 'Yes' ? '' : 'secondary')}
          onClick={() => onChange('Yes')}
          aria-pressed={value === 'Yes'}
        >
          Yes
        </button>
        {isUnset && (
          <span className="muted small" style={{ alignSelf: 'center' }}>
            ← please choose
          </span>
        )}
      </div>
    </div>
  )
}

type Q = { id: string; label: string }
type Section = { title: string; questions: Q[] }

const FORM: Section[] = [
  {
    title: 'Emergency Symptoms', questions: [
      { id: 'emergency_pain', label: 'Experiencing severe pain?' },
      { id: 'emergency_breath', label: 'Difficulty breathing or shortness of breath?' },
      { id: 'emergency_unconscious', label: 'Unconsciousness or altered mental state?' },
      { id: 'emergency_bleeding', label: 'Recent injury with heavy bleeding?' },
    ]
  },
  {
    title: 'Signs of a Stroke (FAST)', questions: [
      { id: 'stroke_face', label: 'Facial droop?' },
      { id: 'stroke_weakness', label: 'Weakness on one side?' },
      { id: 'stroke_speech', label: 'Slurred speech?' },
    ]
  },
  {
    title: 'Indications of Sepsis', questions: [
      { id: 'sepsis_confusion', label: 'Slurred speech or confusion?' },
      { id: 'sepsis_shiver', label: 'Shivering or muscle pain?' },
      { id: 'sepsis_skin', label: 'Skin discoloration or rash?' },
    ]
  },
  {
    title: 'Signs of Heart Attack', questions: [
      { id: 'heartattack_chest', label: 'Severe chest pain, pressure, or heavy weight on chest?' },
    ]
  },
  {
    title: 'General Symptoms', questions: [
      { id: 'general_symptoms_fever', label: 'Experiencing persistent fever?' },
      { id: 'general_symptoms_fatigue', label: 'Feeling extreme fatigue or weakness?' },
      { id: 'general_symptoms_weightloss', label: 'Unexplained weight loss?' },
    ]
  },
  {
    title: 'Respiratory & ENT Issues', questions: [
      { id: 'respiratory_ent_cough', label: 'Persistent cough?' },
      { id: 'respiratory_ent_taste', label: 'Sudden loss of taste or smell?' },
      { id: 'respiratory_ent_throat', label: 'Severe sore throat?' },
    ]
  },
  {
    title: 'Digestive Issues', questions: [
      { id: 'digestive_abdominal_pain', label: 'Severe abdominal pain?' },
      { id: 'digestive_gi', label: 'Persistent nausea, vomiting, or diarrhea?' },
    ]
  },
  {
    title: 'Neurological Symptoms', questions: [
      { id: 'neuro_headache', label: 'New or worsening severe headaches?' },
      { id: 'neuro_vision', label: 'Sudden onset of vision changes?' },
      { id: 'neuro_balance', label: 'Difficulty with balance or coordination?' },
    ]
  },
  {
    title: 'Mental Well-being', questions: [
      { id: 'mental_anxiety', label: 'Experiencing severe anxiety or panic attacks?' },
      { id: 'mental_sadness', label: 'Persistent feelings of sadness or self-harm thoughts?' },
    ]
  },
]

// Normalize many input formats to yyyy-MM-dd
const toYMD = (d?: string) => {
  if (!d) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  try {
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return ''
    const yyyy = dt.getFullYear()
    const mm = String(dt.getMonth() + 1).padStart(2, '0')
    const dd = String(dt.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  } catch { return '' }
}

// Dropdown person item (Primary + Travellers)
type PersonOption = { key: string; label: string; name: string; dob: string }
// For the select used in this screen
type PatientOpt = { key: string; label: string; dob: string }

/** Build Patient options with SAFE unique keys (`trav-<id>` or `trav-idx-<n>`). */
function buildPatientOptionsFromRegistration(reg: any): PatientOpt[] {
  const opts: PatientOpt[] = []
  const seen = new Set<string>()

  const push = (key: string, label: string, dob: string) => {
    if (!key || seen.has(key)) return
    seen.add(key)
    opts.push({ key, label, dob })
  }

  const primaryName =
    [reg?.firstName, reg?.lastName].filter(Boolean).join(' ').trim() ||
    reg?.fullName || 'Primary Member'
  push('primary', `${primaryName} (Primary)`, toYMD(reg?.dateOfBirth))

  if (Array.isArray(reg?.travelers)) {
    reg.travelers.forEach((t: any, idx: number) => {
      const idPart = t?.id != null ? String(t.id) : `idx-${idx}`
      const key = `trav-${idPart}`
      const label = (t?.fullName || `Traveller ${idx + 1}`).trim()
      push(key, label, toYMD(t?.dateOfBirth))
    })
  }
  return opts
}

/** (Also keep your old builder, but use id when available for stability.) */
function buildPeopleFromRegistration(reg: any): PersonOption[] {
  const out: PersonOption[] = []
  const primaryName =
    [reg?.firstName, reg?.lastName].filter(Boolean).join(' ').trim()
    || reg?.fullName
    || 'Primary Member'
  const primaryDob = toYMD(reg?.dateOfBirth)
  out.push({
    key: 'primary',
    label: `${primaryName} (Primary)`,
    name: primaryName,
    dob: primaryDob,
  })
  if (Array.isArray(reg?.travelers)) {
    reg.travelers.forEach((t: any, i: number) => {
      const nm = (t?.fullName || `Traveller ${i + 1}`).trim()
      const idPart = t?.id != null ? String(t.id) : `idx-${i}`
      out.push({
        key: `trav-${idPart}`,
        label: nm,
        name: nm,
        dob: toYMD(t?.dateOfBirth),
      })
    })
  }
  return out
}

export default function PreConsultation() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const cid = params.get('cid') // if present => edit mode
  const isEdit = !!cid

  // Contact fields
  const [location, setLocation] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactAddress, setContactAddress] = useState('')
  const [dob, setDob] = useState('') // yyyy-MM-dd

  // Patient dropdown
  const [people, setPeople] = useState<PersonOption[]>([])
  const [selectedPersonKey, setSelectedPersonKey] = useState<string>('primary')

  // Patients list for the main select (this is what the UI uses)
  const [patientOptions, setPatientOptions] = useState<PatientOpt[]>([])
  const [selectedPatientKey, setSelectedPatientKey] = useState<string>('')

  // Answers, details
  const defaultAnswers = useMemo(() => {
    const all: Record<string, Ans> = {}
    for (const s of FORM) for (const q of s.questions) all[q.id] = undefined
    return all
  }, [])
  const [answers, setAnswers] = useState<Record<string, Ans>>(defaultAnswers)
  const [detailsByQ, setDetailsByQ] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Sticky banner offset below header
  const [stickyTop, setStickyTop] = React.useState(64)
  React.useEffect(() => {
    const calc = () => {
      const header =
        (document.querySelector('header') ||
          document.querySelector('.site-header') ||
          document.querySelector('.topnav')) as HTMLElement | null
      const h = header?.offsetHeight ?? 56
      setStickyTop(h - 1)
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  /* ---------- Prefill (NEW mode): Registration → Latest Consultation → /auth/me ---------- */
  useEffect(() => {
    if (isEdit) return
    let ignore = false
    ;(async () => {
      // 1) Try latest Registration (DOB lives here)
      try {
        const r = await fetch(`${API_BASE_URL}/registrations/mine/latest`, { credentials: 'include' })
        if (!ignore && r.ok) {
          const reg = await r.json().catch(() => null)
          if (reg) {
            const fullName = [reg?.firstName, reg?.lastName].filter(Boolean).join(' ').trim()
            const phone = reg?.primaryWhatsApp || ''

            if (!contactName && fullName) setContactName(fullName)
            if (!contactPhone && phone) setContactPhone(String(phone))

            const ymd = toYMD(reg?.dateOfBirth)
            if (!dob && ymd) setDob(ymd)

            const opts = buildPatientOptionsFromRegistration(reg)
            if (opts.length > 0) {
              setPatientOptions(opts)
              setSelectedPatientKey(opts[0].key)
              const sel = opts[0]
              const nameOnly = sel.label.replace(/\s*\(Primary\)\s*$/, '')
              setContactName(nameOnly)
              if (sel.dob) setDob(sel.dob)
            }
          }
        }
      } catch { /* ignore */ }

      // 2) Latest consultation details (address/location; fallback dob)
      try {
        const r0 = await fetch(`${API_BASE_URL}/consultations/mine/latest`, { credentials: 'include' })
        if (!ignore && r0.ok) {
          const latest = await r0.json().catch(() => null)
          if (latest?.id) {
            const r1 = await fetch(`${API_BASE_URL}/consultations/${latest.id}/mine`, { credentials: 'include' })
            if (!ignore && r1.ok) {
              const j = await r1.json()
              if (!location && j?.currentLocation) setLocation(j.currentLocation)
              if (!contactAddress && j?.contactAddress) setContactAddress(j.contactAddress)
              const ymd = toYMD(j?.dob || j?.patient?.dob)
              if (!dob && ymd) setDob(ymd)
            }
          }
        }
      } catch { /* ignore */ }

      // 3) Fallback /auth/me
      try {
        const r = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' })
        if (!ignore && r.ok) {
          const me = await r.json()
          if (people.length === 0) {
            const nm = [me?.firstName, me?.lastName].filter(Boolean).join(' ').trim() || 'Primary Member'
            const rawDob: string | undefined = me?.dob || me?.dateOfBirth || me?.date_of_birth || me?.birthDate
            const ymd = toYMD(rawDob)
            const list: PersonOption[] = [{
              key: 'primary',
              label: `${nm} (Primary)`,
              name: nm,
              dob: ymd,
            }]
            setPeople(list)
            setSelectedPersonKey('primary')
            setContactName(nm)
            if (ymd) setDob(ymd)
          }
          const phone = me?.username || me?.phone || ''
          if (!contactPhone && phone) setContactPhone(String(phone))
        }
      } catch { /* ignore */ }
    })()
    return () => { ignore = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit])

  /* ---------- Prefill (EDIT mode) ---------- */
  useEffect(() => {
    if (!isEdit) return
    let ignore = false
    ;(async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/consultations/${cid}/mine`, { credentials: 'include' })
        if (!ignore && r.ok) {
          const j = await r.json()
          setLocation(j.currentLocation || '')
          setContactName(j.contactName || '')
          setContactPhone(j.contactPhone || '')
          setContactAddress(j.contactAddress || '')
          setDob(toYMD(j.dob || ''))

          const r2 = await fetch(`${API_BASE_URL}/registrations/mine/latest`, { credentials: 'include' })
          if (!ignore && r2.ok) {
            const reg = await r2.json().catch(() => null)
            if (reg) {
              if (reg?.primaryWhatsApp && !contactPhone) setContactPhone(String(reg.primaryWhatsApp))

              const opts = buildPatientOptionsFromRegistration(reg)
              setPatientOptions(opts)
              const nameOnly = (j.contactName || '').trim()
              const matchByName = opts.find(o => o.label.replace(/\s*\(Primary\)\s*$/, '') === nameOnly)
              const matchByDob  = opts.find(o => o.dob && o.dob === toYMD(j.dob || ''))
              setSelectedPatientKey((matchByName || matchByDob || opts[0])?.key || 'primary')

              const ppl = buildPeopleFromRegistration(reg)
              setPeople(ppl)
              const matchByNameP = ppl.find(p => p.name === j.contactName)
              const matchByDobP = ppl.find(p => p.dob && p.dob === toYMD(j.dob || ''))
              setSelectedPersonKey((matchByNameP || matchByDobP || ppl[0]).key)
            }
          }

          const merged: Record<string, Ans> = { ...defaultAnswers }
          const incoming = j.answers || {}
          Object.entries(incoming).forEach(([k, v]) => {
            if (v === 'Yes' || v === 'No') merged[k] = v
          })
          setAnswers(merged)
          setDetailsByQ(j.detailsByQuestion || {})
        }
      } catch { /* ignore */ }
    })()
    return () => { ignore = true }
  }, [isEdit, cid, defaultAnswers])

  // Legacy effect
  useEffect(() => {
    const sel = people.find(p => p.key === selectedPersonKey)
    if (sel) {
      setContactName(sel.name || '')
      if (sel.dob) setDob(sel.dob)
    }
  }, [selectedPersonKey, people])

  // Main select effect
  useEffect(() => {
    if (!selectedPatientKey || patientOptions.length === 0) return
    const opt = patientOptions.find(o => o.key === selectedPatientKey)
    if (!opt) return
    const cleanName = opt.label.replace(/\s*\(Primary\)\s*$/, '')
    setContactName(cleanName)
    setDob(opt.dob || '')
  }, [selectedPatientKey, patientOptions])

  function setAnswer(id: string, v: YesNo) {
    setAnswers(prev => (prev[id] === v ? prev : { ...prev, [id]: v }))
  }
  function setDetail(id: string, v: string) {
    setDetailsByQ(prev => (prev[id] === v ? prev : { ...prev, [id]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    const unanswered = Object.entries(answers).filter(([, v]) => v === undefined)
    if (unanswered.length > 0) {
      alert('Please answer all questions (Yes/No) before submitting.')
      return
    }

    setSubmitting(true)
    try {
      const castAnswers: Record<string, YesNo> = {}
      for (const k of Object.keys(answers)) castAnswers[k] = answers[k] as YesNo

      const details: Record<string, string> = {}
      for (const [k, v] of Object.entries(detailsByQ)) {
        const trimmed = (v || '').trim()
        if (trimmed) details[k] = trimmed
      }

      const payload = {
        currentLocation: sanitizeAscii(location),
        contactName,
        contactPhone,
        contactAddress,
        answers: castAnswers,
        detailsByQuestion: details,
        dob: dob || null,
      }

      const url = isEdit
        ? `${API_BASE_URL}/consultations/${cid}`
        : `${API_BASE_URL}/consultations`
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(`Failed to save consultation: ${res.status} ${t}`)
      }

      nav('/consultation/tracker?logged=1')
    } catch (err) {
      console.error(err)
      alert('Sorry, we could not save your details. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Geolocation helpers
  const [coords, setCoords] = React.useState<{ lat: number; lon: number } | null>(null)
  const [locLoading, setLocLoading] = React.useState(false)
  const [locErr, setLocErr] = React.useState<string | null>(null)

  async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      if (!res.ok) return null
      const j = await res.json()
      return j?.display_name || null
    } catch {
      return null
    }
  }

  async function useMyLocation() {
    setLocErr(null)
    if (!('geolocation' in navigator)) {
      setLocErr('Geolocation is not available in this browser.')
      return
    }
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setCoords({ lat: latitude, lon: longitude })
        const addr = await reverseGeocode(latitude, longitude)
        setLocation(addr ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
        setLocLoading(false)
      },
      (err) => {
        setLocLoading(false)
        setLocErr(err.message || 'Unable to fetch location.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  /** Critical sections that should be red-bordered (and labels red/bold). */
  const CRITICAL_SECTION_TITLES = useMemo(
    () =>
      new Set([
        'Emergency Symptoms',
        'Signs of a Stroke (FAST)',
        'Indications of Sepsis',
        'Signs of Heart Attack',
      ]),
    []
  )

    /** Show 999 banner ONLY if ANY "Yes" is answered inside critical (red) sections. */
  const showEmergencyBanner = useMemo(() => {
    return FORM
      .filter(s => CRITICAL_SECTION_TITLES.has(s.title))
      .some(s => s.questions.some(q => answers[q.id] === 'Yes'))
  }, [answers, CRITICAL_SECTION_TITLES])


  return (
    <section className="section">
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Pre-Consultation Checklist</h1>
        <Link to="/consultation/tracker" className="btn secondary">Back</Link>
      </div>

      <form className="form" onSubmit={submit}>
        {/* Current location */}
        <div className="field">
          <label>Current Location</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={location}
              onChange={(e) => setLocation(sanitizeAscii(e.target.value))}
              placeholder="123 Main St, Anytown"
              style={{ flex: 1 }}
            />
            <button type="button" className="btn" onClick={useMyLocation} disabled={locLoading}>
              {locLoading ? 'Getting…' : 'Use my location'}
            </button>
          </div>
          {coords && (
            <div className="muted small" style={{ marginTop: 6 }}>
              ({coords.lat.toFixed(5)}, {coords.lon.toFixed(5)})
            </div>
          )}
          {locErr && (
            <div className="muted small" style={{ marginTop: 6, color: '#b91c1c' }}>
              {locErr}
            </div>
          )}
        </div>

        {/* Patient Contact & Address */}
        <div className="card" style={{ marginTop: 12 }}>
          <div className="strong" style={{ marginBottom: 8 }}>Patient Contact &amp; Address</div>

          {/* Patient full width */}
          <div className="field">
            <label>Patient (Primary or Traveller)</label>
            {patientOptions.length > 0 ? (
              <select
                value={selectedPatientKey}
                onChange={(e) => setSelectedPatientKey(e.target.value)}
                style={{ width: '100%' }}
              >
                {patientOptions.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            ) : (
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Full name"
              />
            )}
            <div className="muted small" style={{ marginTop: 4 }}>
              WhatsApp (shared)
            </div>
          </div>

          {/* Phone + DOB in two columns */}
          <div className="grid two">
            <div className="field">
              <label>Phone / WhatsApp</label>
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+44 7xxx xxx xxx"
              />
            </div>
            <div className="field">
              <label>Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                placeholder="yyyy-mm-dd"
              />
            </div>
          </div>

          <div className="field">
            <label>Address</label>
            <textarea
              value={contactAddress}
              onChange={(e) => setContactAddress(e.target.value)}
              placeholder="Street, City, Postal Code, Country"
              rows={3}
            />
          </div>
        </div>

        {/* Emergency banner (now shows if ANY Yes) */}
        {showEmergencyBanner && (
          <div
            className="card"
            role="note"
            aria-live="polite"
            style={{
              position: 'sticky',
              top: stickyTop,
              zIndex: 50,
              background: '#B94A48',
              color: 'white',
              borderColor: 'transparent',
              marginTop: 0,
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 8px 20px rgba(185,74,72,.25)',
            }}
          >
            <div className="strong" style={{ marginBottom: 0 }}>
              If you answer “Yes” to any of these questions, please dial 999 immediately.
            </div>
          </div>
        )}

        {/* Sections */}
        {FORM.map((section) => {
          const isCritical = CRITICAL_SECTION_TITLES.has(section.title)
          return (
            <div
              key={section.title}
              className="card"
              style={{
                marginTop: 12,
                border: isCritical ? '3px solid #dc2626' : '3px solid #16a34a',
                borderRadius: 12,
              }}
            >
              <div
                className="strong"
                style={{
                  marginBottom: 8,
                  color: isCritical ? '#991b1b' : '#166534',
                }}
              >
                {section.title}
              </div>

              {section.questions.map((q) => {
                const val = answers[q.id]
                return (
                  <div key={q.id} style={{ marginBottom: 10 }}>
                    <Toggle
                      label={q.label}
                      value={val}
                      onChange={(v) => setAnswer(q.id, v)}
                      critical={isCritical}
                    />
                    {val === 'Yes' && (
                      <div className="field" style={{ marginTop: 6 }}>
                        <label className="small">Add details (optional)</label>
                        <input
                          value={detailsByQ[q.id] || ''}
                          onChange={(e) => setDetail(q.id, e.target.value)}
                          placeholder="Describe briefly (optional)"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}

        <div className="actions" style={{ marginTop: 16 }}>
          <button className="btn" disabled={submitting}>
            {submitting ? (isEdit ? 'Updating…' : 'Submitting…') : (isEdit ? 'Update & Continue' : 'Submit & Continue')}
          </button>
        </div>
      </form>
    </section>
  )
}
