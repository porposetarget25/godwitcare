import { Link } from 'react-router-dom'

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using GodwitCare, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our services.',
  },
  {
    title: '2. Use of Services',
    body: 'GodwitCare provides travel health consultation services. You agree to use these services only for lawful purposes and in accordance with these terms.',
  },
  {
    title: '3. Medical Disclaimer',
    body: 'The information and consultations provided by GodwitCare are for informational purposes. They do not replace professional medical advice, diagnosis, or treatment.',
  },
  {
    title: '4. Privacy',
    body: 'Your use of GodwitCare is also governed by our Privacy Policy, which is incorporated into these Terms by reference.',
  },
  {
    title: '5. Changes to Terms',
    body: 'GodwitCare reserves the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.',
  },
]

export default function TermsOfUse() {
  return (
    <section className="section legal-page">
      <div className="form" style={{ maxWidth: 760 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          <h2 style={{ marginBottom: 0 }}>Terms of Use</h2>
          <Link to="/dashboard" className="btn secondary">Back to Home</Link>
        </div>
        <p className="help" style={{ marginBottom: 20 }}>Last updated: January 2025</p>

        {SECTIONS.map(s => (
          <div key={s.title} className="card">
            <h3 style={{ margin: '0 0 8px' }}>{s.title}</h3>
            <p style={{ margin: 0, color: 'var(--muted)' }}>{s.body}</p>
          </div>
        ))}

        <p className="help" style={{ textAlign: 'center', marginTop: 20 }}>
          For questions about these terms, contact us at legal@godwitcare.com
        </p>
      </div>
    </section>
  )
}
