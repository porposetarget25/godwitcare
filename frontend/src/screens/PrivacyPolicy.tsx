import { Link } from 'react-router-dom'

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: 'We collect personal information you provide when registering, including your name, email address, phone number, and health-related information necessary to provide travel health consultations.',
  },
  {
    title: 'How We Use Your Information',
    body: 'Your information is used to provide consultations, send appointment reminders, improve our services, and communicate important health information relevant to your travel.',
  },
  {
    title: 'Data Security',
    body: 'We implement industry-standard security measures to protect your personal and health data. All data is encrypted in transit and at rest.',
  },
  {
    title: 'Sharing of Information',
    body: 'We do not sell your personal information. We may share data with licensed healthcare providers involved in your care, or as required by law.',
  },
  {
    title: 'Your Rights',
    body: 'You have the right to access, correct, or delete your personal data. Contact our support team to exercise these rights.',
  },
  {
    title: 'Contact Us',
    body: 'For privacy-related questions or concerns, please reach out to privacy@godwitcare.com.',
  },
]

export default function PrivacyPolicy() {
  return (
    <section className="section legal-page">
      <div className="form" style={{ maxWidth: 760 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          <h2 style={{ marginBottom: 0 }}>Privacy Policy</h2>
          <Link to="/dashboard" className="btn secondary">Back to Home</Link>
        </div>
        <p className="help" style={{ marginBottom: 20 }}>Last updated: January 2025</p>

        <div className="card" style={{ fontStyle: 'italic', marginBottom: 18 }}>
          At GodwitCare, we are committed to protecting your privacy and ensuring your personal
          health information is handled with the utmost care and security.
        </div>

        {SECTIONS.map(s => (
          <div key={s.title} className="card">
            <h3 style={{ margin: '0 0 8px' }}>{s.title}</h3>
            <p style={{ margin: 0, color: 'var(--muted)' }}>{s.body}</p>
          </div>
        ))}

        <p className="help" style={{ textAlign: 'center', marginTop: 20 }}>© {new Date().getFullYear()} GodwitCare. All rights reserved.</p>
      </div>
    </section>
  )
}
