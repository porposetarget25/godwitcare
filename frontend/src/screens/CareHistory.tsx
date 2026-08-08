// src/screens/CareHistory.tsx
import React from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { authFetch, API_BASE_URL, resolveApiUrl, openAuthenticatedFile } from '../api';
import { usePatient } from '../state/patient';

type Item = {
  consultationId: number;
  date: string;                    // ISO Instant from Consultation.createdAt
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'LOGGED';
  locationTravellingTo?: string;   // Consultation.currentLocation
  presentingComplaint?: string;    // Prescription.historyOfPresentingComplaint
  diagnosis?: string;              // Prescription.diagnosis
  medicines?: string;              // Prescription.medicines (newline-separated)
  recommendations?: string;
  pdfUrl?: string;                 // patient-safe download route for THIS item's own prescription
  referralPdfUrl?: string;         // patient-safe download route for THIS item's own referral letter
};

type Payload = {
  patient: {
    name: string;
    patientId?: string | number;
    dob?: string;                  // yyyy-MM-dd
    gender?: string;
  };
  items: Item[];
};

export default function CareHistory() {
  const { id: doctorConsultationId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { patients, activePatient, loading: patientLoading, queryString, selectPatient } = usePatient();
  const travelerId = doctorConsultationId ? params.get('travelerId') : (activePatient?.id === 'PRIMARY' ? null : activePatient?.id || null);
  const patientId = doctorConsultationId ? params.get('patientId') : activePatient?.patientId || null;
  const backHref = React.useMemo(() => {
    if (doctorConsultationId) return `/doctor/consultations/${encodeURIComponent(doctorConsultationId)}`;
    const qp = new URLSearchParams();
    if (travelerId) qp.set('travelerId', travelerId);
    if (patientId) qp.set('patientId', patientId);
    const q = qp.toString();
    return q ? `/home?${q}` : '/home';
  }, [doctorConsultationId, travelerId, patientId]);
  const isDoctorView = Boolean(doctorConsultationId);
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [openingReferral, setOpeningReferral] = React.useState<number | null>(null);

  async function onViewReferral(consultationId: number, url: string) {
    setOpeningReferral(consultationId);
    setErr('');
    try {
      await openAuthenticatedFile(resolveApiUrl(API_BASE_URL, url));
    } catch {
      setErr('Unable to open the referral letter.');
    } finally {
      setOpeningReferral(null);
    }
  }

  React.useEffect(() => {
    if (!doctorConsultationId && (patientLoading || !activePatient)) return;
    let ignore = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        // Care history: Patient header + items (only when a Rx exists)
        const qp = new URLSearchParams();
        if (travelerId) qp.set('travelerId', travelerId);
        if (patientId) qp.set('patientId', patientId);
        const historyUrl = doctorConsultationId
          ? `${API_BASE_URL}/doctor/consultations/${encodeURIComponent(doctorConsultationId)}/care-history`
          : `${API_BASE_URL}/care-history/mine?${qp.toString()}`;
        const r = await authFetch(historyUrl, {});
        if (ignore) return;
        if (r.status === 204) {
          setData(null);
        } else if (r.ok) {
          const j = (await r.json()) as Payload;
          setData(j);
        } else {
          setErr(`Failed to load care history (HTTP ${r.status})`);
        }
      } catch (e: any) {
        if (!ignore) setErr(e?.message || 'Failed to load care history');
      }

      if (!ignore) setLoading(false);
    })();
    return () => { ignore = true; };
  }, [activePatient, doctorConsultationId, patientId, patientLoading, queryString, travelerId]);

  const printPdf = () => window.print();

  const backLabel = isDoctorView ? 'Back to Consultation' : '‹ Home';

  const medsToList = (s?: string) =>
    (s || '')
      .split(/\r?\n/)
      .map(x => x.trim())
      .filter(Boolean);

  let body: React.ReactNode;
  if (loading) {
    body = <div className="card">Loading…</div>;
  } else if (err) {
    body = <div className="notice n-warn"><i className="ti ti-alert-triangle" aria-hidden="true" />{err}</div>;
  } else if (!data) {
    body = <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No care history records yet.</div>;
  } else {
    const { patient, items } = data;
    body = (
      <>
        <div className="card">
          <div className="ct">Patient Overview</div>
          <div className="g3">
            <div>
              <div className="fi-hint">Patient Name</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{patient.name || '—'}</div>
            </div>
            <div>
              <div className="fi-hint">Patient ID</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{String(patient.patientId ?? '—')}</div>
            </div>
            <div>
              <div className="fi-hint">Gender / Date of Birth</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{[patient.gender, patient.dob].filter(Boolean).join(', ') || '—'}</div>
            </div>
          </div>
        </div>

        <div className="ct" style={{ margin: '12px 0 8px' }}>Patient Care History</div>

        {items.length === 0 && <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No care history records yet.</div>}

        {items.map((it) => {
          const dateStr = new Date(it.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
          const meds = medsToList(it.medicines);
          const canViewPrescription = !isDoctorView && !!it.pdfUrl;
          const canViewReferral = !isDoctorView && !!it.referralPdfUrl;
          const showReferralButton = !isDoctorView

          return (
            <div key={it.consultationId} className="timeline-row">
              <div className="fi-hint timeline-date">{dateStr}</div>
              <div className="card" style={{ marginBottom: 0 }}>
                <div className="fi-hint">Location Travelling To</div>
                <div style={{ marginBottom: 10, fontSize: 13 }}>{it.locationTravellingTo || '—'}</div>

                <div className="fi-hint">Presenting Complaint</div>
                <div style={{ marginBottom: 10, fontSize: 13 }}>{it.presentingComplaint || '—'}</div>

                <div className="fi-hint">Diagnosis</div>
                <div style={{ marginBottom: 10, fontSize: 13 }}>{it.diagnosis || '—'}</div>

                <div className="fi-hint">Medicines Given</div>
                {meds.length > 0 ? (
                  <ul style={{ margin: '4px 0 10px', paddingLeft: 18, fontSize: 13 }}>
                    {meds.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                ) : (
                  <div style={{ marginBottom: 10, fontSize: 13 }}>—</div>
                )}

                <div className="fi-hint">Recommendations</div>
                <div style={{ marginBottom: (canViewPrescription || showReferralButton) ? 10 : 0, fontSize: 13 }}>{it.recommendations || '—'}</div>

                {(canViewPrescription || showReferralButton) && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {canViewPrescription && (
                      <button
                        type="button"
                        className="bs"
                        onClick={() => navigate(queryString ? `/prescription?${queryString}` : '/prescription', { state: { ...it, patientName: patient.name, rxUrl: resolveApiUrl(API_BASE_URL, it.pdfUrl!) } })}
                      >
                        View Prescription
                      </button>
                    )}
                    {showReferralButton && (
                      canViewReferral ? (
                        <button
                          type="button"
                          className="bs"
                          onClick={() => onViewReferral(it.consultationId, it.referralPdfUrl!)}
                          disabled={openingReferral === it.consultationId}
                        >
                          {openingReferral === it.consultationId ? 'Opening…' : 'View Referral Letter'}
                        </button>
                      ) : (
                        <button type="button" className="bs" disabled title="Your clinician hasn't generated a referral letter for this consultation yet.">
                          Referral Letter Not Generated
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <div className="page-title">Care History</div>
        <div className="page-head-actions">
          {!isDoctorView && <Link to={queryString ? `/referral?${queryString}` : '/referral'} className="bs">Referral Letter</Link>}
          <Link to={backHref} className="bs">{backLabel}</Link>
          {!loading && !err && data && (
            <button type="button" className="bs" onClick={printPdf}><i className="ti ti-printer" aria-hidden="true" /> Print / Save as PDF</button>
          )}
        </div>
      </div>

      {isDoctorView && (
        <div className="notice n-info">
          <i className="ti ti-lock" aria-hidden="true" />
          Read-only patient record. Return to the consultation to record new clinical information.
        </div>
      )}

      {!isDoctorView && patients.length > 1 && (
        <div className="patient-chip-row">
          {patients.map(p => (
            <button
              key={p.patientId}
              type="button"
              className={`patient-chip${activePatient?.patientId === p.patientId ? ' on' : ''}`}
              onClick={() => selectPatient(p.patientId)}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {body}
    </>
  );
}
