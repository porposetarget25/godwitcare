import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { doctorListConsultations } from '../api'

type Row = { id:number; patientEmail:string; patientName:string; createdAt:string; status:string }

export default function DoctorConsultations(){
  const [rows,setRows]=useState<Row[]>([])
  useEffect(()=>{(async()=>{
    try{ setRows(await doctorListConsultations()) }catch{}
  })()},[])
  return (
    <section className="section">
      <h1 className="page-title">Consultation Requests</h1>
      <div className="card">
        {rows.length===0 && <div className="muted">No consultations yet.</div>}
        {rows.map(r=>(
          <div key={r.id} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderTop:'1px solid var(--line)'}}>
            <div>
              <div className="strong">{r.patientName || r.patientEmail}</div>
              <div className="muted small">#{r.id} • {new Date(r.createdAt).toLocaleString()} • {r.status}</div>
            </div>
            <Link className="btn" to={`/doctor/consultations/${r.id}`}>Open</Link>
          </div>
        ))}
      </div>
    </section>
  )
}
