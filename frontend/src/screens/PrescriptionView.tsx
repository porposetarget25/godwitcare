// src/screens/PrescriptionView.tsx — read-only prescription detail
import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { usePatient } from '../state/patient'
import { openAuthenticatedFile } from '../api'

type PrescriptionState = {
  consultationId?: number
  date?: string
  patientName?: string
  diagnosis?: string
  medicines?: string
  recommendations?: string
  rxUrl?: string | null
}

export default function PrescriptionView() {
  const location = useLocation()
  const navigate = useNavigate()
  const { queryString } = usePatient()
  const state = (location.state || {}) as PrescriptionState
  const [opening, setOpening] = React.useState(false)
  const [openErr, setOpenErr] = React.useState<string | null>(null)

  async function openPdf() {
    if (!state.rxUrl) return
    setOpening(true)
    setOpenErr(null)
    try {
      await openAuthenticatedFile(state.rxUrl)
    } catch (e: any) {
      setOpenErr(e?.message || 'Unable to open the PDF.')
    } finally {
      setOpening(false)
    }
  }

  if (!state.consultationId) {
    return (
      <div className="card">
        <div className="ct">No prescription selected</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Open a prescription from your Care History or Consultations list.</p>
        <Link to={queryString ? `/care-history?${queryString}` : '/care-history'} className="bp">Go to Care History</Link>
      </div>
    )
  }

  const dateStr = state.date ? new Date(state.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : ''
  const meds = (state.medicines || '').split(/\r?\n/).map(m => m.trim()).filter(Boolean)

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Prescription</div>
          <div className="page-sub">{[dateStr, state.patientName].filter(Boolean).join(' · ')}</div>
        </div>
        <button type="button" className="bs" onClick={() => navigate(-1)}>‹ Back</button>
      </div>

      <div className="card">
        <div className="ct">Diagnosis</div>
        <p style={{ fontSize: 13 }}>{state.diagnosis || '—'}</p>
      </div>

      <div className="card">
        <div className="ct">Medicines</div>
        {meds.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {meds.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        ) : <p style={{ fontSize: 13 }}>—</p>}
      </div>

      <div className="card">
        <div className="ct">Recommendations</div>
        <p style={{ fontSize: 13 }}>{state.recommendations || '—'}</p>
      </div>

      {state.rxUrl ? (
        <>
          <button type="button" className="bp" onClick={openPdf} disabled={opening}>
            <i className="ti ti-download" aria-hidden="true" /> {opening ? 'Opening…' : 'Download PDF'}
          </button>
          {openErr && <div className="notice n-warn" style={{ marginTop: 10 }}><i className="ti ti-alert-triangle" aria-hidden="true" />{openErr}</div>}
        </>
      ) : (
        <button type="button" className="bs" disabled title="PDF download is only available for your most recent prescription">
          <i className="ti ti-download" aria-hidden="true" /> Download PDF
        </button>
      )}
    </>
  )
}
