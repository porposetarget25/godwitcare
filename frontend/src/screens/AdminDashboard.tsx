import React from 'react';
import {
  adminCreateDoctor,
  adminCreateUser,
  adminDashboard,
  adminDeleteDoctor,
  adminDeleteUser,
  adminGetUserDetails,
  adminUpdateDoctor,
  adminUpdateUser,
  deleteDocument,
  getLatestRegistrationByEmail,
  listDocuments,
  uploadDocument,
  type AdminListItem,
  type DocSummary,
  type AdminUserInput,
} from '../api';
import { COUNTRY_NAMES } from '../lib/countries';

type Mode = 'addUser' | 'addDoctor' | 'editUser' | 'editDoctor' | null;
type TravelerForm = { fullName: string; dateOfBirth: string };

const EMPTY_FORM: AdminUserInput = {
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  password: '',
  middleName: '',
  dateOfBirth: '',
  gender: '',
  carerSecondaryWhatsAppNumber: '',
  travellingFrom: '',
  travellingTo: '',
  travelStartDate: '',
  travelEndDate: '',
  packageDays: 0,
  longTermMedication: false,
  healthCondition: false,
  allergies: false,
  fitToFlyCertificate: false,
  travelers: [],
  paymentMethod: '',
  paymentAmount: undefined,
  paymentCurrency: '',
  cardExpiry: '',
};

