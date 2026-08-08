// src/screens/DoctorGenerateLetter.tsx — static letter drafting UI (no backend persistence yet)
import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doctorGetConsultation } from '../api'

const LETTER_TYPES = ['Medical Certificate', 'Fit-to-Work Letter', 'Travel Fitness Letter', 'Admin/Miscellaneous Letter']

export default function DoctorGenerateLetter() {
  const { id } = useParams()
  const [patientName, setPatientName] = useState('the patient')
  const [letterType, setLetterType] = useState(LETTER_TYPES[0])
  const [recipient, setRecipient] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validTo, setValidTo] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    if (!id) return
    let alive = true
    doctorGetConsultation(Number(id)).then(c => {
      if (!alive) return
      const name = [c?.patient?.firstName].filter(Boolean).join(' ') || 'the patient'
      setPatientName(name)
    }).catch(() => {})
    return () => { alive = false }
  }, [id])

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    setContent(
      `This is to certify that ${patientName} was reviewed by GodwitCare on ${today} via tele-consultation.\n\n`
      + `Based on the clinical assessment, the above is issued for the purpose of: ${letterType}.\n\n`
      + `Please contact GodwitCare for any clarification regarding this letter.`,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientName, letterType])

  const previewDate = useMemo(() => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), [])

  return (
    <>
      <div className="page-head">
        <div className="page-title">Generate Letter</div>
        <Link to={`/doctor/consultations/${id}`} className="bs">‹ Consultation</Link>
      </div>

      <div className="g2">
        <div>
          <div className="card">
            <div className="ct">Letter Details</div>
            <div className="fi">
              <label className="fl2">Letter Type</label>
              <select value={letterType} onChange={e => setLetterType(e.target.value)}>
                {LETTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="fi">
              <label className="fl2">Recipient</label>
              <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="e.g. Employer, Airline, Insurer" />
            </div>
            <div className="g2">
              <div className="fi"><label className="fl2">Valid From</label><input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} /></div>
              <div className="fi"><label className="fl2">Valid To</label><input type="date" value={validTo} onChange={e => setValidTo(e.target.value)} /></div>
            </div>
          </div>

          <div className="card">
            <div className="ct">Letter Content</div>
            <textarea rows={8} value={content} onChange={e => setContent(e.target.value)} />
            <div className="fi-hint" style={{ marginTop: 6 }}>Auto-filled — edit as needed.</div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="ct">Preview</div>
            <div style={{ background: 'var(--surface-1)', borderRadius: 8, padding: 16, fontSize: 13 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>GodwitCare {letterType}</div>
              <div className="fi-hint" style={{ marginBottom: 12 }}>{previewDate}</div>
              <div style={{ marginBottom: 8 }}>To: {recipient || '—'}</div>
              <div style={{ whiteSpace: 'pre-wrap', marginBottom: 16 }}>{content}</div>
              <div className="fi-hint">Doctor signature block</div>
            </div>
          </div>

          <div className="notice n-warn">
            <i className="ti ti-alert-triangle" aria-hidden="true" />
            Generic letter generation isn&apos;t wired to a document backend yet — this is a drafting preview only.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="bs" disabled title="Not yet available">Save Draft</button>
            <button type="button" className="bp" disabled title="Not yet available"><i className="ti ti-file-download" aria-hidden="true" /> Generate</button>
          </div>
        </div>
      </div>
    </>
  )
}
