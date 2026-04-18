import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkAuthAvailability } from '../api'
import { COUNTRY_OPTIONS } from '../lib/countries'
import { useReg } from '../state/registration'

type Errors = Partial<Record<
  | 'firstName'
  | 'lastName'
  | 'dob'
  | 'gender'
  | 'primary'
  | 'password'
  | 'email',
  string
>>

// ===== Date helpers & validation =====
const ymd = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// cutoff date = today minus 18 years
const today = new Date();
const cutoff18 = new Date(today);
cutoff18.setFullYear(today.getFullYear() - 18);
const CUTOFF_18_YMD = ymd(cutoff18);

// Optional lower bound to avoid accidental 1800s
const MIN_DOB_YMD = '1900-01-01';

// validator
function validateDob(value?: string): string | null {
  if (!value) return 'Date of birth is required.';
  // force local midnight to avoid TZ edge cases
  const dob = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return 'Invalid date.';

  const now = new Date();
  if (dob > now) return 'Date of birth cannot be in the future.';
  if (dob > cutoff18) return 'You must be at least 18 years old.';
  return null;
}

function isValidEmail(value: string): boolean {
  // simple & robust enough: chars@chars.domain
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}



export default function Step1() {
  const { draft, setDraft } = useReg()
  const nav = useNavigate()
  const [errors, setErrors] = useState<Errors>({})
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)

  // sensible defaults
  const defaultPrimaryDial = useMemo(
    () => draft.primaryDial || '+91',
    [draft.primaryDial]
  )
  const defaultSecondaryDial = useMemo(
    () => draft.secondaryDial || '+91',
    [draft.secondaryDial]
  )

  function normalizeDigits(s: string): string {
    return String(s || '').replace(/[^\d]/g, '')
  }

  function validate(): boolean {
    const next: Errors = {}

    if (!draft['First Name']?.trim()) next.firstName = 'Required'
    if (!draft['Last Name']?.trim()) next.lastName = 'Required'

    // Use detailed DOB validation
    const dobErr = validateDob(draft['Date of Birth'])
    if (dobErr) next.dob = dobErr

    if (!draft['Gender']) next.gender = 'Required'
    if (!draft['Primary WhatsApp Number']?.trim()) next.primary = 'Required'
    if (!draft['Account Password']?.trim()) next.password = 'Required'
    // 👇 Only validate if user typed something
    const email = (draft['Email Address'] || '').trim()
    if (email && !isValidEmail(email)) {
      next.email = 'Please enter a valid email address.'
    }
    if (!next.primary && errors.primary) next.primary = errors.primary
    if (!next.email && errors.email) next.email = errors.email

    setErrors(next)
    return Object.keys(next).length === 0
  }

  useEffect(() => {
    const rawEmail = (draft['Email Address'] || '').trim()
    if (!rawEmail) {
      setErrors(prev => ({ ...prev, email: undefined }))
      return
    }
    if (!isValidEmail(rawEmail)) return

    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const result = await checkAuthAvailability(rawEmail, undefined)
        if (cancelled) return
        setErrors(prev => ({
          ...prev,
          email: result.emailRegistered ? 'This email is already registered.' : undefined,
        }))
      } catch {
        // keep UX non-blocking if validation API fails
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [draft['Email Address']])

  useEffect(() => {
    const primaryDial = draft.primaryDial || defaultPrimaryDial
    const digits = normalizeDigits(draft['Primary WhatsApp Number'] || '')
    if (!digits) {
      setErrors(prev => ({ ...prev, primary: undefined }))
      return
    }

    const fullPrimary = `${primaryDial}${digits}`
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const result = await checkAuthAvailability(undefined, fullPrimary)
        if (cancelled) return
        setErrors(prev => ({
          ...prev,
          primary: result.whatsAppRegistered ? "This what'sapp number is already registered" : undefined,
        }))
      } catch {
        // keep UX non-blocking if validation API fails
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [draft['Primary WhatsApp Number'], draft.primaryDial, defaultPrimaryDial])

  async function next(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    // Final availability guard on submit (must block navigation if already registered)
    const email = (draft['Email Address'] || '').trim()
    const primaryDial = draft.primaryDial || defaultPrimaryDial
    const primaryDigits = normalizeDigits(draft['Primary WhatsApp Number'] || '')
    const primaryFull = `${primaryDial}${primaryDigits}`
    try {
      setIsCheckingAvailability(true)
      const result = await checkAuthAvailability(email || undefined, primaryFull)
      const emailError = result.emailRegistered ? 'This email is already registered.' : undefined
      const primaryError = result.whatsAppRegistered ? "This what'sapp number is already registered" : undefined

      if (emailError || primaryError) {
        setErrors(prev => ({
          ...prev,
          email: emailError,
          primary: primaryError,
        }))
        return
      }
    } catch {
      // keep UX non-blocking if validation API fails
    } finally {
      setIsCheckingAvailability(false)
    }

    // Compose full international numbers before proceeding
    const secondaryDial = draft.secondaryDial || defaultSecondaryDial

    const secondaryRaw = normalizeDigits(draft['Carer/Secondary WhatsApp Number'] || '')
    const secondaryFull = secondaryRaw ? `${secondaryDial}${secondaryRaw}` : ''

    const updated = {
      ...draft,
      primaryDial,
      secondaryDial,
      ['Primary WhatsApp Number']: primaryFull,
      ['Carer/Secondary WhatsApp Number']: secondaryFull, // may be ''
      Username: primaryFull, // Username = primary WhatsApp number
    }

    setDraft(updated)
    nav('/register/2')
  }

  return (
    <section className="section">
      <div className="form">
        <h2>Personal Information</h2>
        <form className="grid" onSubmit={next} noValidate>
          <div className="grid two">
            <div className="field">
              <label>First Name <span style={{ color: '#e11d48' }}>*</span></label>
              <input
                value={draft['First Name'] || ''}
                onChange={(e) => setDraft({ ...draft, ['First Name']: e.target.value })}
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && <div className="help" style={{ color: '#e11d48' }}>{errors.firstName}</div>}
            </div>
            <div className="field">
              <label>Middle Name</label>
              <input
                value={draft['Middle Name'] || ''}
                onChange={(e) => setDraft({ ...draft, ['Middle Name']: e.target.value })}
              />
            </div>
          </div>

          <div className="grid two">
            <div className="field">
              <label>Last Name <span style={{ color: '#e11d48' }}>*</span></label>
              <input
                value={draft['Last Name'] || ''}
                onChange={(e) => setDraft({ ...draft, ['Last Name']: e.target.value })}
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && <div className="help" style={{ color: '#e11d48' }}>{errors.lastName}</div>}
            </div>
            <div className="field">
              <label>
                Date of Birth <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <input
                type="date"
                value={draft['Date of Birth'] || ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft({ ...draft, ['Date of Birth']: v });
                  const err = validateDob(v);
                  setErrors((prev) => ({ ...prev, dob: err || undefined }));
                }}
                onBlur={(e) => {
                  const err = validateDob(e.target.value);
                  setErrors((prev) => ({ ...prev, dob: err || undefined }));
                }}
                aria-invalid={!!errors.dob}
                min={MIN_DOB_YMD}
                max={CUTOFF_18_YMD}  // blocks selecting dates that make user < 18
              />
              {errors.dob && (
                <div role="alert" className="small" style={{ color: '#b91c1c', marginTop: 4 }}>
                  {errors.dob}
                </div>
              )}
            </div>
          </div>

          <div className="grid two">
            <div className="field">
              <label>Gender <span style={{ color: '#e11d48' }}>*</span></label>
              <select
                value={draft['Gender'] || ''}
                onChange={(e) => setDraft({ ...draft, ['Gender']: e.target.value })}
                aria-invalid={!!errors.gender}
              >
                <option value="">Select Gender</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
              {errors.gender && <div className="help" style={{ color: '#e11d48' }}>{errors.gender}</div>}
            </div>

            <div className="field">
              <label>Primary WhatsApp Number <span style={{ color: '#e11d48' }}>*</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={draft.primaryDial || defaultPrimaryDial}
                  onChange={e => setDraft({ ...draft, primaryDial: e.target.value })}
                  style={{ minWidth: 220 }}
                >
                  {COUNTRY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="1234567890"
                  value={draft['Primary WhatsApp Number'] || ''}
                  onChange={(e) => {
                    setDraft({ ...draft, ['Primary WhatsApp Number']: e.target.value })
                    if (errors.primary === 'Required') {
                      setErrors(prev => ({ ...prev, primary: undefined }))
                    }
                  }}
                  aria-invalid={!!errors.primary}
                />
              </div>
              {errors.primary && <div className="help" style={{ color: '#e11d48' }}>{errors.primary}</div>}
            </div>
          </div>

          <div className="grid two">
            <div className="field">
              <label>Carer/Secondary WhatsApp Number</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={draft.secondaryDial || defaultSecondaryDial}
                  onChange={e => setDraft({ ...draft, secondaryDial: e.target.value })}
                  style={{ minWidth: 220 }}
                >
                  {COUNTRY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="1234567890"
                  value={draft['Carer/Secondary WhatsApp Number'] || ''}
                  onChange={(e) => setDraft({ ...draft, ['Carer/Secondary WhatsApp Number']: e.target.value })}
                />
              </div>
            </div>

            <div className="field">
              <label>Email Address</label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={draft['Email Address'] || ''}
                onChange={(e) => {
                  const v = e.target.value
                  setDraft({ ...draft, ['Email Address']: v })
                  // live-validate only when user has typed something (optional)
                  const msg = v.trim() && !isValidEmail(v) ? 'Please enter a valid email address.' : undefined
                  setErrors(prev => ({ ...prev, email: msg }))
                }}
                onBlur={(e) => {
                  const v = e.target.value
                  const msg = v.trim() && !isValidEmail(v) ? 'Please enter a valid email address.' : undefined
                  setErrors(prev => ({ ...prev, email: msg }))
                }}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <div className="help" style={{ color: '#e11d48' }}>
                  {errors.email}
                </div>
              )}
            </div>

          </div>

          <div className="field">
            <label>Create Password <span style={{ color: '#e11d48' }}>*</span></label>
            <input
              type="password"
              placeholder="Choose a secure password"
              value={draft['Account Password'] || ''}
              onChange={(e) => setDraft({ ...draft, ['Account Password']: e.target.value })}
              aria-invalid={!!errors.password}
            />
            {errors.password && <div className="help" style={{ color: '#e11d48' }}>{errors.password}</div>}
          </div>

          <div className="actions">
            <button className="btn block" disabled={isCheckingAvailability}>
              {isCheckingAvailability ? 'Checking details...' : 'Save Information & Continue'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
