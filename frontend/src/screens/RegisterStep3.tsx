// src/screens/RegisterStep3.tsx
import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReg } from '../state/registration'
import {
  saveRegistration,
  uploadDocument,
  registerAuthUser,
  login,
} from '../api'

type Errors = Partial<Record<
  'from' | 'to' | 'start' | 'end' | 'dates' | 'package' | 'travelers',
  string
>>

type Person = { fullName: string; dateOfBirth: string }

// ---- Date helpers ----
const ymd = (d: Date) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const today = new Date()
const todayYMD = ymd(today)
// start must be strictly after today
const tmr = new Date(today); tmr.setDate(today.getDate() + 1)
const tomorrowYMD = ymd(tmr)

// 18+ cutoff
const cutoff18 = new Date(today); cutoff18.setFullYear(today.getFullYear() - 18)
const cutoff18YMD = ymd(cutoff18)

// Optional lower bound to avoid accidental 1800s
const MIN_DOB_YMD = '1900-01-01'

const MAX_DOC_BYTES = 20 * 1024 * 1024; // 20MB (match backend)
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));


// Validators
function isValidLocalDate(value?: string) {
  if (!value) return false
  const d = new Date(`${value}T00:00:00`)
  return !Number.isNaN(d.getTime())
}
function parseLocal(value: string) {
  return new Date(`${value}T00:00:00`)
}
function validateAdultDob(value?: string): string | null {
  if (!value) return null // allow blank rows (dropped on submit)
  if (!isValidLocalDate(value)) return 'Invalid date.'
  const d = parseLocal(value)
  if (d > today) return 'DOB cannot be in the future.'
  if (d > cutoff18) return 'Adult must be at least 18 years old.'
  return null
}
function validateChildDob(value?: string): string | null {
  if (!value) return null // allow blank rows (dropped on submit)
  if (!isValidLocalDate(value)) return 'Invalid date.'
  const d = parseLocal(value)
  if (d > today) return 'Child DOB cannot be in the future.'
  if (d <= cutoff18) return 'Child must be under 18 years old.'
  return null
}
function validateStartDateLaterThanToday(value?: string): string | null {
  if (!value) return 'Required'
  if (!isValidLocalDate(value)) return 'Please enter a valid date.'
  const d = parseLocal(value)
  if (d <= today) return 'Start date must be later than today.'
  return null
}
function validateEndNotBeforeStart(start?: string, end?: string): string | null {
  if (!start || !end) return null
  if (!isValidLocalDate(start) || !isValidLocalDate(end)) return 'Please enter valid dates.'
  const s = parseLocal(start)
  const e = parseLocal(end)
  if (e < s) return 'End date must be on or after the start date.'
  return null
}

/* ===== Country lists ===== */
const ALL_COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo (Republic)', 'Congo (DRC)', 'Costa Rica', 'Côte d’Ivoire', 'Croatia', 'Cuba', 'Cyprus', 'Czechia',
  'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia',
  'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway',
  'Oman', 'Pakistan', 'Palau', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar',
  'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'São Tomé and Príncipe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Venezuela', 'Vietnam',
  'Yemen', 'Zambia', 'Zimbabwe'
].sort((a, b) => a.localeCompare(b))

const EUROPE_COUNTRIES = [
  'Albania', 'Andorra', 'Armenia', 'Austria', 'Azerbaijan', 'Belarus', 'Belgium', 'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia',
  'Denmark', 'Estonia', 'Finland', 'France', 'Georgia', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy',
  'Kazakhstan (European part)', 'Kosovo', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta', 'Moldova', 'Monaco', 'Montenegro',
  'Netherlands', 'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania', 'Russia (European part)', 'San Marino', 'Serbia',
  'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Turkey (European part)', 'Ukraine', 'United Kingdom', 'Vatican City'
].sort((a, b) => a.localeCompare(b))

