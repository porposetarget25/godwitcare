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
        <div className="strong" style={{marginBottom:8}}>Questionnaire</div>
        {data.answers && Object.keys(data.answers).length>0 ? (
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#f3f4f6', textAlign:'left'}}>
                <th style={{padding:'6px 8px'}}>Question ID</th>
                <th style={{padding:'6px 8px'}}>Answer</th>
                <th style={{padding:'6px 8px'}}>Details</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.answers).map(([qid, ans])=>{
                const note = (data.detailsByQuestion || {})[qid]
                const isYes = String(ans).toLowerCase() === 'yes'
                return (
                  <tr
                    key={qid}
                    style={{
                      borderTop:'1px solid #e5e7eb',
                      background: isYes ? '#fef3c7' : 'transparent' // orange-100 for Yes
                    }}
                  >
                    <td style={{padding:'6px 8px', fontSize:13, fontWeight:500}}>{qid}</td>
                    <td style={{padding:'6px 8px'}}>{String(ans)}</td>
                    <td style={{padding:'6px 8px', color: note ? '#374151' : '#9ca3af'}}>
                      {note ? note : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : <div className="muted">No answers</div>}
      </div>
    </section>
  )
}
