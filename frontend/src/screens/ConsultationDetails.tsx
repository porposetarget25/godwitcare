import React from 'react'
import { Link } from 'react-router-dom'

export default function ConsultationDetails() {
  return (
    <section className="section">
      <div className="page-head" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h1 className="page-title">Consultation Details</h1>
        <Link to="/consultation/tracker" className="btn secondary">Back</Link>
      </div>

      <div className="card">
        <div className="strong">Patient Contact & Address</div>
        <div className="muted small" style={{marginTop:4}}>+1 555-123-4567</div>
        <div className="muted small">456 Oak Avenue, Springfield</div>

        <div className="strong" style={{marginTop:16}}>Pre-Consultation Questionnaire</div>
        <div className="muted small">Summary of answers submitted in the previous step.</div>

        <div className="actions" style={{marginTop:16, display:'flex', gap:8, flexWrap:'wrap'}}>
          <a href="tel:+15551234567" className="btn">Call Patient</a>
          <button type="button" className="btn secondary">Schedule a Call</button>
        </div>
      </div>

      <div className="card" style={{marginTop:12}}>
        <div className="field">
          <label className="strong">History of Presenting Complaint</label>
          <textarea placeholder="Enter patient's complaint history..." />
        </div>
        <div className="field" style={{marginTop:12}}>
          <label className="strong">Diagnosis</label>
          <textarea placeholder="Enter patient diagnosis..." />
        </div>
        <div className="field" style={{marginTop:12}}>
          <label className="strong">Medicines</label>
          <textarea placeholder="Prescribe medicines..." />
        </div>
        <div className="field" style={{marginTop:12}}>
          <label className="strong">Recommendations</label>
          <textarea placeholder="Provide recommendations..." />
        </div>

        <div className="actions" style={{marginTop:16}}>
          <button className="btn">Create Prescription</button>
        </div>
      </div>
    </section>
  )
}
