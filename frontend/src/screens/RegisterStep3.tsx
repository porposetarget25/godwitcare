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

export default function Step3() {
  const { draft, setDraft } = useReg()
  const nav = useNavigate()

  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)

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
    if (!start || !end) return ''
    try {
      const s = new Date(start)
      const e = new Date(end)
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return 'Please enter valid dates.'
      if (e < s) return 'End date must be on or after the start date.'
      return ''
    } catch {
      return 'Please enter valid dates.'
    }
  }, [start, end])

  const totalTravelers = adults.length + children.length

  function addAdult() {
    if (totalTravelers >= MAX_TRAVELERS) return
    setAdults(a => [...a, { fullName: '', dateOfBirth: '' }])
  }
  function removeAdult(idx: number) {
    setAdults(a => a.filter((_, i) => i !== idx))
  }

  function addChild() {
    if (totalTravelers >= MAX_TRAVELERS) return
    setChildren(c => [...c, { fullName: '', dateOfBirth: '' }])
  }
  function removeChild(idx: number) {
    setChildren(c => c.filter((_, i) => i !== idx))
  }

  function validate(): boolean {
    const next: Errors = {}
    if (!from) next.from = 'Required'
    if (!to) next.to = 'Required'
    if (!start) next.start = 'Required'
    if (!end) next.end = 'Required'
    if (!pkg) next.package = 'Please select a package'
    if (!next.start && !next.end && dateProblem) next.dates = dateProblem

    // Validate travelers lightly (blank rows allowed; dropped on submit)
    const merged = [...adults, ...children]
    const cleaned = merged.filter(t => t.fullName.trim() && t.dateOfBirth)
    if (cleaned.length > MAX_TRAVELERS) next.travelers = `Maximum ${MAX_TRAVELERS} travelers allowed.`

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

      if (file) {
        await uploadDocument(created.id!, file)
      }

      // 3) Create user account (email optional, username required = primary WhatsApp)
      const firstName = draft['First Name'] || ''
      const lastName  = draft['Last Name']  || ''
      const email     = (draft['Email Address'] || '').trim() || null // optional now
      const password  = (draft['Account Password'] || '').trim()
      const username  = (draft['Username'] || draft['Primary WhatsApp Number'] || '').trim()

      // Register only if we have password AND username (primary phone as username)
      if (password && username) {
        try {
          await registerAuthUser(firstName, lastName, email, password, username)
        } catch (err) {
          console.warn('registerAuthUser:', err)
        }

        // Auto-login: identifier can be email OR username
        const identifier = email ?? username
        try {
          await login(identifier, password)
        } catch (err) {
          console.warn('auto-login failed:', err)
        }
      }

      // 4) Finish
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
              <label>Travelling From <span style={{color:'#e11d48'}}>*</span></label>
              <input
                required
                value={from}
                onChange={(e) => setDraft({ ...draft, ['Travelling From']: e.target.value })}
                aria-invalid={!!errors.from}
              />
              {errors.from && <div className="help" style={{color:'#e11d48'}}>{errors.from}</div>}
            </div>

            <div className="field">
              <label>Travelling To (UK &amp; Europe) <span style={{color:'#e11d48'}}>*</span></label>
              <input
                required
                value={to}
                onChange={(e) => setDraft({ ...draft, ['Travelling To (UK & Europe)']: e.target.value })}
                aria-invalid={!!errors.to}
              />
              {errors.to && <div className="help" style={{color:'#e11d48'}}>{errors.to}</div>}
            </div>
          </div>

          {/* Dates */}
          <div className="grid two">
            <div className="field">
              <label>Travel Start Date <span style={{color:'#e11d48'}}>*</span></label>
              <input
                type="date"
                required
                value={start}
                onChange={(e) => setDraft({ ...draft, ['Travel Start Date']: e.target.value })}
                aria-invalid={!!(errors.start || errors.dates)}
              />
              {errors.start && <div className="help" style={{color:'#e11d48'}}>{errors.start}</div>}
            </div>

            <div className="field">
              <label>Travel End Date <span style={{color:'#e11d48'}}>*</span></label>
              <input
                type="date"
                required
                value={end}
                onChange={(e) => setDraft({ ...draft, ['Travel End Date']: e.target.value })}
                aria-invalid={!!(errors.end || errors.dates)}
              />
              {errors.end && <div className="help" style={{color:'#e11d48'}}>{errors.end}</div>}
            </div>
          </div>

          {!errors.start && !errors.end && errors.dates && (
            <div className="help" style={{color:'#e11d48'}}>{errors.dates}</div>
          )}

          {/* Adults only */}
          <div className="field">
            <label className="h3" style={{display:'block', marginBottom:8}}>Adults only</label>
            <button
              type="button"
              className="btn"
              onClick={addAdult}
              disabled={totalTravelers >= MAX_TRAVELERS}
            >
              + Add Adult
            </button>

            {adults.map((a, i) => (
              <div key={`a-${i}`} className="card" style={{marginTop:10, padding:12}}>
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
                      }}
                    />
                  </div>
                </div>
                <button type="button" className="btn secondary" onClick={() => removeAdult(i)}>Remove</button>
              </div>
            ))}
          </div>

          {/* Children */}
          <div className="field" style={{marginTop:16}}>
            <label className="h3" style={{display:'block', marginBottom:8}}>Children</label>
            <button
              type="button"
              className="btn"
              onClick={addChild}
              disabled={totalTravelers >= MAX_TRAVELERS}
            >
              + Add Child
            </button>

            {children.map((c, i) => (
              <div key={`c-${i}`} className="card" style={{marginTop:10, padding:12}}>
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
                      }}
                    />
                  </div>
                </div>
                <button type="button" className="btn secondary" onClick={() => removeChild(i)}>Remove</button>
              </div>
            ))}
          </div>

          <div className="muted" style={{marginTop:8}}>
            Total Travelers: {totalTravelers} / {MAX_TRAVELERS}
          </div>
          {errors.travelers && <div className="help" style={{color:'#e11d48'}}>{errors.travelers}</div>}

          {/* Optional document */}
          <div className="field" style={{marginTop:16}}>
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
              Select a Package <span style={{color:'#e11d48'}}>*</span>
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
            {errors.package && <div className="help" style={{color:'#e11d48'}}>{errors.package}</div>}
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
