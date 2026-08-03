import React, { useEffect, useState, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { authFetch, doctorGetConsultation } from '../api'
import { API_BASE_URL } from '../api'
import { doctorLatestPrescriptionMeta } from '../api'
import { resolveApiUrl } from '../api'
import { QUESTIONNAIRE_SECTIONS } from '../questionnaire'

export default function DoctorConsultationDetails() {
  const { id } = useParams()
  const [data, setData] = useState<any>(null)
  const [answers, setAnswers] = useState<Record<string, 'Yes' | 'No'>>({})
  const [detailsByQuestion, setDetailsByQuestion] = useState<Record<string, string>>({})
  const [savingConsultation, setSavingConsultation] = useState(false)
  const [consultationSaveErr, setConsultationSaveErr] = useState<string | null>(null)
  const [prescriptionRequired, setPrescriptionRequired] = useState(true)
  const [initialAnswers, setInitialAnswers] = useState<Record<string, 'Yes' | 'No'>>({})
  const [initialDetailsByQuestion, setInitialDetailsByQuestion] = useState<Record<string, string>>({})
  const [expandedQuestionnaireSections, setExpandedQuestionnaireSections] = useState<Set<string>>(new Set())

  // ---- NEW: prescription state
  const [history, setHistory] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [medicines, setMedicines] = useState<string[]>([''])
  const [recommendations, setRecommendations] = useState('')
  const [creatingRx, setCreatingRx] = useState(false)
  const [rxErr, setRxErr] = useState<string | null>(null)
  const [rxId, setRxId] = useState<number | null>(null)
  const [rxPdfUrl, setRxPdfUrl] = useState<string | null>(null)

  // cleanup any object URL we created
  const rxUrlRef = useRef<string | null>(null)
  useEffect(() => {
    return () => {
      if (rxUrlRef.current) URL.revokeObjectURL(rxUrlRef.current)
    }
  }, [])

  // ===== Referral state (for "View generated referral letter") =====
  const [referralId, setReferralId] = useState<number | null>(null)
  const [referralPdfUrl, setReferralPdfUrl] = useState<string | null>(null)

  // Load consultation + latest prescription meta
  useEffect(() => {
    let ignore = false
    setData(null)
    ;(async () => {
      try {
        const d = await doctorGetConsultation(Number(id))
        if (ignore) return
        const loadedAnswers = (d?.answers || {}) as Record<string, 'Yes' | 'No'>
        const sectionsWithYesAnswers = QUESTIONNAIRE_SECTIONS
          .filter(section => section.questions.some(question => loadedAnswers[question.id] === 'Yes'))
          .map(section => section.title)

        setData(d)
        setAnswers(loadedAnswers)
        setDetailsByQuestion((d?.detailsByQuestion || {}) as Record<string, string>)
        setInitialAnswers(loadedAnswers)
        setInitialDetailsByQuestion((d?.detailsByQuestion || {}) as Record<string, string>)
        // Initialize this once per loaded consultation. Later changes are driven only
        // by the doctor's manual expand/collapse actions.
        setExpandedQuestionnaireSections(new Set(sectionsWithYesAnswers))
        setHistory(d?.historyOfPresentingComplaint || '')
        setDiagnosis(d?.diagnosis || '')
        setRecommendations(d?.recommendations || '')
        setPrescriptionRequired(d?.prescriptionRequired !== false)

        // fetch latest RX for this consultation (if any)
        try {
          const meta = await doctorLatestPrescriptionMeta(Number(id))
          if (meta && meta.id) {
            setRxId(meta.id)
            setRxPdfUrl(meta.pdfUrl ? resolveApiUrl(API_BASE_URL, meta.pdfUrl) : null)
          } else {
            setRxId(null)
            setRxPdfUrl(null)
          }
        } catch {
          // no content or not found is fine
          setRxId(null)
          setRxPdfUrl(null)
        }
      } catch { /* handled */ }
    })()
    return () => { ignore = true }
  }, [id])

  // Load latest referral meta for this consultation
  useEffect(() => {
    const cid = Number(id)
    if (!cid) {
      setReferralId(null)
      setReferralPdfUrl(null)
      return
    }

    let ignore = false
    ;(async () => {
      try {
        const r = await authFetch(
          `${API_BASE_URL}/doctor/consultations/${cid}/referrals/latest`,
          {}
        )

        if (ignore) return

        if (r.status === 204) {
          setReferralId(null)
          setReferralPdfUrl(null)
        } else if (r.ok) {
          const meta = await r.json().catch(() => ({} as any))
          setReferralId(typeof meta?.id === 'number' ? meta.id : null)
          setReferralPdfUrl(
            meta?.pdfUrl ? resolveApiUrl(API_BASE_URL, meta.pdfUrl) : null
          )
        } else {
          setReferralId(null)
          setReferralPdfUrl(null)
        }
      } catch {
        if (!ignore) {
          setReferralId(null)
          setReferralPdfUrl(null)
        }
      }
    })()

    return () => { ignore = true }
  }, [id])

  if (!data) return (
    <section className="section">
      <div className="muted">Loading…</div>
    </section>
  )

  const phoneDigits = (data.contactPhone || '').replace(/[^\d+]/g, '')
  const waUrl = phoneDigits ? `https://wa.me/${phoneDigits.replace(/^0+/, '')}` : ''
  const readOnly = data.status === 'COMPLETED'

  // ---- helpers for medicine rows
  function setMed(idx: number, val: string) {
    setMedicines(list => list.map((m, i) => i === idx ? val : m))
  }
  function addMed() {
    setMedicines(list => [...list, ''])
  }
  function removeMed(idx: number) {
    setMedicines(list => list.filter((_, i) => i !== idx))
  }

  function setAnswer(qid: string, value: 'Yes' | 'No') {
    setAnswers(prev => ({ ...prev, [qid]: value }))
    if (value === 'No') {
      setDetailsByQuestion(prev => {
        const next = { ...prev }
        delete next[qid]
        return next
      })
    }
  }

  function setDetail(qid: string, value: string) {
    setDetailsByQuestion(prev => ({ ...prev, [qid]: value }))
  }

  async function saveQuestionnaire() {
    if (!data?.id || savingConsultation) return
    setConsultationSaveErr(null)
    setSavingConsultation(true)
    try {
      const cleanDetails: Record<string, string> = {}
      for (const [qid, detail] of Object.entries(detailsByQuestion || {})) {
        if ((answers?.[qid] || 'No') !== 'Yes') continue
        const trimmed = (detail || '').trim()
        if (trimmed) cleanDetails[qid] = trimmed
      }

      const changedAnswers: Record<string, 'Yes' | 'No'> = {}
      const changedDetails: Record<string, string> = {}
      const keys = new Set([
        ...Object.keys(initialAnswers || {}),
        ...Object.keys(answers || {}),
        ...Object.keys(initialDetailsByQuestion || {}),
        ...Object.keys(cleanDetails || {}),
      ])
      keys.forEach((qid) => {
        if ((initialAnswers?.[qid] || 'No') !== (answers?.[qid] || 'No')) {
          changedAnswers[qid] = answers?.[qid] || 'No'
        }
        if ((initialDetailsByQuestion?.[qid] || '') !== (cleanDetails?.[qid] || '')) {
          if (cleanDetails?.[qid]) changedDetails[qid] = cleanDetails[qid]
        }
      })

      const res = await authFetch(`${API_BASE_URL}/doctor/consultations/${data.id}/save-questionnaire`, {
        method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
          answers: changedAnswers,
          detailsByQuestion: changedDetails,
        }),
      })

      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(t || `HTTP ${res.status}`)
      }

      setData((prev: any) => ({ ...prev, answers, detailsByQuestion: cleanDetails }))
      setInitialAnswers(answers)
      setDetailsByQuestion(cleanDetails)
      setInitialDetailsByQuestion(cleanDetails)
    } catch (err: any) {
      setConsultationSaveErr(err?.message || 'Failed to save consultation')
    } finally {
      setSavingConsultation(false)
    }
  }

  async function completeConsultation() {
    if (!data?.id || savingConsultation) return
    setConsultationSaveErr(null)
    setSavingConsultation(true)
    try {
      const res = await authFetch(`${API_BASE_URL}/doctor/consultations/${data.id}/complete`, {
        method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
          history: history.trim(),
          diagnosis: diagnosis.trim(),
          recommendations: recommendations.trim(),
          prescriptionRequired,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData((prev: any) => ({ ...prev, status: 'COMPLETED' }))
    } catch (err: any) {
      setConsultationSaveErr(err?.message || 'Failed to complete consultation')
    } finally {
      setSavingConsultation(false)
    }
  }

  // ---- create prescription via API helpers
  async function createPrescription() {
    setRxErr(null);

    const meds = medicines.map(m => (m || '').trim()).filter(Boolean);
    if (!diagnosis.trim()) {
      setRxErr('Please enter a diagnosis.');
      return;
    }
    if (meds.length === 0) {
      setRxErr('Please add at least one medicine.');
      return;
    }

    setCreatingRx(true);
    try {
      // 1. Create prescription on backend
      const res = await authFetch(
        `${API_BASE_URL}/doctor/consultations/${data.id}/prescriptions`,
        {
          method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
            history: history.trim(),
            diagnosis: diagnosis.trim(),
            medicines: meds,
            recommendations: recommendations.trim(),
          }),
        }
      );

      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(t || `HTTP ${res.status}`);
      }

      const j = await res.json().catch(() => ({}));
      setRxId(typeof j.id === 'number' ? j.id : null);

      // 2. Download PDF
      const pdfRes = await authFetch(`${API_BASE_URL}/doctor/prescriptions/${j.id}/pdf`, {
      });
      if (!pdfRes.ok) throw new Error('Failed to download prescription PDF');

      const blob = await pdfRes.blob();
      const url = URL.createObjectURL(blob);
      if (rxUrlRef.current) URL.revokeObjectURL(rxUrlRef.current);
      rxUrlRef.current = url;
      setRxPdfUrl(url);

    } catch (err: any) {
      setRxErr(err?.message || 'Failed to create prescription');
    } finally {
      setCreatingRx(false);
    }
  }

  return (
    <section className="section doctor-consultation-details doctor-consult-workspace">
      <div className="page-head doctor-consultation-details-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Consultation — #{data.id}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link className="btn secondary" to="/doctor/consultations">Back</Link>
        </div>
      </div>
      {readOnly && <div className="consultation-readonly" role="status">Completed consultation — view only</div>}

      <div className="doctor-consult-grid">
      <div className="doctor-patient-column">
      {/* Patient summary card */}
      <div className="card patient-summary-card" style={{ padding: 16 }}>
        {(() => {
          const created = new Date(data.createdAt)
          const timeStr = created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          const dateStr = created.toLocaleDateString([], { day: '2-digit', month: 'short' })
          const dobRaw = data?.patient?.dob
          const dobStr = dobRaw
            ? new Date(dobRaw).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })
            : '—'
          return (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>
                  {data.patient.firstName} {data.patient.lastName}
                </div>
                <div className="muted small" style={{ whiteSpace: 'nowrap' }}>
                  {timeStr} • {dateStr}
                </div>
              </div>
              <div className="muted" style={{ marginTop: 8 }}>
                <div style={{ marginTop: 4 }}>
                  <span className="strong" style={{ fontWeight: 600 }}>DOB:</span>{' '}
                  <span>{dobStr}</span>
                </div>
                <div style={{ marginTop: 4 }}>
                  <span className="strong" style={{ fontWeight: 600 }}>Patient ID:</span>{' '}
                  <span>{data.patientId ?? '—'}</span>
                </div>
              </div>
            </>
          )
        })()}
      </div>

      <details className="card consultation-section" open={Boolean(data.contactPhone || data.contactAddress || data.patient.email)}>
        <summary>Patient Contact &amp; Address <span>Patient provided · read only</span></summary>
        <div className="consultation-section-body">
        <div><span className="muted">Phone (WhatsApp):</span> {data.contactPhone || '—'}</div>
        <div><span className="muted">Address:</span> {data.contactAddress || '—'}</div>
        <div><span className="muted">Email:</span> {data.patient.email || '—'}</div>
        {waUrl && <a className="btn" href={waUrl} target="_blank" rel="noreferrer" style={{ marginTop: 8 }}>WhatsApp Patient</a>}
        </div>
      </details>

      <details className="card consultation-section" defaultOpen>
        <summary>Questionnaire <span>{Object.keys(answers || {}).length} responses · read only</span></summary>
        <div className="consultation-section-body">
          <div className="doctor-questionnaire-sections">
            {QUESTIONNAIRE_SECTIONS.map((section) => {
              const answeredCount = section.questions.filter(({ id }) => answers[id] != null).length
              return (
                <details
                  className="doctor-questionnaire-section"
                  key={section.title}
                  open={expandedQuestionnaireSections.has(section.title)}
                  onToggle={(event) => {
                    const isOpen = event.currentTarget.open
                    setExpandedQuestionnaireSections(current => {
                      if (current.has(section.title) === isOpen) return current
                      const next = new Set(current)
                      if (isOpen) next.add(section.title)
                      else next.delete(section.title)
                      return next
                    })
                  }}
                >
                  <summary>
                    <strong>{section.title}</strong>
                    <span>{answeredCount} of {section.questions.length} answered</span>
                  </summary>
                  <div className="doctor-questionnaire-questions">
                    {section.questions.map((question) => {
                      const answer = answers[question.id]
                      const note = detailsByQuestion[question.id]
                      return (
                        <div className={`doctor-questionnaire-question${answer === 'Yes' ? ' is-yes' : ''}`} key={question.id}>
                          <div>
                            <strong>{question.label}</strong>
                            <small>{question.id}</small>
                            {answer === 'Yes' && <p>{note || 'No additional details'}</p>}
                          </div>
                          <span className={`patient-answer${answer === 'Yes' ? ' patient-answer-yes' : ''}`}>
                            {answer || 'Unanswered'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </details>
              )
            })}
          </div>
        </div>
      </details>

      {/* ===== NEW: Right column style stack (kept vertical so it fits your layout) ===== */}
      {/* Actions */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="strong" style={{ marginBottom: 8 }}>Actions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a className="btn" href={waUrl || '#'} target={waUrl ? '_blank' : undefined} rel="noreferrer"
            aria-disabled={!waUrl} onClick={(e) => { if (!waUrl) e.preventDefault() }}>
            📞 Call Patient
          </a>
          <Link className="btn secondary" to={`/doctor/consultations/${encodeURIComponent(String(id))}/care-history`}>↶ Patient Care History</Link>
          <button type="button" className="btn secondary" disabled>🔔 Select Notification Type</button>
          <button type="button" className="btn" disabled={readOnly}>🗓️ Schedule a Call</button>
        </div>
      </div>
      </div>

      <div className="doctor-notes-column">

      {/* History of Presenting Complaint */}
      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ marginBottom: 10 }}>
          <div className="strong" style={{ marginBottom: 6 }}>Prescription Requirement</div>
          <label style={{ marginRight: 12 }}>
            <input type="radio" checked={!prescriptionRequired} disabled={readOnly} onChange={() => setPrescriptionRequired(false)} /> No Prescription
          </label>
          <label>
            <input type="radio" checked={prescriptionRequired} disabled={readOnly} onChange={() => setPrescriptionRequired(true)} /> Prescription Required
          </label>
        </div>
        <div className="strong" style={{ marginBottom: 8 }}>History of Presenting Complaint</div>
        <textarea
          value={history}
          disabled={readOnly}
          onChange={(e) => setHistory(e.target.value)}
          placeholder="Detail patient's complaint history here..."
          rows={4}
          style={{ width: '100%' }}
        />
      </div>

      {/* Diagnosis */}
      <div className="card" style={{ marginTop: 12, opacity: prescriptionRequired ? 1 : 0.5 }}>
        <div className="strong" style={{ marginBottom: 8 }}>Diagnosis</div>
        <textarea
          value={diagnosis}
          disabled={readOnly}
          onChange={(e) => setDiagnosis(e.target.value)}
          placeholder="Enter patient diagnosis…"
          rows={3}
          style={{ width: '100%' }}
        />
      </div>

      {/* Medicines */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="strong" style={{ marginBottom: 8 }}>Medicines</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {medicines.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 8 }}>
              <textarea
                value={m}
                onChange={(e) => setMed(i, e.target.value)}
                disabled={readOnly || !prescriptionRequired}
                placeholder="e.g., Amoxicillin 500mg – 1 capsule three times daily for 7 days"
                rows={2}
                style={{ flex: 1 }}
              />
              {medicines.length > 1 && (
                <button type="button" className="btn secondary" onClick={() => removeMed(i)} disabled={readOnly || !prescriptionRequired}>Remove</button>
              )}
            </div>
          ))}
          <div>
            {!readOnly && <button type="button" className="btn secondary" onClick={addMed} disabled={!prescriptionRequired}>Add another medicine</button>}
          </div>
        </div>

        {/* Recommendations */}
        <div className="card" style={{ marginTop: 12 }}>
          <div className="strong" style={{ marginBottom: 8 }}>Recommendations</div>
          <textarea
            value={recommendations}
            disabled={readOnly}
            onChange={(e) => setRecommendations(e.target.value)}
            placeholder="Provide recommendations…"
            rows={3}
            style={{ width: '100%' }}
          />
        </div>

        {/* Create Prescription */}
        <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {prescriptionRequired && !readOnly && (
            <button type="button" className="btn" onClick={createPrescription} disabled={creatingRx}>
              {creatingRx ? 'Creating…' : 'Create Prescription'}
            </button>
          )}
          {rxErr && <span className="muted small" style={{ color: '#b91c1c' }}>{rxErr}</span>}
          {rxId && (
            <>
              <span className="muted small">Prescription created (ID #{rxId})</span>
              {rxPdfUrl && (
                <a className="btn secondary" href={rxPdfUrl} target="_blank" rel="noreferrer">
                  View Prescription (PDF)
                </a>
              )}
            </>
          )}
        </div>
        {data?.status !== 'COMPLETED' && (
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn"
              onClick={completeConsultation}
              disabled={savingConsultation || (prescriptionRequired && !rxId)}
              title={prescriptionRequired && !rxId ? 'Create prescription first, or select No Prescription.' : undefined}
            >
              {savingConsultation ? 'Completing…' : 'Complete Consultation'}
            </button>
            {prescriptionRequired && !rxId && (
              <div className="muted small" style={{ marginTop: 6 }}>
                Create a prescription first, or switch to No Prescription to complete.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Patient Records quick actions */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="strong" style={{ marginBottom: 8 }}>Patient Records</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {rxPdfUrl ? (
            <a className="btn secondary" href={rxPdfUrl} target="_blank" rel="noreferrer">View Prescription</a>
          ) : (
            <button className="btn secondary" type="button" disabled>View Prescription</button>
          )}
          <Link className="btn secondary" to={`/doctor/consultations/${encodeURIComponent(String(id))}/care-history`}>Patient Care History</Link>
          <button className="btn secondary" type="button" disabled>Admin/Miscellaneous Letter</button>
          {/* Referral Letter (builder) */}
          {prescriptionRequired && !readOnly && ((id || data?.id) ? (
            <Link
              to={`/doctor/referral/${encodeURIComponent(String(id ?? data.id))}`}
              className="btn secondary"
              type="button"
              onClick={(e) => { if (!prescriptionRequired) e.preventDefault() }}
              aria-disabled={!prescriptionRequired}
            >
              Referral Letter
            </Link>
          ) : (
            <button className="btn secondary" type="button" disabled>
              Referral Letter
            </button>
          ))}
          {/* View generated Referral (only if one exists) */}
          {prescriptionRequired && (() => {
            const href =
              (typeof referralPdfUrl === 'string' && referralPdfUrl) ||
              ((typeof referralId === 'number' || typeof referralId === 'string') &&
                `${API_BASE_URL}/doctor/referrals/${encodeURIComponent(String(referralId))}/pdf`);

            return href ? (
              <a className="btn secondary" href={href as string} target="_blank" rel="noreferrer">
                View generated referral letter
              </a>
            ) : (
              <button className="btn secondary" type="button" disabled>
                View generated referral letter
              </button>
            );
          })()}
        </div>
      </div>
      </div>
      </div>

    </section>
  )
}
