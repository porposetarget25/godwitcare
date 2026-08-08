// src/screens/DoctorPrescriptionView.tsx — read-only prescription view (doctor side)
import React, { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { API_BASE_URL, doctorGetConsultation, doctorLatestPrescriptionMeta, resolveApiUrl } from '../api'

type LocationState = {
  diagnosis?: string
  medicines?: string[]
  recommendations?: string
  patientName?: string
  rxId?: number
  rxPdfUrl?: string | null
}

export default function DoctorPrescriptionView() {
  const { id } = useParams()
  const location = useLocation()
  const state = (location.state || {}) as LocationState
  const [fallback, setFallback] = useState<{ diagnosis: string; recommendations: string; patientName: string } | null>(null)
  const [rxPdfUrl, setRxPdfUrl] = useState<string | null | undefined>(state.rxPdfUrl)
  const [loading, setLoading] = useState(!state.diagnosis)

  useEffect(() => {
    if (state.diagnosis || !id) { setLoading(false); return }
    let alive = true
    ;(async () => {
      try {
        const [consultation, meta] = await Promise.all([
          doctorGetConsultation(Number(id)),
          doctorLatestPrescriptionMeta(Number(id)).catch(() => null),
        ])
        if (!alive) return
        setFallback({
          diagnosis: consultation?.diagnosis || '',
          recommendations: consultation?.recommendations || '',
          patientName: [consultation?.patient?.firstName].filter(Boolean).join(' ') || 'Patient',
        })
        if (meta?.pdfUrl) setRxPdfUrl(resolveApiUrl(API_BASE_URL, meta.pdfUrl))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [id, state.diagnosis])

  const diagnosis = state.diagnosis ?? fallback?.diagnosis ?? ''
  const recommendations = state.recommendations ?? fallback?.recommendations ?? ''
  const medicines = state.medicines
  const patientName = state.patientName ?? fallback?.patientName ?? ''

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Prescription</div>
          <div className="page-sub">{patientName}</div>
        </div>
        <Link to={`/doctor/consultations/${id}`} className="bs">‹ Consultation</Link>
      </div>

      {loading ? (
        <div className="card">Loading…</div>
      ) : (
        <>
          <div className="card">
            <div className="ct">Diagnosis</div>
            <p style={{ fontSize: 13 }}>{diagnosis || '—'}</p>
          </div>

          <div className="card">
            <div className="ct">Medicines Prescribed</div>
            {medicines && medicines.filter(Boolean).length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {medicines.filter(Boolean).map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {medicines ? '—' : 'Full medicine list is only available when opened from the consultation you just prescribed on.'}
              </p>
            )}
          </div>

          <div className="card">
            <div className="ct">Recommendations</div>
            <p style={{ fontSize: 13 }}>{recommendations || '—'}</p>
          </div>

          {rxPdfUrl && (
            <a href={rxPdfUrl} target="_blank" rel="noreferrer" className="bp">
              <i className="ti ti-download" aria-hidden="true" /> Download PDF
            </a>
          )}
        </>
      )}
    </>
  )
}
