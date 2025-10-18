import React, { useEffect, useState, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doctorGetConsultation } from '../api'
import { API_BASE_URL } from '../api'
import { doctorCreatePrescription, doctorDownloadPrescriptionPdf, doctorLatestPrescriptionMeta } from '../api'
import { resolveApiUrl } from '../api'

export default function DoctorConsultationDetails() {
  const { id } = useParams()
  const [data, setData] = useState<any>(null)

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

  useEffect(() => {
    (async () => {
      try {
        const d = await doctorGetConsultation(Number(id))
        setData(d)

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
  }, [id])

  if (!data) return (
    <section className="section">
      <div className="muted">Loading…</div>
    </section>
  )

  const phoneDigits = (data.contactPhone || '').replace(/[^\d+]/g, '')
  const waUrl = phoneDigits ? `https://wa.me/${phoneDigits.replace(/^0+/, '')}` : ''

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
      const res = await fetch(
        `${API_BASE_URL}/doctor/consultations/${data.id}/prescriptions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
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
      const pdfRes = await fetch(`${API_BASE_URL}/doctor/prescriptions/${j.id}/pdf`, {
        credentials: 'include',
      });
      if (!pdfRes.ok) throw new Error('Failed to download prescription PDF');

      const blob = await pdfRes.blob();
      const url = URL.createObjectURL(blob);
      setRxPdfUrl(url);

    } catch (err: any) {
      setRxErr(err?.message || 'Failed to create prescription');
    } finally {
      setCreatingRx(false);
    }
  }


  return (
    <section className="section">
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Consultation -{data.id}</h1>
        <Link className="btn secondary" to="/doctor/consultations">Back</Link>
      </div>

      {/* Patient summary card (unchanged) */}
      <div className="card" style={{ padding: 16 }}>
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

      <div className="card" style={{ marginTop: 12 }}>
        <div className="strong">Patient Contact & Address</div>
        <div><span className="muted">Phone (WhatsApp):</span> {data.contactPhone || '—'}</div>
        <div><span className="muted">Address:</span> {data.contactAddress || '—'}</div>
        <div><span className="muted">Email:</span> {data.patient.email || '—'}</div>
        {waUrl && <a className="btn" href={waUrl} target="_blank" rel="noreferrer" style={{ marginTop: 8 }}>WhatsApp Patient</a>}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="strong" style={{ marginBottom: 8 }}>Questionnaire</div>
        {data.answers && Object.keys(data.answers).length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>Question ID</th>
                <th style={{ padding: '6px 8px' }}>Answer</th>
                <th style={{ padding: '6px 8px' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.answers).map(([qid, ans]) => {
                const note = (data.detailsByQuestion || {})[qid]
                const isYes = String(ans).toLowerCase() === 'yes'
                return (
                  <tr
                    key={qid}
                    style={{
                      borderTop: '1px solid #e5e7eb',
                      background: isYes ? '#fef3c7' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '6px 8px', fontSize: 13, fontWeight: 500 }}>{qid}</td>
                    <td style={{ padding: '6px 8px' }}>{String(ans)}</td>
                    <td style={{ padding: '6px 8px', color: note ? '#374151' : '#9ca3af' }}>
                      {note ? note : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : <div className="muted">No answers</div>}
      </div>

      {/* ===== NEW: Right column style stack (kept vertical so it fits your layout) ===== */}
      {/* Actions */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="strong" style={{ marginBottom: 8 }}>Actions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a className="btn" href={waUrl || '#'} target={waUrl ? '_blank' : undefined} rel="noreferrer"
            aria-disabled={!waUrl} onClick={(e) => { if (!waUrl) e.preventDefault() }}>
            📞 Call Patient
          </a>
          <button type="button" className="btn secondary" disabled>🔔 Select Notification Type</button>
          <button type="button" className="btn">🗓️ Schedule a Call</button>
        </div>
      </div>

      {/* History of Presenting Complaint */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="strong" style={{ marginBottom: 8 }}>History of Presenting Complaint</div>
        <textarea
          value={history}
          onChange={(e) => setHistory(e.target.value)}
          placeholder="Detail patient's complaint history here..."
          rows={4}
          style={{ width: '100%' }}
        />
      </div>

      {/* Diagnosis */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="strong" style={{ marginBottom: 8 }}>Diagnosis</div>
        <textarea
          value={diagnosis}
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
                placeholder="e.g., Amoxicillin 500mg – 1 capsule three times daily for 7 days"
                rows={2}
                style={{ flex: 1 }}
              />
              {medicines.length > 1 && (
                <button type="button" className="btn secondary" onClick={() => removeMed(i)}>Remove</button>
              )}
            </div>
          ))}
          <div>
            <button type="button" className="btn secondary" onClick={addMed}>Add another medicine</button>
          </div>
        </div>

        {/* Recommendations */}
        <div className="card" style={{ marginTop: 12 }}>
          <div className="strong" style={{ marginBottom: 8 }}>Recommendations</div>
          <textarea
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            placeholder="Provide recommendations…"
            rows={3}
            style={{ width: '100%' }}
          />
        </div>

        {/* Create Prescription */}
        <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={createPrescription} disabled={creatingRx}>
            {creatingRx ? 'Creating…' : 'Create Prescription'}
          </button>
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
          <button className="btn secondary" type="button" disabled>View Case History</button>
          <button className="btn secondary" type="button" disabled>Admin/Miscellaneous Letter</button>
          {/* Referral Letter */}
          {(id || data?.id) ? (
            <Link
              to={`/doctor/referral/${encodeURIComponent(String(id ?? data.id))}`}
              className="btn secondary"
              type="button"
            >
              Referral Letter
            </Link>
          ) : (
            <button className="btn secondary" type="button" disabled>
              Referral Letter
            </button>
          )}


        </div>
      </div>
    </section>
  )
}
