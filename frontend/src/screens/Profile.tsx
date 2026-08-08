import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';


type Person = {
  id?: number;
  patientId?: string;
  fullName: string;
  dateOfBirth: string;
  passport?: File | null;
  travelDocument?: File | null;
};

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
  addTravelerWithDocuments,
  API_BASE_URL,
  deleteMyAccount,
  deleteMyPhoto,
  getLatestRegistrationByEmail,
  getMyProfile,
  listDocuments,
  logout,
  resolveApiUrl,
  type RegistrationApi,
  type DocSummary,
  type DocumentType,
  updateRegistrationById,
  updateMyProfile,
  uploadDocument,
  uploadMyPhoto,
} from '../api';
import { isDoctorUser, useAuth } from '../state/auth';
import AuthedAvatar from '../components/AuthedAvatar';

export default function Profile() {
  const { user, refresh } = useAuth();
  const isDoctor = isDoctorUser(user);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [secondaryWhatsAppNumber, setSecondaryWhatsAppNumber] = useState('');
  const [travellingFrom, setTravellingFrom] = useState('');
  const [travellingTo, setTravellingTo] = useState('');
  const [travelStartDate, setTravelStartDate] = useState('');
  const [travelEndDate, setTravelEndDate] = useState('');
  const [packageDays, setPackageDays] = useState(0);
  const [longTermMedication, setLongTermMedication] = useState(false);
  const [healthCondition, setHealthCondition] = useState(false);
  const [allergies, setAllergies] = useState(false);
  const [fitToFlyCertificate, setFitToFlyCertificate] = useState(false);
  const [travelers, setTravelers] = useState<Person[]>([]);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [regId, setRegId] = useState<number | null>(null);
  const [latestReg, setLatestReg] = useState<RegistrationApi | null>(null);
  const [docs, setDocs] = useState<Record<string, DocSummary[]>>({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
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
            setMiddleName(reg.middleName || '');
            setDateOfBirth(reg.dateOfBirth || '');
            setGender(reg.gender || '');
            setSecondaryWhatsAppNumber(reg.carerSecondaryWhatsAppNumber || '');
            setTravellingFrom(reg.travellingFrom || '');
            setTravellingTo(reg.travellingTo || '');
            setTravelStartDate(reg.travelStartDate || '');
            setTravelEndDate(reg.travelEndDate || '');
            setPackageDays(reg.packageDays || 0);
            setLongTermMedication(!!reg.longTermMedication);
            setHealthCondition(!!reg.healthCondition);
            setAllergies(!!reg.allergies);
            setFitToFlyCertificate(!!reg.fitToFlyCertificate);
            setTravelers((reg.travelers || []).map(t => ({
              id: t.id,
              patientId: t.patientId,
              fullName: t.fullName || '',
              dateOfBirth: t.dateOfBirth || '',
            })));
            const patientIds = [reg.primaryPatientId, ...(reg.travelers || []).map(t => t.patientId)].filter(Boolean) as string[];
            const entries = await Promise.all(patientIds.map(async patientId => [patientId, await listDocuments(reg.id, patientId)] as const));
            setDocs(Object.fromEntries(entries));
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
    setTravelers((prev) => [...prev, { fullName: '', dateOfBirth: '', passport: null, travelDocument: null }]);
  }

  function removePassenger(index: number) {
    setTravelers((prev) => prev.filter((_, idx) => idx !== index));
  }

  function updatePassenger(index: number, field: keyof Person, value: string) {
    setTravelers((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
  }

  async function onPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setPhotoBusy(true);
    setErr('');
    try {
      await uploadMyPhoto(f);
      await refresh();
    } catch {
      setErr('Failed to upload photo. Please try again.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function onPhotoRemove() {
    setPhotoBusy(true);
    setErr('');
    try {
      await deleteMyPhoto();
      await refresh();
    } catch {
      setErr('Failed to remove photo. Please try again.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function onSignOut() {
    await logout();
    await refresh();
    navigate('/dashboard');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    const prev = latestReg;
    try {
      if (!isDoctor) {
        const incompleteNewTraveler = travelers.find(t => !t.id &&
          (!t.fullName.trim() || !t.dateOfBirth || !t.passport || !t.travelDocument));
        if (incompleteNewTraveler) {
          throw new Error('Full name, date of birth, passport, and travel document are required for every new co-traveller.');
        }
      }

      await updateMyProfile({ firstName, lastName, email, username });

      if (!isDoctor && regId && prev) {
        const savedTravelers: Person[] = [];
        for (const traveler of validTravelers) {
          if (traveler.id) {
            savedTravelers.push(traveler);
          } else {
            const created = await addTravelerWithDocuments(
              regId,
              traveler,
              traveler.passport!,
              traveler.travelDocument!,
            );
            savedTravelers.push({ ...created, passport: null, travelDocument: null });
          }
        }
      const registrationPayload: RegistrationApi = {
        ...prev,
        id: regId,
        firstName,
        middleName,
        lastName,
        emailAddress: email,
        primaryWhatsAppNumber: username,
        dateOfBirth,
        gender,
        carerSecondaryWhatsAppNumber: secondaryWhatsAppNumber,
        longTermMedication,
        healthCondition,
        allergies,
        fitToFlyCertificate,
        travellingFrom,
        travellingTo,
        travelStartDate,
        travelEndDate,
        packageDays: Number.isFinite(packageDays) ? packageDays : 0,
        travelers: savedTravelers,
      };

      const updated = await updateRegistrationById(regId, registrationPayload);
      setTravelers((updated.travelers || []).map(t => ({ id: t.id, patientId: t.patientId, fullName: t.fullName, dateOfBirth: t.dateOfBirth })));
      setLatestReg(updated);
      const newEntries = await Promise.all(savedTravelers.filter(t => t.patientId).map(async t =>
        [t.patientId!, await listDocuments(regId, t.patientId!)] as const));
      setDocs(prevDocs => ({ ...prevDocs, ...Object.fromEntries(newEntries) }));
      }
      setShowSuccessPopup(true);

      setLatestReg((prevReg) => prevReg ? ({
      ...prevReg,
      middleName,
      dateOfBirth,
      gender,
      carerSecondaryWhatsAppNumber: secondaryWhatsAppNumber,
      longTermMedication,
      healthCondition,
      allergies,
      fitToFlyCertificate,
      travellingFrom,
      travellingTo,
      travelStartDate,
      travelEndDate,
      packageDays: Number.isFinite(packageDays) ? packageDays : 0,
      travelers: prevReg.travelers,
      }) : prevReg);
    } finally {
      setSaving(false);
    }
  }

  async function onUploadDocument(patientId: string, type: DocumentType, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !regId) return;
    setErr('');
    await uploadDocument(regId, patientId, type, f);
    const existingDocs = await listDocuments(regId, patientId);
    setDocs(prev => ({ ...prev, [patientId]: existingDocs }));
    setMsg(`${type === 'PASSPORT' ? 'Passport' : 'Travel document'} uploaded successfully.`);
  }

  async function onDeleteAccount() {
    if (!confirm('Are you sure? This deletes your account.')) return;
    await deleteMyAccount();
    await logout();
    navigate('/dashboard');
  }

  if (loading) return <div className="card">Loading profile…</div>;

  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || (email[0] || '?').toUpperCase();

  return (
    <>
      <div className="page-head">
        <div className="page-title">Profile</div>
        <Link to="/home" className="bs">‹ Home</Link>
      </div>

      {!!err && <div className="notice n-warn"><i className="ti ti-alert-triangle" aria-hidden="true" />{err}</div>}
      {!!msg && !showSuccessPopup && <div className="notice n-info"><i className="ti ti-circle-check" aria-hidden="true" />{msg}</div>}

      <form onSubmit={async (e) => {
        try {
          await save(e);
        } catch (error: any) {
          setErr(error?.message || 'Failed to save changes.');
        }
      }}>
        <div className="g2">
          <div>
            <div className="card">
              <div className="ct">Photo</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="ava" style={{ width: 64, height: 64, fontSize: 22 }}>
                  <AuthedAvatar
                    src={user?.photoUrl ? resolveApiUrl(API_BASE_URL, user.photoUrl) : null}
                    fallback={initials}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div className="file-input-btn bs">
                    {photoBusy ? 'Uploading…' : 'Upload Photo'}
                    <input type="file" accept="image/*" disabled={photoBusy} onChange={onPhotoUpload} />
                  </div>
                  {user?.photoUrl && (
                    <button type="button" className="bg" disabled={photoBusy} onClick={onPhotoRemove}>Remove</button>
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="ct">Personal Information</div>
              <div className="g2">
                <div className="fi"><label className="fl2">First Name</label><input value={firstName} onChange={e => setFirstName(e.target.value)} required /></div>
                <div className="fi"><label className="fl2">Last Name</label><input value={lastName} onChange={e => setLastName(e.target.value)} /></div>
              </div>
              <div className="fi"><label className="fl2">Email</label><input value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div className="fi"><label className="fl2">WhatsApp Number</label><input value={username} onChange={e => setUsername(e.target.value)} required /></div>

              {!isDoctor && (
                <div className="g2">
                  <div className="fi"><label className="fl2">Date of Birth</label><input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} /></div>
                  <div className="fi"><label className="fl2">Middle Name</label><input value={middleName} onChange={e => setMiddleName(e.target.value)} /></div>
                  <div className="fi"><label className="fl2">Gender</label><input value={gender} onChange={e => setGender(e.target.value)} /></div>
                  <div className="fi"><label className="fl2">Secondary WhatsApp Number</label><input value={secondaryWhatsAppNumber} onChange={e => setSecondaryWhatsAppNumber(e.target.value)} /></div>
                </div>
              )}
            </div>

            {!isDoctor && (
              <>
                <div className="card">
                  <div className="ct">Trip Details</div>
                  <div className="g2">
                    <div className="fi">
                      <label className="fl2">Travelling From</label>
                      <input list="profile-country-from-list" placeholder="Start typing to search…" value={travellingFrom} onChange={e => setTravellingFrom(e.target.value)} />
                      <datalist id="profile-country-from-list">{ALL_COUNTRIES.map(c => <option key={c} value={c} />)}</datalist>
                    </div>
                    <div className="fi">
                      <label className="fl2">Travelling To</label>
                      <input list="profile-country-to-list" placeholder="Start typing to search…" value={travellingTo} onChange={e => setTravellingTo(e.target.value)} />
                      <datalist id="profile-country-to-list">{EUROPE_COUNTRIES.map(c => <option key={c} value={c} />)}</datalist>
                    </div>
                    <div className="fi"><label className="fl2">Travel Start Date</label><input type="date" value={travelStartDate} onChange={e => setTravelStartDate(e.target.value)} /></div>
                    <div className="fi"><label className="fl2">Travel End Date</label><input type="date" value={travelEndDate} onChange={e => setTravelEndDate(e.target.value)} /></div>
                  </div>
                  <div className="fi"><label className="fl2">Package Days</label><input type="number" min={0} value={packageDays} onChange={e => setPackageDays(Number(e.target.value || 0))} /></div>
                </div>

                <div className="card">
                  <div className="ct">Health Declarations</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={longTermMedication} onChange={(e) => setLongTermMedication(e.target.checked)} /> Long-term Medication</label>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={healthCondition} onChange={(e) => setHealthCondition(e.target.checked)} /> Health Condition</label>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={allergies} onChange={(e) => setAllergies(e.target.checked)} /> Allergies</label>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={fitToFlyCertificate} onChange={(e) => setFitToFlyCertificate(e.target.checked)} /> Fit-to-fly Required</label>
                  </div>
                </div>

                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div className="ct" style={{ marginBottom: 0 }}>Travellers</div>
                    <button type="button" className="bg" onClick={addPassenger}><i className="ti ti-plus" aria-hidden="true" /> Add Passenger</button>
                  </div>

                  {travelers.map((person, idx) => (
                    <div key={`p-${idx}`} className="card" style={{ background: 'var(--surface-1)' }}>
                      <div className="g2">
                        <div className="fi"><label className="fl2">Full Name</label><input value={person.fullName} onChange={(e) => updatePassenger(idx, 'fullName', e.target.value)} /></div>
                        <div className="fi"><label className="fl2">Date of Birth</label><input type="date" value={person.dateOfBirth} onChange={(e) => updatePassenger(idx, 'dateOfBirth', e.target.value)} /></div>
                      </div>
                      {!person.id && (
                        <div className="g2">
                          <div className="fi">
                            <label className="fl2">Upload Passport *</label>
                            {person.passport && <div className="fi-hint">Selected: {person.passport.name}</div>}
                            <input type="file" accept=".jpg,.jpeg,.png,.pdf" required
                              onChange={e => setTravelers(list => list.map((row, i) => i === idx ? { ...row, passport: e.target.files?.[0] || null } : row))} />
                          </div>
                          <div className="fi">
                            <label className="fl2">Upload Travel Document *</label>
                            {person.travelDocument && <div className="fi-hint">Selected: {person.travelDocument.name}</div>}
                            <input type="file" accept=".jpg,.jpeg,.png,.pdf" required
                              onChange={e => setTravelers(list => list.map((row, i) => i === idx ? { ...row, travelDocument: e.target.files?.[0] || null } : row))} />
                          </div>
                        </div>
                      )}
                      <button type="button" className="bg" onClick={() => removePassenger(idx)}>Remove</button>
                    </div>
                  ))}
                </div>

                <div className="card">
                  <div className="ct">Traveller Documents</div>
                  {latestReg?.primaryPatientId && [{ name: `${firstName} ${lastName}`.trim() || 'Primary traveller', patientId: latestReg.primaryPatientId },
                    ...travelers.filter(t => t.patientId).map(t => ({ name: t.fullName, patientId: t.patientId! }))].map(person => (
                    <div className="card" style={{ background: 'var(--surface-1)' }} key={person.patientId}>
                      <strong style={{ fontSize: 13 }}>{person.name}</strong>
                      {(['PASSPORT', 'TRAVEL_DOCUMENT'] as DocumentType[]).map(type => {
                        const current = (docs[person.patientId] || []).find(doc => doc.type === type)
                        return <div className="fi" key={type}>
                          <label className="fl2">{type === 'PASSPORT' ? 'Passport' : 'Travel Document'}</label>
                          {current && <div className="fi-hint">Current: {current.fileName}</div>}
                          <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => onUploadDocument(person.patientId, type, e)} />
                        </div>
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div>
            <div className="card">
              <div className="ct">Account</div>
              <div className="fi">
                <label className="fl2">Password</label>
                <Link to="/change-password" className="bs">Change Password</Link>
              </div>
              <div className="fi">
                <label className="fl2">Session</label>
                <button type="button" className="bd" onClick={onSignOut}>Sign Out</button>
              </div>
            </div>

            <div className="card" style={{ borderColor: 'var(--border-danger)' }}>
              <div className="ct" style={{ color: 'var(--text-danger)' }}>Danger Zone</div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                Deleting your account permanently removes your profile, travellers, and consultation history. This cannot be undone.
              </p>
              <button type="button" className="bd" onClick={onDeleteAccount}>Delete My Account</button>
            </div>

            <button className="bp btn-block" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Profile'}</button>
          </div>
        </div>
      </form>

      {showSuccessPopup && (
        <div className="portal">
          <div className="modal-overlay" onClick={() => setShowSuccessPopup(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="modal-head">
                <div className="modal-title">Success</div>
                <button type="button" className="modal-close" onClick={() => setShowSuccessPopup(false)}>×</button>
              </div>
              <div className="modal-body">
                <p style={{ fontSize: 13 }}>{isDoctor ? 'Your profile details have been updated.' : 'Your profile has been updated.'}</p>
              </div>
              <div className="modal-foot">
                <button type="button" className="bp" onClick={() => setShowSuccessPopup(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
