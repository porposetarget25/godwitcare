import React from 'react'
import { Link } from 'react-router-dom'

export default function ConsultationTracker() {
  return (
    <section className="section">
      <div className="page-head" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h1 className="page-title">Your Consultation Journey</h1>
        <Link to="/home" className="btn secondary">Back to Home</Link>
      </div>

      {/* Step 1 */}
      <div className="card" style={{marginTop:12}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
          <div>
            <div className="strong">Call GodwitCare</div>
            <div className="muted small">Initiate your consultation by logging a call to connect with a healthcare professional.</div>
          </div>
          {/* goes to questionnaire next */}
          <Link to="/consultation/questionnaire" className="btn secondary">In progress</Link>
        </div>
      </div>

      {/* Step 2 */}
      <div className="card" style={{marginTop:12}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
          <div>
            <div className="strong">Complete Pre-Consultation Checklist</div>
            <div className="muted small">Fill out the necessary health questionnaire and consent forms.</div>
          </div>
          <Link to="/consultation/questionnaire" className="btn">Complete Checklist</Link>
        </div>
      </div>

      {/* Step 3 */}
      <div className="card" style={{marginTop:12}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
          <div>
            <div className="strong">Doctor Calling within an hour</div>
            <div className="muted small">A doctor will contact you via WhatsApp to discuss your concerns.</div>
          </div>
          <Link to="/consultation/details" className="btn secondary">Upcoming</Link>
        </div>
      </div>

      {/* Step 4 */}
      <div className="card" style={{marginTop:12}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
          <div>
            <div className="strong">Prescription Issued</div>
            <div className="muted small">Receive your digital prescription via WhatsApp.</div>
          </div>
          <button className="btn secondary" type="button" disabled>Upcoming</button>
        </div>
      </div>

      {/* Step 5 */}
      <div className="card" style={{marginTop:12}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
          <div>
            <div className="strong">Locate Pharmacy</div>
            <div className="muted small">Find the nearest pharmacy to pick up your medicines.</div>
          </div>
          <button className="btn secondary" type="button" disabled>Upcoming</button>
        </div>
      </div>
    </section>
  )
}
