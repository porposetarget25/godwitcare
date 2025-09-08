import React from 'react'
import { Link } from 'react-router-dom'

export default function Home(){
  return (
    <div style={{padding:16}}>
      <h2>My Travel Package</h2>
      <div className="card">
        <div><strong>Destination:</strong> Europe</div>
        <div className="muted">Daily Support: 9:00am - 9:00pm</div>
        <div className="muted">Time Difference: +6 hours from Origin (GMT+2)</div>
        <div className="row" style={{marginTop:12, gap:8}}>
          <a className="btn secondary" href="https://wa.me/" target="_blank">WhatsApp</a>
          <button className="btn secondary">Call</button>
        </div>
      </div>
      <div style={{marginTop:16}}>
        <div className="muted" style={{marginBottom:8}}>Quick Links</div>
        <div className="row" style={{flexWrap:'wrap'}}>
          <Link className="btn secondary" to="/consultation">I Need a Consultation</Link>
          <button className="btn secondary" disabled>Case Notes</button>
          <button className="btn secondary" disabled>Appointments</button>
        </div>
      </div>
    </div>
  )
}
