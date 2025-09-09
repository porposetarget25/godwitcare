import React from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <section className="section home">
      <div className="page-head">
        <h1 className="page-title">My Travel Package</h1>
      </div>

      {/* PACKAGE CARD */}
      <div className="package-card">
        <div className="pc-body">
          <div className="pc-lines">
            <div><span className="muted strong">Destination:</span> <span className="strong">Europe</span></div>
            <div className="muted">Daily Support: 9:00am - 9:00pm</div>
            <div className="muted">Time Difference: +6 hours from Origin (GMT+2)</div>
          </div>

          <div className="pc-actions">
            <a 
              className="btn" 
              href="https://wa.me/64211899955" 
              target="_blank" 
              rel="noreferrer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M20.5 11.5a8.5 8.5 0 1 1-15.5 5L3 21l4.5-2a8.5 8.5 0 1 1 13  -7.5Z" stroke="white" strokeWidth="1.6"/>
                <path d="M16.2 14.5c-.2.6-1.1 1.1-1.7 1.1-.5 0-1.1-.1-1.9-.5a8.6 8.6 0 0 1-3.4-3.2c-.6-1-.9-1.8-.9-2.4 0-.6.4-1.5 1-1.7.2-.1.4-.1.7 0 .2.1.5.9.6 1.2.1.3.1.5 0 .7-.1.2-.2.4-.4.6-.2.1-.2.3-.1.6.1.3.5 1.1 1.2 1.7.8.9 1.6 1.2 1.8 1.3.3.1.5.1.7 0 .2-.1.4-.3.6-.5.2-.3.5-.4.8-.3.3.1 1.3.6 1.4.8.1.2 0 .5-.2.6Z" fill="white"/>
              </svg>
              <span>WhatsApp</span>
          </a>


            <button className="btn outline">
              {/* Phone icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 3h4l1 4-2 1a11 11 0 0 0 5 5l1.1-2H19l2 4-2 2c-1.2.5-3.5.5-6.8-1.6C8.8 13.8 6.7 11.2 6 9c-.5-1.3-.5-2.3 0-3.1L6 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>Call</span>
            </button>
          </div>
        </div>
      </div>

      {/* QUICK LINKS */}
      <div className="ql-head">Quick Links</div>
      <div className="quick-grid">
        <Link to="/consultation" className="quick">
          <span>I Need a Consultation</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
        <Link to="/home#cases" className="quick">
          <span>Case Notes</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" /></svg>
        </Link>
        <Link to="/home#appts" className="quick">
          <span>Appointments</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" /></svg>
        </Link>
      </div>

      {/* FEATURED OFFERS */}
      <div className="offers-head">Featured Offers</div>
      <div className="offers">
        <a className="offer-card" href="#" aria-label="Food & Drink Offers">
          <img src="https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1600&auto=format&fit=crop" alt="" />
          <div className="offer-title">Food & Drink Offers</div>
        </a>
        <a className="offer-card" href="#" aria-label="Taxi & Transport Offers">
          <img src="https://images.unsplash.com/photo-1593950315186-76a92975b60c?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="" />
          <div className="offer-title">Taxi & Transport Offers</div>
        </a>
        <a className="offer-card" href="#" aria-label="Entertainment Offers">
          <img src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1600&auto=format&fit=crop" alt="" />
          <div className="offer-title">Entertainment Offers</div>
        </a>
        <a className="offer-card" href="#" aria-label="Accommodation Offers">
          <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8aG90ZWxzfGVufDB8fDB8fHww" alt="" />
          <div className="offer-title">Accommodation Offers</div>
        </a>
      </div>
    </section>
  )
}
