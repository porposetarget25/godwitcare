import Modal from './portal/Modal'
import { TERMS_AND_CONDITIONS } from '../content/termsAndConditions'

export default function RegistrationTermsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="portal registration-terms-modal">
      <Modal
        title="Terms & Conditions"
        onClose={onClose}
        footer={<button type="button" className="btn" onClick={onClose}>Close</button>}
      >
        <article className="terms-content" tabIndex={0} aria-label="Terms and Conditions content">
          {TERMS_AND_CONDITIONS.split('\n').map((line, index) => {
            const heading = /^(TERMS AND CONDITIONS|Important|Contents|\d+\.\s{2}|A note from)/.test(line)
            if (!line) return <br key={index} />
            return heading
              ? <h3 key={index}>{line}</h3>
              : <p key={index}>{line}</p>
          })}
        </article>
      </Modal>
    </div>
  )
}
