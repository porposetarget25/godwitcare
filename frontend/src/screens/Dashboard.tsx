import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const doctorSrc = `${import.meta.env.BASE_URL}assets/doctor10.png`;
const consultSrc = `${import.meta.env.BASE_URL}assets/consultation.png`; // change filename as per your actual file

// Loads the same Tabler Icons webfont used across the Patient & Doctor
// portals, so the marketing site and the logged-in product share one
// icon vocabulary. No-ops if it's already on the page.
function useTablerIcons() {
  useEffect(() => {
    const id = 'tabler-icons-webfont';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css';
    document.head.appendChild(link);
  }, []);
}

type Feature = {
  icon: string;
  title: string;
  desc: string;
};

const HOW_IT_WORKS = [
  { icon: 'ti-link', title: 'Connect', desc: 'Reach out to our platform from anywhere in the world, effortlessly.' },
  { icon: 'ti-stethoscope', title: 'Consult', desc: 'Have a virtual consultation with an experienced medical professional.' },
  { icon: 'ti-heart-handshake', title: 'Continue', desc: 'Receive timely advice, recover and feel confident to continue your journey.' },
];

const FEATURES: Feature[] = [
  { icon: 'ti-clock-hour-9', title: '9 to 5 Availability', desc: 'Medical advice accessible anytime, from any time zone.' },
  { icon: 'ti-certificate', title: 'Certified Experts', desc: 'Connect with licensed and experienced healthcare professionals.' },
  { icon: 'ti-world', title: 'Worldwide Access', desc: 'Receive care globally, ensuring support wherever you are.' },
  { icon: 'ti-adjustments', title: 'Personalized Plans', desc: 'Flexible plans tailored to your specific health needs.' },
  { icon: 'ti-users', title: 'Inclusive for All Ages', desc: 'Fair pricing with no age-linked costs or restrictions.' },
  { icon: 'ti-device-mobile', title: 'Effortless Digital Experience', desc: 'No reimbursements; manage everything digitally with ease.' },
  { icon: 'ti-tag', title: 'Transparent Pricing', desc: 'Full outpatient coverage with no hidden fees.' },
  { icon: 'ti-ban', title: 'Cancel Anytime', desc: 'Freedom to cancel your plan without penalties.' },
  { icon: 'ti-shield-check', title: 'Comprehensive Coverage', desc: 'Full support, even for pre-existing conditions.' },
  { icon: 'ti-credit-card', title: 'Zero Excess Fees', desc: 'No additional costs applied to your medical care.' },
  { icon: 'ti-calendar-plus', title: 'Flexible Start', desc: 'Begin your coverage even after your journey has commenced.' },
  { icon: 'ti-clipboard-heart', title: 'Pre-Existing Conditions Welcome', desc: 'Coverage thoughtfully designed for pre-existing conditions.' },
];

const TESTIMONIALS = [
  { initials: 'SJ', name: 'Sarah J.', place: 'London, UK', quote: 'As a frequent traveler, GodwitCare has been a lifesaver. Quick, reliable advice when I needed it most!' },
  { initials: 'MP', name: 'Michael P.', place: 'Sydney, AU', quote: 'I had an urgent question while abroad, and their WhatsApp consultation was incredibly convenient and reassuring.' },
  { initials: 'AK', name: 'Aisha K.', place: 'Dubai, UAE', quote: 'Getting medical advice during my trip has never been easier. The doctors were thorough and made me feel at ease.' },
];

