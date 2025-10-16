// src/screens/CareHistory.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL, resolveApiUrl } from '../api';

type Item = {
  consultationId: number;
  date: string;                    // ISO Instant from Consultation.createdAt
  locationTravellingTo?: string;   // Consultation.currentLocation
  presentingComplaint?: string;    // Prescription.historyOfPresentingComplaint
  diagnosis?: string;              // Prescription.diagnosis
  medicines?: string;              // Prescription.medicines (newline-separated)
};

type Payload = {
  patient: {
    name: string;
    patientId?: string | number;
    dob?: string;                  // yyyy-MM-dd
  };
  items: Item[];
};

export default function CareHistory() {
  const [data, setData] = React.useState<Payload | null>(null);
  const [rxUrl, setRxUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        // Care history: Patient header + items (only when a Rx exists)
        const r = await fetch(`${API_BASE_URL}/care-history/mine`, { credentials: 'include' });
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
      try {
        const r2 = await fetch(`${API_BASE_URL}/prescriptions/latest`, { credentials: 'include' });
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
  }, []);

  const printPdf = () => window.print();

  if (loading) {
    return (
      <section className="section">
        <div className="page-head" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h1 className="page-title">Care History</h1>
          <Link to="/home" className="btn secondary">Back</Link>
        </div>
        <div className="card">Loading…</div>
      </section>
    );
  }

  if (err) {
    return (
      <section className="section">
        <div className="page-head" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h1 className="page-title">Care History</h1>
          <Link to="/home" className="btn secondary">Back</Link>
        </div>
        <div className="card" style={{ color:'#b91c1c' }}>{err}</div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="section">
        <div className="page-head" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h1 className="page-title">Care History</h1>
          <Link to="/home" className="btn secondary">Back</Link>
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
      <div className="page-head" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h1 className="page-title">Care History</h1>
        <div style={{ display:'flex', gap:8 }}>
          <Link to="/home" className="btn secondary">Back</Link>
          <button className="btn" onClick={printPdf}>Print / Save as PDF</button>
        </div>
      </div>

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
            </div>
          </div>
        );
      })}
    </section>
  );
}
