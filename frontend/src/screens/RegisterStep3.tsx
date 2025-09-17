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

  // NEW: local lists for adults and children
  const [adults, setAdults] = useState<Person[]>([])
  const [children, setChildren] = useState<Person[]>([])

  const MAX_TRAVELERS = 6

  // Helpers to read values safely
  const from = draft['Travelling From']?.trim() ?? ''
  const to = draft['Travelling To (UK & Europe)']?.trim() ?? ''
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
  function removeAdult(idx: number) { setAdults(a => a.filter((_, i) => i !== idx)) }

  function addChild() {
    if (totalTravelers >= MAX_TRAVELERS) return
    setChildren(c => [...c, { fullName: '', dateOfBirth: '' }])
  }
  function removeChild(idx: number) { setChildren(c => c.filter((_, i) => i !== idx)) }

  function validate(): boolean {
    const next: Errors = {}
    if (!from) next.from = 'Required'
    if (!to) next.to = 'Required'
    if (!start) next.start = 'Required'
    if (!end) next.end = 'Required'
    if (!pkg) next.package = 'Please select a package'
    if (!next.start && !next.end && dateProblem) next.dates = dateProblem

    // NEW: validate travelers (optional but recommended)
    const merged = [...adults, ...children]
    const cleaned = merged.filter(t => t.fullName.trim() && t.dateOfBirth)
    if (cleaned.length !== merged.length) {
      // Allow blank rows, but they will be dropped silently on submit.
      // If you want a hard requirement, uncomment the next line:
      // next.travelers = 'Please fill name and date of birth for each traveler or remove blank rows.'
    }
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
      // Merge adults + children -> travelers
      const travelers = [...adults, ...children]
        .filter(t => t.fullName.trim() && t.dateOfBirth)           // keep valid rows
        .map(t => ({ fullName: t.fullName.trim(), dateOfBirth: t.dateOfBirth })) // yyyy-MM-dd

      // Put the travelers array on the draft object so api.ts can map it
      const payload = { ...draft, travelers } as any

      // 1) Save registration (now includes travelers)
      const created = await saveRegistration(payload)

      // 2) Optional document upload
      if (file) {
        await uploadDocument(created.id!, file)
      }

      // 3) Create user account using fields captured in Step 1
      const firstName = draft['First Name'] || ''
      const lastName  = draft['Last Name']  || ''
      const email     = (draft['Email Address'] || '').trim()
      const password  = (draft['Account Password'] || '').trim()

      if (email && password) {
        try { await registerAuthUser(firstName, lastName, email, password) }
        catch (err) { console.warn('registerAuthUser:', err) }
        try { await login(email, password) }
        catch (err) { console.warn('auto-login failed:', err) }
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
            <button type="button" className="btn" onClick={addAdult} disabled={totalTravelers >= MAX_TRAVELERS}>
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
            <button type="button" className="btn" onClick={addChild} disabled={totalTravelers >= MAX_TRAVELERS}>
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
