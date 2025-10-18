// src/screens/DoctorReferral.tsx
import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL } from '../api';

// Prevent double `/api` (e.g., API_BASE_URL already has /api and server returns /api/..)
function normalizeApiUrl(base: string, path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path; // already absolute

  const origin = window.location.origin.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : '/' + path;

  // If the server returned /api/... build from origin so we don't end up with /api/api/...
  if (p.startsWith('/api/')) return origin + p;

  // Otherwise join with API_BASE_URL (which already includes /api)
  const baseNoSlash = API_BASE_URL.replace(/\/$/, '');
  const pathNoSlash = p.replace(/^\//, '');
  return `${baseNoSlash}/${pathNoSlash}`;
}

type Patient = {
  firstName?: string;
  lastName?: string;
  dob?: string;  // ISO
  email?: string;
};

type ConsultationDTO = {
  id: number;
  patientId?: string;
  patient: Patient;
  currentLocation?: string;
  createdAt?: string;
};

export default function DoctorReferral() {
  const { id } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [c, setC] = React.useState<ConsultationDTO | null>(null);

  // Editable paragraph
  const [body, setBody] = React.useState<string>('');

  // Hardcoded doctor details (per your note)
  const doctorName  = 'Dr. Dimitris–Christos Zachariades';
  const doctorReg   = 'GMS101Z';
  const doctorAddr  = 'GodwitCare Clinic, Healthville, HV5 9XY';
  const doctorPhone = 'godwitcare whatsapp';
  const doctorEmail = 'godwitcare@gmail.com';

  // Load consultation + prefill scaffold
  React.useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const cId = Number(id);
        if (!cId || Number.isNaN(cId)) throw new Error('Invalid consultation id.');

        const res = await fetch(`${API_BASE_URL}/doctor/consultations/${cId}`, { credentials: 'include' });
        if (!res.ok) throw new Error(`Failed to load consultation (${res.status}).`);
        const data: ConsultationDTO = await res.json();
        if (ignore) return;

        setC(data);

        const fullName = [data.patient?.firstName, data.patient?.lastName].filter(Boolean).join(' ') || 'the patient';
        const dobStr   = data.patient?.dob ? new Date(data.patient.dob).toLocaleDateString() : '—';
        const loc      = data.currentLocation || 'the stated location';
        const dt       = data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'the date of consultation';
        const pid      = data.patientId || '—';

        setBody(
`Dear Dr (To Whom it May Concern),

I am writing to refer ${fullName}, born on ${dobStr}, Patient ID: ${pid}. During her travel to ${loc} on ${dt}, she presented with symptoms as assessed during the tele-consultation. Kindly review and consider further evaluation and management.

The patient's relevant medical history and current medication have been reviewed during the consultation. Based on the presenting complaint, please consider local assessment, and additional investigations if clinically indicated.

Thank you for considering this referral. Please feel free to contact me if you require any additional information.

Sincerely,

${doctorName}
Digital Signature Area
Referring Practitioner`
        );
      } catch (e: any) {
        if (!ignore) setErr(e?.message || 'Failed to load data.');
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [id]);

  function onPreview() {
    const w = window.open('', '_blank');
    if (!w) return;
    const name = [c?.patient?.firstName, c?.patient?.lastName].filter(Boolean).join(' ') || '—';
    const dob  = c?.patient?.dob ? new Date(c.patient.dob).toLocaleDateString() : '—';
    const pid  = c?.patientId || '—';
    w.document.write(`
      <html><head><title>Referral Preview</title></head>
      <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;line-height:1.5">
        <h2>Referral Letter (Preview)</h2>
        <h3>Patient Information</h3>
        <div><strong>Patient Name:</strong> ${name}</div>
        <div><strong>Patient ID:</strong> ${pid}</div>
        <div><strong>Date of Birth:</strong> ${dob}</div>
        <hr/>
        <h3>Referral From</h3>
        <div><strong>GP Name:</strong> ${doctorName}</div>
        <div><strong>GMS Number:</strong> ${doctorReg}</div>
        <div><strong>Address:</strong> ${doctorAddr}</div>
        <div><strong>Email:</strong> ${doctorEmail}</div>
        <div><strong>Contact Number:</strong> ${doctorPhone}</div>
        <hr/>
        <pre style="white-space:pre-wrap">${body}</pre>
      </body></html>
    `);
    w.document.close();
  }

  async function onGeneratePdf() {
    if (!c?.id) return;
    try {
      // Create referral for this consultation
      const createRes = await fetch(
        `${API_BASE_URL}/doctor/consultations/${c.id}/referrals`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ paragraph: body }),
        }
      );

      if (!createRes.ok) {
        const t = await createRes.text().catch(() => '');
        throw new Error(t || `Failed (${createRes.status})`);
      }

      const ct = createRes.headers.get('content-type') || '';

      // If backend streams PDF directly
      if (ct.includes('application/pdf')) {
        const blob = await createRes.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        return;
      }

      // Otherwise expect a JSON meta with id or pdfUrl
      const meta = await createRes.json().catch(() => ({} as any));

      if (meta?.pdfUrl) {
        const url = normalizeApiUrl(API_BASE_URL, meta.pdfUrl);
        if (!url) throw new Error('Invalid pdfUrl returned.');
        window.open(url, '_blank');
        return;
      }

      if (meta?.id) {
        const pdfRes = await fetch(
          `${API_BASE_URL}/doctor/referrals/${meta.id}/pdf`,
          { credentials: 'include' }
        );
        if (!pdfRes.ok) throw new Error('Failed to download referral PDF.');
        const blob = await pdfRes.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        return;
      }

      throw new Error('Referral created but no PDF URL/ID returned.');
    } catch (e: any) {
      alert(e?.message || 'Failed to generate PDF');
    }
  }

  const patientName = [c?.patient?.firstName, c?.patient?.lastName].filter(Boolean).join(' ') || '—';
  const patientId   = c?.patientId || '—';
  const patientDob  = c?.patient?.dob ? new Date(c.patient.dob).toLocaleDateString() : '—';

  return (
    <section className="section">
      <div className="page-head" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h1 className="page-title">Referral Letter</h1>
        <Link to="/doctor/consultations" className="btn secondary">Back</Link>
      </div>

      {loading && <div className="card">Loading…</div>}
      {err && <div className="card" style={{ color:'#b91c1c' }}>{err}</div>}

      {!loading && !err && (
        <>
          {/* Patient Information */}
          <div className="card" style={{ marginTop: 12 }}>
            <div className="strong" style={{ marginBottom: 8 }}>Patient Information</div>
            <div className="grid three" style={{ rowGap: 8 }}>
              <div>
                <div className="muted small">Patient Name</div>
                <div className="strong">{patientName}</div>
              </div>
              <div>
                <div className="muted small">Patient ID</div>
                <div className="strong">{patientId}</div>
              </div>
              <div>
                <div className="muted small">Date of Birth</div>
                <div className="strong">{patientDob}</div>
              </div>
            </div>
          </div>

          {/* Referral From */}
          <div className="card" style={{ marginTop: 12 }}>
            <div className="strong" style={{ marginBottom: 8 }}>Referral From</div>
            <div className="grid two" style={{ rowGap: 8 }}>
              <div>
                <div className="muted small">GP Name</div>
                <div className="strong">{doctorName}</div>
                <div className="muted small" style={{ marginTop: 8 }}>GMS Number</div>
                <div className="strong">{doctorReg}</div>
              </div>
              <div>
                <div className="muted small">Address</div>
                <div className="strong">{doctorAddr}</div>
                <div className="muted small" style={{ marginTop: 8 }}>Email</div>
                <div className="strong">{doctorEmail}</div>
                <div className="muted small" style={{ marginTop: 8 }}>Contact Number</div>
                <div className="strong">{doctorPhone}</div>
              </div>
            </div>
          </div>

          {/* Editable Paragraph */}
          <div className="card" style={{ marginTop: 12 }}>
            <div className="strong" style={{ marginBottom: 8 }}>Letter Body</div>
            <textarea
              rows={12}
              style={{ width: '100%' }}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type the referral text here…"
            />
          </div>

          {/* Actions */}
          <div className="actions" style={{ marginTop: 12, display:'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn secondary" onClick={onPreview} disabled={!c?.id}>
              Preview
            </button>
            <button type="button" className="btn" onClick={onGeneratePdf} disabled={!c?.id}>
              Generate PDF
            </button>
          </div>
        </>
      )}
    </section>
  );
}
