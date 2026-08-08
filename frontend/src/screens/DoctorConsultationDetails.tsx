import React, { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { authFetch, doctorGetConsultation, API_BASE_URL, doctorLatestPrescriptionMeta, resolveApiUrl, openAuthenticatedFile } from '../api'
import { QUESTIONNAIRE_SECTIONS } from '../questionnaire'
import Modal from '../components/portal/Modal'

export default function DoctorConsultationDetails() {
  const { id } = useParams()
  const [data, setData] = useState<any>(null)
  const [answers, setAnswers] = useState<Record<string, 'Yes' | 'No'>>({})
  const [detailsByQuestion, setDetailsByQuestion] = useState<Record<string, string>>({})
  const [savingConsultation, setSavingConsultation] = useState(false)
  const [consultationSaveErr, setConsultationSaveErr] = useState<string | null>(null)
  const [prescriptionRequired, setPrescriptionRequired] = useState(true)
  const [expandedQuestionnaireSections, setExpandedQuestionnaireSections] = useState<Set<string>>(new Set())

  const [history, setHistory] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [medicines, setMedicines] = useState<string[]>([''])
  const [recommendations, setRecommendations] = useState('')
  const [creatingRx, setCreatingRx] = useState(false)
  const [rxErr, setRxErr] = useState<string | null>(null)
  const [rxId, setRxId] = useState<number | null>(null)
  const [rxPdfUrl, setRxPdfUrl] = useState<string | null>(null)

  const rxUrlRef = useRef<string | null>(null)
  useEffect(() => () => { if (rxUrlRef.current) URL.revokeObjectURL(rxUrlRef.current) }, [])

  const [referralId, setReferralId] = useState<number | null>(null)
  const [referralPdfUrl, setReferralPdfUrl] = useState<string | null>(null)
  const [openingReferral, setOpeningReferral] = useState(false)
  const [referralOpenErr, setReferralOpenErr] = useState<string | null>(null)

  async function openReferralPdf(url: string) {
    setOpeningReferral(true)
    setReferralOpenErr(null)
    try {
      await openAuthenticatedFile(url)
    } catch (e: any) {
      setReferralOpenErr(e?.message || 'Unable to open the referral letter.')
    } finally {
      setOpeningReferral(false)
    }
  }

  const [showNoShowModal, setShowNoShowModal] = useState(false)
  const [noShowNote, setNoShowNote] = useState('')
  const [markingNoShow, setMarkingNoShow] = useState(false)
  const [noShowErr, setNoShowErr] = useState<string | null>(null)

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
        setExpandedQuestionnaireSections(new Set(sectionsWithYesAnswers))
        setHistory(d?.historyOfPresentingComplaint || '')
        setDiagnosis(d?.diagnosis || '')
        setRecommendations(d?.recommendations || '')
        setPrescriptionRequired(d?.prescriptionRequired !== false)

        try {
          const meta = await doctorLatestPrescriptionMeta(Number(id))
          if (meta && meta.id) {
            setRxId(meta.id)
            setRxPdfUrl(meta.pdfUrl ? resolveApiUrl(API_BASE_URL, meta.pdfUrl) : null)
          } else {
            setRxId(null); setRxPdfUrl(null)
          }
        } catch {
          setRxId(null); setRxPdfUrl(null)
        }
      } catch { /* handled */ }
    })()
    return () => { ignore = true }
  }, [id])

  useEffect(() => {
    const cid = Number(id)
    if (!cid) { setReferralId(null); setReferralPdfUrl(null); return }
    let ignore = false
    ;(async () => {
      try {
        const r = await authFetch(`${API_BASE_URL}/doctor/consultations/${cid}/referrals/latest`, {})
        if (ignore) return
        if (r.status === 204) { setReferralId(null); setReferralPdfUrl(null) }
        else if (r.ok) {
          const meta = await r.json().catch(() => ({} as any))
          setReferralId(typeof meta?.id === 'number' ? meta.id : null)
          setReferralPdfUrl(meta?.pdfUrl ? resolveApiUrl(API_BASE_URL, meta.pdfUrl) : null)
        } else { setReferralId(null); setReferralPdfUrl(null) }
      } catch {
        if (!ignore) { setReferralId(null); setReferralPdfUrl(null) }
      }
    })()
    return () => { ignore = true }
  }, [id])

  if (!data) return <div className="card">Loading…</div>

  const phoneDigits = (data.contactPhone || '').replace(/[^\d+]/g, '')
  const waUrl = phoneDigits ? `https://wa.me/${phoneDigits.replace(/^0+/, '')}` : ''
  const readOnly = data.status === 'COMPLETED'
  const appointmentStatus: string | undefined = data.appointmentStatus
  const isNoShow = appointmentStatus === 'NO_SHOW'

  function setMed(idx: number, val: string) { setMedicines(list => list.map((m, i) => i === idx ? val : m)) }
  function addMed() { setMedicines(list => [...list, '']) }
  function removeMed(idx: number) { setMedicines(list => list.filter((_, i) => i !== idx)) }

  async function completeConsultation() {
    if (!data?.id || savingConsultation) return
    setConsultationSaveErr(null)
    setSavingConsultation(true)
    try {
      const res = await authFetch(`${API_BASE_URL}/doctor/consultations/${data.id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: history.trim(), diagnosis: diagnosis.trim(), recommendations: recommendations.trim(), prescriptionRequired }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData((prev: any) => ({ ...prev, status: 'COMPLETED' }))
    } catch (err: any) {
      setConsultationSaveErr(err?.message || 'Failed to complete consultation')
    } finally {
      setSavingConsultation(false)
    }
  }

  async function createPrescription() {
    setRxErr(null)
    const meds = medicines.map(m => (m || '').trim()).filter(Boolean)
    if (!diagnosis.trim()) { setRxErr('Please enter a diagnosis.'); return }
    if (meds.length === 0) { setRxErr('Please add at least one medicine.'); return }

    setCreatingRx(true)
    try {
      const res = await authFetch(`${API_BASE_URL}/doctor/consultations/${data.id}/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: history.trim(), diagnosis: diagnosis.trim(), medicines: meds, recommendations: recommendations.trim() }),
      })
      if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(t || `HTTP ${res.status}`) }
      const j = await res.json().catch(() => ({}))
      setRxId(typeof j.id === 'number' ? j.id : null)

      const pdfRes = await authFetch(`${API_BASE_URL}/doctor/prescriptions/${j.id}/pdf`, {})
      if (!pdfRes.ok) throw new Error('Failed to download prescription PDF')
      const blob = await pdfRes.blob()
      const url = URL.createObjectURL(blob)
      if (rxUrlRef.current) URL.revokeObjectURL(rxUrlRef.current)
      rxUrlRef.current = url
      setRxPdfUrl(url)
    } catch (err: any) {
      setRxErr(err?.message || 'Failed to create prescription')
    } finally {
      setCreatingRx(false)
    }
  }

  async function confirmNoShow() {
    setMarkingNoShow(true)
    setNoShowErr(null)
    try {
      const res = await authFetch(`${API_BASE_URL}/doctor/consultations/${data.id}/no-show`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noShowNote.trim() }),
      })
      if (!res.ok) { const t = await res.json().catch(() => null); throw new Error(t?.message || `HTTP ${res.status}`) }
      const appt = await res.json()
      setData((prev: any) => ({ ...prev, appointmentStatus: appt.status, appointmentNoShowNote: appt.noShowNote }))
      setShowNoShowModal(false)
      setNoShowNote('')
    } catch (err: any) {
      setNoShowErr(err?.message || 'Failed to mark as no-show.')
    } finally {
      setMarkingNoShow(false)
    }
  }

  const created = new Date(data.createdAt)
  const dobStr = data?.patient?.dob ? new Date(data.patient.dob).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/doctor/consultations" className="bs" style={{ marginBottom: 8, display: 'inline-flex' }}>‹ Consultations</Link>
          <div className="page-title">Consultation — #{data.id}</div>
        </div>
        <span className={`tag ${isNoShow ? 'tnoshow' : readOnly ? 'tmute' : 'tinfo'}`}>{isNoShow ? 'No-show' : data.status}</span>
      </div>

      {readOnly && <div className="notice n-info"><i className="ti ti-lock" aria-hidden="true" />Completed consultation — view only.</div>}
      {isNoShow && (
        <div className="notice n-warn">
          <i className="ti ti-user-x" aria-hidden="true" />
          <div><strong>Marked as no-show.</strong> {data.appointmentNoShowNote ? data.appointmentNoShowNote : 'No note recorded.'}</div>
        </div>
      )}

      <div className="g2">
        <div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{data.patient.firstName} {data.patient.lastName}</div>
              <div className="fi-hint">{created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {created.toLocaleDateString([], { day: '2-digit', month: 'short' })}</div>
            </div>
            <div className="dr"><div className="dk">DOB</div><div className="dv">{dobStr}</div></div>
            <div className="dr"><div className="dk">Patient ID</div><div className="dv">{data.patientId ?? '—'}</div></div>
          </div>

          <details className="card" open={Boolean(data.contactPhone || data.contactAddress || data.patient.email)}>
            <summary style={{ cursor: 'pointer' }} className="ct">Patient Contact &amp; Address</summary>
            <div className="dr"><div className="dk">Phone (WhatsApp)</div><div className="dv">{data.contactPhone || '—'}</div></div>
            <div className="dr"><div className="dk">Address</div><div className="dv">{data.contactAddress || '—'}</div></div>
            <div className="dr"><div className="dk">Email</div><div className="dv">{data.patient.email || '—'}</div></div>
            {waUrl && <a className="bp" href={waUrl} target="_blank" rel="noreferrer" style={{ marginTop: 10, display: 'inline-flex' }}>WhatsApp Patient</a>}
          </details>

          <details className="card" open>
            <summary style={{ cursor: 'pointer' }} className="ct">Questionnaire — {Object.keys(answers || {}).length} responses</summary>
            {QUESTIONNAIRE_SECTIONS.map(section => {
              const answeredCount = section.questions.filter(({ id: qid }) => answers[qid] != null).length
              return (
                <details
                  key={section.title}
                  className="accordion-item"
                  open={expandedQuestionnaireSections.has(section.title)}
                  onToggle={(event) => {
                    const isOpen = event.currentTarget.open
                    setExpandedQuestionnaireSections(current => {
                      if (current.has(section.title) === isOpen) return current
                      const next = new Set(current)
                      if (isOpen) next.add(section.title); else next.delete(section.title)
                      return next
                    })
                  }}
                >
                  <summary className="accordion-header" style={{ cursor: 'pointer' }}>
                    <span className="accordion-title">{section.title}</span>
                    <span className="accordion-count">{answeredCount}/{section.questions.length}</span>
                  </summary>
                  <div className="accordion-body">
                    {section.questions.map(question => {
                      const answer = answers[question.id]
                      const note = detailsByQuestion[question.id]
                      return (
                        <div key={question.id} className="q-row">
                          <span>
                            {question.label}
                            {answer === 'Yes' && note && <div className="fi-hint">{note}</div>}
                          </span>
                          <span className={`tag ${answer === 'Yes' ? 'tdanger' : 'tmute'}`}>{answer || 'Unanswered'}</span>
                        </div>
                      )
                    })}
                  </div>
                </details>
              )
            })}
          </details>

          <div className="card">
            <div className="ct">Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a className="bs" href={waUrl || '#'} target={waUrl ? '_blank' : undefined} rel="noreferrer" aria-disabled={!waUrl} onClick={(e) => { if (!waUrl) e.preventDefault() }}>
                <i className="ti ti-phone" aria-hidden="true" /> Call Patient
              </a>
              <Link className="bs" to={`/doctor/consultations/${encodeURIComponent(String(id))}/care-history`}>
                <i className="ti ti-history" aria-hidden="true" /> Patient Care History
              </Link>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="ct">Prescription Requirement</div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                <input type="radio" checked={!prescriptionRequired} disabled={readOnly} onChange={() => setPrescriptionRequired(false)} /> No Prescription
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                <input type="radio" checked={prescriptionRequired} disabled={readOnly} onChange={() => setPrescriptionRequired(true)} /> Prescription Required
              </label>
            </div>
            <div className="fi">
              <label className="fl2">History of Presenting Complaint</label>
              <textarea value={history} disabled={readOnly} onChange={(e) => setHistory(e.target.value)} placeholder="Detail patient's complaint history here..." rows={4} />
            </div>
          </div>

          <div className="card" style={{ opacity: prescriptionRequired ? 1 : 0.5 }}>
            <div className="ct">Diagnosis</div>
            <textarea value={diagnosis} disabled={readOnly} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Enter patient diagnosis…" rows={3} />
          </div>

          <div className="card">
            <div className="ct">Medicines</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {medicines.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <textarea value={m} onChange={(e) => setMed(i, e.target.value)} disabled={readOnly || !prescriptionRequired} placeholder="e.g., Amoxicillin 500mg – 1 capsule three times daily for 7 days" rows={2} style={{ flex: 1 }} />
                  {medicines.length > 1 && <button type="button" className="bg" onClick={() => removeMed(i)} disabled={readOnly || !prescriptionRequired}>Remove</button>}
                </div>
              ))}
              {!readOnly && <button type="button" className="bs" onClick={addMed} disabled={!prescriptionRequired}>+ Add Another Medicine</button>}
            </div>
          </div>

          <div className="card">
            <div className="ct">Recommendations</div>
            <textarea value={recommendations} disabled={readOnly} onChange={(e) => setRecommendations(e.target.value)} placeholder="Provide recommendations…" rows={3} />
          </div>

          <div className="card">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: data?.status !== 'COMPLETED' ? 10 : 0 }}>
              {prescriptionRequired && !readOnly && (
                <button type="button" className="bp" onClick={createPrescription} disabled={creatingRx}>{creatingRx ? 'Creating…' : 'Create Prescription'}</button>
              )}
              {rxErr && <span className="fi-hint" style={{ color: 'var(--text-danger)' }}>{rxErr}</span>}
              {rxId && <span className="tag tok">Prescription created (#{rxId})</span>}
              {!isNoShow && appointmentStatus === 'SCHEDULED' && !readOnly && (
                <button type="button" className="bd" onClick={() => setShowNoShowModal(true)}>Mark No-Show</button>
              )}
            </div>
            {data?.status !== 'COMPLETED' && (
              <>
                <button type="button" className="bp" onClick={completeConsultation} disabled={savingConsultation || (prescriptionRequired && !rxId)} title={prescriptionRequired && !rxId ? 'Create a prescription first, or select No Prescription.' : undefined}>
                  {savingConsultation ? 'Completing…' : 'Complete Consultation'}
                </button>
                {consultationSaveErr && <div className="fi-hint" style={{ color: 'var(--text-danger)', marginTop: 6 }}>{consultationSaveErr}</div>}
                {prescriptionRequired && !rxId && <div className="fi-hint" style={{ marginTop: 6 }}>Create a prescription first, or switch to No Prescription to complete.</div>}
              </>
            )}
          </div>

          <div className="card">
            <div className="ct">Patient Records</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {rxId ? (
                <Link
                  className="bs"
                  to={`/doctor/consultations/${encodeURIComponent(String(id))}/prescription`}
                  state={{ diagnosis, medicines, recommendations, history, patientName: `${data.patient.firstName} ${data.patient.lastName}`.trim(), rxId, rxPdfUrl }}
                >
                  View Prescription
                </Link>
              ) : (
                <button className="bs" type="button" disabled>View Prescription</button>
              )}
              <Link className="bs" to={`/doctor/consultations/${encodeURIComponent(String(id))}/care-history`}>Patient Care History</Link>
              <Link className="bs" to={`/doctor/consultations/${encodeURIComponent(String(id))}/letter`}>Admin/Miscellaneous Letter</Link>
              {prescriptionRequired && !readOnly ? (
                <Link className="bs" to={`/doctor/referral/${encodeURIComponent(String(id ?? data.id))}`}>Referral Letter</Link>
              ) : (
                <button className="bs" type="button" disabled>Referral Letter</button>
              )}
              {prescriptionRequired && (() => {
                const href = (typeof referralPdfUrl === 'string' && referralPdfUrl)
                  || ((typeof referralId === 'number' || typeof referralId === 'string') && `${API_BASE_URL}/doctor/referrals/${encodeURIComponent(String(referralId))}/pdf`)
                return href ? (
                  <button className="bs" type="button" onClick={() => openReferralPdf(href as string)} disabled={openingReferral}>
                    {openingReferral ? 'Opening…' : 'View generated referral letter'}
                  </button>
                ) : (
                  <button className="bs" type="button" disabled>View generated referral letter</button>
                )
              })()}
              {referralOpenErr && <div className="notice n-warn" style={{ width: '100%', marginTop: 8 }}><i className="ti ti-alert-triangle" aria-hidden="true" />{referralOpenErr}</div>}
            </div>
          </div>
        </div>
      </div>

      {showNoShowModal && (
        <Modal
          title="Mark as No-Show"
          onClose={() => setShowNoShowModal(false)}
          footer={(
            <>
              <button type="button" className="bs" onClick={() => setShowNoShowModal(false)}>Cancel</button>
              <button type="button" className="bd" onClick={confirmNoShow} disabled={markingNoShow}>{markingNoShow ? 'Saving…' : 'Save & Mark No-Show'}</button>
            </>
          )}
        >
          <div className="fi">
            <label className="fl2">Note (visible only to doctors on this case)</label>
            <textarea value={noShowNote} onChange={e => setNoShowNote(e.target.value)} rows={4} placeholder="e.g. Patient did not join the WhatsApp call after 15 minutes." />
          </div>
          {noShowErr && <div className="notice n-warn"><i className="ti ti-alert-triangle" aria-hidden="true" />{noShowErr}</div>}
        </Modal>
      )}
    </>
  )
}
