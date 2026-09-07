// src/screens/Account.tsx — mirrors web's screens/Profile.tsx (.portal cards/fields), mobile keeps a view/edit toggle.
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, Platform, Image,
} from 'react-native';
import { FormScrollView } from '../components/FormScrollView';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useAuth, isDoctorUser } from '../state/auth';
import {
  updateMe, uploadProfilePhoto, deleteProfilePhoto, deleteMe, logout,
  API_BASE_URL, authFetch, getLatestRegistrationByEmail, updateRegistrationById,
  addTravelerWithDocuments, uploadDocument, listDocuments,
  type RegistrationApi, type DocSummary, type DocumentType, type RNFile,
} from '../api';
import { PageHeader } from '../components/PageHeader';
import { ws, wc } from '../webStyle';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PIN_ENABLED_KEY = 'gc_pin_enabled';
const BIO_ENABLED_KEY = 'gc_bio_enabled';

type Person = {
  id?: number;
  patientId?: string;
  fullName: string;
  dateOfBirth: string;
  passport?: RNFile | null;
  travelDocument?: RNFile | null;
};

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function displayDate(v?: string) {
  if (!v) return '';
  const d = new Date(`${v}T00:00:00`);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}
async function pickDocFile(): Promise<RNFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png', 'application/pdf'] });
  if (result.canceled || !result.assets[0]) return null;
  const a = result.assets[0];
  return { uri: a.uri, name: a.name, type: a.mimeType || 'application/octet-stream' };
}

// ── Inline date field ────────────────────────────────────────────────────────
function DateBtn({ value, onChange, editing }: { value: string; onChange: (v: string) => void; editing: boolean }) {
  const [show, setShow] = useState(false);
  if (!editing) return <Text style={s.fieldValue}>{value ? displayDate(value) : '—'}</Text>;
  return (
    <>
      <TouchableOpacity style={ws.input} onPress={() => setShow(true)} activeOpacity={0.75}>
        <Text style={[s.dateBtnText, !value && { color: wc.textMuted }]}>{value ? displayDate(value) : 'Select date'}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value ? new Date(`${value}T00:00:00`) : new Date()}
          mode="date"
          display="default"
          onChange={(_, d) => { setShow(Platform.OS === 'ios'); if (d) onChange(ymd(d)); }}
        />
      )}
    </>
  );
}