export default function Dashboard() {
  const [ctaReady, setCtaReady] = useState(false)
  useTablerIcons();

  useEffect(() => {
    const id = requestAnimationFrame(() => setCtaReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="dashboardShell" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Page-scoped theme — tokens copied verbatim from the Patient & Doctor
          portal wireframes so the marketing site reads as the same product. */}
      <style>{`
  :root { --header-offset: 118px; }

  /* ---- Brand tokens (source of truth: patient_web_wireframes.html) ---- */
  .dashboardShell {
    --brand-teal:#0C6E7E; --brand-teal-dark:#074450;
    --brand-amber:#EBA545; --brand-amber-dark:#C17F1F;
    --surface-0:#F6F8F8; --surface-1:#EEF2F2; --surface-2:#ffffff;
    --border:#E3E8E9; --border-strong:#D3DADC; --border-stronger:#B5C1C4;
    --text-primary:#132326; --text-secondary:#48595D; --text-muted:#829296;
    --fill-accent:#0C6E7E; --bg-accent:#E4F1F2; --border-accent:#8FC7CE; --text-accent:#0A5A67;
    --bg-success:#E8F6EC; --border-success:#8FD6A6; --text-success:#1C7A3F;
    --bg-warning:#fdf1de; --border-warning:#f0c987; --text-warning:#b3730c;
    background: var(--surface-0);
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: var(--text-primary);
  }

  .dashboard-page {
    position: relative;
    padding-top: calc(var(--header-offset) * 0.15);
    overflow: visible;
    display: flow-root;
  }

  .dashboard-page section[id] { scroll-margin-top: var(--header-offset); }
  .dashboard-page .section { background: transparent; padding: 56px 24px; max-width: 1200px; margin: 0 auto; }

  /* ---- Eyebrow / kicker — same shape as the .tag pill in the portals ---- */
  .dashboard-page .eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
    padding: 4px 10px; border-radius: 999px;
    background: var(--bg-accent); color: var(--text-accent);
    border: 0.5px solid var(--border-accent);
    margin-bottom: 14px;
  }

  .dashboard-page .h2 {
    font-size: clamp(24px, 2.6vw, 32px);
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text-primary);
    text-align: center;
    margin-bottom: 6px;
  }
  .dashboard-page .h2-sub {
    text-align: center;
    color: var(--text-accent);
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 32px;
  }

  /* ---- Cards: soft elevation, 12px radius — reads as a modern health-portal card ---- */
  .dashboard-page .card {
    background: var(--surface-2);
    border: 0.5px solid var(--border-strong);
    border-radius: 12px;
    padding: 22px 20px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    transition: border-color .15s ease, transform .15s ease, box-shadow .15s ease;
  }
  .dashboard-page .card:hover {
    border-color: var(--border-accent);
    transform: translateY(-3px);
    box-shadow: 0 12px 24px rgba(12, 110, 126, 0.1);
  }

  .dashboard-page .icon-badge {
    width: 44px; height: 44px; border-radius: 12px;
    background: var(--bg-accent); color: var(--fill-accent);
    display: flex; align-items: center; justify-content: center;
    font-size: 21px; margin-bottom: 14px;
  }

  .dashboard-page .cards {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
  }
  .dashboard-page .cards.features { grid-template-columns: repeat(4, 1fr); }

  .dashboard-page strong { display: block; font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 5px; }
  .dashboard-page .muted { font-size: 14px; color: var(--text-secondary); line-height: 1.6; }

  /* ---- Hero ---- */
  .dashboard-page .hero.section {
    background: var(--surface-2);
    border: 0.5px solid var(--border-strong);
    border-radius: 14px;
    padding: 40px 32px;
    margin-top: 8px;
  }
  .dashboard-page .heroGrid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 40px; align-items: center; }
  .dashboard-page .hero.section h2 {
    font-size: clamp(26px, 3.4vw, 42px);
    line-height: 1.12;
    letter-spacing: -0.02em;
    font-weight: 700;
    margin-bottom: 14px;
    color: var(--text-primary);
    text-align: left;
  }
  .dashboard-page .hero.section p {
    font-size: 15px; line-height: 1.6; color: var(--text-secondary); max-width: 52ch; margin-bottom: 22px;
  }

  .dashboard-page .heroGrid > img, .dashboard-page .twoCol > img {
    border-radius: 10px !important;
    border: 0.5px solid var(--border-strong) !important;
    background: #fff;
  }

  /* ---- Buttons — full pill, matches the header CTA ---- */
  .dashboard-page .btn {
    display: inline-flex; align-items: center; gap: 6px;
    border-radius: 999px !important;
    padding: 11px 22px !important;
    font-size: 14px; font-weight: 600;
    text-decoration: none;
    background: var(--fill-accent); color: #fff;
    border: none;
    transition: background .12s ease, transform .12s ease;
  }
  .dashboard-page .btn:hover { background: var(--brand-teal-dark); transform: translateY(-1px); }

  .dashboard-page .btn.secondary {
    background: var(--surface-1) !important;
    color: var(--text-primary) !important;
    border: 0.5px solid var(--border-strong) !important;
  }
  .dashboard-page .btn.secondary:hover { background: var(--surface-2) !important; }

  .dashboard-page .btn_big.heroBtn {
    display: inline-flex; align-items: center; gap: 8px;
    border-radius: 999px; padding: 14px 28px; font-size: 15px; font-weight: 700;
    background: var(--fill-accent); color: #fff; text-decoration: none;
    transition: background .12s ease, transform .12s ease;
  }
  .dashboard-page .btn_big.heroBtn:hover { background: var(--brand-teal-dark); transform: translateY(-1px); }

  .dashboard-page .heroActions { display: flex; gap: 10px; opacity: 0; transform: translateY(4px); transition: opacity .35s ease, transform .35s ease; }
  .dashboard-page .heroActions.isReady { opacity: 1; transform: translateY(0); }

  /* ---- Sections with tinted bg (matches --bg-accent tokens) ---- */
  .dashboard-page #features.section {
    background: var(--surface-1);
    border-top: 0.5px solid var(--border);
    border-bottom: 0.5px solid var(--border);
    max-width: none;
  }
  .dashboard-page #features.section > * { max-width: 1200px; margin-left: auto; margin-right: auto; }

  .dashboard-page #testimonials.section { border-top: 0.5px solid var(--border); }

  .dashboard-page .quote-icon { color: var(--border-accent); font-size: 24px; margin-bottom: 8px; }
  .dashboard-page .testimonial-foot { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
  .dashboard-page .ava {
    width: 32px; height: 32px; border-radius: 50%;
    background: var(--bg-accent); color: var(--text-accent);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 600; flex-shrink: 0;
  }

  .dashboard-page .twoCol { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; }

  /* ---- Final CTA ---- */
  .dashboard-page .cta.section {
    background: var(--bg-accent);
    border: 0.5px solid var(--border-accent);
    border-radius: 14px;
    margin-bottom: 0 !important;
    padding-bottom: 40px !important;
  }
  .dashboard-page .cta.section .h2 { text-align: left; }

  /* Remove trailing space below last section */
  .dashboard-page main > section:last-of-type { margin-bottom: 0 !important; }

  /* ---- Footer: dark, multi-column, matches modern marketing-site convention ---- */
  .site-footer { background: var(--brand-teal-dark); color: #cfe4e6; }
  .footer-top { padding: 56px 24px 40px; max-width: 1200px; margin: 0 auto; }
  .footer-grid {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr;
    gap: 32px;
  }
  .footer-brand { display: flex; flex-direction: column; gap: 14px; }
  .footer-brand-name { font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em; }
  .footer-tagline { font-size: 13.5px; line-height: 1.6; color: #a9c6c9; max-width: 34ch; }
  .footer-social { display: flex; gap: 8px; margin-top: 4px; }
  .footer-social a {
    width: 32px; height: 32px; border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.18);
    display: flex; align-items: center; justify-content: center;
    color: #cfe4e6; font-size: 14px; transition: background .15s ease, border-color .15s ease;
  }
  .footer-social a:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.35); }
  .footer-col h4 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #ffffff; margin: 0 0 16px; }
  .footer-col { display: flex; flex-direction: column; }
  .footer-col button, .footer-col a {
    background: none; border: 0; text-align: left; padding: 0;
    font-size: 14px; color: #a9c6c9; margin-bottom: 12px; transition: color .15s ease;
  }
  .footer-col button:hover, .footer-col a:hover { color: #ffffff; }
  .footer-bottom { border-top: 1px solid rgba(255,255,255,0.12); }
  .footer-bottom-inner {
    max-width: 1200px; margin: 0 auto; padding: 18px 24px;
    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
    font-size: 12.5px; color: #93b3b6;
  }
  .footer-legal { display: flex; gap: 18px; }
  .footer-legal a { color: #93b3b6; }
  .footer-legal a:hover { color: #ffffff; }

  @media (max-width: 900px) {
    .dashboard-page .heroGrid, .dashboard-page .twoCol { grid-template-columns: 1fr; }
    .dashboard-page .cards { grid-template-columns: repeat(2, 1fr); }
    .dashboard-page .cards.features { grid-template-columns: repeat(2, 1fr); }
    .footer-grid { grid-template-columns: 1fr; gap: 28px; }
  }

  @media (max-width: 720px) {
    :root { --header-offset: 80px; }
    .dashboard-page .section { padding: 40px 16px; }
    .dashboard-page .hero.section { padding: 24px 18px; }
    .dashboard-page .card { border-radius: 8px; }
    .dashboard-page .cards, .dashboard-page .cards.features { grid-template-columns: 1fr; }
    @supports (-webkit-touch-callout: none) {
      .dashboard-page { padding-top: calc(var(--header-offset) * 0.35 + env(safe-area-inset-top)) !important; }
    }
  }
`}</style>

      <main className="dashboard-page" style={{ flex: 1 }}>
        {/* HERO */}
        <section id="top" className="hero section">
          <div className="heroGrid">
            <div>
              <span className="eyebrow"><i className="ti ti-map-pin" aria-hidden="true" />Care Beyond Borders</span>
              <h2>Your Trusted Medical Advisor on the Go</h2>
              <p>
                GodwitCare provides instant, reliable medical advice and consultations via WhatsApp,
                ensuring your health is never compromised, no matter where you are in the world.
              </p>
              <div className={`heroActions ${ctaReady ? 'isReady' : ''}`}>
                <Link to="/register/1" className="btn heroBtn">
                  <i className="ti ti-user-plus" aria-hidden="true" />Register
                </Link>
                <Link to="/login" className="btn secondary heroBtn">
                  <i className="ti ti-login" aria-hidden="true" />Login
                </Link>
              </div>
            </div>
            <img alt="Consultation" style={{ width: '100%' }} src={doctorSrc} />
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="section">
          <h2 className="h2">How It Works</h2>
          <p className="h2-sub">Connect · Consult · Continue</p>
          <div className="cards">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.title} className="card">
                <div className="icon-badge"><i className={`ti ${s.icon}`} aria-hidden="true" /></div>
                <strong>{s.title}</strong>
                <p className="muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* KEY FEATURES */}
        <section id="features" className="section">
          <h2 className="h2">Key Features</h2>
          <p className="h2-sub">12 Reasons to Join GodwitCare</p>
          <div className="cards features">
            {FEATURES.map((f) => (
              <div key={f.title} className="card">
                <div className="icon-badge"><i className={`ti ${f.icon}`} aria-hidden="true" /></div>
                <strong>{f.title}</strong>
                <p className="muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SEAMLESS CONSULTATIONS */}
        <section className="section">
          <div className="twoCol">
            <img alt="WhatsApp consultation" style={{ width: '100%' }} src={consultSrc} />
            <div>
              <span className="eyebrow"><i className="ti ti-brand-whatsapp" aria-hidden="true" />Video &amp; chat, on WhatsApp</span>
              <h2 className="h2" style={{ textAlign: 'left' }}>Seamless Consultations, Anywhere, Anytime</h2>
              <p className="muted" style={{ fontSize: 14, marginBottom: 18 }}>
                Leverage the convenience of WhatsApp for secure video and chat consultations with certified doctors.
                Our platform integrates seamlessly, providing you with peace of mind and expert medical guidance at your fingertips.
              </p>
              <Link className="btn" to="/consultation">
                Learn More<i className="ti ti-arrow-right" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section id="testimonials" className="section">
          <h2 className="h2">What Our Travelers Say</h2>
          <p className="h2-sub">Join thousands of travelers who trust GodwitCare for their medical needs abroad</p>
          <div className="cards">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="card">
                <i className="ti ti-quote quote-icon" aria-hidden="true" />
                <p className="muted" style={{ fontStyle: 'italic' }}>&ldquo;{t.quote}&rdquo;</p>
                <div className="testimonial-foot">
                  <div className="ava">{t.initials}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.place}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="cta section">
          <div className="twoCol">
            <div>
              <h2 className="h2" style={{ textAlign: 'left' }}>Ready for Worry-Free Travel Health?</h2>
              <p className="muted" style={{ fontSize: 14 }}>
                Join thousands of travelers who trust GodwitCare for their medical needs abroad. Get peace of mind, expert advice,
                and instant support wherever your journey takes you.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Link className="btn_big heroBtn" to="/register/1">
                <i className="ti ti-arrow-right" aria-hidden="true" />Register Now
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer — dark, multi-column, mirrors the modern marketing-site convention */}
      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-grid">
            <div className="footer-brand">
              <span className="footer-brand-name">GodwitCare</span>
              <p className="footer-tagline">
                Instant, reliable medical advice on WhatsApp, wherever your journey takes you.
              </p>
              <div className="footer-social">
                {[
                  { icon: 'ti-brand-x', label: 'X (Twitter)' },
                  { icon: 'ti-brand-facebook', label: 'Facebook' },
                  { icon: 'ti-brand-instagram', label: 'Instagram' },
                ].map((s) => (
                  <a key={s.icon} href="#" aria-label={s.label} title={s.label}>
                    <i className={`ti ${s.icon}`} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>

            <div className="footer-col">
              <h4>Company</h4>
              <Link to="/dashboard#top">Home</Link>
              <Link to="/dashboard#how">How it Works</Link>
              <Link to="/dashboard#features">Features</Link>
              <Link to="/dashboard#testimonials">Testimonials</Link>
            </div>

            <div className="footer-col">
              <h4>Account</h4>
              <Link to="/login">Log in</Link>
              <Link to="/register/1">Register</Link>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-inner">
            <div>© {new Date().getFullYear()} GodwitCare. All rights reserved.</div>
            <div className="footer-legal">
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
              <Link to="/cookies">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
