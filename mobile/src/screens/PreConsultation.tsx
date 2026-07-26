// src/screens/PreConsultation.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, TextInput,
  TouchableOpacity, Modal, FlatList, ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL } from '../api';
import { colors, spacing, radius, typography, shadow } from '../theme';
import { PageHeader } from '../components/PageHeader';

// ── Types ─────────────────────────────────────────────────────────────────────
type YesNo = 'Yes' | 'No';
type Ans   = YesNo | undefined;
type PatientOpt = { key: string; label: string; dob: string };

// ── Form definition ───────────────────────────────────────────────────────────
const CRITICAL = new Set([
  'Emergency Symptoms',
  'Signs of a Stroke (FAST)',
  'Indications of Sepsis',
  'Signs of Heart Attack',
]);

const FORM = [
  { title: 'Emergency Symptoms', questions: [
    { id: 'emergency_pain',        label: 'Experiencing severe pain?' },
    { id: 'emergency_breath',      label: 'Difficulty breathing or shortness of breath?' },
    { id: 'emergency_unconscious', label: 'Unconsciousness or altered mental state?' },
    { id: 'emergency_bleeding',    label: 'Recent injury with heavy bleeding?' },
  ]},
  { title: 'Signs of a Stroke (FAST)', questions: [
    { id: 'stroke_face',     label: 'Facial droop?' },
    { id: 'stroke_weakness', label: 'Weakness on one side?' },
    { id: 'stroke_speech',   label: 'Slurred speech?' },
  ]},
  { title: 'Indications of Sepsis', questions: [
    { id: 'sepsis_confusion', label: 'Slurred speech or confusion?' },
    { id: 'sepsis_shiver',    label: 'Shivering or muscle pain?' },
    { id: 'sepsis_skin',      label: 'Skin discoloration or rash?' },
  ]},
  { title: 'Signs of Heart Attack', questions: [
    { id: 'heartattack_chest', label: 'Severe chest pain, pressure, or heavy weight on chest?' },
  ]},
  { title: 'General Symptoms', questions: [
    { id: 'general_symptoms_fever',      label: 'Experiencing persistent fever?' },
    { id: 'general_symptoms_fatigue',    label: 'Feeling extreme fatigue or weakness?' },
    { id: 'general_symptoms_weightloss', label: 'Unexplained weight loss?' },
  ]},
  { title: 'Respiratory & ENT Issues', questions: [
    { id: 'respiratory_ent_cough',  label: 'Persistent cough?' },
    { id: 'respiratory_ent_taste',  label: 'Sudden loss of taste or smell?' },
    { id: 'respiratory_ent_throat', label: 'Severe sore throat?' },
  ]},
  { title: 'Digestive Issues', questions: [
    { id: 'digestive_abdominal_pain', label: 'Severe abdominal pain?' },
    { id: 'digestive_gi',             label: 'Persistent nausea, vomiting, or diarrhea?' },
  ]},
  { title: 'Neurological Symptoms', questions: [
    { id: 'neuro_headache', label: 'New or worsening severe headaches?' },
    { id: 'neuro_vision',   label: 'Sudden onset of vision changes?' },
    { id: 'neuro_balance',  label: 'Difficulty with balance or coordination?' },
  ]},
  { title: 'Mental Well-being', questions: [
    { id: 'mental_anxiety', label: 'Experiencing severe anxiety or panic attacks?' },
    { id: 'mental_sadness', label: 'Persistent feelings of sadness or self-harm thoughts?' },
  ]},
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function toYMD(raw?: string | null): string {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch { return ''; }
}

function sanitize(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '');
}

function buildPatientOptions(reg: any): PatientOpt[] {
  const opts: PatientOpt[] = [];
  const seen = new Set<string>();
  const push = (key: string, label: string, dob: string) => {
    if (!key || seen.has(key)) return;
    seen.add(key);
    opts.push({ key, label, dob });
  };
  const primaryName = [reg?.firstName, reg?.lastName].filter(Boolean).join(' ').trim() || 'Primary Member';
  push('primary', `${primaryName} (Primary)`, toYMD(reg?.dateOfBirth));
  if (Array.isArray(reg?.travelers)) {
    reg.travelers.forEach((t: any, idx: number) => {
      const idPart = t?.id != null ? String(t.id) : `idx-${idx}`;
      push(`trav-${idPart}`, (t?.fullName || `Traveller ${idx + 1}`).trim(), toYMD(t?.dateOfBirth));
    });
  }
  return opts;
}

