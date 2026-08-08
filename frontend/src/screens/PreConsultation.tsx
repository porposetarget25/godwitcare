// src/screens/PreConsultation.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authFetch, API_BASE_URL } from '../api'
import { QUESTIONNAIRE_SECTIONS, type QuestionnaireSection } from '../questionnaire'
import { usePatient } from '../state/patient'
import Modal from '../components/portal/Modal'

type YesNo = 'Yes' | 'No'
type Ans = YesNo | undefined

function Toggle({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: Ans
  onChange: (v: YesNo) => void
  disabled?: boolean
}) {
  return (
    <div className="q-row">
      <span>{label}</span>
      <div className="yn">
        <button type="button" className={`yn-btn no${value === 'No' ? ' on' : ''}`} onClick={() => onChange('No')} aria-pressed={value === 'No'} disabled={disabled}>
          <i className="ti ti-circle-check" aria-hidden="true" /> No
        </button>
        <button type="button" className={`yn-btn yes${value === 'Yes' ? ' on' : ''}`} onClick={() => onChange('Yes')} aria-pressed={value === 'Yes'} disabled={disabled}>
          <i className="ti ti-alert-triangle" aria-hidden="true" /> Yes
        </button>
      </div>
    </div>
  )
}

const FORM = QUESTIONNAIRE_SECTIONS

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
  const locked = params.get('locked') === '1'
  const { activePatient, loading: patientContextLoading, queryString: activePatientQuery } = usePatient()
  const travelerId = activePatient?.id === 'PRIMARY' ? null : activePatient?.id || null
  const patientId = activePatient?.patientId || null
  const [resolvedPatientId, setResolvedPatientId] = useState(patientId || '')
  const isEdit = !!cid

  const travelerQueryString = useMemo(() => {
    return activePatientQuery
  }, [activePatientQuery])

  useEffect(() => {
    if (patientId) setResolvedPatientId(patientId)
  }, [patientId])

  // Contact fields
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

  // Answers, details — questions start unselected; `touched` tracks which ones the patient
  // has actually answered, driving the "reviewed" progress and section auto-advance.
  const defaultAnswers = useMemo(() => {
    const all: Record<string, Ans> = {}
    for (const s of FORM) for (const q of s.questions) all[q.id] = undefined
    return all
  }, [])
  const [answers, setAnswers] = useState<Record<string, Ans>>(defaultAnswers)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [detailsByQ, setDetailsByQ] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  // Sections are walked through one at a time; only this index is expanded.
  const [openSectionIndex, setOpenSectionIndex] = useState(0)

  /* ---------- Prefill (NEW mode): Registration → Latest Consultation → /auth/me ---------- */
  useEffect(() => {
    if (isEdit || patientContextLoading || !activePatient) return
    let ignore = false
    ;(async () => {
      // 1) Try latest Registration (DOB lives here)
      try {
        const r = await authFetch(`${API_BASE_URL}/registrations/mine/latest`, {})
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
              const requested = travelerId ? opts.find(opt => opt.key === `trav-${travelerId}`) : opts.find(opt => opt.key === 'primary')
              const sel = requested || opts[0]
              setSelectedPatientKey(sel.key)
              const nameOnly = sel.label.replace(/\s*\(Primary\)\s*$/, '')
              setContactName(nameOnly)
              if (sel.dob) setDob(sel.dob)
            }
          }
        }
      } catch { /* ignore */ }

      // 2) Latest consultation details (address; fallback dob)
      try {
        const r0 = await authFetch(`${API_BASE_URL}/consultations/mine/latest${travelerQueryString ? `?${travelerQueryString}` : ''}`, {})
        if (!ignore && r0.ok) {
          const latest = await r0.json().catch(() => null)
          if (latest?.id) {
            const r1 = await authFetch(`${API_BASE_URL}/consultations/${latest.id}/mine`, {})
            if (!ignore && r1.ok) {
              const j = await r1.json()
              if (!contactAddress && j?.contactAddress) setContactAddress(j.contactAddress)
              const ymd = toYMD(j?.dob || j?.patient?.dob)
              if (!dob && ymd) setDob(ymd)
            }
          }
        }
      } catch { /* ignore */ }

      // 3) Shared contact number fallback. Never replace the selected patient's identity.
      try {
        const r = await authFetch(`${API_BASE_URL}/auth/me`, {})
        if (!ignore && r.ok) {
          const me = await r.json()
          const phone = me?.username || me?.phone || ''
          if (!contactPhone && phone) setContactPhone(String(phone))
        }
      } catch { /* ignore */ }
    })()
    return () => { ignore = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePatient, activePatientQuery, isEdit, patientContextLoading, travelerId])

  /* ---------- Prefill (EDIT mode) ---------- */
  useEffect(() => {
    if (!isEdit) return
    let ignore = false
    ;(async () => {
      try {
        const r = await authFetch(`${API_BASE_URL}/consultations/${cid}/mine`, {})
        if (!ignore && r.ok) {
          const j = await r.json()
          setContactName(j.contactName || '')
          setContactPhone(j.contactPhone || '')
          setContactAddress(j.contactAddress || '')
          setDob(toYMD(j.dob || ''))

          const r2 = await authFetch(`${API_BASE_URL}/registrations/mine/latest`, {})
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
          // A previously-submitted checklist means every question was already reviewed.
          const allTouched: Record<string, boolean> = {}
          for (const s of FORM) for (const q of s.questions) allTouched[q.id] = true
          setTouched(allTouched)
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

  function setDetail(id: string, v: string) {
    setDetailsByQ(prev => (prev[id] === v ? prev : { ...prev, [id]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || locked || hasEmergencyAnswer) return

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

      const travelerId = selectedPatientKey.startsWith('trav-')
        ? Number(selectedPatientKey.slice(5).replace(/^idx-/, ''))
        : null

      const payload = {
        currentLocation: null,
        contactName,
        contactPhone,
        contactAddress,
        answers: castAnswers,
        detailsByQuestion: details,
        dob: dob || null,
        travelerId: Number.isFinite(travelerId) ? travelerId : null,
        patientId: resolvedPatientId,
      }

      const url = isEdit
        ? `${API_BASE_URL}/consultations/${cid}`
        : `${API_BASE_URL}/consultations`
      const method = isEdit ? 'PUT' : 'POST'

      const res = await authFetch(url, {
        method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(`Failed to save consultation: ${res.status} ${t}`)
      }

      nav(travelerQueryString ? `/consultation?${travelerQueryString}` : '/consultation')
    } catch (err) {
      console.error(err)
      alert('Sorry, we could not save your details. Please try again.')
    } finally {
      setSubmitting(false)
    }
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

    /** Lock the whole checklist and show the 999 warning if ANY "Yes" is answered inside a critical (red) section. */
  const hasEmergencyAnswer = useMemo(() => {
    return FORM
      .filter(s => CRITICAL_SECTION_TITLES.has(s.title))
      .some(s => s.questions.some(q => answers[q.id] === 'Yes'))
  }, [answers, CRITICAL_SECTION_TITLES])

  const [emergencyModalDismissed, setEmergencyModalDismissed] = useState(false)
  useEffect(() => {
    if (!hasEmergencyAnswer) setEmergencyModalDismissed(false)
  }, [hasEmergencyAnswer])


  const totalQuestions = useMemo(() => FORM.reduce((n, s) => n + s.questions.length, 0), [])
  const reviewedCount = useMemo(() => Object.values(touched).filter(Boolean).length, [touched])

  function isSectionComplete(section: QuestionnaireSection, snapshot: Record<string, boolean>) {
    return section.questions.every(q => snapshot[q.id])
  }

  /** Mark a question reviewed, and if that was the section's last unreviewed one, fold it and expand the next. */
  function answerQuestion(sectionIndex: number, id: string, v: YesNo) {
    setAnswers(prev => (prev[id] === v ? prev : { ...prev, [id]: v }))
    setTouched(prev => {
      if (prev[id]) return prev
      const next = { ...prev, [id]: true }
      const section = FORM[sectionIndex]
      // A "Yes" reveals a details textbox the patient may want to fill in — don't fold the
      // section out from under them mid-typing. Only auto-advance on a completing "No".
      if (v === 'No' && section && isSectionComplete(section, next) && sectionIndex < FORM.length - 1) {
        window.setTimeout(() => {
          setOpenSectionIndex(current => (current === sectionIndex ? sectionIndex + 1 : current))
        }, 350)
      }
      return next
    })
  }

  function openSection(index: number) {
    setOpenSectionIndex(index)
  }

  return (
    <>
      <div className="page-head">
        <div className="page-title">Pre-Consultation Checklist</div>
        <Link to={travelerQueryString ? `/consultation?${travelerQueryString}` : '/consultation'} className="bs">Back</Link>
      </div>

      {locked && (
        <div className="notice n-info">
          <i className="ti ti-lock" aria-hidden="true" />
          <div>This checklist is locked while your appointment is booked. Cancel the appointment to make changes.</div>
        </div>
      )}

      <div className="progress-wrap">
        <div className="progress-label"><span>Progress</span><span>{reviewedCount} of {totalQuestions} answered</span></div>
        <div className="progress-bar-track"><div className="progress-bar-fill" style={{ width: `${totalQuestions ? (reviewedCount / totalQuestions) * 100 : 0}%` }} /></div>
      </div>

      <form onSubmit={submit}>
        <div className="card">
          <div className="ct">Patient Contact &amp; Address</div>

          <div className="fi">
            <label className="fl2">Consultation for</label>
            {patientOptions.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="ava" style={{ width: 26, height: 26, fontSize: 10 }}>{contactName.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()}</div>
                <strong style={{ fontSize: 13 }}>{contactName}</strong>
              </div>
            ) : (
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Full name" disabled={locked || hasEmergencyAnswer} />
            )}
          </div>

          <div className="g2">
            <div className="fi">
              <label className="fl2">Phone / WhatsApp</label>
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} disabled />
            </div>
            <div className="fi">
              <label className="fl2">Date of Birth</label>
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} disabled />
            </div>
          </div>

          <div className="fi">
            <label className="fl2">Address</label>
            <textarea value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} placeholder="Street, City, Postal Code, Country" rows={3} disabled={locked || hasEmergencyAnswer} />
          </div>
        </div>

        {hasEmergencyAnswer && (
          <div className="notice n-danger" role="alert" aria-live="assertive" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
            <i className="ti ti-alert-triangle" aria-hidden="true" />
            <div>
              <strong>You are experiencing emergency symptoms. Please dial 999 immediately.</strong>
              <div style={{ marginTop: 8 }}>
                <a href="tel:999" className="bd" style={{ background: '#fff' }}><i className="ti ti-phone" aria-hidden="true" /> Call 999 Now</a>
              </div>
            </div>
          </div>
        )}

        <div className="ct" style={{ margin: '14px 0 8px' }}>Health Questionnaire</div>
        {FORM.map((section, index) => {
          const isCritical = CRITICAL_SECTION_TITLES.has(section.title)
          const reviewedInSection = section.questions.filter(q => touched[q.id]).length
          const complete = reviewedInSection === section.questions.length
          const isOpen = openSectionIndex === index
          const isFirstGeneral = !isCritical && FORM[index - 1] && CRITICAL_SECTION_TITLES.has(FORM[index - 1].title)
          return (
            <React.Fragment key={section.title}>
              {index === 0 && <div className="fi-hint" style={{ margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Emergency Symptom Check</div>}
              {isFirstGeneral && <div className="fi-hint" style={{ margin: '14px 0 6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>General Health Questions</div>}
              <div className={`accordion-item${isOpen ? ' open' : ''}${isCritical ? ' critical' : ''}${complete ? ' complete' : ''}`}>
                <div className="accordion-header" onClick={() => openSection(index)}>
                  <div className="accordion-header-left">
                    {isCritical && <i className="ti ti-alert-triangle" aria-hidden="true" style={{ color: 'var(--text-danger)' }} />}
                    <span className="accordion-title">{section.title}</span>
                    {complete ? (
                      <i className="ti ti-circle-check" aria-hidden="true" style={{ color: 'var(--text-success)' }} />
                    ) : (
                      <span className="accordion-count">{reviewedInSection}/{section.questions.length}</span>
                    )}
                  </div>
                  <i className="ti ti-chevron-down accordion-chevron" aria-hidden="true" />
                </div>
                <div className="accordion-body">
                  <div className="accordion-body-inner">
                    {section.questions.map(q => {
                      const val = answers[q.id]
                      // Keep the question(s) that actually triggered the emergency lock editable,
                      // so the patient can correct a misclick — everything else stays blocked.
                      const questionDisabled = locked || (hasEmergencyAnswer && val !== 'Yes')
                      return (
                        <div key={q.id}>
                          <Toggle label={q.label} value={val} onChange={(v) => answerQuestion(index, q.id, v)} disabled={questionDisabled} />
                          {val === 'Yes' && (
                            <div className="fi" style={{ marginTop: -4, marginBottom: 10 }}>
                              <input value={detailsByQ[q.id] || ''} onChange={(e) => setDetail(q.id, e.target.value)} placeholder="Add details (optional)" disabled={questionDisabled} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </React.Fragment>
          )
        })}

        {hasEmergencyAnswer ? (
          <div className="notice n-danger" style={{ marginTop: 16 }}>
            <i className="ti ti-alert-triangle" aria-hidden="true" />
            This checklist can&apos;t be submitted while an emergency symptom is reported. Please dial 999.
          </div>
        ) : !locked && (
          <button className="bp btn-block" style={{ marginTop: 16 }} disabled={submitting}>
            {submitting ? (isEdit ? 'Updating…' : 'Submitting…') : (isEdit ? 'Update & Continue' : 'Submit & Continue')}
          </button>
        )}
      </form>

      {hasEmergencyAnswer && !emergencyModalDismissed && (
        <Modal
          title="Medical Emergency"
          onClose={() => setEmergencyModalDismissed(true)}
          footer={(
            <>
              <button type="button" className="bs" onClick={() => setEmergencyModalDismissed(true)}>Close</button>
              <a className="bd" href="tel:999">Call 999 Now</a>
            </>
          )}
        >
          <p style={{ fontSize: 13 }}>
            You are experiencing emergency symptoms. Please dial 999 immediately.
          </p>
        </Modal>
      )}
    </>
  )
}
