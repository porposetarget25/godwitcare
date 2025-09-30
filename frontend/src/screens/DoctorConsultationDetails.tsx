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
        <h1 className="page-title">Consultation -{data.id}</h1>
        <Link className="btn secondary" to="/doctor/consultations">Back</Link>
      </div>

      {/* Patient summary card (styled like your mock) */}
    <div className="card" style={{ padding: 16 }}>
      {(() => {
        const created = new Date(data.createdAt)
        const timeStr = created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const dateStr = created.toLocaleDateString([], { day: '2-digit', month: 'short' }) // e.g. 24 May

        // If your API later includes DOB (e.g., data.patient.dob = '1990-03-15'),
        // this will render it nicely. Otherwise it shows "—".
        const dobRaw = data?.patient?.dob
        const dobStr = dobRaw
          ? new Date(dobRaw).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })
          : '—'

        return (
          <>
            {/* top row: name + timestamp */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>
                {data.patient.firstName} {data.patient.lastName}
              </div>
              <div className="muted small" style={{ whiteSpace: 'nowrap' }}>
                {timeStr} • {dateStr}
              </div>
            </div>

            {/* info lines */}
            <div className="muted" style={{ marginTop: 8 }}>
              <div style={{ marginTop: 4 }}>
                <span className="strong" style={{ fontWeight: 600 }}>DOB:</span>{' '}
                <span>{dobStr}</span>
              </div>
              <div style={{ marginTop: 4 }}>
                <span className="strong" style={{ fontWeight: 600 }}>Patient ID:</span>{' '}
                <span>{data.patientId ?? '—'}</span>
              </div>
            </div>
          </>
        )
      })()}
    </div>


      <div className="card" style={{marginTop:12}}>
        <div className="strong">Patient Contact & Address</div>
        <div><span className="muted">Phone (WhatsApp):</span> {data.contactPhone || '—'}</div>
        <div><span className="muted">Address:</span> {data.contactAddress || '—'}</div>
        <div><span className="muted">Email:</span> {data.patient.email || '—'}</div>
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