// ── Patient picker sheet ──────────────────────────────────────────────────────
function PatientSheet({ visible, options, selected, onSelect, onClose }: {
  visible: boolean; options: PatientOpt[]; selected: string;
  onSelect: (k: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={ps.overlay} activeOpacity={1} onPress={onClose} />
      <View style={ps.sheet}>
        <View style={ps.handle} />
        <Text style={ps.title}>Select Patient</Text>
        <FlatList
          data={options}
          keyExtractor={i => i.key}
          style={{ maxHeight: 300 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.line, marginHorizontal: spacing.xl }} />}
          renderItem={({ item }) => {
            const active = item.key === selected;
            return (
              <TouchableOpacity
                style={[ps.option, active && ps.optionActive]}
                onPress={() => { onSelect(item.key); onClose(); }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[ps.optLabel, active && ps.optLabelActive]}>{item.label}</Text>
                  {item.dob ? <Text style={ps.optDob}>DOB: {item.dob}</Text> : null}
                </View>
                {active && <Text style={{ color: colors.brand, fontWeight: '700', fontSize: 16 }}>✓</Text>}
              </TouchableOpacity>
            );
          }}
        />
        <TouchableOpacity style={ps.cancelBtn} onPress={onClose} activeOpacity={0.75}>
          <Text style={ps.cancelTxt}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Yes/No toggle ─────────────────────────────────────────────────────────────
function Toggle({ label, value, onChange, critical }: {
  label: string; value: Ans; onChange: (v: YesNo) => void; critical: boolean;
}) {
  const labelColor = critical ? colors.error : colors.success;
  return (
    <View style={t.wrap}>
      <Text style={[t.label, { color: labelColor }]}>{label}</Text>
      {value === undefined && <Text style={t.hint}>← please choose</Text>}
      <View style={t.btnRow}>
        <TouchableOpacity
          style={[t.btn, value === 'No' ? t.btnNo : t.btnUnset]}
          onPress={() => onChange('No')}
          activeOpacity={0.75}
        >
          <Text style={[t.btnTxt, value === 'No' && t.btnTxtActive]}>No</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[t.btn, value === 'Yes' ? t.btnYes : t.btnUnset]}
          onPress={() => onChange('Yes')}
          activeOpacity={0.75}
        >
          <Text style={[t.btnTxt, value === 'Yes' && t.btnTxtActive]}>Yes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function PreConsultation() {
  const router = useRouter();
  const params = useLocalSearchParams<{ cid?: string; travelerId?: string; patientId?: string }>();
  const cid        = params.cid;
  const isEdit     = !!cid;
  const initTravId = params.travelerId;
  const initPatId  = params.patientId;

  const [location,       setLocation      ] = useState('');
  const [locationCity,   setLocationCity  ] = useState(''); // human-readable city name
  const [contactName,    setContactName   ] = useState('');
  const [contactPhone,   setContactPhone  ] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [dob,            setDob           ] = useState('');
  const [submitting,     setSubmitting    ] = useState(false);
  const [locLoading,     setLocLoading    ] = useState(false);
  const [locError,       setLocError      ] = useState('');

  const [patientOptions,     setPatientOptions    ] = useState<PatientOpt[]>([]);
  const [selectedPatientKey, setSelectedPatientKey] = useState<string>('primary');
  const [showPatientSheet,   setShowPatientSheet  ] = useState(false);

  const defaultAnswers = useMemo(() => {
    const all: Record<string, Ans> = {};
    for (const s of FORM) for (const q of s.questions) all[q.id] = undefined;
    return all;
  }, []);
  const [answers,    setAnswers   ] = useState<Record<string, Ans>>(defaultAnswers);
  const [detailsByQ, setDetailsByQ] = useState<Record<string, string>>({});

  // ── Prefill (new mode) ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isEdit) return;
    let ignore = false;
    (async () => {
      // 1. Latest registration → build patient options
      try {
        const r = await fetch(`${API_BASE_URL}/registrations/mine/latest`, { credentials: 'include' });
        if (!ignore && r.ok) {
          const reg = await r.json().catch(() => null);
          if (reg) {
            const fullName = [reg?.firstName, reg?.lastName].filter(Boolean).join(' ').trim();
            if (fullName && !contactName) setContactName(fullName);
            if (reg?.primaryWhatsApp && !contactPhone) setContactPhone(String(reg.primaryWhatsApp));
            const ymd = toYMD(reg?.dateOfBirth);
            if (ymd && !dob) setDob(ymd);

            const opts = buildPatientOptions(reg);
            if (opts.length > 0) {
              setPatientOptions(opts);
              // Pre-select if travelerId/patientId passed via params
              const preKey = initTravId ? `trav-${initTravId}` : initPatId ? `trav-${initPatId}` : opts[0].key;
              const match  = opts.find(o => o.key === preKey) ?? opts[0];
              setSelectedPatientKey(match.key);
              setContactName(match.label.replace(/\s*\(Primary\)\s*$/, ''));
              if (match.dob) setDob(match.dob);
            }
          }
        }
      } catch {}

      // 2. Latest consultation → prefill location/address
      try {
        const r0 = await fetch(`${API_BASE_URL}/consultations/mine/latest`, { credentials: 'include' });
        if (!ignore && r0.ok) {
          const latest = await r0.json().catch(() => null);
          if (latest?.id) {
            const r1 = await fetch(`${API_BASE_URL}/consultations/${latest.id}/mine`, { credentials: 'include' });
            if (!ignore && r1.ok) {
              const j = await r1.json();
              if (!location && j?.currentLocation) setLocation(j.currentLocation);
              if (!contactAddress && j?.contactAddress) setContactAddress(j.contactAddress);
              if (!dob) { const y = toYMD(j?.dob || j?.patient?.dob); if (y) setDob(y); }
            }
          }
        }
      } catch {}

      // 3. Fallback /auth/me
      try {
        const r = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });
        if (!ignore && r.ok) {
          const me = await r.json();
          if (!contactPhone && (me?.username || me?.phone)) setContactPhone(String(me.username || me.phone));
          if (!contactName) {
            const nm = [me?.firstName, me?.lastName].filter(Boolean).join(' ').trim();
            if (nm) setContactName(nm);
          }
        }
      } catch {}
    })();
    return () => { ignore = true; };
  }, [isEdit]);

  // ── Prefill (edit mode) ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    let ignore = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/consultations/${cid}/mine`, { credentials: 'include' });
        if (!ignore && r.ok) {
          const j = await r.json();
          setLocation(j.currentLocation || '');
          setContactName(j.contactName || '');
          setContactPhone(j.contactPhone || '');
          setContactAddress(j.contactAddress || '');
          setDob(toYMD(j.dob || ''));

          const r2 = await fetch(`${API_BASE_URL}/registrations/mine/latest`, { credentials: 'include' });
          if (!ignore && r2.ok) {
            const reg = await r2.json().catch(() => null);
            if (reg) {
              const opts = buildPatientOptions(reg);
              setPatientOptions(opts);
              const nameOnly = (j.contactName || '').trim();
              const matchByName = opts.find(o => o.label.replace(/\s*\(Primary\)\s*$/, '') === nameOnly);
              const matchByDob  = opts.find(o => o.dob && o.dob === toYMD(j.dob || ''));
              setSelectedPatientKey((matchByName || matchByDob || opts[0])?.key || 'primary');
            }
          }
          const merged: Record<string, Ans> = { ...defaultAnswers };
          Object.entries(j.answers || {}).forEach(([k, v]) => {
            if (v === 'Yes' || v === 'No') merged[k] = v as YesNo;
          });
          setAnswers(merged);
          setDetailsByQ(j.detailsByQuestion || {});
        }
      } catch {}
    })();
    return () => { ignore = true; };
  }, [isEdit, cid]);

  // ── Sync contact fields when patient selection changes ──────────────────────
  useEffect(() => {
    if (!patientOptions.length) return;
    const opt = patientOptions.find(o => o.key === selectedPatientKey);
    if (!opt) return;
    setContactName(opt.label.replace(/\s*\(Primary\)\s*$/, ''));
    if (opt.dob) setDob(opt.dob);
  }, [selectedPatientKey]);

  // ── GPS with reverse geocode → friendly city name ──────────────────────────
  async function useMyLocation() {
    setLocLoading(true); setLocError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocError('Location permission denied.'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      // Try Nominatim reverse geocode for a human-readable address
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=16`,
          { headers: { 'Accept-Language': 'en', 'User-Agent': 'GodwitCare/1.0' } }
        );
        if (res.ok) {
          const j = await res.json();
          const addr = j?.address;
          // Build a concise friendly name: "Suburb, City, Country"
          const parts = [
            addr?.suburb || addr?.neighbourhood || addr?.village || addr?.hamlet,
            addr?.city    || addr?.town || addr?.county,
            addr?.country,
          ].filter(Boolean);
          const friendly = parts.length > 0 ? parts.join(', ') : j?.display_name;
          if (friendly) {
            setLocation(sanitize(friendly));
            setLocationCity(sanitize(addr?.city || addr?.town || addr?.county || parts[0] || ''));
          } else {
            setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          }
        } else {
          setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        }
      } catch {
        setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      }
    } catch {
      setLocError('Unable to get location. Please enter it manually.');
    } finally {
      setLocLoading(false);
    }
  }

  const showEmergencyBanner = useMemo(() =>
    FORM.filter(s => CRITICAL.has(s.title))
        .some(s => s.questions.some(q => answers[q.id] === 'Yes'))
  , [answers]);

  function setAnswer(id: string, v: YesNo) {
    setAnswers(prev => prev[id] === v ? prev : { ...prev, [id]: v });
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function submit() {
    const unanswered = Object.entries(answers).filter(([, v]) => v === undefined);
    if (unanswered.length > 0) {
      Alert.alert('Incomplete', `Please answer all ${unanswered.length} remaining question(s) before submitting.`);
      return;
    }
    setSubmitting(true);
    try {
      const castAnswers: Record<string, YesNo> = {};
      for (const k of Object.keys(answers)) castAnswers[k] = answers[k] as YesNo;

      const details: Record<string, string> = {};
      for (const [k, v] of Object.entries(detailsByQ)) {
        const t = (v || '').trim();
        if (t) details[k] = t;
      }

      const travelerId = selectedPatientKey.startsWith('trav-')
        ? (() => {
            const idStr = selectedPatientKey.slice(5).replace(/^idx-/, '');
            const n = Number(idStr);
            return Number.isFinite(n) ? n : null;
          })()
        : null;

      const payload = {
        currentLocation: sanitize(location),
        contactName,
        contactPhone,
        contactAddress,
        answers: castAnswers,
        detailsByQuestion: details,
        dob: dob || null,
        travelerId,
      };

      const url    = isEdit ? `${API_BASE_URL}/consultations/${cid}` : `${API_BASE_URL}/consultations`;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${t || res.statusText}`);
      }

      const trackerParams = travelerId ? `?logged=1&travelerId=${travelerId}` : '?logged=1';
      router.replace(`/(app)/consultation/tracker${trackerParams}` as any);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not save your details. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedPatient = patientOptions.find(o => o.key === selectedPatientKey);
  const answeredCount   = Object.values(answers).filter(v => v !== undefined).length;
  const totalCount      = Object.keys(answers).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGray }}>
      <PageHeader
        title={isEdit ? 'Edit Consultation' : 'Pre-Consultation Checklist'}
        subtitle="Health questionnaire"
      />
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Progress pill ── */}
        <View style={s.progressPill}>
          <View style={[s.progressBar, { width: `${(answeredCount / totalCount) * 100}%` as any }]} />
          <Text style={s.progressText}>{answeredCount} / {totalCount} answered</Text>
        </View>

        {/* ── Current Location ── */}
        <View style={s.card}>
          <Text style={s.cardHeader}>📍  Current Location</Text>
          <View style={s.locationRow}>
            <View style={{ flex: 1 }}>
              <TextInput
                style={s.input}
                value={location}
                onChangeText={t => { setLocation(t); setLocError(''); }}
                placeholder="e.g. Suburb, City, Country"
                placeholderTextColor={colors.mutedLight}
              />
              {locationCity ? (
                <Text style={s.locationCity}>📍 {locationCity}</Text>
              ) : null}
              {locError ? (
                <Text style={s.locError}>{locError}</Text>
              ) : null}
            </View>
            <TouchableOpacity style={s.gpsBtn} onPress={useMyLocation} disabled={locLoading} activeOpacity={0.75}>
              {locLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.gpsBtnText}>📡 GPS</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Patient Contact & Address ── */}
        <View style={s.card}>
          <Text style={s.cardHeader}>👤  Patient Contact & Address</Text>

          {/* Patient selector */}
          {patientOptions.length > 0 && (
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Patient (Primary or Traveller)</Text>
              <TouchableOpacity style={s.selector} onPress={() => setShowPatientSheet(true)} activeOpacity={0.75}>
                <Text style={s.selectorText}>{selectedPatient?.label || 'Select patient'}</Text>
                <Text style={s.selectorChevron}>›</Text>
              </TouchableOpacity>
              {selectedPatient?.dob ? (
                <Text style={s.selectorNote}>WhatsApp (shared)  ·  DOB: {selectedPatient.dob}</Text>
              ) : (
                <Text style={s.selectorNote}>WhatsApp (shared)</Text>
              )}
            </View>
          )}

          <View style={s.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Full Name</Text>
              <TextInput style={s.input} value={contactName} onChangeText={setContactName} placeholder="Full name" placeholderTextColor={colors.mutedLight} autoCapitalize="words" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Date of Birth</Text>
              <TextInput style={s.input} value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedLight} keyboardType="numbers-and-punctuation" />
            </View>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>Phone / WhatsApp</Text>
            <TextInput style={s.input} value={contactPhone} onChangeText={setContactPhone} placeholder="+44 7xxx xxx xxx" placeholderTextColor={colors.mutedLight} keyboardType="phone-pad" />
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>Address</Text>
            <TextInput
              style={s.textarea}
              value={contactAddress}
              onChangeText={setContactAddress}
              placeholder="Street, City, Postal Code, Country"
              placeholderTextColor={colors.mutedLight}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* ── Emergency banner ── */}
        {showEmergencyBanner && (
          <View style={s.emergencyBanner}>
            <Text style={s.emergencyTitle}>🚨 Emergency Detected</Text>
            <Text style={s.emergencyText}>
              If you answered "Yes" to any of the critical questions, please dial 999 immediately.
            </Text>
          </View>
        )}

        {/* ── Question sections ── */}
        {FORM.map(section => {
          const isCritical = CRITICAL.has(section.title);
          const borderColor = isCritical ? colors.error : colors.success;
          const titleColor  = isCritical ? colors.error : colors.success;
          return (
            <View key={section.title} style={[s.sectionCard, { borderColor }]}>
              <View style={[s.sectionTitleRow, { backgroundColor: isCritical ? colors.errorBg : colors.successBg }]}>
                <Text style={[s.sectionTitle, { color: titleColor }]}>{section.title}</Text>
              </View>
              <View style={s.sectionBody}>
                {section.questions.map(q => (
                  <View key={q.id}>
                    <Toggle
                      label={q.label}
                      value={answers[q.id]}
                      onChange={v => setAnswer(q.id, v)}
                      critical={isCritical}
                    />
                    {answers[q.id] === 'Yes' && (
                      <View style={s.detailWrap}>
                        <TextInput
                          style={s.detailInput}
                          value={detailsByQ[q.id] || ''}
                          onChangeText={v => setDetailsByQ(prev => ({ ...prev, [q.id]: v }))}
                          placeholder="Add details (optional)"
                          placeholderTextColor={colors.mutedLight}
                        />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[s.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={submit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color={colors.brandDark} />
            : <Text style={s.submitBtnText}>{isEdit ? 'Update & Continue' : 'Submit & Continue'}</Text>
          }
        </TouchableOpacity>

      </ScrollView>

      <PatientSheet
        visible={showPatientSheet}
        options={patientOptions}
        selected={selectedPatientKey}
        onSelect={setSelectedPatientKey}
        onClose={() => setShowPatientSheet(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: 60, gap: spacing.md },

  progressPill: { height: 32, backgroundColor: colors.white, borderRadius: radius.full, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', justifyContent: 'center', position: 'relative' },
  progressBar:  { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.brandLight, borderRadius: radius.full },
  progressText: { textAlign: 'center', fontSize: typography.xs, fontWeight: '700', color: colors.brand, zIndex: 1 },

  card:       { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.md, ...shadow.sm },
  cardHeader: { fontSize: typography.base, fontWeight: '700', color: colors.text },

  locationRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  locationCity:{ fontSize: typography.xs, color: colors.brand, marginTop: 4, fontWeight: '600' },
  locError:    { fontSize: typography.xs, color: colors.error, marginTop: 4 },
  gpsBtn:      { backgroundColor: colors.brand, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', minWidth: 72 },
  gpsBtnText:  { color: '#fff', fontWeight: '700', fontSize: typography.sm },

  fieldWrap:   { gap: 4 },
  fieldLabel:  { fontSize: typography.xs, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldRow:    { flexDirection: 'row', gap: spacing.md },
  input:       { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: typography.base, color: colors.text, backgroundColor: colors.bgGray, minHeight: 46 },
  textarea:    { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: typography.base, color: colors.text, backgroundColor: colors.bgGray, minHeight: 80 },

  selector:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.brand + '60', borderRadius: radius.md, backgroundColor: colors.brandLight, paddingHorizontal: spacing.md, paddingVertical: 12, gap: spacing.sm },
  selectorText:   { flex: 1, fontSize: typography.base, color: colors.text, fontWeight: '600' },
  selectorChevron:{ fontSize: 20, color: colors.muted },
  selectorNote:   { fontSize: typography.xs, color: colors.muted, marginTop: 2 },

  emergencyBanner: { backgroundColor: colors.error, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.xs, ...shadow.md },
  emergencyTitle:  { color: '#fff', fontWeight: '800', fontSize: typography.md },
  emergencyText:   { color: 'rgba(255,255,255,0.9)', fontSize: typography.sm, lineHeight: 20 },

  sectionCard:     { borderRadius: radius.xl, borderWidth: 2, overflow: 'hidden', ...shadow.sm },
  sectionTitleRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  sectionTitle:    { fontWeight: '700', fontSize: typography.base },
  sectionBody:     { padding: spacing.lg, backgroundColor: colors.white, gap: spacing.md },

  detailWrap:  { marginTop: -spacing.sm, marginBottom: spacing.xs },
  detailInput: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8, fontSize: typography.sm, color: colors.text, backgroundColor: colors.bgGray },

  submitBtn:     { backgroundColor: colors.amber, borderRadius: radius.full, paddingVertical: 15, alignItems: 'center', ...shadow.brand },
  submitBtnText: { fontSize: typography.md, fontWeight: '800', color: colors.brandDark },
});

const t = StyleSheet.create({
  wrap:        { gap: 6 },
  label:       { fontSize: typography.sm, fontWeight: '700', lineHeight: 20 },
  hint:        { fontSize: typography.xs, color: colors.mutedLight, fontStyle: 'italic' },
  btnRow:      { flexDirection: 'row', gap: spacing.sm },
  btn:         { flex: 1, paddingVertical: 10, borderRadius: radius.lg, alignItems: 'center', borderWidth: 1.5 },
  btnUnset:    { backgroundColor: colors.bgGray, borderColor: colors.line },
  btnNo:       { backgroundColor: colors.brand, borderColor: colors.brand },
  btnYes:      { backgroundColor: colors.error, borderColor: colors.error },
  btnTxt:      { fontSize: typography.base, fontWeight: '600', color: colors.muted },
  btnTxtActive:{ color: '#fff' },
});

const ps = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:       { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 28 },
  handle:      { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, alignSelf: 'center', marginTop: 12 },
  title:       { fontSize: typography.lg, fontWeight: '700', color: colors.text, textAlign: 'center', padding: spacing.lg },
  option:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: 14 },
  optionActive:{ backgroundColor: colors.brandLight },
  optLabel:    { fontSize: typography.base, color: colors.text, fontWeight: '500' },
  optLabelActive: { color: colors.brand, fontWeight: '700' },
  optDob:      { fontSize: typography.xs, color: colors.muted, marginTop: 2 },
  cancelBtn:   { marginHorizontal: spacing.xl, marginTop: spacing.md, paddingVertical: 14, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center' },
  cancelTxt:   { fontSize: typography.base, fontWeight: '600', color: colors.muted },
});
