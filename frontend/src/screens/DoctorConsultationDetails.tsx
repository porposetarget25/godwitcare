import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doctorGetConsultation } from '../api'

export default function DoctorConsultationDetails(){
  const {id}=useParams()
  const [data,setData]=useState<any>(null)
  useEffect(()=>{(async()=>{
    try{ setData(await doctorGetConsultation(Number(id))) }catch{}
  })()},[id])

  if(!data) return <section className="section"><div className="muted">Loading…</div></section>

  const phoneDigits = (data.contactPhone||'').replace(/[^\d+]/g,'')
  const waUrl = phoneDigits ? `https://wa.me/${phoneDigits.replace(/^0+/,'')}` : ''

  return (
    <section className="section">
      <div className="page-head" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h1 className="page-title">Consultation #{data.id}</h1>
        <Link className="btn secondary" to="/doctor/consultations">Back</Link>
      </div>

      <div className="card">
        <div className="strong">Patient</div>
        <div>{data.patient.firstName} {data.patient.lastName}</div>
        <div className="muted small">{data.patient.email}</div>
        <div className="muted small">Logged at: {new Date(data.createdAt).toLocaleString()}</div>
      </div>

      <div className="card" style={{marginTop:12}}>
        <div className="strong">Patient Contact & Address</div>
        <div><span className="muted">Name:</span> {data.contactName || '—'}</div>
        <div><span className="muted">Phone (WhatsApp):</span> {data.contactPhone || '—'}</div>
        <div><span className="muted">Address:</span> {data.contactAddress || '—'}</div>
        {waUrl && <a className="btn" href={waUrl} target="_blank" rel="noreferrer" style={{marginTop:8}}>WhatsApp Patient</a>}
      </div>

      <div className="card" style={{marginTop:12}}>
        <div className="strong">Questionnaire</div>
        {data.answers && Object.keys(data.answers).length>0 ? (
          <ul style={{marginTop:6}}>
            {Object.entries(data.answers).map(([k,v])=>(
              <li key={k}><span className="strong">{k}</span>: <span className="muted">{String(v)}</span></li>
            ))}
          </ul>
        ) : <div className="muted">No answers</div>}
      </div>
    </section>
  )
}
