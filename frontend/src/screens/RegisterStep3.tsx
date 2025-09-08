import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReg } from '../state/registration'
import { saveRegistration, uploadDocument } from '../api'

export default function Step3(){
  const { draft, setDraft } = useReg()
  const nav = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  async function submit(e: React.FormEvent){
    e.preventDefault()
    const created = await saveRegistration(draft as any)
    if(file){ await uploadDocument(created.id!, file) }
    localStorage.removeItem('reg-draft')
    nav('/home')
  }
  return (
    <section className="section">
      <div className="form">
        <h2>Trip Details</h2>
        <form className="grid" onSubmit={submit}>
          <div className="grid two">
            <div className="field">
              <label>Travelling From</label>
              <input value={draft['Travelling From']} onChange={e=>setDraft({...draft, ['Travelling From']: e.target.value})}/>
            </div>
            <div className="field">
              <label>Travelling To (UK &amp; Europe)</label>
              <input value={draft['Travelling To (UK & Europe)']} onChange={e=>setDraft({...draft, ['Travelling To (UK & Europe)']: e.target.value})}/>
            </div>
          </div>

          <div className="grid two">
            <div className="field">
              <label>Travel Start Date</label>
              <input type="date" value={draft['Travel Start Date']} onChange={e=>setDraft({...draft, ['Travel Start Date']: e.target.value})}/>
            </div>
            <div className="field">
              <label>Travel End Date</label>
              <input type="date" value={draft['Travel End Date']} onChange={e=>setDraft({...draft, ['Travel End Date']: e.target.value})}/>
            </div>
          </div>

          <div className="field">
            <label>Boarding Pass / E-Ticket</label>
            <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e=>setFile(e.target.files?.[0]||null)} />
            <div className="help">JPG, PNG, PDF formats supported</div>
          </div>

          <div className="field">
            <label>Select a Package</label>
            <div className="actions">
              {[7,14,30].map(p => (
                <button key={p} type="button" className={'btn ' + (draft['Package Days']===p?'':'secondary')}
                        onClick={()=>setDraft({...draft, ['Package Days']: p})}>{p} Days</button>
              ))}
            </div>
          </div>

          <div className="actions"><button className="btn block">Save &amp; Finish</button></div>
        </form>
      </div>
    </section>
  )
}
