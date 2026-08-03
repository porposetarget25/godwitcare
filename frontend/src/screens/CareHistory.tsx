// src/screens/CareHistory.tsx
import React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { authFetch, API_BASE_URL, resolveApiUrl } from '../api';
import { usePatient } from '../state/patient';

type Item = {
  consultationId: number;
  date: string;                    // ISO Instant from Consultation.createdAt
  locationTravellingTo?: string;   // Consultation.currentLocation
  presentingComplaint?: string;    // Prescription.historyOfPresentingComplaint
  diagnosis?: string;              // Prescription.diagnosis
  medicines?: string;              // Prescription.medicines (newline-separated)
  recommendations?: string;
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
  const { activePatient, loading: patientLoading, queryString } = usePatient();
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
  const [rxUrl, setRxUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

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

      // Latest prescription (optional quick link)
      if (!doctorConsultationId) try {
        const qp2 = new URLSearchParams();
        if (travelerId) qp2.set('travelerId', travelerId);
        if (patientId) qp2.set('patientId', patientId);
        const r2 = await authFetch(`${API_BASE_URL}/prescriptions/latest?${qp2.toString()}`, {});
        if (!ignore) {
          if (!r2.ok || r2.status === 204) {
            setRxUrl(null);
          } else {
            const j2 = await r2.json().catch(() => null);
            setRxUrl(j2?.pdfUrl ? resolveApiUrl(API_BASE_URL, j2.pdfUrl) : null);
          }
        }
      } catch {
        if (!ignore) setRxUrl(null);
      }

      if (!ignore) setLoading(false);
    })();
    return () => { ignore = true; };
  }, [activePatient, doctorConsultationId, patientId, patientLoading, queryString, travelerId]);

  const printPdf = () => window.print();

  if (loading) {
    return (
      <section className="section">
        <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="page-title">Care History</h1>
          <Link to={backHref} className="btn secondary">{isDoctorView ? 'Back to Consultation' : 'Back'}</Link>
        </div>
        <div className="card">Loading…</div>
      </section>
    );
  }

  if (err) {
    return (
      <section className="section">
        <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="page-title">Care History</h1>
          <Link to={backHref} className="btn secondary">{isDoctorView ? 'Back to Consultation' : 'Back'}</Link>
        </div>
        <div className="card" style={{ color: '#b91c1c' }}>{err}</div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="section">
        <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="page-title">Care History</h1>
          <Link to={backHref} className="btn secondary">{isDoctorView ? 'Back to Consultation' : 'Back'}</Link>
        </div>
        <div className="card">No history available yet.</div>
      </section>
    );
  }

  const { patient, items } = data;

  const medsToList = (s?: string) =>
    (s || '')
      .split(/\r?\n/)
      .map(x => x.trim())
      .filter(Boolean);

  return (
    <section className="section">
      {/* Header */}
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Care History</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to={backHref} className="btn secondary">{isDoctorView ? 'Back to Consultation' : 'Back'}</Link>
          <button className="btn" onClick={printPdf}>Print / Save as PDF</button>
        </div>
      </div>

      {isDoctorView && (
        <div className="consultation-readonly" role="status">
          Read-only patient record. Return to the consultation to record new clinical information.
        </div>
      )}

      {/* Patient Overview */}
      <div className="card" style={{ marginBottom: 12, borderRadius: 16, padding: 20 }}>
        <div className="strong" style={{ marginBottom: 12, fontSize: 18 }}>Patient Overview</div>

        {/* Horizontal 3-column layout */}
        <div
          className="grid three"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1.2fr',
            columnGap: 24,
            rowGap: 0,
            alignItems: 'start',
          }}
        >
          <div>
            <div className="muted small" style={{ marginBottom: 4 }}>Patient Name:</div>
            <div className="strong" style={{ fontSize: 16 }}>{patient.name || '—'}</div>
          </div>

          <div>
            <div className="muted small" style={{ marginBottom: 4 }}>Patient ID:</div>
            <div className="strong" style={{ fontSize: 16 }}>{String(patient.patientId ?? '—')}</div>
          </div>

          <div>
            <div className="muted small" style={{ marginBottom: 4 }}>Gender / Date of Birth:</div>
            <div className="strong" style={{ fontSize: 16 }}>
              {[patient.gender, patient.dob].filter(Boolean).join(', ') || '—'}
            </div>
          </div>
        </div>
      </div>


      {/* Prescription quick link (if exists) */}
      {rxUrl && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="strong" style={{ marginBottom: 6 }}>Prescription</div>
          <a href={rxUrl} target="_blank" rel="noreferrer" className="btn">View Latest Prescription</a>
        </div>
      )}

      {/* Timeline */}
      <div className="strong" style={{ margin: '12px 0 8px' }}>Patient Care History</div>

      {items.length === 0 && <div className="card">No consultations with prescriptions yet.</div>}

      {items.map((it) => {
        const dateStr = new Date(it.date).toLocaleDateString(undefined, {
          year: 'numeric', month: 'long', day: 'numeric'
      });
        const meds = medsToList(it.medicines);

        return (
          <div
            key={it.consultationId}
            style={{
              display: 'grid',
              gridTemplateColumns: '220px 1fr',
              gap: 16,
              alignItems: 'start',
              marginBottom: 18
            }}
          >
            <div className="muted strong">{dateStr}</div>

            <div className="card">
              <div className="strong" style={{ marginBottom: 6 }}>Location Travelling To:</div>
              <div style={{ marginBottom: 10 }}>{it.locationTravellingTo || '—'}</div>

              <div className="strong" style={{ marginTop: 8 }}>Presenting Complaint:</div>
              <div style={{ marginBottom: 10 }}>{it.presentingComplaint || '—'}</div>

              <div className="strong" style={{ marginTop: 8 }}>Diagnosis:</div>
              <div style={{ marginBottom: 10 }}>{it.diagnosis || '—'}</div>

              <div className="strong" style={{ marginTop: 8 }}>Medicines Given:</div>
              {meds.length > 0 ? (
                <ul style={{ marginTop: 4, paddingLeft: 18 }}>
                  {meds.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              ) : (
                <div>—</div>
              )}
              <div className="strong" style={{ marginTop: 8 }}>Recommendations:</div>
              <div style={{ marginBottom: 10 }}>{it.recommendations || '—'}</div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
