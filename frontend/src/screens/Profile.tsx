import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  API_BASE_URL,
  deleteMyAccount,
  deleteMyPhoto,
  getMyProfile,
  logout,
  updateMyProfile,
  uploadMyPhoto,
} from '../api';

export default function Profile() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const p = await getMyProfile();
        setFirstName(p.firstName || '');
        setLastName(p.lastName || '');
        setEmail(p.email || '');
        setUsername(p.username || '');
        setPhotoUrl(p.photoUrl ? `${API_BASE_URL.replace(/\/api$/, '')}${p.photoUrl}` : '');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    await updateMyProfile({ firstName, lastName, email, username });
    setMsg('Profile updated.');
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    await uploadMyPhoto(f);
    const p = await getMyProfile();
    setPhotoUrl(p.photoUrl ? `${API_BASE_URL.replace(/\/api$/, '')}${p.photoUrl}?t=${Date.now()}` : '');
    setMsg('Photo uploaded.');
  }

  async function onDeletePhoto() {
    await deleteMyPhoto();
    setPhotoUrl('');
    setMsg('Photo deleted.');
  }

  async function onDeleteAccount() {
    if (!confirm('Are you sure? This deletes your account.')) return;
    await deleteMyAccount();
    await logout();
    navigate('/dashboard');
  }

  if (loading) return <section className="section"><p>Loading profile…</p></section>;

  return (
    <section className="section auth">
      <div className="auth-card">
        <h1 className="auth-title">My Profile</h1>
        {!!msg && <p className="help">{msg}</p>}

        <form className="auth-form" onSubmit={save}>
          <div className="field"><label>First Name</label><input value={firstName} onChange={e => setFirstName(e.target.value)} required /></div>
          <div className="field"><label>Last Name</label><input value={lastName} onChange={e => setLastName(e.target.value)} /></div>
          <div className="field"><label>Email</label><input value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="field"><label>Phone / Username</label><input value={username} onChange={e => setUsername(e.target.value)} required /></div>

          <div className="field">
            <label>Profile Photo</label>
            {photoUrl && <img src={photoUrl} alt="profile" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', marginBottom: 8 }} />}
            <input type="file" accept="image/*" onChange={onUpload} />
            {photoUrl && <button type="button" className="btn secondary" onClick={onDeletePhoto}>Delete Photo</button>}
          </div>

          <button className="btn" type="submit">Save Changes</button>
        </form>

        <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
          <Link className="btn secondary" to="/home">Back</Link>
          <button type="button" className="btn" style={{ background: '#b91c1c', borderColor: '#b91c1c' }} onClick={onDeleteAccount}>
            Delete Account
          </button>
        </div>
      </div>
    </section>
  );
}
