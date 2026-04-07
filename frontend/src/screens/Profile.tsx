import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  deleteMyAccount,
  getLatestRegistrationByEmail,
  getMyProfile,
  listDocuments,
  logout,
  type RegistrationApi,
  type Traveler,
  type DocSummary,
  updateRegistrationById,
  updateMyProfile,
  uploadDocument,
} from '../api';

export default function Profile() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [travellingFrom, setTravellingFrom] = useState('');
  const [travellingTo, setTravellingTo] = useState('');
  const [travelStartDate, setTravelStartDate] = useState('');
  const [travelEndDate, setTravelEndDate] = useState('');
  const [travelersText, setTravelersText] = useState('');
  const [regId, setRegId] = useState<number | null>(null);
  const [latestReg, setLatestReg] = useState<RegistrationApi | null>(null);
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
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

        if (p.email) {
          const reg = await getLatestRegistrationByEmail(p.email);
          setLatestReg(reg);
          if (reg?.id) {
            setRegId(reg.id);
            setDateOfBirth(reg.dateOfBirth || '');
            setTravellingFrom(reg.travellingFrom || '');
            setTravellingTo(reg.travellingTo || '');
            setTravelStartDate(reg.travelStartDate || '');
            setTravelEndDate(reg.travelEndDate || '');
            setTravelersText(
              (reg.travelers || [])
                .map(t => `${t.fullName || ''}, ${t.dateOfBirth || ''}`.trim())
                .join('\n')
            );
            const existingDocs = await listDocuments(reg.id);
            setDocs(existingDocs || []);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function parseTravelers(): Traveler[] {
    if (!travelersText.trim()) return [];
    return travelersText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [fullName, dob] = line.split(',').map(v => v.trim());
        if (!fullName || !dob) {
          throw new Error('Each passenger must be on a new line: Full Name, YYYY-MM-DD');
        }
        return { fullName, dateOfBirth: dob };
      });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setErr('');

    const updatedFields: string[] = [];
    const prev = latestReg;

    await updateMyProfile({ firstName, lastName, email, username });
    updatedFields.push('First Name', 'Last Name', 'Email', 'Phone / Username');

    let parsedTravelers: Traveler[] = [];
    if (regId && prev) {
      const travelers = parseTravelers();
      parsedTravelers = travelers;
      const registrationPayload: RegistrationApi = {
        ...prev,
        id: regId,
        firstName,
        lastName,
        emailAddress: email,
        primaryWhatsAppNumber: username,
        dateOfBirth,
        travellingFrom,
        travellingTo,
        travelStartDate,
        travelEndDate,
        travelers,
      };

      await updateRegistrationById(regId, registrationPayload);

      if ((prev.dateOfBirth || '') !== dateOfBirth) updatedFields.push('DOB');
      if ((prev.travellingFrom || '') !== travellingFrom) updatedFields.push('Source');
      if ((prev.travellingTo || '') !== travellingTo) updatedFields.push('Destination');
      if ((prev.travelStartDate || '') !== travelStartDate || (prev.travelEndDate || '') !== travelEndDate) {
        updatedFields.push('Travel Dates');
      }
      const prevTravelers = JSON.stringify(prev.travelers || []);
      const nextTravelers = JSON.stringify(travelers);
      if (prevTravelers !== nextTravelers) updatedFields.push('Passenger Details');
    }

    const fieldList = updatedFields.length ? Array.from(new Set(updatedFields)).join(', ') : 'No fields';
    setMsg(`Success: The following fields have been updated: ${fieldList}.`);
    setLatestReg((prevReg) => prevReg ? ({
      ...prevReg,
      dateOfBirth,
      travellingFrom,
      travellingTo,
      travelStartDate,
      travelEndDate,
      travelers: parsedTravelers,
    }) : prevReg);
  }

  async function onUploadDocument(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !regId) return;
    setErr('');
    await uploadDocument(regId, f);
    const existingDocs = await listDocuments(regId);
    setDocs(existingDocs || []);
    setMsg('Travel document uploaded successfully.');
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
        {!!err && <p className="help" style={{ color: '#b91c1c' }}>{err}</p>}
        {!!msg && <p className="help">{msg}</p>}

        <form className="auth-form" onSubmit={async (e) => {
          try {
            await save(e);
          } catch (error: any) {
            setErr(error?.message || 'Failed to save changes.');
          }
        }}>
          <div className="field"><label>First Name</label><input value={firstName} onChange={e => setFirstName(e.target.value)} required /></div>
          <div className="field"><label>Last Name</label><input value={lastName} onChange={e => setLastName(e.target.value)} /></div>
          <div className="field"><label>Email</label><input value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="field"><label>Phone / Username</label><input value={username} onChange={e => setUsername(e.target.value)} required /></div>

          <div className="field">
            <label>DOB</label>
            <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
          </div>
          <div className="field"><label>Source</label><input value={travellingFrom} onChange={e => setTravellingFrom(e.target.value)} /></div>
          <div className="field"><label>Destination</label><input value={travellingTo} onChange={e => setTravellingTo(e.target.value)} /></div>
          <div className="field"><label>Travel Start Date</label><input type="date" value={travelStartDate} onChange={e => setTravelStartDate(e.target.value)} /></div>
          <div className="field"><label>Travel End Date</label><input type="date" value={travelEndDate} onChange={e => setTravelEndDate(e.target.value)} /></div>
          <div className="field">
            <label>Passenger Details (one line per passenger: Full Name, YYYY-MM-DD)</label>
            <textarea value={travelersText} onChange={e => setTravelersText(e.target.value)} rows={4} />
          </div>

          <div className="field">
            <label>Travel Document</label>
            <input type="file" onChange={onUploadDocument} />
            {docs.length > 0 && (
              <ul style={{ marginTop: 8 }}>
                {docs.map((d) => (
                  <li key={d.id}>{d.fileName}</li>
                ))}
              </ul>
            )}
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
