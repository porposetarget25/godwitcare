import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReg } from '../state/registration'

type Errors = Partial<Record<
  | 'firstName'
  | 'lastName'
  | 'dob'
  | 'gender'
  | 'primary'
  | 'carer'
  | 'email'
  | 'password',
  string
>>

export default function Step1() {
  const { draft, setDraft } = useReg()
  const nav = useNavigate()
  const [errors, setErrors] = useState<Errors>({})

  function validate(): boolean {
    const next: Errors = {}
    if (!draft['First Name']?.trim()) next.firstName = 'Required'
    if (!draft['Last Name']?.trim()) next.lastName = 'Required'
    if (!draft['Date of Birth']) next.dob = 'Required'
    if (!draft['Gender']) next.gender = 'Required'
    if (!draft['Primary WhatsApp Number']?.trim()) next.primary = 'Required'
    if (!draft['Carer/Secondary WhatsApp Number']?.trim()) next.carer = 'Required'
    if (!draft['Email Address']?.trim()) next.email = 'Required'
    if (!draft['Account Password']?.trim()) next.password = 'Required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function next(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    nav('/register/2')
  }

  return (
    <section className="section">
      <div className="form">
        <h2>Personal Information</h2>
        <form className="grid" onSubmit={next} noValidate>
          <div className="grid two">
            <div className="field">
              <label>First Name <span style={{color:'#e11d48'}}>*</span></label>
              <input
                value={draft['First Name']}
                onChange={(e) => setDraft({ ...draft, ['First Name']: e.target.value })}
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && <div className="help" style={{color:'#e11d48'}}>{errors.firstName}</div>}
            </div>
            <div className="field">
              <label>Middle Name</label>
              <input
                value={draft['Middle Name']}
                onChange={(e) => setDraft({ ...draft, ['Middle Name']: e.target.value })}
              />
            </div>
          </div>

          <div className="grid two">
            <div className="field">
              <label>Last Name <span style={{color:'#e11d48'}}>*</span></label>
              <input
                value={draft['Last Name']}
                onChange={(e) => setDraft({ ...draft, ['Last Name']: e.target.value })}
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && <div className="help" style={{color:'#e11d48'}}>{errors.lastName}</div>}
            </div>
            <div className="field">
              <label>Date of Birth <span style={{color:'#e11d48'}}>*</span></label>
              <input
                type="date"
                value={draft['Date of Birth']}
                onChange={(e) => setDraft({ ...draft, ['Date of Birth']: e.target.value })}
                aria-invalid={!!errors.dob}
              />
              {errors.dob && <div className="help" style={{color:'#e11d48'}}>{errors.dob}</div>}
            </div>
          </div>

          <div className="grid two">
            <div className="field">
              <label>Gender <span style={{color:'#e11d48'}}>*</span></label>
              <select
                value={draft['Gender']}
                onChange={(e) => setDraft({ ...draft, ['Gender']: e.target.value })}
                aria-invalid={!!errors.gender}
              >
                <option value="">Select Gender</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
              {errors.gender && <div className="help" style={{color:'#e11d48'}}>{errors.gender}</div>}
            </div>
            <div className="field">
              <label>Primary WhatsApp Number <span style={{color:'#e11d48'}}>*</span></label>
              <input
                placeholder="+1234567890"
                value={draft['Primary WhatsApp Number']}
                onChange={(e) => setDraft({ ...draft, ['Primary WhatsApp Number']: e.target.value })}
                aria-invalid={!!errors.primary}
              />
              {errors.primary && <div className="help" style={{color:'#e11d48'}}>{errors.primary}</div>}
            </div>
          </div>

          <div className="grid two">
            <div className="field">
              <label>Carer/Secondary WhatsApp Number <span style={{color:'#e11d48'}}>*</span></label>
              <input
                placeholder="+1234567890"
                value={draft['Carer/Secondary WhatsApp Number']}
                onChange={(e) => setDraft({ ...draft, ['Carer/Secondary WhatsApp Number']: e.target.value })}
                aria-invalid={!!errors.carer}
              />
              {errors.carer && <div className="help" style={{color:'#e11d48'}}>{errors.carer}</div>}
            </div>
            <div className="field">
              <label>Email Address <span style={{color:'#e11d48'}}>*</span></label>
              <input
                type="email"
                placeholder="you@example.com"
                value={draft['Email Address']}
                onChange={(e) => setDraft({ ...draft, ['Email Address']: e.target.value })}
                aria-invalid={!!errors.email}
              />
              {errors.email && <div className="help" style={{color:'#e11d48'}}>{errors.email}</div>}
            </div>
          </div>

          <div className="field">
            <label>Create Password <span style={{color:'#e11d48'}}>*</span></label>
            <input
              type="password"
              placeholder="Choose a secure password"
              value={draft['Account Password'] || ''}
              onChange={(e) => setDraft({ ...draft, ['Account Password']: e.target.value })}
              aria-invalid={!!errors.password}
            />
            {errors.password && <div className="help" style={{color:'#e11d48'}}>{errors.password}</div>}
          </div>

          <div className="actions">
            <button className="btn block">Save Information &amp; Continue</button>
          </div>
        </form>
      </div>
    </section>
  )
}
