import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';


type Person = { fullName: string; dateOfBirth: string };

const ALL_COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo (Republic)', 'Congo (DRC)', 'Costa Rica', 'Côte d’Ivoire', 'Croatia', 'Cuba', 'Cyprus', 'Czechia',
  'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia',
  'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway',
  'Oman', 'Pakistan', 'Palau', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar',
  'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'São Tomé and Príncipe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Venezuela', 'Vietnam',
  'Yemen', 'Zambia', 'Zimbabwe'
].sort((a, b) => a.localeCompare(b));

const EUROPE_COUNTRIES = [
  'Albania', 'Andorra', 'Armenia', 'Austria', 'Azerbaijan', 'Belarus', 'Belgium', 'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia',
  'Denmark', 'Estonia', 'Finland', 'France', 'Georgia', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy',
  'Kazakhstan (European part)', 'Kosovo', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta', 'Moldova', 'Monaco', 'Montenegro',
  'Netherlands', 'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania', 'Russia (European part)', 'San Marino', 'Serbia',
  'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Turkey (European part)', 'Ukraine', 'United Kingdom', 'Vatican City'
].sort((a, b) => a.localeCompare(b));

import {
  deleteMyAccount,
  getLatestRegistrationByEmail,
  getMyProfile,
  listDocuments,
  logout,
  type RegistrationApi,
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
  const [travelers, setTravelers] = useState<Person[]>([]);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
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
            setTravelers((reg.travelers || []).map(t => ({
              fullName: t.fullName || '',
              dateOfBirth: t.dateOfBirth || '',
            })));
            const existingDocs = await listDocuments(reg.id);
            setDocs(existingDocs || []);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);


  const validTravelers = useMemo(
    () => travelers.filter((t) => t.fullName.trim() && t.dateOfBirth),
    [travelers]
  );

  function addPassenger() {
    setTravelers((prev) => [...prev, { fullName: '', dateOfBirth: '' }]);
  }

  function removePassenger(index: number) {
    setTravelers((prev) => prev.filter((_, idx) => idx !== index));
  }

  function updatePassenger(index: number, field: keyof Person, value: string) {
    setTravelers((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
  }


  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setErr('');

    const updatedFields: string[] = [];
    const prev = latestReg;

    await updateMyProfile({ firstName, lastName, email, username });
    updatedFields.push('First Name', 'Last Name', 'Email', 'Phone / Username');

    if (regId && prev) {
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
        travelers: validTravelers,
      };

      await updateRegistrationById(regId, registrationPayload);

      if ((prev.dateOfBirth || '') !== dateOfBirth) updatedFields.push('DOB');
      if ((prev.travellingFrom || '') !== travellingFrom) updatedFields.push('Source');
      if ((prev.travellingTo || '') !== travellingTo) updatedFields.push('Destination');
      if ((prev.travelStartDate || '') !== travelStartDate || (prev.travelEndDate || '') !== travelEndDate) {
        updatedFields.push('Travel Dates');
      }
      const prevTravelers = JSON.stringify(prev.travelers || []);
      const nextTravelers = JSON.stringify(validTravelers);
      if (prevTravelers !== nextTravelers) updatedFields.push('Passenger Details');
    }

    const fieldList = updatedFields.length ? Array.from(new Set(updatedFields)).join(', ') : '';
    setMsg(fieldList);
    if (fieldList) {
      setShowSuccessPopup(true);
    }

    setLatestReg((prevReg) => prevReg ? ({
      ...prevReg,
      dateOfBirth,
      travellingFrom,
      travellingTo,
      travelStartDate,
      travelEndDate,
      travelers: validTravelers,
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
        {!!msg && !showSuccessPopup && <p className="help">Updated fields: {msg}</p>}

        {showSuccessPopup && (
          <div className="theme-modal-overlay" role="dialog" aria-modal="true" aria-label="Profile update success">
            <div className="theme-modal">
              <button type="button" className="theme-modal-close" aria-label="Close popup" onClick={() => setShowSuccessPopup(false)}>×</button>
              <h3>Success</h3>
              <p>The passenger details have been updated.</p>
              <div className="actions">
                <button type="button" className="btn" onClick={() => setShowSuccessPopup(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

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
          <div className="field">
            <label>Source</label>
            <input
              list="profile-country-from-list"
              placeholder="Start typing to search…"
              value={travellingFrom}
              onChange={e => setTravellingFrom(e.target.value)}
            />
            <datalist id="profile-country-from-list">
              {ALL_COUNTRIES.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="field">
            <label>Destination</label>
            <input
              list="profile-country-to-list"
              placeholder="Start typing to search…"
              value={travellingTo}
              onChange={e => setTravellingTo(e.target.value)}
            />
            <datalist id="profile-country-to-list">
              {EUROPE_COUNTRIES.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="field"><label>Travel Start Date</label><input type="date" value={travelStartDate} onChange={e => setTravelStartDate(e.target.value)} /></div>
          <div className="field"><label>Travel End Date</label><input type="date" value={travelEndDate} onChange={e => setTravelEndDate(e.target.value)} /></div>
          <div className="field">
            <label className="h3" style={{ display: 'block', marginBottom: 8 }}>Passenger Details</label>
            <button type="button" className="btn" onClick={addPassenger}>+ Add Passenger</button>

            {travelers.map((person, idx) => (
              <div key={`p-${idx}`} className="card" style={{ marginTop: 10, padding: 12 }}>
                <div className="grid two">
                  <div className="field">
                    <label>Full Name</label>
                    <input
                      value={person.fullName}
                      onChange={(e) => updatePassenger(idx, 'fullName', e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      value={person.dateOfBirth}
                      onChange={(e) => updatePassenger(idx, 'dateOfBirth', e.target.value)}
                    />
                  </div>
                </div>
                <button type="button" className="btn secondary" onClick={() => removePassenger(idx)}>Remove</button>
              </div>
            ))}
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
