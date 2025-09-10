import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReg } from '../state/registration'
import {
  saveRegistration,
  uploadDocument,
  registerAuthUser,  // create user account
  login,              // optional auto-login
} from '../api'

type Errors = Partial<Record<
  | 'from'
  | 'to'
  | 'start'
  | 'end'
  | 'dates'
  | 'package',
  string
>>

export default function Step3() {
  const { draft, setDraft } = useReg()
  const nav = useNavigate()

  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)

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

  function validate(): boolean {
    const next: Errors = {}
    if (!from) next.from = 'Required'
    if (!to) next.to = 'Required'
    if (!start) next.start = 'Required'
    if (!end) next.end = 'Required'
    if (!pkg) next.package = 'Please select a package'
    if (!next.start && !next.end && dateProblem) next.dates = dateProblem
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    if (submitting) return
    setSubmitting(true)

    try {
      // 1) Save registration
      const created = await saveRegistration(draft as any)

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
        try {
          await registerAuthUser(firstName, lastName, email, password)
        } catch (err) {
          // If the email already exists, backend can return 400/409. Not fatal.
          console.warn('registerAuthUser failed or user already exists:', err)
        }

        // 4) Auto-login so the session is established now (optional)
        try {
          await login(email, password)
        } catch (err) {
          console.warn('auto-login failed:', err)
        }
      }

      // 5) Finish
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
              <label>
                Travelling From <span style={{color:'#e11d48'}}>*</span>
              </label>
              <input
                required
                value={from}
                onChange={(e) =>
                  setDraft({ ...draft, ['Travelling From']: e.target.value })
                }
                aria-invalid={!!errors.from}
              />
              {errors.from && <div className="help" style={{color:'#e11d48'}}>{errors.from}</div>}
            </div>

            <div className="field">
              <label>
                Travelling To (UK &amp; Europe){' '}
                <span style={{color:'#e11d48'}}>*</span>
              </label>
              <input
                required
                value={to}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    ['Travelling To (UK & Europe)']: e.target.value,
                  })
                }
                aria-invalid={!!errors.to}
              />
              {errors.to && <div className="help" style={{color:'#e11d48'}}>{errors.to}</div>}
            </div>
          </div>

          {/* Dates */}
          <div className="grid two">
            <div className="field">
              <label>
                Travel Start Date <span style={{color:'#e11d48'}}>*</span>
              </label>
              <input
                type="date"
                required
                value={start}
                onChange={(e) =>
                  setDraft({ ...draft, ['Travel Start Date']: e.target.value })
                }
                aria-invalid={!!(errors.start || errors.dates)}
              />
              {errors.start && <div className="help" style={{color:'#e11d48'}}>{errors.start}</div>}
            </div>

            <div className="field">
              <label>
                Travel End Date <span style={{color:'#e11d48'}}>*</span>
              </label>
              <input
                type="date"
                required
                value={end}
                onChange={(e) =>
                  setDraft({ ...draft, ['Travel End Date']: e.target.value })
                }
                aria-invalid={!!(errors.end || errors.dates)}
              />
              {errors.end && <div className="help" style={{color:'#e11d48'}}>{errors.end}</div>}
            </div>
          </div>

          {/* Cross-field date error */}
          {!errors.start && !errors.end && errors.dates && (
            <div className="help" style={{color:'#e11d48'}}>{errors.dates}</div>
          )}

          {/* Optional document */}
          <div className="field">
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
