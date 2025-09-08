import React from 'react'
import { Link } from 'react-router-dom'

export default function Dashboard(){
  return (
    <>
      {/* HERO */}
      <section className="hero section">
        <div className="heroGrid">
          <div>
            <h2>Your Trusted Medical Advisor on the Go</h2>
            <p>
              GodwitCare provides instant, reliable medical advice and consultations via WhatsApp,
              ensuring your health is never compromised, no matter where you are in the world.
            </p>
            <div style={{display:'flex', gap:12, marginTop:12}}>
              <Link className="btn" to="/register/1">Register</Link>
              <Link className="btn secondary" to="/login">Login</Link>
            </div>
          </div>
          <img
            alt="Consultation"
            style={{ width:'100%', borderRadius:16, border:'1px solid var(--line)' }}
            src="https://plus.unsplash.com/premium_photo-1661286686818-5823db33959d?q=80&w=1170&auto=format&fit=crop"
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
<section id="how" className="section">
  <div className="kicker">How it works</div>
  <h2 className="h2">Connect · Consult · Recover</h2>
  <div className="cards">
    <div className="card how-card">
      <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
        <path d="M12 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="#0ea5e9" strokeWidth="2"/>
        <path d="M5.1 13.7a9.99 9.99 0 0 1 13.8 0" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round"/>
        <path d="M2 10a14 14 0 0 1 20 0" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <div>
        <strong>Connect</strong>
        <p className="muted">Reach out to our platform from anywhere in the world, effortlessly.</p>
      </div>
    </div>

    <div className="card how-card">
      <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
        <path d="M7 11h6M7 7h10" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round"/>
        <path d="M20 15a3 3 0 0 1-3 3H8l-4 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v9Z" stroke="#0ea5e9" strokeWidth="2" strokeLinejoin="round"/>
      </svg>
      <div>
        <strong>Consult</strong>
        <p className="muted">Have a virtual consultation with an experienced medical professional.</p>
      </div>
    </div>

    <div className="card how-card">
      <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
        <path d="M12.1 21s-7-4.3-9.1-8.1a5.4 5.4 0 0 1 8-7.2l1.1 1.1 1.1-1.1a5.4 5.4 0 0 1 8 7.2c-2.1 3.8-9.1 8.1-9.1 8.1Z" stroke="#0ea5e9" strokeWidth="2" strokeLinejoin="round"/>
      </svg>
      <div>
        <strong>Recover</strong>
        <p className="muted">Receive timely advice and feel confident in your health journey.</p>
      </div>
    </div>
  </div>
</section>


<section id="features" className="section" style={{background:'var(--surface)', borderTop:'1px solid var(--line)', borderBottom:'1px solid var(--line)'}}>
  <h2 className="h2">Key Features</h2>
  <div className="cards">
    
    {/* 24/7 Availability */}
    <div className="card feature-card">
      <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="#0ea5e9" strokeWidth="2"/>
        <path d="M12 7v5l3 2" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <div>
        <strong>24/7 Availability</strong>
        <p className="muted">Access medical advice around the clock, no matter your time zone.</p>
      </div>
    </div>

    {/* Expert Doctors (new stethoscope icon) */}
    <div className="card feature-card">
      <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
        <circle cx="18" cy="6" r="3" stroke="#0ea5e9" strokeWidth="2"/>
        <path d="M18 9v3a4 4 0 0 1-8 0V5" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="8" cy="19" r="3" stroke="#0ea5e9" strokeWidth="2"/>
        <path d="M11 19h4a3 3 0 0 0 3-3v-4" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <div>
        <strong>Expert Doctors</strong>
        <p className="muted">Consult with licensed and experienced healthcare professionals.</p>
      </div>
    </div>

    {/* Global Coverage */}
    <div className="card feature-card">
      <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="#0ea5e9" strokeWidth="2"/>
        <path d="M3 12h18M12 3c3 3.5 3 14 0 18M8 3c-1.5 3 0 14 4 18M16 3c1.5 3 0 14-4 18" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <div>
        <strong>Global Coverage</strong>
        <p className="muted">Our network ensures you get care wherever your travels take you.</p>
      </div>
    </div>

  </div>
</section>



      {/* SEAMLESS CONSULTATIONS */}
      <section className="section">
        <div className="twoCol">
          <img
            alt="WhatsApp"
            style={{ width:'100%', borderRadius:16, border:'1px solid var(--line)' }}
            src="https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?q=80&w=1600&auto=format&fit=crop"
          />
          <div>
            <h2 className="h2" style={{textAlign:'left'}}>Seamless Consultations, Anywhere, Anytime</h2>
            <p className="muted">
              Leverage the convenience of WhatsApp for secure video and chat consultations with certified doctors.
              Our platform integrates seamlessly, providing you with peace of mind and expert medical guidance at your fingertips.
            </p>
            <Link className="btn" to="/consultation">Learn More</Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="section" style={{borderTop:'1px solid var(--line)'}}>
        <h2 className="h2">What Our Travelers Say</h2>
        <div className="cards">
          <div className="card">
            <em>"As a frequent traveler, GodwitCare has been a lifesaver. Quick, reliable advice when I needed it most!"</em>
            <div className="muted" style={{marginTop:8}}>— Sarah J., London, UK</div>
          </div>
          <div className="card">
            <em>"I had an urgent question while abroad, and their WhatsApp consultation was incredibly convenient and reassuring."</em>
            <div className="muted" style={{marginTop:8}}>— Michael P., Sydney, AU</div>
          </div>
          <div className="card">
            <em>"Getting medical advice during my trip has never been easier. The doctors were thorough and made me feel at ease."</em>
            <div className="muted" style={{marginTop:8}}>— Aisha K., Dubai, UAE</div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="cta section">
        <div className="twoCol">
          <div>
            <h2 className="h2" style={{textAlign:'left'}}>Ready for Worry-Free Travel Health?</h2>
            <p className="muted">
              Join thousands of travelers who trust GodwitCare for their medical needs abroad. Get peace of mind, expert advice,
              and instant support wherever your journey takes you.
            </p>
          </div>
          <div style={{display:'flex', alignItems:'center'}}>
            <Link className="btn" to="/register/1">Register Now</Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="container" style={{maxWidth:'1100px'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10}}>
            <div className="muted">© 2024 GodwitCare. All rights reserved.</div>
            <div className="muted">Privacy · Terms · Cookie Policy</div>
          </div>
        </div>
      </footer>
    </>
  )
}