// ── Photo action sheet ────────────────────────────────────────────────────────
function PhotoSheet({ visible, onClose, onCamera, onGallery, onRemove }: {
  visible: boolean; onClose: () => void;
  onCamera: () => void; onGallery: () => void; onRemove: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={ps.overlay} activeOpacity={1} onPress={onClose} />
      <View style={ps.sheet}>
        <View style={ps.handle} />
        <Text style={ps.title}>Profile Photo</Text>
        {[
          { icon: '📷', label: 'Take Photo', onPress: onCamera, danger: false },
          { icon: '🖼️', label: 'Choose from Gallery', onPress: onGallery, danger: false },
          { icon: '🗑️', label: 'Remove Photo', onPress: onRemove, danger: true },
        ].map((o, i) => (
          <React.Fragment key={o.label}>
            {i > 0 && <View style={ps.sep} />}
            <TouchableOpacity style={ps.option} onPress={() => { onClose(); setTimeout(o.onPress, 300); }} activeOpacity={0.7}>
              <Text style={{ fontSize: 21, width: 32 }}>{o.icon}</Text>
              <Text style={[ps.optLabel, o.danger && ps.optDanger]}>{o.label}</Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
        <TouchableOpacity style={ps.cancelRow} onPress={onClose} activeOpacity={0.7}>
          <Text style={ps.cancelTxt}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Menu row ──────────────────────────────────────────────────────────────────
function MenuRow({ icon, label, sub, onPress, danger }: {
  icon: string; label: string; sub?: string; onPress?: () => void; danger?: boolean;
}) {
  return (
    <TouchableOpacity style={s.menuRow} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <Text style={{ fontSize: 17, width: 24 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[s.menuLabel, danger && { color: wc.textDanger }]}>{label}</Text>
        {sub ? <Text style={s.menuSub}>{sub}</Text> : null}
      </View>
      {onPress && <Text style={s.menuChevron}>›</Text>}
    </TouchableOpacity>
  );
}

// ── Yes/No checkbox row ────────────────────────────────────────────────────────
function CheckRow({ label, value, onChange, editing }: { label: string; value: boolean; onChange: (v: boolean) => void; editing: boolean }) {
  return (
    <TouchableOpacity
      style={s.checkRow}
      onPress={() => editing && onChange(!value)}
      activeOpacity={editing ? 0.7 : 1}
      disabled={!editing}
    >
      <View style={[s.checkbox, value && s.checkboxOn]}>{value && <Text style={s.checkboxTick}>✓</Text>}</View>
      <Text style={s.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Account() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const isDoctor = isDoctorUser(user);

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const [photoB64, setPhotoB64] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);

  const [pinEnabled, setPinEnabled] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);

  const [middleName, setMiddleName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [secondaryWA, setSecondaryWA] = useState('');
  const [travellingFrom, setTravellingFrom] = useState('');
  const [travellingTo, setTravellingTo] = useState('');
  const [travelStart, setTravelStart] = useState('');
  const [travelEnd, setTravelEnd] = useState('');
  const [packageDays, setPackageDays] = useState('0');
  const [longTermMedication, setLongTermMedication] = useState(false);
  const [healthCondition, setHealthCondition] = useState(false);
  const [allergies, setAllergies] = useState(false);
  const [fitToFly, setFitToFly] = useState(false);
  const [travelers, setTravelers] = useState<Person[]>([]);
  const [regId, setRegId] = useState<number | null>(null);
  const [latestReg, setLatestReg] = useState<RegistrationApi | null>(null);
  const [docs, setDocs] = useState<Record<string, DocSummary[]>>({});
  const [loadingReg, setLoadingReg] = useState(true);

  useEffect(() => {
    if (!user) { router.replace('/(app)/login'); return; }
    resetFields();
    loadPhoto();
    loadRegistration();
  }, [user]);

  useEffect(() => {
    AsyncStorage.multiGet([PIN_ENABLED_KEY, BIO_ENABLED_KEY]).then(pairs => {
      const m = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
      setPinEnabled(m[PIN_ENABLED_KEY] === 'true');
      setBioEnabled(m[BIO_ENABLED_KEY] === 'true');
    });
  }, []);

  function resetFields() {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setEmail(user?.email || '');
  }

  async function loadRegistration() {
    if (isDoctor || !user?.email) { setLoadingReg(false); return; }
    setLoadingReg(true);
    try {
      const reg = await getLatestRegistrationByEmail(user.email);
      setLatestReg(reg);
      if (reg?.id) {
        setRegId(reg.id);
        setMiddleName(reg.middleName || '');
        setDateOfBirth(reg.dateOfBirth || '');
        setGender(reg.gender || '');
        setSecondaryWA(reg.carerSecondaryWhatsAppNumber || '');
        setTravellingFrom(reg.travellingFrom || '');
        setTravellingTo(reg.travellingTo || '');
        setTravelStart(reg.travelStartDate || '');
        setTravelEnd(reg.travelEndDate || '');
        setPackageDays(String(reg.packageDays || 0));
        setLongTermMedication(!!reg.longTermMedication);
        setHealthCondition(!!reg.healthCondition);
        setAllergies(!!reg.allergies);
        setFitToFly(!!reg.fitToFlyCertificate);
        setTravelers((reg.travelers || []).map(t => ({ id: t.id, patientId: t.patientId, fullName: t.fullName || '', dateOfBirth: t.dateOfBirth || '' })));

        const patientIds = [reg.primaryPatientId, ...(reg.travelers || []).map(t => t.patientId)].filter(Boolean) as string[];
        const entries = await Promise.all(patientIds.map(async pid => [pid, await listDocuments(reg.id, pid).catch(() => [])] as const));
        setDocs(Object.fromEntries(entries));
      }
    } catch { /* not registered yet — fine, sections below just stay empty */ }
    finally { setLoadingReg(false); }
  }

  async function loadPhoto() {
    setPhotoLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/users/me/photo`);
      if (!res.ok) { setPhotoB64(null); return; }
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => setPhotoB64(reader.result as string);
      reader.onerror = () => setPhotoB64(null);
      reader.readAsDataURL(blob);
    } catch { setPhotoB64(null); }
    finally { setPhotoLoading(false); }
  }

  function addTraveler() {
    setTravelers(prev => [...prev, { fullName: '', dateOfBirth: '', passport: null, travelDocument: null }]);
  }
  function removeTraveler(idx: number) {
    setTravelers(prev => prev.filter((_, i) => i !== idx));
  }
  function updateTraveler(idx: number, patch: Partial<Person>) {
    setTravelers(prev => prev.map((t, i) => i === idx ? { ...t, ...patch } : t));
  }

  async function save() {
    if (!firstName.trim()) { Alert.alert('Validation', 'First name is required.'); return; }
    const incomplete = !isDoctor && travelers.find(t => !t.id && (!t.fullName.trim() || !t.dateOfBirth || !t.passport || !t.travelDocument));
    if (incomplete) { Alert.alert('Validation', 'Full name, date of birth, passport, and travel document are required for every new co-traveller.'); return; }

    setSaving(true);
    try {
      await updateMe({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() || undefined });

      if (!isDoctor && regId && latestReg) {
        const savedTravelers: Person[] = [];
        for (const t of travelers) {
          if (t.id) { savedTravelers.push(t); continue; }
          const created = await addTravelerWithDocuments(regId, { fullName: t.fullName, dateOfBirth: t.dateOfBirth }, t.passport!, t.travelDocument!);
          savedTravelers.push({ id: created.id, patientId: created.patientId, fullName: created.fullName, dateOfBirth: created.dateOfBirth });
        }

        const updated = await updateRegistrationById(regId, {
          ...latestReg,
          id: regId,
          firstName: firstName.trim(),
          middleName,
          lastName: lastName.trim(),
          emailAddress: email.trim(),
          dateOfBirth,
          gender,
          carerSecondaryWhatsAppNumber: secondaryWA,
          longTermMedication,
          healthCondition,
          allergies,
          fitToFlyCertificate: fitToFly,
          travellingFrom,
          travellingTo,
          travelStartDate: travelStart,
          travelEndDate: travelEnd,
          packageDays: Number(packageDays) || 0,
          travelers: savedTravelers,
        });

        setLatestReg(updated);
        setTravelers((updated.travelers || []).map(t => ({ id: t.id, patientId: t.patientId, fullName: t.fullName, dateOfBirth: t.dateOfBirth })));

        const newPatientIds = savedTravelers.map(t => t.patientId).filter(Boolean) as string[];
        if (newPatientIds.length) {
          const entries = await Promise.all(newPatientIds.map(async pid => [pid, await listDocuments(regId, pid).catch(() => [])] as const));
          setDocs(prev => ({ ...prev, ...Object.fromEntries(entries) }));
        }
      }

      await refresh();
      setEditing(false);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not update profile.');
    } finally { setSaving(false); }
  }

  function cancelEdit() { resetFields(); loadRegistration(); setEditing(false); }

  async function pickImage(src: 'camera' | 'gallery') {
    const perm = src === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', `Please allow ${src} access.`); return; }
    const result = src === 'camera'
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      setPhotoLoading(true);
      try {
        await uploadProfilePhoto(result.assets[0].uri, result.assets[0].mimeType || 'image/jpeg');
        await loadPhoto();
      } catch (e: any) {
        Alert.alert('Upload failed', e?.message || 'Could not upload photo.');
        setPhotoLoading(false);
      }
    }
  }

  function confirmRemovePhoto() {
    Alert.alert('Remove Photo', 'Remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await deleteProfilePhoto(); setPhotoB64(null); }
        catch (e: any) { Alert.alert('Error', e?.message); }
      }},
    ]);
  }

  function confirmLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'Deleting your account permanently removes your profile, travellers, and consultation history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete My Account', style: 'destructive', onPress: async () => {
          try {
            await deleteMe();
            await logout();
            router.replace('/(app)/login');
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Could not delete account.');
          }
        }},
      ],
    );
  }

  async function onUploadTravellerDoc(patientId: string, type: DocumentType) {
    if (!regId) return;
    const file = await pickDocFile();
    if (!file) return;
    try {
      await uploadDocument(regId, patientId, type, file);
      const fresh = await listDocuments(regId, patientId);
      setDocs(prev => ({ ...prev, [patientId]: fresh }));
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Could not upload document.');
    }
  }

  const initials = `${(user?.firstName || '?')[0]}${(user?.lastName || '')[0] || ''}`.toUpperCase();
  const pinSubtext = pinEnabled ? (bioEnabled ? 'PIN + Fingerprint enabled' : 'PIN enabled') : 'Set up app lock';

  const documentPeople = latestReg?.primaryPatientId
    ? [{ name: `${firstName} ${lastName}`.trim() || 'Primary traveller', patientId: latestReg.primaryPatientId },
       ...travelers.filter(t => t.patientId).map(t => ({ name: t.fullName, patientId: t.patientId! }))]
    : [];

  return (
    <View style={{ flex: 1 }}>
      <PageHeader
        title={editing ? 'Edit Profile' : 'My Profile'}
        subtitle={editing ? 'Tap ✓ to save' : 'Account & settings'}
        showBack
        onBack={editing ? cancelEdit : undefined}
        right={
          editing ? (
            <TouchableOpacity style={ws.bp} onPress={save} disabled={saving} activeOpacity={0.8}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={ws.bpText}>✓ Save</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={ws.bs} onPress={() => setEditing(true)} activeOpacity={0.7}>
              <Text style={ws.bsText}>✏️ Edit</Text>
            </TouchableOpacity>
          )
        }
      />

      <FormScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Photo ── */}
        <View style={ws.card}>
          <Text style={ws.ct}>Photo</Text>
          <View style={s.photoRow}>
            <TouchableOpacity onPress={() => setShowPhotoSheet(true)} activeOpacity={0.85}>
              <View style={s.avatarCircle}>
                {photoLoading ? (
                  <View style={[StyleSheet.absoluteFill, s.avatarFallback]}><ActivityIndicator color={wc.fillAccent} /></View>
                ) : photoB64 ? (
                  <Image source={{ uri: photoB64 }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <View style={[StyleSheet.absoluteFill, s.avatarFallback]}><Text style={s.initials}>{initials}</Text></View>
                )}
              </View>
            </TouchableOpacity>
            <View>
              <Text style={s.heroName}>{user?.firstName} {user?.lastName}</Text>
              <Text style={s.heroSub}>{user?.email || user?.username}</Text>
              <TouchableOpacity style={[ws.bs, { marginTop: 6, alignSelf: 'flex-start' }]} onPress={() => setShowPhotoSheet(true)} activeOpacity={0.8}>
                <Text style={ws.bsText}>Change Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Personal Info ── */}
        <View style={ws.card}>
          <Text style={ws.ct}>Personal Information</Text>

          <View style={ws.g2Row}>
            <View style={ws.g2Col}>
              <Text style={ws.fl2}>First Name *</Text>
              {editing
                ? <TextInput style={ws.input} value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor={wc.textMuted} autoCapitalize="words" />
                : <Text style={s.fieldValue}>{firstName || '—'}</Text>}
            </View>
            <View style={ws.g2Col}>
              <Text style={ws.fl2}>Last Name</Text>
              {editing
                ? <TextInput style={ws.input} value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor={wc.textMuted} autoCapitalize="words" />
                : <Text style={s.fieldValue}>{lastName || '—'}</Text>}
            </View>
          </View>

          <Text style={ws.fl2}>Email Address</Text>
          {editing
            ? <TextInput style={ws.input} value={email} onChangeText={setEmail} placeholder="you@email.com" placeholderTextColor={wc.textMuted} keyboardType="email-address" autoCapitalize="none" textContentType="emailAddress" />
            : <Text style={s.fieldValue}>{email || '—'}</Text>}

          <Text style={[ws.fl2, { marginTop: 10 }]}>Username / WhatsApp</Text>
          <Text style={[s.fieldValue, { color: wc.textMuted }]}>{user?.username || '—'}</Text>

          {!isDoctor && (
            <>
              <View style={[ws.g2Row, { marginTop: 10 }]}>
                <View style={ws.g2Col}>
                  <Text style={ws.fl2}>Middle Name</Text>
                  {editing
                    ? <TextInput style={ws.input} value={middleName} onChangeText={setMiddleName} placeholderTextColor={wc.textMuted} autoCapitalize="words" />
                    : <Text style={s.fieldValue}>{middleName || '—'}</Text>}
                </View>
                <View style={ws.g2Col}>
                  <Text style={ws.fl2}>Gender</Text>
                  {editing
                    ? <TextInput style={ws.input} value={gender} onChangeText={setGender} placeholderTextColor={wc.textMuted} />
                    : <Text style={s.fieldValue}>{gender || '—'}</Text>}
                </View>
              </View>

              <Text style={ws.fl2}>Date of Birth</Text>
              <DateBtn value={dateOfBirth} onChange={setDateOfBirth} editing={editing} />

              <Text style={[ws.fl2, { marginTop: 10 }]}>Secondary WhatsApp Number</Text>
              {editing
                ? <TextInput style={ws.input} value={secondaryWA} onChangeText={v => setSecondaryWA(v.replace(/^0+/, ''))} placeholder="Optional" placeholderTextColor={wc.textMuted} keyboardType="phone-pad" />
                : <Text style={s.fieldValue}>{secondaryWA || '—'}</Text>}
            </>
          )}
        </View>

        {!isDoctor && !loadingReg && regId && (
          <>
            {/* ── Trip Details ── */}
            <View style={ws.card}>
              <Text style={ws.ct}>Trip Details</Text>
              <View style={ws.g2Row}>
                <View style={ws.g2Col}>
                  <Text style={ws.fl2}>Travelling From</Text>
                  {editing
                    ? <TextInput style={ws.input} value={travellingFrom} onChangeText={setTravellingFrom} placeholder="Country" placeholderTextColor={wc.textMuted} />
                    : <Text style={s.fieldValue}>{travellingFrom || '—'}</Text>}
                </View>
                <View style={ws.g2Col}>
                  <Text style={ws.fl2}>Travelling To</Text>
                  {editing
                    ? <TextInput style={ws.input} value={travellingTo} onChangeText={setTravellingTo} placeholder="Destination" placeholderTextColor={wc.textMuted} />
                    : <Text style={s.fieldValue}>{travellingTo || '—'}</Text>}
                </View>
              </View>
              <View style={ws.g2Row}>
                <View style={ws.g2Col}>
                  <Text style={ws.fl2}>Travel Start Date</Text>
                  <DateBtn value={travelStart} onChange={setTravelStart} editing={editing} />
                </View>
                <View style={ws.g2Col}>
                  <Text style={ws.fl2}>Travel End Date</Text>
                  <DateBtn value={travelEnd} onChange={setTravelEnd} editing={editing} />
                </View>
              </View>
              <Text style={ws.fl2}>Package Days</Text>
              {editing
                ? <TextInput style={ws.input} value={packageDays} onChangeText={setPackageDays} keyboardType="number-pad" placeholderTextColor={wc.textMuted} />
                : <Text style={s.fieldValue}>{packageDays || '0'} days</Text>}
            </View>

            {/* ── Health Declarations ── */}
            <View style={ws.card}>
              <Text style={ws.ct}>Health Declarations</Text>
              <CheckRow label="Long-term Medication" value={longTermMedication} onChange={setLongTermMedication} editing={editing} />
              <CheckRow label="Health Condition" value={healthCondition} onChange={setHealthCondition} editing={editing} />
              <CheckRow label="Allergies" value={allergies} onChange={setAllergies} editing={editing} />
              <CheckRow label="Fit-to-fly Required" value={fitToFly} onChange={setFitToFly} editing={editing} />
            </View>

            {/* ── Travellers ── */}
            <View style={ws.card}>
              <View style={s.rowBetween}>
                <Text style={[ws.ct, { marginBottom: 0 }]}>Travellers</Text>
                {editing && (
                  <TouchableOpacity style={ws.bg} onPress={addTraveler} activeOpacity={0.75}>
                    <Text style={ws.bgText}>+ Add Passenger</Text>
                  </TouchableOpacity>
                )}
              </View>
              {travelers.length === 0 && <Text style={s.emptyText}>No co-travellers added yet.</Text>}
              {travelers.map((t, idx) => (
                <View key={t.id ?? `new-${idx}`} style={s.travCard}>
                  <View style={ws.g2Row}>
                    <View style={ws.g2Col}>
                      <Text style={ws.fl2}>Full Name</Text>
                      {editing && !t.id
                        ? <TextInput style={ws.input} value={t.fullName} onChangeText={v => updateTraveler(idx, { fullName: v })} placeholderTextColor={wc.textMuted} autoCapitalize="words" />
                        : <Text style={s.fieldValue}>{t.fullName || '—'}</Text>}
                    </View>
                    <View style={ws.g2Col}>
                      <Text style={ws.fl2}>Date of Birth</Text>
                      {editing && !t.id
                        ? <DateBtn value={t.dateOfBirth} onChange={v => updateTraveler(idx, { dateOfBirth: v })} editing />
                        : <Text style={s.fieldValue}>{displayDate(t.dateOfBirth) || '—'}</Text>}
                    </View>
                  </View>
                  {editing && !t.id && (
                    <View style={ws.g2Row}>
                      <TouchableOpacity style={[ws.bs, { flex: 1 }]} onPress={async () => updateTraveler(idx, { passport: await pickDocFile() })} activeOpacity={0.75}>
                        <Text style={ws.bsText} numberOfLines={1}>{t.passport ? `✓ ${t.passport.name}` : 'Upload Passport *'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[ws.bs, { flex: 1 }]} onPress={async () => updateTraveler(idx, { travelDocument: await pickDocFile() })} activeOpacity={0.75}>
                        <Text style={ws.bsText} numberOfLines={1}>{t.travelDocument ? `✓ ${t.travelDocument.name}` : 'Upload Travel Doc *'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {editing && (
                    <TouchableOpacity style={[ws.bd, { alignSelf: 'flex-start', marginTop: 8 }]} onPress={() => removeTraveler(idx)} activeOpacity={0.75}>
                      <Text style={ws.bdText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            {/* ── Traveller Documents ── */}
            {documentPeople.length > 0 && (
              <View style={ws.card}>
                <Text style={ws.ct}>Traveller Documents</Text>
                {documentPeople.map(person => (
                  <View key={person.patientId} style={s.travCard}>
                    <Text style={s.travCardName}>{person.name}</Text>
                    {(['PASSPORT', 'TRAVEL_DOCUMENT'] as DocumentType[]).map(type => {
                      const current = (docs[person.patientId] || []).find(d => d.type === type);
                      return (
                        <View key={type} style={s.docRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={ws.fl2}>{type === 'PASSPORT' ? 'Passport' : 'Travel Document'}</Text>
                            <Text style={s.docCurrent}>{current ? current.fileName : 'Not uploaded'}</Text>
                          </View>
                          <TouchableOpacity style={ws.bs} onPress={() => onUploadTravellerDoc(person.patientId, type)} activeOpacity={0.75}>
                            <Text style={ws.bsText}>{current ? 'Replace' : 'Upload'}</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Security ── */}
        <View style={ws.card}>
          <Text style={ws.ct}>Security</Text>
          <MenuRow icon="🔒" label="PIN & Biometrics" sub={pinSubtext} onPress={() => router.push('/(app)/pin-setup' as any)} />
          <View style={s.rowDivider} />
          <MenuRow icon="🔑" label="Change Password" sub="Update your account password" onPress={() => router.push('/(app)/change-password' as any)} />
        </View>

        {/* ── App ── */}
        <View style={ws.card}>
          <Text style={ws.ct}>App</Text>
          <MenuRow icon="📋" label="Terms of Use" sub="Our terms and conditions" onPress={() => router.push('/(app)/more/terms' as any)} />
          <View style={s.rowDivider} />
          <MenuRow icon="🔐" label="Privacy Policy" sub="How we handle your data" onPress={() => router.push('/(app)/more/privacy' as any)} />
          <View style={s.rowDivider} />
          <MenuRow icon="🔔" label="Notifications" sub="Manage notification settings" onPress={() => router.push('/(app)/more/notifications' as any)} />
          <View style={s.rowDivider} />
          <MenuRow icon="❓" label="FAQs" sub="Common questions answered" onPress={() => router.push('/(app)/more/faqs' as any)} />
        </View>

        {/* ── Account ── */}
        <View style={ws.card}>
          <Text style={ws.ct}>Account</Text>
          <MenuRow icon="🚪" label="Sign Out" sub="Log out of your account" onPress={confirmLogout} danger />
        </View>

        {/* ── Danger Zone ── */}
        <View style={[ws.card, { borderColor: wc.borderDanger }]}>
          <Text style={[ws.ct, { color: wc.textDanger }]}>Danger Zone</Text>
          <Text style={s.dangerText}>Deleting your account permanently removes your profile, travellers, and consultation history. This cannot be undone.</Text>
          <TouchableOpacity style={ws.bd} onPress={confirmDeleteAccount} activeOpacity={0.8}>
            <Text style={ws.bdText}>Delete My Account</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.version}>GodwitCare · v1.0.0</Text>
      </FormScrollView>

      <PhotoSheet
        visible={showPhotoSheet}
        onClose={() => setShowPhotoSheet(false)}
        onCamera={() => pickImage('camera')}
        onGallery={() => pickImage('gallery')}
        onRemove={() => { setShowPhotoSheet(false); setTimeout(confirmRemovePhoto, 300); }}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60 },

  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarCircle: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', backgroundColor: wc.bgAccent },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 23, fontWeight: '700', color: wc.textAccent },

  heroName: { fontSize: 16, fontWeight: '600', color: wc.textPrimary },
  heroSub: { fontSize: 13, color: wc.textMuted },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },

  fieldValue: { fontSize: 14, color: wc.textPrimary, paddingVertical: 6, marginBottom: 6 },
  dateBtnText: { fontSize: 14, color: wc.textPrimary },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: wc.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: wc.fillAccent, borderColor: wc.fillAccent },
  checkboxTick: { color: '#fff', fontSize: 13, fontWeight: '800' },
  checkLabel: { fontSize: 14, color: wc.textPrimary },

  emptyText: { fontSize: 13, color: wc.textMuted, fontStyle: 'italic' },

  travCard: { backgroundColor: wc.surface1, borderRadius: 8, padding: 12, marginTop: 8, gap: 6 },
  travCardName: { fontSize: 14, fontWeight: '600', color: wc.textPrimary, marginBottom: 4 },

  docRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  docCurrent: { fontSize: 13, color: wc.textSecondary },

  dangerText: { fontSize: 13, color: wc.textSecondary, lineHeight: 17, marginBottom: 10 },

  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 10 },
  menuLabel: { fontSize: 14, fontWeight: '500', color: wc.textPrimary },
  menuSub: { fontSize: 12, color: wc.textMuted, marginTop: 1 },
  menuChevron: { fontSize: 19, color: wc.textMuted },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: wc.border },

  version: { textAlign: 'center', color: wc.textMuted, fontSize: 12, marginTop: 8 },
});

// Photo sheet styles
const ps = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: wc.surface2, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: wc.borderStronger, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '600', color: wc.textPrimary, textAlign: 'center', paddingVertical: 14 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: wc.border, marginHorizontal: 20 },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  optLabel: { fontSize: 15, color: wc.textPrimary, fontWeight: '500' },
  optDanger: { color: wc.textDanger },
  cancelRow: { marginTop: 10, marginHorizontal: 20, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: wc.borderStrong, alignItems: 'center' },
  cancelTxt: { fontSize: 14, fontWeight: '500', color: wc.textMuted },
});
