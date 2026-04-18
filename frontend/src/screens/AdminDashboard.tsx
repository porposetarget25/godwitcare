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
  type AdminListItem,
  type AdminUserInput,
} from '../api';

type Mode = 'addUser' | 'addDoctor' | 'editUser' | 'editDoctor' | null;

const EMPTY_FORM: AdminUserInput = {
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  password: '',
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
    setForm(item ? {
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

  async function onView(item: AdminListItem) {
    if (item.role === 'DOCTOR') {
      setDetails({ user: item, note: 'Doctor details view is intentionally minimal.' });
      return;
    }
    const d = await adminGetUserDetails(item.id);
    setDetails(d);
  }

  async function onSubmitForm(e: React.FormEvent) {
    e.preventDefault();

    if (mode === 'addUser') await adminCreateUser(form);
    if (mode === 'addDoctor') await adminCreateDoctor(form);
    if (mode === 'editUser' && selected) await adminUpdateUser(selected.id, form);
    if (mode === 'editDoctor' && selected) await adminUpdateDoctor(selected.id, form);

    setMode(null);
    setSelected(null);
    setForm(EMPTY_FORM);
    await load();
  }

  return (
    <section className="section">
      <h1 className="page-title">Admin Dashboard</h1>
      <p className="muted">Manage users and doctors from one place.</p>

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
                  <td>{u.firstName} {u.lastName}</td>
                  <td>{u.email || '—'}</td>
                  <td>{u.username}</td>
                  <td className="admin-actions">
                    <button className="btn secondary" onClick={() => onView(u)}>View</button>
                    <button className="btn" onClick={() => openForm('editUser', u)}>Edit</button>
                    <button className="btn secondary" onClick={() => onDelete(u)}>Delete</button>
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
                  <td>{d.firstName} {d.lastName}</td>
                  <td>{d.email || '—'}</td>
                  <td>{d.username}</td>
                  <td className="admin-actions">
                    <button className="btn secondary" onClick={() => onView(d)}>View</button>
                    <button className="btn" onClick={() => openForm('editDoctor', d)}>Edit</button>
                    <button className="btn secondary" onClick={() => onDelete(d)}>Delete</button>
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
