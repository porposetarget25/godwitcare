import { Link } from 'react-router-dom'

const SECTIONS = [
  {
    title: 'What Are Cookies',
    body: 'Cookies are small text files stored on your device that help us keep you signed in, remember your preferences, and understand how GodwitCare is used.',
  },
  {
    title: 'Cookies We Use',
    body: 'We use essential cookies required for login sessions and security, and analytics cookies that help us understand site usage so we can improve the service.',
  },
  {
    title: 'Managing Cookies',
    body: 'You can control or delete cookies through your browser settings. Disabling essential cookies may prevent you from signing in or using parts of GodwitCare.',
  },
  {
    title: 'Contact Us',
    body: 'For questions about our use of cookies, please reach out to privacy@godwitcare.com.',
  },
]

export default function CookiePolicy() {
  return (
    <section className="section legal-page">
      <div className="form" style={{ maxWidth: 760 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          <h2 style={{ marginBottom: 0 }}>Cookie Policy</h2>
          <Link to="/dashboard" className="btn secondary">Back to Home</Link>
        </div>
        <p className="help" style={{ marginBottom: 20 }}>Last updated: January 2025</p>

        {SECTIONS.map(s => (
          <div key={s.title} className="card">
            <h3 style={{ margin: '0 0 8px' }}>{s.title}</h3>
            <p style={{ margin: 0, color: 'var(--muted)' }}>{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
