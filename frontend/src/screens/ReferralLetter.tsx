// src/screens/DoctorReferral.tsx
import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { authFetch, API_BASE_URL, openAuthenticatedFile } from '../api';

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
  const [generating, setGenerating] = React.useState(false);
  const [genErr, setGenErr] = React.useState<string | null>(null);

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

        const res = await authFetch(`${API_BASE_URL}/doctor/consultations/${cId}`, {});
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
    setGenerating(true);
    setGenErr(null);
    try {
      // Create referral for this consultation
      const createRes = await authFetch(
        `${API_BASE_URL}/doctor/consultations/${c.id}/referrals`,
        {
          method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paragraph: body }),
        }
      );

      if (!createRes.ok) {
        const t = await createRes.text().catch(() => '');
        throw new Error(t || `Failed (${createRes.status})`);
      }

      const meta = await createRes.json().catch(() => ({} as any));
      const pdfUrl = meta?.id
        ? `${API_BASE_URL}/doctor/referrals/${meta.id}/pdf`
        : (meta?.pdfUrl ? normalizeApiUrl(API_BASE_URL, meta.pdfUrl) : null);
      if (!pdfUrl) throw new Error('Referral created but no PDF URL/ID returned.');

      // Open the generated PDF for review, then return to the consultation.
      await openAuthenticatedFile(pdfUrl);
      nav(`/doctor/consultations/${c.id}`);
    } catch (e: any) {
      setGenErr(e?.message || 'Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  }

  const patientName = [c?.patient?.firstName, c?.patient?.lastName].filter(Boolean).join(' ') || '—';
  const patientId   = c?.patientId || '—';
  const patientDob  = c?.patient?.dob ? new Date(c.patient.dob).toLocaleDateString() : '—';

  return (
    <>
      <div className="page-head">
        <div className="page-title">Referral Letter</div>
        <Link to="/doctor/consultations" className="bs">‹ Consultations</Link>
      </div>

      {loading && <div className="card">Loading…</div>}
      {err && <div className="notice n-warn"><i className="ti ti-alert-triangle" aria-hidden="true" />{err}</div>}

      {!loading && !err && (
        <>
          <div className="card">
            <div className="ct">Patient Information</div>
            <div className="g3">
              <div><div className="fi-hint">Patient Name</div><div style={{ fontSize: 13, fontWeight: 600 }}>{patientName}</div></div>
              <div><div className="fi-hint">Patient ID</div><div style={{ fontSize: 13, fontWeight: 600 }}>{patientId}</div></div>
              <div><div className="fi-hint">Date of Birth</div><div style={{ fontSize: 13, fontWeight: 600 }}>{patientDob}</div></div>
            </div>
          </div>

          <div className="card">
            <div className="ct">Referral From</div>
            <div className="g2">
              <div>
                <div className="dr"><div className="dk">GP Name</div><div className="dv">{doctorName}</div></div>
                <div className="dr"><div className="dk">GMS Number</div><div className="dv">{doctorReg}</div></div>
              </div>
              <div>
                <div className="dr"><div className="dk">Address</div><div className="dv">{doctorAddr}</div></div>
                <div className="dr"><div className="dk">Email</div><div className="dv">{doctorEmail}</div></div>
                <div className="dr"><div className="dk">Contact Number</div><div className="dv">{doctorPhone}</div></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="ct">Letter Body</div>
            <textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type the referral text here…" />
          </div>

          {genErr && <div className="notice n-warn"><i className="ti ti-alert-triangle" aria-hidden="true" />{genErr}</div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="bs" onClick={onPreview} disabled={!c?.id}>Preview</button>
            <button type="button" className="bp" onClick={onGeneratePdf} disabled={!c?.id || generating}>
              <i className="ti ti-file-download" aria-hidden="true" /> {generating ? 'Generating…' : 'Generate PDF'}
            </button>
          </div>
        </>
      )}
    </>
  );
}
