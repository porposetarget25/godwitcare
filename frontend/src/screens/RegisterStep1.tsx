import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useReg } from '../state/registration'

export default function Step1(){
  const { draft, setDraft } = useReg()
  const nav = useNavigate()
  function next(e: React.FormEvent){ e.preventDefault(); nav('/register/2') }
  return (
    <section className="section">
      <div className="form">
        <h2>Personal Information</h2>
        <form className="grid" onSubmit={next}>
          <div className="grid two">
            <div className="field">
              <label>First Name *</label>
              <input required value={draft['First Name']} onChange={e=>setDraft({...draft, ['First Name']: e.target.value})}/>
            </div>
            <div className="field">
              <label>Middle Name</label>
              <input value={draft['Middle Name']} onChange={e=>setDraft({...draft, ['Middle Name']: e.target.value})}/>
            </div>
          </div>

          <div className="grid two">
            <div className="field">
              <label>Last Name *</label>
              <input required value={draft['Last Name']} onChange={e=>setDraft({...draft, ['Last Name']: e.target.value})}/>
            </div>
            <div className="field">
              <label>Date of Birth *</label>
              <input required type="date" value={draft['Date of Birth']} onChange={e=>setDraft({...draft, ['Date of Birth']: e.target.value})}/>
            </div>
          </div>

          <div className="grid two">
            <div className="field">
              <label>Gender *</label>
              <select required value={draft['Gender']} onChange={e=>setDraft({...draft, ['Gender']: e.target.value})}>
                <option value="">Select Gender</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div className="field">
              <label>Primary WhatsApp Number *</label>
              <input required placeholder="+1234567890" value={draft['Primary WhatsApp Number']} onChange={e=>setDraft({...draft, ['Primary WhatsApp Number']: e.target.value})}/>
            </div>
          </div>

          <div className="grid two">
            <div className="field">
              <label>Carer/Secondary WhatsApp Number *</label>
              <input required placeholder="+1234567890" value={draft['Carer/Secondary WhatsApp Number']} onChange={e=>setDraft({...draft, ['Carer/Secondary WhatsApp Number']: e.target.value})}/>
            </div>
            <div className="field">
              <label>Email Address</label>
              <input type="email" placeholder="you@example.com" value={draft['Email Address']} onChange={e=>setDraft({...draft, ['Email Address']: e.target.value})}/>
            </div>
          </div>

          <div className="actions">
            <button className="btn block">Save Information &amp; Continue</button>
          </div>
        </form>
      </div>
    </section>
  )
}