export default function AdminDashboard() {
  const [users, setUsers] = React.useState<AdminListItem[]>([]);
  const [doctors, setDoctors] = React.useState<AdminListItem[]>([]);
  const [details, setDetails] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [mode, setMode] = React.useState<Mode>(null);
  const [selected, setSelected] = React.useState<AdminListItem | null>(null);
  const [form, setForm] = React.useState<AdminUserInput>(EMPTY_FORM);
  const [travelers, setTravelers] = React.useState<TravelerForm[]>([]);
  const [editingRegistrationId, setEditingRegistrationId] = React.useState<number | null>(null);
  const [documents, setDocuments] = React.useState<DocSummary[]>([]);
  const [pendingDocuments, setPendingDocuments] = React.useState<File[]>([]);
  const [docError, setDocError] = React.useState<string | null>(null);
  const [docBusy, setDocBusy] = React.useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminDashboard();
      setUsers(data.users || []);
      setDoctors(data.doctors || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  function openForm(nextMode: Mode, item?: AdminListItem) {
    setMode(nextMode);
    setSelected(item || null);
    setTravelers([]);
    setEditingRegistrationId(null);
    setDocuments([]);
    setPendingDocuments([]);
    setDocError(null);
    setDocBusy(false);
    setForm(item ? {
      ...EMPTY_FORM,
      firstName: item.firstName || '',
      lastName: item.lastName || '',
      email: item.email || '',
      username: item.username || '',
      password: '',
    } : EMPTY_FORM);
  }

  async function onDelete(item: AdminListItem) {
    const ok = window.confirm(`Delete ${item.firstName} ${item.lastName}?`);
    if (!ok) return;
    if (item.role === 'DOCTOR') await adminDeleteDoctor(item.id);
    else await adminDeleteUser(item.id);
    await load();
  }

  function toDateInput(v?: string) {
    if (!v) return '';
    if (v.includes('T')) return v.slice(0, 10);
    return v;
  }

  async function onView(item: AdminListItem) {
    if (item.role === 'DOCTOR') {
      setDetails({ user: item, note: 'Doctor details view is intentionally minimal.' });
      return;
    }
    const d = await adminGetUserDetails(item.id);
    setDetails(d);
  }

  async function onEditUser(item: AdminListItem) {
    const d = await adminGetUserDetails(item.id);
    const latestReg = d?.registrationDetails?.[0] || {};
    const latestPayment = d?.paymentHistory?.[0] || {};
    const nextTravelers: TravelerForm[] = Array.isArray(latestReg?.travelers)
      ? latestReg.travelers.map((t: any) => ({
          fullName: t?.fullName || '',
          dateOfBirth: toDateInput(t?.dateOfBirth),
        }))
      : [];

    setSelected(item);
    setMode('editUser');
    setTravelers(nextTravelers);
    setPendingDocuments([]);
    setDocError(null);
    setForm({
      ...EMPTY_FORM,
      firstName: item.firstName || '',
      lastName: item.lastName || '',
      email: item.email || '',
      username: item.username || '',
      middleName: latestReg?.middleName || '',
      dateOfBirth: toDateInput(latestReg?.dateOfBirth),
      gender: latestReg?.gender || '',
      carerSecondaryWhatsAppNumber: latestReg?.carerSecondaryWhatsAppNumber || '',
      travellingFrom: latestReg?.travellingFrom || '',
      travellingTo: latestReg?.travellingTo || '',
      travelStartDate: toDateInput(latestReg?.travelStartDate),
      travelEndDate: toDateInput(latestReg?.travelEndDate),
      packageDays: latestReg?.packageDays || 0,
      longTermMedication: !!latestReg?.longTermMedication,
      healthCondition: !!latestReg?.healthCondition,
      allergies: !!latestReg?.allergies,
      fitToFlyCertificate: !!latestReg?.fitToFlyCertificate,
      paymentMethod: latestPayment?.method || '',
      paymentAmount: latestPayment?.amount != null ? Number(latestPayment.amount) : undefined,
      paymentCurrency: latestPayment?.currency || '',
      cardExpiry: latestPayment?.cardExpiry || '',
      password: '',
    });

    const regId = Number(latestReg?.id);
    if (Number.isFinite(regId) && regId > 0) {
      setEditingRegistrationId(regId);
      try {
        const docs = await listDocuments(regId);
        setDocuments(Array.isArray(docs) ? docs : []);
      } catch (e: any) {
        setDocuments([]);
        setDocError(e?.message || 'Failed to load documents');
      }
    } else {
      setEditingRegistrationId(null);
      setDocuments([]);
    }
  }

  async function onSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    setDocError(null);

    const payload: AdminUserInput = {
      ...form,
      travelers: travelers.filter((t) => t.fullName.trim() && t.dateOfBirth),
    };

    if (mode === 'addUser') await adminCreateUser(payload);
    if (mode === 'addDoctor') await adminCreateDoctor(payload);
    if (mode === 'editUser' && selected) await adminUpdateUser(selected.id, payload);
    if (mode === 'editDoctor' && selected) await adminUpdateDoctor(selected.id, payload);

    if ((mode === 'addUser' || mode === 'editUser') && pendingDocuments.length > 0) {
      let targetRegistrationId = editingRegistrationId;
      if (!targetRegistrationId && payload.email) {
        const latestRegistration = await getLatestRegistrationByEmail(payload.email);
        targetRegistrationId = latestRegistration?.id ?? null;
      }

      if (!targetRegistrationId) {
        throw new Error('Unable to upload travel documents because no registration was found for this user.');
      }

      for (const file of pendingDocuments) {
        await uploadDocument(targetRegistrationId, file);
      }
    }

    setMode(null);
    setSelected(null);
    setForm(EMPTY_FORM);
    setTravelers([]);
    setPendingDocuments([]);
    await load();
  }

  async function refreshDocuments(registrationId: number) {
    const docs = await listDocuments(registrationId);
    setDocuments(Array.isArray(docs) ? docs : []);
  }

  async function onUploadDocumentForUser(file: File) {
    if (!editingRegistrationId) {
      setDocError('No registration found to attach this document.');
      return;
    }
    setDocBusy(true);
    setDocError(null);
    try {
      await uploadDocument(editingRegistrationId, file);
      await refreshDocuments(editingRegistrationId);
    } catch (e: any) {
      setDocError(e?.message || 'Failed to upload document');
    } finally {
      setDocBusy(false);
    }
  }

  async function onDeleteDocumentForUser(docId: number) {
    if (!editingRegistrationId) {
      setDocError('No registration found for deleting documents.');
      return;
    }
    setDocBusy(true);
    setDocError(null);
    try {
      await deleteDocument(editingRegistrationId, docId);
      await refreshDocuments(editingRegistrationId);
    } catch (e: any) {
      setDocError(e?.message || 'Failed to delete document');
    } finally {
      setDocBusy(false);
    }
  }

  function onPickDocuments(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPendingDocuments((prev) => [...prev, ...Array.from(files)]);
  }

  return (
    <section className="section">
      <div className="page-head page-head--split">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="muted">Manage users and doctors from one place.</p>
        </div>
      </div>

      {error && <div className="admin-error">{error}</div>}
      {loading ? <div className="muted">Loading…</div> : null}

      <div className="admin-grid">
        <div className="admin-card">
          <h2>Users List</h2>
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Username</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={`u-${u.id}`}>
                  <td data-label="Name">{u.firstName} {u.lastName}</td>
                  <td data-label="Email">{u.email || '—'}</td>
                  <td data-label="Username">{u.username}</td>
                  <td data-label="Actions" className="admin-actions admin-actions-cell">
                    <button className="btn secondary" onClick={() => onView(u)}>View</button>
                    <button className="btn" onClick={() => onEditUser(u)}>Edit</button>
                    <button className="btn danger" onClick={() => onDelete(u)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="admin-footer-btn"><button className="btn" onClick={() => openForm('addUser')}>Add User</button></div>
        </div>

        <div className="admin-card">
          <h2>Doctors List</h2>
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Username (WhatsApp)</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {doctors.map((d) => (
                <tr key={`d-${d.id}`}>
                  <td data-label="Name">{d.firstName} {d.lastName}</td>
                  <td data-label="Email">{d.email || '—'}</td>
                  <td data-label="Username (WhatsApp)">{d.username}</td>
                  <td data-label="Actions" className="admin-actions admin-actions-cell">
                    <button className="btn secondary" onClick={() => onView(d)}>View</button>
                    <button className="btn" onClick={() => openForm('editDoctor', d)}>Edit</button>
                    <button className="btn danger" onClick={() => onDelete(d)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="admin-footer-btn"><button className="btn" onClick={() => openForm('addDoctor')}>Add Doctor</button></div>
        </div>
      </div>

      {details && (
        <div className="admin-modal-overlay" onClick={() => setDetails(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Details: {details?.user?.firstName} {details?.user?.lastName}</h3>
            {details?.note ? <p className="muted">{details.note}</p> : null}

            {!details?.note && (
              <>
                <p><strong>Registrations:</strong> {details.registrationDetails?.length || 0}</p>
                <p><strong>Consultation History:</strong> {details.consultationHistory?.length || 0}</p>
                <p><strong>Prescriptions:</strong> {details.prescriptions?.length || 0}</p>
                <p><strong>Referral letters:</strong> {details.referralLetters?.length || 0}</p>
                <p><strong>Payment history:</strong> {details.paymentHistory?.length || 0}</p>
              </>
            )}

            <button className="btn" onClick={() => setDetails(null)}>Close</button>
          </div>
        </div>
      )}

      {mode && (
        <div className="admin-modal-overlay" onClick={() => setMode(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {mode === 'addUser' && 'Add User'}
              {mode === 'addDoctor' && 'Add Doctor'}
              {mode === 'editUser' && 'Edit User'}
              {mode === 'editDoctor' && 'Edit Doctor'}
            </h3>
            <form className="form" onSubmit={onSubmitForm}>
              <div className="field"><label>First Name</label><input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
              <div className="field"><label>Last Name</label><input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
              <div className="field"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="field"><label>Username (WhatsApp number)</label><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></div>
              <div className="field"><label>Password (optional while editing)</label><input type="password" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>

              {(mode === 'editUser' || mode === 'addUser') && (
                <>
                  <h4 className="admin-section-title">Profile / Travel Details</h4>
                  <div className="field"><label>Middle Name</label><input value={form.middleName || ''} onChange={(e) => setForm({ ...form, middleName: e.target.value })} /></div>
                  <div className="field"><label>Date of Birth</label><input type="date" value={form.dateOfBirth || ''} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></div>
                  <div className="field"><label>Gender</label><input value={form.gender || ''} onChange={(e) => setForm({ ...form, gender: e.target.value })} /></div>
                  <div className="field"><label>Secondary WhatsApp Number</label><input value={form.carerSecondaryWhatsAppNumber || ''} onChange={(e) => setForm({ ...form, carerSecondaryWhatsAppNumber: e.target.value })} /></div>
                  <div className="field">
                    <label>Travelling From</label>
                    <select value={form.travellingFrom || ''} onChange={(e) => setForm({ ...form, travellingFrom: e.target.value })}>
                      <option value="">Select country</option>
                      {COUNTRY_NAMES.map((country) => (
                        <option key={`from-${country}`} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Travelling To</label>
                    <select value={form.travellingTo || ''} onChange={(e) => setForm({ ...form, travellingTo: e.target.value })}>
                      <option value="">Select country</option>
                      {COUNTRY_NAMES.map((country) => (
                        <option key={`to-${country}`} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field"><label>Travel Start Date</label><input type="date" value={form.travelStartDate || ''} onChange={(e) => setForm({ ...form, travelStartDate: e.target.value })} /></div>
                  <div className="field"><label>Travel End Date</label><input type="date" value={form.travelEndDate || ''} onChange={(e) => setForm({ ...form, travelEndDate: e.target.value })} /></div>
                  <div className="field"><label>Package Days</label><input type="number" min={0} value={form.packageDays || 0} onChange={(e) => setForm({ ...form, packageDays: Number(e.target.value || 0) })} /></div>

                  <div className="admin-bool-grid">
                    <label><input type="checkbox" checked={!!form.longTermMedication} onChange={(e) => setForm({ ...form, longTermMedication: e.target.checked })} /> Long-term Medication</label>
                    <label><input type="checkbox" checked={!!form.healthCondition} onChange={(e) => setForm({ ...form, healthCondition: e.target.checked })} /> Health Condition</label>
                    <label><input type="checkbox" checked={!!form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.checked })} /> Allergies</label>
                    <label><input type="checkbox" checked={!!form.fitToFlyCertificate} onChange={(e) => setForm({ ...form, fitToFlyCertificate: e.target.checked })} /> Fit-to-fly Required</label>
                  </div>

                  <div className="admin-travelers-wrap">
                    <div className="admin-travelers-head">
                      <h4 className="admin-section-title">Passenger Details</h4>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setTravelers((prev) => [...prev, { fullName: '', dateOfBirth: '' }])}
                      >
                        + Add Passenger
                      </button>
                    </div>
                    {travelers.map((traveler, idx) => (
                      <div key={`traveler-${idx}`} className="admin-traveler-card">
                        <div className="field"><label>Full Name</label><input value={traveler.fullName} onChange={(e) => setTravelers((prev) => prev.map((item, i) => i === idx ? { ...item, fullName: e.target.value } : item))} /></div>
                        <div className="field"><label>Date of Birth</label><input type="date" value={traveler.dateOfBirth} onChange={(e) => setTravelers((prev) => prev.map((item, i) => i === idx ? { ...item, dateOfBirth: e.target.value } : item))} /></div>
                        <button type="button" className="btn secondary" onClick={() => setTravelers((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                      </div>
                    ))}
                  </div>

                  <h4 className="admin-section-title">Latest Payment Details</h4>
                  <div className="field"><label>Payment Method</label><input value={form.paymentMethod || ''} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} placeholder="CARD / EFT / BANK_TRANSFER / DIGITAL_WALLET" /></div>
                  <div className="field"><label>Payment Amount</label><input type="number" step="0.01" min={0} value={form.paymentAmount ?? ''} onChange={(e) => setForm({ ...form, paymentAmount: e.target.value ? Number(e.target.value) : undefined })} /></div>
                  <div className="field"><label>Payment Currency</label><input value={form.paymentCurrency || ''} onChange={(e) => setForm({ ...form, paymentCurrency: e.target.value })} placeholder="GBP" /></div>
                  <div className="field"><label>Card Expiry</label><input value={form.cardExpiry || ''} onChange={(e) => setForm({ ...form, cardExpiry: e.target.value })} placeholder="MM/YY" /></div>

                  <div className="field admin-documents">
                    <h4 className="admin-section-title">Travel Documents</h4>
                    {editingRegistrationId ? (
                      <>
                        <input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onUploadDocumentForUser(file);
                            e.currentTarget.value = '';
                          }}
                          disabled={docBusy}
                        />
                        {documents.length > 0 ? (
                          <ul className="admin-doc-list">
                            {documents.map((d) => (
                              <li key={`doc-${d.id}`} className="admin-doc-item">
                                <span>{d.fileName}</span>
                                <button
                                  type="button"
                                  className="btn danger"
                                  disabled={docBusy}
                                  onClick={() => onDeleteDocumentForUser(d.id)}
                                >
                                  Delete
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="muted">No documents uploaded yet.</p>
                        )}
                      </>
                    ) : (
                      <p className="muted">Files added here will upload when you save the user.</p>
                    )}

                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        onPickDocuments(e.target.files);
                        e.currentTarget.value = '';
                      }}
                      disabled={docBusy}
                    />
                    {pendingDocuments.length > 0 && (
                      <ul className="admin-doc-list">
                        {pendingDocuments.map((file, idx) => (
                          <li key={`pending-doc-${idx}-${file.name}`} className="admin-doc-item">
                            <span>{file.name}</span>
                            <button
                              type="button"
                              className="btn secondary"
                              onClick={() => setPendingDocuments((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {docError && <p className="help error">{docError}</p>}
                  </div>
                </>
              )}

              <div className="actions">
                <button className="btn" type="submit">Save</button>
                <button className="btn secondary" type="button" onClick={() => setMode(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
