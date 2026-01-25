import React from 'react'
import { Link } from 'react-router-dom'
const doctorSrc = `${import.meta.env.BASE_URL}assets/doctor.jpg`; // change filename as per your actual file

export default function Dashboard() {
  return (
    // Flex layout: footer sits flush without extra whitespace
    <div className="dashboardShell" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Page-scoped theme override (Dashboard only). No global CSS edits needed. */}
      <style>{`
  /* ------------------------------
     Dashboard Theme (WHITE)
     ------------------------------ */

  /* If your site header is fixed/sticky, this ensures hash-jumps (#how, #features...)
     do not hide section titles under the header. Adjust the 96px if your header is taller/shorter. */
  :root {
    --header-offset: 96px;
  }

  .dashboardShell {
    background: #ffffff; /* FULL WHITE */
  }

  .dashboard-page {
    position: relative;
    overflow: hidden;
    background: #ffffff; /* FULL WHITE */
    padding-top: 8px; /* a little breathing room */
  }

  /* Make hash navigation safe (refresh / direct links / clicks) */
  .dashboard-page section[id] {
    scroll-margin-top: var(--header-offset);
  }

  /* If your header is fixed, the content can sit under it on initial load.
     This guarantees the top content is visible even after refresh with a hash. */
  .dashboard-page {
    padding-top: calc(var(--header-offset) * 0.15);
  }

  .dashboard-page .section {
    background: transparent;
  }

  /* Cards / panels: solid white, subtle shadows */
  .dashboard-page .hero.section,
  .dashboard-page .card,
  .dashboard-page .cta.section {
    background: #ffffff !important;
    border: 1px solid rgba(2, 6, 23, 0.08) !important;
    box-shadow: 0 10px 30px rgba(2, 6, 23, 0.08);
    border-radius: 22px;
  }

  /* HERO spacing */
  .dashboard-page .hero.section {
    margin-top: 18px;
    padding: 26px 22px;
  }

  /* Title sizing (also addresses your earlier request to keep it a bit smaller) */
  .dashboard-page .hero.section h2 {
    font-size: clamp(24px, 2.6vw, 38px);
    line-height: 1.12;
    letter-spacing: -0.02em;
    margin-bottom: 10px;
    color: #0f172a;
  }

  .dashboard-page .hero.section p {
    font-size: 15px;
    line-height: 1.55;
    color: rgba(15, 23, 42, .72);
    max-width: 62ch;
  }

  /* Images: keep clean */
  .dashboard-page .heroGrid > img,
  .dashboard-page .twoCol > img {
    border-radius: 16px !important;
    border: 1px solid rgba(2, 6, 23, 0.08) !important;
    box-shadow: 0 10px 30px rgba(2, 6, 23, 0.08);
    background: #fff;
  }

  /* Buttons: keep your existing theme, just ensure consistency */
  .dashboard-page .btn {
    border-radius: 999px !important;
    padding: 10px 16px !important;
    box-shadow: 0 10px 24px rgba(2, 6, 23, 0.10);
    border: 1px solid rgba(2, 6, 23, 0.10);
  }

  .dashboard-page .btn.secondary {
    background: #ffffff !important;
    border: 1px solid rgba(2, 6, 23, 0.12) !important;
    box-shadow: 0 10px 24px rgba(2, 6, 23, 0.06);
  }

  /* Section headers */
  .dashboard-page .kicker {
    letter-spacing: .12em;
    text-transform: uppercase;
    font-weight: 700;
    color: rgba(2, 94, 184, 0.95); /* align with your primary #005eb8 */
  }

  .dashboard-page .h2 {
    letter-spacing: -0.015em;
    color: #0f172a;
  }

  /* Features band: keep it white instead of colored */
  .dashboard-page #features.section {
    background: #ffffff !important;
    border-top: 1px solid rgba(2, 6, 23, 0.08) !important;
    border-bottom: 1px solid rgba(2, 6, 23, 0.08) !important;
  }

  /* Testimonials top border stays subtle */
  .dashboard-page #testimonials.section {
    border-top: 1px solid rgba(2, 6, 23, 0.08) !important;
  }

  /* CTA: still white */
  .dashboard-page .cta.section {
    border-radius: 22px;
  }

  /* Remove trailing space below last section */
  .dashboard-page main > section:last-of-type {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }
  .dashboard-page .cta.section {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }

  /* Small screens */
  @media (max-width: 720px) {
    :root { --header-offset: 120px; } /* mobile header is often taller */

    .dashboard-page .hero.section {
      padding: 18px 14px;
    }

    .dashboard-page .card {
      border-radius: 18px;
    }

    .dashboard-page .hero.section h2 {
      font-size: 26px;
    }
  }
`}</style>


      <main className="dashboard-page" style={{ flex: 1 }}>
        {/* HERO (add id="top" so Home can jump here) */}
        <section id="top" className="hero section">
          <div className="heroGrid">
            <div>
              <h2>Your Trusted Medical Advisor on the Go</h2>
              <p>
                GodwitCare provides instant, reliable medical advice and consultations via WhatsApp,
                ensuring your health is never compromised, no matter where you are in the world.
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                <Link className="btn" to="/register/1">Register</Link>
                <Link className="btn" to="/login">Login</Link>
              </div>
            </div>
            <img
              alt="Consultation"
              style={{ width: '100%', borderRadius: 16, border: '1px solid var(--line)' }}
              src={doctorSrc}
            />

          </div>  
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="section">
          <h2 className="h2">Connect · Consult · Recover</h2>
          <div className="cards">
            <div className="card how-card">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
                <path d="M12 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="#005eb8" strokeWidth="2" />
                <path d="M5.1 13.7a9.99 9.99 0 0 1 13.8 0" stroke="#005eb8" strokeWidth="2" strokeLinecap="round" />
                <path d="M2 10a14 14 0 0 1 20 0" stroke="#005eb8" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div>
                <strong>Connect</strong>
                <p className="muted">Reach out to our platform from anywhere in the world, effortlessly.</p>
              </div>
            </div>

            <div className="card how-card">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
                <path d="M7 11h6M7 7h10" stroke="#005eb8" strokeWidth="2" strokeLinecap="round" />
                <path d="M20 15a3 3 0 0 1-3 3H8l-4 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v9Z" stroke="#005eb8" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              <div>
                <strong>Consult</strong>
                <p className="muted">Have a virtual consultation with an experienced medical professional.</p>
              </div>
            </div>

            <div className="card how-card">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
                <path d="M12.1 21s-7-4.3-9.1-8.1a5.4 5.4 0 0 1 8-7.2l1.1 1.1 1.1-1.1a5.4 5.4 0 0 1 8 7.2c-2.1 3.8-9.1 8.1-9.1 8.1Z" stroke="#005eb8" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              <div>
                <strong>Recover</strong>
                <p className="muted">Receive timely advice and feel confident in your health journey.</p>
              </div>
            </div>
          </div>
        </section>

        {/* KEY FEATURES */}
        <section
          id="features"
          className="section"
          style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}
        >
          <h2 className="h2">Key Features</h2>
          <div className="cards">
            <div className="card feature-card">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#005eb8" strokeWidth="2" />
                <path d="M12 7v5l3 2" stroke="#005eb8" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div>
                <strong>24/7 Availability</strong>
                <p className="muted">Access medical advice around the clock, no matter your time zone.</p>
              </div>
            </div>

            <div className="card feature-card">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
                <circle cx="18" cy="6" r="3" stroke="#005eb8" strokeWidth="2" />
                <path d="M18 9v3a4 4 0 0 1-8 0V5" stroke="#005eb8" strokeWidth="2" strokeLinecap="round" />
                <circle cx="8" cy="19" r="3" stroke="#005eb8" strokeWidth="2" />
                <path d="M11 19h4a3 3 0 0 0 3-3v-4" stroke="#005eb8" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div>
                <strong>Expert Doctors</strong>
                <p className="muted">Consult with licensed and experienced healthcare professionals.</p>
              </div>
            </div>

            <div className="card feature-card">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#005eb8" strokeWidth="2" />
                <path d="M3 12h18M12 3c3 3.5 3 14 0 18M8 3c-1.5 3 0 14 4 18M16 3c1.5 3 0 14-4 18" stroke="#005eb8" strokeWidth="2" strokeLinecap="round" />
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
              style={{ width: '100%', borderRadius: 16, border: '1px solid var(--line)' }}
              src="https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?q=80&w=1600&auto=format&fit=crop"
            />
            <div>
              <h2 className="h2" style={{ textAlign: 'left' }}>Seamless Consultations, Anywhere, Anytime</h2>
              <p className="muted">
                Leverage the convenience of WhatsApp for secure video and chat consultations with certified doctors.
                Our platform integrates seamlessly, providing you with peace of mind and expert medical guidance at your fingertips.
              </p>
              <Link className="btn" to="/consultation">Learn More</Link>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section id="testimonials" className="section" style={{ borderTop: '1px solid var(--line)' }}>
          <h2 className="h2">What Our Travelers Say</h2>
          <div className="cards">
            <div className="card">
              <em>"As a frequent traveler, GodwitCare has been a lifesaver. Quick, reliable advice when I needed it most!"</em>
              <div className="muted" style={{ marginTop: 8 }}>— Sarah J., London, UK</div>
            </div>
            <div className="card">
              <em>"I had an urgent question while abroad, and their WhatsApp consultation was incredibly convenient and reassuring."</em>
              <div className="muted" style={{ marginTop: 8 }}>— Michael P., Sydney, AU</div>
            </div>
            <div className="card">
              <em>"Getting medical advice during my trip has never been easier. The doctors were thorough and made me feel at ease."</em>
              <div className="muted" style={{ marginTop: 8 }}>— Aisha K., Dubai, UAE</div>
            </div>
          </div>
        </section>

        {/* FINAL CTA (no bottom gap) */}
        <section className="cta section">
          <div className="twoCol">
            <div>
              <h2 className="h2" style={{ textAlign: 'left' }}>Ready for Worry-Free Travel Health?</h2>
              <p className="muted">
                Join thousands of travelers who trust GodwitCare for their medical needs abroad. Get peace of mind, expert advice,
                and instant support wherever your journey takes you.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Link className="btn" to="/register/1">Register Now</Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer: compact, no logo, no extra spacing */}
      <footer style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', background: '#fff' }}>
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div className="muted">© 2024 GodwitCare. All rights reserved.</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="muted">Privacy · Terms · Cookie Policy</div>

              {/* Social Icons */}
              <div className="social-icons">
                <a href="#" aria-label="Twitter" title="Twitter">
                  {/* Twitter */}
                  <svg viewBox="0 0 24 24">
                    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53A4.48 4.48 0 0 0 12 8v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
                  </svg>
                </a>

                <a href="#" aria-label="Facebook" title="Facebook">
                  {/* Facebook */}
                  <svg viewBox="0 0 24 24">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>

                <a href="#" aria-label="Instagram" title="Instagram">
                  {/* Instagram */}
                  <svg viewBox="0 0 24 24">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37a4 4 0 1 1-7.87 1.26A4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

        </div>
      </footer>
    </div>
  )
}
