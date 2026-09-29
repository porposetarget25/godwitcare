import { Link } from 'react-router-dom'
import { TERMS_AND_CONDITIONS } from '../content/termsAndConditions'

export default function TermsOfUse() {
  return (
    <section className="section legal-page">
      <div className="form" style={{ maxWidth: 760 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          <h2 style={{ marginBottom: 0 }}>Terms &amp; Conditions</h2>
          <Link to="/dashboard" className="btn secondary">Back to Home</Link>
        </div>

        <div className="card">
          <article className="terms-content" aria-label="Terms and Conditions content">
            {TERMS_AND_CONDITIONS.split('\n').map((line, index) => {
              const heading = /^(TERMS AND CONDITIONS|Important|Contents|\d+\.\s{2}|A note from)/.test(line)
              if (!line) return <br key={index} />
              return heading
                ? <h3 key={index}>{line}</h3>
                : <p key={index}>{line}</p>
            })}
          </article>
        </div>
      </div>
    </section>
  )
}