export default function Step3() {
  const { draft, setDraft } = useReg()
  const nav = useNavigate()

  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)

  // Per-row DOB error maps (inline messages)
  const [adultDobErrors, setAdultDobErrors] = useState<Record<number, string>>({})
  const [childDobErrors, setChildDobErrors] = useState<Record<number, string>>({})

  // Local lists for adults and children (merged before submit)
  const [adults, setAdults] = useState<Person[]>([])
  const [children, setChildren] = useState<Person[]>([])

  const MAX_TRAVELERS = 6

  // Helpers to read values safely
  const from = (draft['Travelling From'] ?? '').trim()
  const to = (draft['Travelling To (UK & Europe)'] ?? '').trim()
  const start = draft['Travel Start Date'] ?? ''
  const end = draft['Travel End Date'] ?? ''
  const pkg = draft['Package Days']

  const dateProblem = useMemo(() => {
    // Start must be later than today
    if (start) {
      const err = validateStartDateLaterThanToday(start)
      if (err && err !== 'Required') return err
    }
    // End must be >= start
    const rangeErr = validateEndNotBeforeStart(start, end)
    return rangeErr || ''
  }, [start, end])

  const totalTravelers = adults.length + children.length

  function addAdult() {
    if (totalTravelers >= MAX_TRAVELERS) return
    setAdults(a => [...a, { fullName: '', dateOfBirth: '' }])
  }
  function removeAdult(idx: number) {
    setAdults(a => a.filter((_, i) => i !== idx))
    setAdultDobErrors(prev => {
      const next = { ...prev }
      delete next[idx]
      return next
    })
  }

  function addChild() {
    if (totalTravelers >= MAX_TRAVELERS) return
    setChildren(c => [...c, { fullName: '', dateOfBirth: '' }])
  }
  function removeChild(idx: number) {
    setChildren(c => c.filter((_, i) => i !== idx))
    setChildDobErrors(prev => {
      const next = { ...prev }
      delete next[idx]
      return next
    })
  }

  function validate(): boolean {
    const next: Errors = {}

    if (!from) next.from = 'Required'
    if (!to) next.to = 'Required'

    // Start date validations
    const startErr = validateStartDateLaterThanToday(start)
    if (startErr) next.start = startErr

    // End date present
    if (!end) next.end = 'Required'

    // Range validation only if both start+end present and start ok
    if (!next.start && !next.end) {
      const rangeErr = validateEndNotBeforeStart(start, end)
      if (rangeErr) next.dates = rangeErr
    }

    if (!pkg) next.package = 'Please select a package'

    // Travelers: per-row DOB checks; blank rows allowed (dropped on submit)
    const merged = [...adults, ...children]
    const cleaned = merged.filter(t => t.fullName.trim() && t.dateOfBirth)
    if (cleaned.length > MAX_TRAVELERS) next.travelers = `Maximum ${MAX_TRAVELERS} travelers allowed.`

    // Adults DOB checks
    const aErrs: Record<number, string> = {}
    adults.forEach((a, i) => {
      if (!(a.fullName.trim() || a.dateOfBirth)) return // blank row allowed
      const err = validateAdultDob(a.dateOfBirth)
      if (err) aErrs[i] = err
    })
    setAdultDobErrors(aErrs)

    // Children DOB checks
    const cErrs: Record<number, string> = {}
    children.forEach((c, i) => {
      if (!(c.fullName.trim() || c.dateOfBirth)) return // blank row allowed
      const err = validateChildDob(c.dateOfBirth)
      if (err) cErrs[i] = err
    })
    setChildDobErrors(cErrs)

    if (Object.keys(aErrs).length || Object.keys(cErrs).length) {
      next.travelers = next.travelers || 'Please fix traveler date(s) of birth.'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    if (submitting) return
    setSubmitting(true)

    try {
      // 1) Merge adults + children -> travelers (drop blanks)
      const travelers = [...adults, ...children]
        .filter(t => t.fullName.trim() && t.dateOfBirth)
        .map(t => ({ fullName: t.fullName.trim(), dateOfBirth: t.dateOfBirth }))

      // Put travelers onto the draft so api.ts->toBackend can map them
      const payload = { ...draft, travelers } as any

      // 2) Save registration (+doc upload)
      const created = await saveRegistration(payload)

      // ---- optional document upload (robust) ----
      try {
        if (file) {
          // front-end size guard (avoid server reset for big files)
          if (file.size > MAX_DOC_BYTES) {
            alert('File too large. Max allowed is 10MB.');
          } else {
            // tiny delay so the new registration is visible even if tx commit is lagging
            await sleep(200);

            // try once
            await uploadDocument(created.id!, file);
          }
        }
      } catch (e) {
        console.warn('Document upload failed:', e);
        // don’t block the rest of the flow if upload fails
      }

      // 3) Create user account (email optional, username required = primary WhatsApp)
      const firstName = draft['First Name'] || ''
      const lastName = draft['Last Name'] || ''
      const email = (draft['Email Address'] || '').trim() || null
      const password = (draft['Account Password'] || '').trim()
      const username = (draft['Username'] || draft['Primary WhatsApp Number'] || '').trim()

      if (password && username) {
        try {
          await registerAuthUser(firstName, lastName, email, password, username)
        } catch (err) {
          console.warn('registerAuthUser:', err)
        }

        const identifier = email ?? username
        try {
          await login(identifier, password)
        } catch (err) {
          console.warn('auto-login failed:', err)
        }
      }

      localStorage.removeItem('reg-draft')
      nav('/home')
    } catch (err) {
      console.error(err)
      alert('Failed to save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="section">
      <div className="form">
        <h2>Trip Details</h2>

        <form className="grid" onSubmit={submit} noValidate>
          {/* From / To */}
          <div className="grid two">
            <div className="field">
              <label>Travelling From <span style={{ color: '#e11d48' }}>*</span></label>
              <input
                list="country-from-list"
                placeholder="Start typing to search…"
                required
                value={from}
                onChange={(e) => setDraft({ ...draft, ['Travelling From']: e.target.value })}
                aria-invalid={!!errors.from}
              />
              <datalist id="country-from-list">
                {ALL_COUNTRIES.map(c => <option key={c} value={c} />)}
              </datalist>
              {errors.from && <div className="help" style={{ color: '#e11d48' }}>{errors.from}</div>}
            </div>

            <div className="field">
              <label>Travelling To (UK &amp; Europe) <span style={{ color: '#e11d48' }}>*</span></label>
              <input
                list="country-to-list"
                placeholder="Start typing to search…"
                required
                value={to}
                onChange={(e) => setDraft({ ...draft, ['Travelling To (UK & Europe)']: e.target.value })}
                aria-invalid={!!errors.to}
              />
              <datalist id="country-to-list">
                {EUROPE_COUNTRIES.map(c => <option key={c} value={c} />)}
              </datalist>
              {errors.to && <div className="help" style={{ color: '#e11d48' }}>{errors.to}</div>}
            </div>
          </div>

          {/* Dates */}
          <div className="grid two">
            <div className="field">
              <label>Travel Start Date <span style={{ color: '#e11d48' }}>*</span></label>
              <input
                type="date"
                required
                value={start}
                onChange={(e) => setDraft({ ...draft, ['Travel Start Date']: e.target.value })}
                aria-invalid={!!(errors.start || errors.dates)}
                min={tomorrowYMD} // must be later than today
              />
              {errors.start && <div className="help" style={{ color: '#e11d48' }}>{errors.start}</div>}
            </div>

            <div className="field">
              <label>Travel End Date <span style={{ color: '#e11d48' }}>*</span></label>
              <input
                type="date"
                required
                value={end}
                onChange={(e) => setDraft({ ...draft, ['Travel End Date']: e.target.value })}
                aria-invalid={!!(errors.end || errors.dates)}
                min={start || tomorrowYMD} // cannot be before start; if no start, at least after today
              />
              {errors.end && <div className="help" style={{ color: '#e11d48' }}>{errors.end}</div>}
            </div>
          </div>

          {!errors.start && !errors.end && errors.dates && (
            <div className="help" style={{ color: '#e11d48' }}>{errors.dates}</div>
          )}

          {/* Adults only */}
          <div className="field">
            <label className="h3" style={{ display: 'block', marginBottom: 8 }}>Adults only</label>
            <button
              type="button"
              className="btn"
              onClick={addAdult}
              disabled={totalTravelers >= MAX_TRAVELERS}
            >
              + Add Adult
            </button>

            {adults.map((a, i) => (
              <div key={`a-${i}`} className="card" style={{ marginTop: 10, padding: 12 }}>
                <div className="grid two">
                  <div className="field">
                    <label>Full Name</label>
                    <input
                      value={a.fullName}
                      onChange={(e) => {
                        const v = e.target.value
                        setAdults(list => list.map((row, idx) => idx === i ? { ...row, fullName: v } : row))
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      value={a.dateOfBirth}
                      onChange={(e) => {
                        const v = e.target.value
                        setAdults(list => list.map((row, idx) => idx === i ? { ...row, dateOfBirth: v } : row))
                        // live validate this row
                        setAdultDobErrors(prev => {
                          const msg = validateAdultDob(v)
                          const next = { ...prev }
                          if (msg) next[i] = msg; else delete next[i]
                          return next
                        })
                      }}
                      min={MIN_DOB_YMD}
                      max={cutoff18YMD} // adult must be at least 18
                    />
                    {adultDobErrors[i] && (
                      <div className="small" style={{ color: '#b91c1c', marginTop: 4 }}>{adultDobErrors[i]}</div>
                    )}
                  </div>
                </div>
                <button type="button" className="btn secondary" onClick={() => removeAdult(i)}>Remove</button>
              </div>
            ))}
          </div>

          {/* Children */}
          <div className="field" style={{ marginTop: 16 }}>
            <label className="h3" style={{ display: 'block', marginBottom: 8 }}>Children</label>
            <button
              type="button"
              className="btn"
              onClick={addChild}
              disabled={totalTravelers >= MAX_TRAVELERS}
            >
              + Add Child
            </button>

            {children.map((c, i) => (
              <div key={`c-${i}`} className="card" style={{ marginTop: 10, padding: 12 }}>
                <div className="grid two">
                  <div className="field">
                    <label>Full Name</label>
                    <input
                      value={c.fullName}
                      onChange={(e) => {
                        const v = e.target.value
                        setChildren(list => list.map((row, idx) => idx === i ? { ...row, fullName: v } : row))
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      value={c.dateOfBirth}
                      onChange={(e) => {
                        const v = e.target.value
                        setChildren(list => list.map((row, idx) => idx === i ? { ...row, dateOfBirth: v } : row))
                        // live validate this row
                        setChildDobErrors(prev => {
                          const msg = validateChildDob(v)
                          const next = { ...prev }
                          if (msg) next[i] = msg; else delete next[i]
                          return next
                        })
                      }}
                      min={MIN_DOB_YMD}
                      max={todayYMD} // child DOB cannot be in the future
                    />
                    {childDobErrors[i] && (
                      <div className="small" style={{ color: '#b91c1c', marginTop: 4 }}>{childDobErrors[i]}</div>
                    )}
                  </div>
                </div>
                <button type="button" className="btn secondary" onClick={() => removeChild(i)}>Remove</button>
              </div>
            ))}
          </div>

          <div className="muted" style={{ marginTop: 8 }}>
            Total Travelers: {totalTravelers} / {MAX_TRAVELERS}
          </div>
          {errors.travelers && <div className="help" style={{ color: '#e11d48' }}>{errors.travelers}</div>}

          {/* Optional document */}
          <div className="field" style={{ marginTop: 16 }}>
            <label>Boarding Pass / E-Ticket (optional)</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div className="help">JPG, PNG, PDF formats supported</div>
          </div>

          {/* Package selection */}
          <div className="field">
            <label>
              Select a Package <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <div className="actions" role="group" aria-label="Select a package">
              {[7, 14, 30].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={'btn ' + (pkg === p ? '' : 'secondary')}
                  onClick={() => setDraft({ ...draft, ['Package Days']: p })}
                  aria-pressed={pkg === p}
                >
                  {p} Days
                </button>
              ))}
            </div>
            {errors.package && <div className="help" style={{ color: '#e11d48' }}>{errors.package}</div>}
          </div>

          <div className="actions">
            <button className="btn block" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save & Finish'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
