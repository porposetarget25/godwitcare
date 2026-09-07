// src/screens/PreConsultation.tsx — mirrors web's .portal card/field/notice styling.
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Alert, TextInput,
  TouchableOpacity, Modal, FlatList, ActivityIndicator, Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL, authFetch } from '../api';
import { ws, wc } from '../webStyle';
import { PageHeader } from '../components/PageHeader';
import { FormScrollView } from '../components/FormScrollView';

// ── Types ─────────────────────────────────────────────────────────────────────
type YesNo = 'Yes' | 'No';
type Ans = YesNo | undefined;
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
    { id: 'emergency_pain', label: 'Experiencing severe pain?' },
    { id: 'emergency_breath', label: 'Difficulty breathing or shortness of breath?' },
    { id: 'emergency_unconscious', label: 'Unconsciousness or altered mental state?' },
    { id: 'emergency_bleeding', label: 'Recent injury with heavy bleeding?' },
  ]},
  { title: 'Signs of a Stroke (FAST)', questions: [
    { id: 'stroke_face', label: 'Facial droop?' },
    { id: 'stroke_weakness', label: 'Weakness on one side?' },
    { id: 'stroke_speech', label: 'Slurred speech?' },
  ]},
  { title: 'Indications of Sepsis', questions: [
    { id: 'sepsis_confusion', label: 'Slurred speech or confusion?' },
    { id: 'sepsis_shiver', label: 'Shivering or muscle pain?' },
    { id: 'sepsis_skin', label: 'Skin discoloration or rash?' },
  ]},
  { title: 'Signs of Heart Attack', questions: [
    { id: 'heartattack_chest', label: 'Severe chest pain, pressure, or heavy weight on chest?' },
  ]},
  { title: 'General Symptoms', questions: [
    { id: 'general_symptoms_fever', label: 'Experiencing persistent fever?' },
    { id: 'general_symptoms_fatigue', label: 'Feeling extreme fatigue or weakness?' },
    { id: 'general_symptoms_weightloss', label: 'Unexplained weight loss?' },
  ]},
  { title: 'Respiratory & ENT Issues', questions: [
    { id: 'respiratory_ent_cough', label: 'Persistent cough?' },
    { id: 'respiratory_ent_taste', label: 'Sudden loss of taste or smell?' },
    { id: 'respiratory_ent_throat', label: 'Severe sore throat?' },
  ]},
  { title: 'Digestive Issues', questions: [
    { id: 'digestive_abdominal_pain', label: 'Severe abdominal pain?' },
    { id: 'digestive_gi', label: 'Persistent nausea, vomiting, or diarrhea?' },
  ]},
  { title: 'Neurological Symptoms', questions: [
    { id: 'neuro_headache', label: 'New or worsening severe headaches?' },
    { id: 'neuro_vision', label: 'Sudden onset of vision changes?' },
    { id: 'neuro_balance', label: 'Difficulty with balance or coordination?' },
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

function isSectionComplete(section: { questions: { id: string }[] }, answers: Record<string, Ans>) {
  return section.questions.every(q => answers[q.id] !== undefined);
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
          ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: wc.border, marginHorizontal: 20 }} />}
          renderItem={({ item }) => {
            const active = item.key === selected;
            return (
              <TouchableOpacity style={[ps.option, active && ps.optionActive]} onPress={() => { onSelect(item.key); onClose(); }} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  <Text style={[ps.optLabel, active && ps.optLabelActive]}>{item.label}</Text>
                  {item.dob ? <Text style={ps.optDob}>DOB: {item.dob}</Text> : null}
                </View>
                {active && <Text style={{ color: wc.fillAccent, fontWeight: '700', fontSize: 16 }}>✓</Text>}
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

// ── Emergency blocking modal ──────────────────────────────────────────────────
function EmergencyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={em.overlay} activeOpacity={1} onPress={onClose} />
      <View style={em.centerWrap} pointerEvents="box-none">
        <View style={em.box}>
          <Text style={em.title}>🚨 Medical Emergency</Text>
          <Text style={em.body}>You are experiencing emergency symptoms. Please dial 999 immediately.</Text>
          <View style={em.actions}>
            <TouchableOpacity style={[ws.bs, { flex: 1 }]} onPress={onClose} activeOpacity={0.75}>
              <Text style={ws.bsText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[ws.bd, { flex: 1 }]} onPress={() => Linking.openURL('tel:999')} activeOpacity={0.85}>
              <Text style={ws.bdText}>📞 Call 999 Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Yes/No toggle ─────────────────────────────────────────────────────────────
function Toggle({ label, value, onChange, critical, disabled }: {
  label: string; value: Ans; onChange: (v: YesNo) => void; critical: boolean; disabled?: boolean;
}) {
  const labelColor = critical ? wc.textDanger : wc.textSuccess;
  return (
    <View style={[t.wrap, disabled && { opacity: 0.5 }]}>
      <Text style={[t.label, { color: labelColor }]}>{label}</Text>
      {value === undefined && <Text style={t.hint}>← please choose</Text>}
      <View style={t.btnRow}>
        <TouchableOpacity style={[t.btn, value === 'No' ? t.btnNo : t.btnUnset]} onPress={() => onChange('No')} activeOpacity={0.75} disabled={disabled}>
          <Text style={[t.btnTxt, value === 'No' && t.btnTxtActive]}>No</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[t.btn, value === 'Yes' ? t.btnYes : t.btnUnset]} onPress={() => onChange('Yes')} activeOpacity={0.75} disabled={disabled}>
          <Text style={[t.btnTxt, value === 'Yes' && t.btnTxtActive]}>Yes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function PreConsultation() {
  const router = useRouter();
  const params = useLocalSearchParams<{ cid?: string; travelerId?: string; patientId?: string; locked?: string }>();
  const cid = params.cid;
  const isEdit = !!cid;
  const isLocked = params.locked === '1';
  const initTravId = params.travelerId;
  const initPatId = params.patientId;

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [dob, setDob] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [patientOptions, setPatientOptions] = useState<PatientOpt[]>([]);
  const [selectedPatientKey, setSelectedPatientKey] = useState<string>('primary');
  const [showPatientSheet, setShowPatientSheet] = useState(false);
  // Backend-computed patientId per patient key ('primary' / 'trav-{id}') — the create
  // endpoint validates the submitted patientId against this exact server-side value.
  const [patientIdByKey, setPatientIdByKey] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEdit) return;
    let ignore = false;
    (async () => {
      try {
        const r = await authFetch(`${API_BASE_URL}/consultations/travelers`);
        if (!ignore && r.ok) {
          const rows: Array<{ id: string | number; patientId?: string }> = await r.json().catch(() => []);
          const map: Record<string, string> = {};
          for (const row of rows) {
            if (!row.patientId) continue;
            map[row.id === 'PRIMARY' ? 'primary' : `trav-${row.id}`] = row.patientId;
          }
          setPatientIdByKey(map);
        }
      } catch {}
    })();
    return () => { ignore = true; };
  }, [isEdit]);

  const defaultAnswers = useMemo(() => {
    const all: Record<string, Ans> = {};
    for (const s of FORM) for (const q of s.questions) all[q.id] = undefined;
    return all;
  }, []);
  const [answers, setAnswers] = useState<Record<string, Ans>>(defaultAnswers);
  const [detailsByQ, setDetailsByQ] = useState<Record<string, string>>({});

  const [openSectionIndex, setOpenSectionIndex] = useState(0);

  useEffect(() => {
    if (isEdit) return;
    let ignore = false;
    (async () => {
      try {
        const r = await authFetch(`${API_BASE_URL}/registrations/mine/latest`);
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
              const preKey = initTravId ? `trav-${initTravId}` : initPatId ? `trav-${initPatId}` : opts[0].key;
              const match = opts.find(o => o.key === preKey) ?? opts[0];
              setSelectedPatientKey(match.key);
              setContactName(match.label.replace(/\s*\(Primary\)\s*$/, ''));
              if (match.dob) setDob(match.dob);
            }
          }
        }
      } catch {}

      try {
        const r0 = await authFetch(`${API_BASE_URL}/consultations/mine/latest`);
        if (!ignore && r0.ok) {
          const latest = await r0.json().catch(() => null);
          if (latest?.id) {
            const r1 = await authFetch(`${API_BASE_URL}/consultations/${latest.id}/mine`);
            if (!ignore && r1.ok) {
              const j = await r1.json();
              if (!contactAddress && j?.contactAddress) setContactAddress(j.contactAddress);
              if (!dob) { const y = toYMD(j?.dob || j?.patient?.dob); if (y) setDob(y); }
            }
          }
        }
      } catch {}

      try {
        const r = await authFetch(`${API_BASE_URL}/auth/me`);
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

  useEffect(() => {
    if (!isEdit) return;
    let ignore = false;
    (async () => {
      try {
        const r = await authFetch(`${API_BASE_URL}/consultations/${cid}/mine`);
        if (!ignore && r.ok) {
          const j = await r.json();
          setContactName(j.contactName || '');
          setContactPhone(j.contactPhone || '');
          setContactAddress(j.contactAddress || '');
          setDob(toYMD(j.dob || ''));

          const r2 = await authFetch(`${API_BASE_URL}/registrations/mine/latest`);
          if (!ignore && r2.ok) {
            const reg = await r2.json().catch(() => null);
            if (reg) {
              const opts = buildPatientOptions(reg);
              setPatientOptions(opts);
              const nameOnly = (j.contactName || '').trim();
              const matchByName = opts.find(o => o.label.replace(/\s*\(Primary\)\s*$/, '') === nameOnly);
              const matchByDob = opts.find(o => o.dob && o.dob === toYMD(j.dob || ''));
              setSelectedPatientKey((matchByName || matchByDob || opts[0])?.key || 'primary');
            }
          }
          const merged: Record<string, Ans> = { ...defaultAnswers };
          Object.entries(j.answers || {}).forEach(([k, v]) => {
            if (v === 'Yes' || v === 'No') merged[k] = v as YesNo;
          });
          setAnswers(merged);
          setDetailsByQ(j.detailsByQuestion || {});
          setOpenSectionIndex(FORM.length - 1);
        }
      } catch {}
    })();
    return () => { ignore = true; };
  }, [isEdit, cid]);

  useEffect(() => {
    if (!patientOptions.length) return;
    const opt = patientOptions.find(o => o.key === selectedPatientKey);
    if (!opt) return;
    setContactName(opt.label.replace(/\s*\(Primary\)\s*$/, ''));
    if (opt.dob) setDob(opt.dob);
  }, [selectedPatientKey]);

  const hasEmergencyAnswer = useMemo(() =>
    FORM.filter(s => CRITICAL.has(s.title))
        .some(s => s.questions.some(q => answers[q.id] === 'Yes'))
  , [answers]);

  const [emergencyModalDismissed, setEmergencyModalDismissed] = useState(false);
  useEffect(() => {
    if (!hasEmergencyAnswer) setEmergencyModalDismissed(false);
  }, [hasEmergencyAnswer]);

  function answerQuestion(sectionIndex: number, id: string, v: YesNo) {
    setAnswers(prev => {
      if (prev[id] === v) return prev;
      const next = { ...prev, [id]: v };
      const section = FORM[sectionIndex];
      if (v === 'No' && section && isSectionComplete(section, next) && sectionIndex < FORM.length - 1) {
        setTimeout(() => {
          setOpenSectionIndex(current => (current === sectionIndex ? sectionIndex + 1 : current));
        }, 350);
      }
      return next;
    });
  }

  async function submit() {
    if (submitting || isLocked || hasEmergencyAnswer) return;

    const unanswered = Object.entries(answers).filter(([, v]) => v === undefined);
    if (unanswered.length > 0) {
      Alert.alert('Incomplete', 'Please answer all questions (Yes/No) before submitting.');
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

      const patientId = patientIdByKey[selectedPatientKey];
      if (!isEdit && !patientId) {
        Alert.alert('Please try again', 'Could not resolve the selected patient. Please try again in a moment.');
        setSubmitting(false);
        return;
      }

      const payload = {
        currentLocation: null,
        contactName,
        contactPhone,
        contactAddress,
        answers: castAnswers,
        detailsByQuestion: details,
        dob: dob || null,
        travelerId,
        patientId,
      };

      const url = isEdit ? `${API_BASE_URL}/consultations/${cid}` : `${API_BASE_URL}/consultations`;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
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
  const answeredCount = Object.values(answers).filter(v => v !== undefined).length;
  const totalCount = Object.keys(answers).length;
  const initials = contactName.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title={isEdit ? 'Edit Consultation' : 'Pre-Consultation Checklist'} subtitle="Health questionnaire" />
      <FormScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {isLocked && (
          <View style={[ws.notice, ws.nInfo]}>
            <Text style={[ws.noticeText, ws.nInfoText]}>🔒 This checklist is locked while your appointment is booked. Cancel the appointment to make changes.</Text>
          </View>
        )}

        {/* ── Progress pill ── */}
        <View style={s.progressPill}>
          <View style={[s.progressBar, { width: `${totalCount ? (answeredCount / totalCount) * 100 : 0}%` as any }]} />
          <Text style={s.progressText}>{answeredCount} of {totalCount} answered</Text>
        </View>

        {/* ── Patient Contact & Address ── */}
        <View style={ws.card}>
          <Text style={ws.ct}>👤  Patient Contact & Address</Text>

          {patientOptions.length > 0 ? (
            <View style={ws.fi}>
              <Text style={ws.fl2}>Consultation for</Text>
              <TouchableOpacity style={s.selector} onPress={() => setShowPatientSheet(true)} activeOpacity={0.75} disabled={isLocked || hasEmergencyAnswer}>
                <View style={ws.ava}><Text style={ws.avaText}>{initials}</Text></View>
                <Text style={s.selectorText}>{selectedPatient?.label || 'Select patient'}</Text>
                <Text style={s.selectorChevron}>›</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={ws.fi}>
              <Text style={ws.fl2}>Full Name</Text>
              <TextInput style={ws.input} value={contactName} onChangeText={setContactName} placeholder="Full name" placeholderTextColor={wc.textMuted} autoCapitalize="words" editable={!isLocked && !hasEmergencyAnswer} />
            </View>
          )}

          <View style={ws.g2Row}>
            <View style={ws.g2Col}>
              <Text style={ws.fl2}>Phone / WhatsApp</Text>
              <TextInput style={[ws.input, ws.inputDisabled]} value={contactPhone} editable={false} />
            </View>
            <View style={ws.g2Col}>
              <Text style={ws.fl2}>Date of Birth</Text>
              <TextInput style={[ws.input, ws.inputDisabled]} value={dob} editable={false} />
            </View>
          </View>

          <View style={ws.fi}>
            <Text style={ws.fl2}>Address</Text>
            <TextInput
              style={[ws.input, { minHeight: 70 }]}
              value={contactAddress}
              onChangeText={setContactAddress}
              placeholder="Street, City, Postal Code, Country"
              placeholderTextColor={wc.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!isLocked && !hasEmergencyAnswer}
            />
          </View>
        </View>

        {/* ── Emergency banner ── */}
        {hasEmergencyAnswer && (
          <View style={s.emergencyBanner}>
            <Text style={s.emergencyTitle}>🚨 You are experiencing emergency symptoms</Text>
            <Text style={s.emergencyText}>Please dial 999 immediately.</Text>
            <TouchableOpacity style={s.emergencyCallBtn} onPress={() => Linking.openURL('tel:999')} activeOpacity={0.85}>
              <Text style={s.emergencyCallBtnText}>📞 Call 999 Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Question sections (sequential accordion) ── */}
        {FORM.map((section, index) => {
          const isCritical = CRITICAL.has(section.title);
          const answeredIn = section.questions.filter(q => answers[q.id] !== undefined).length;
          const complete = answeredIn === section.questions.length;
          const isOpen = openSectionIndex === index;
          const isFirstGeneral = !isCritical && FORM[index - 1] && CRITICAL.has(FORM[index - 1].title);
          const borderColor = isCritical ? wc.borderDanger : (complete ? wc.borderSuccess : wc.borderStrong);

          return (
            <React.Fragment key={section.title}>
              {index === 0 && <Text style={s.groupHint}>EMERGENCY SYMPTOM CHECK</Text>}
              {isFirstGeneral && <Text style={[s.groupHint, { marginTop: 8 }]}>GENERAL HEALTH QUESTIONS</Text>}

              <View style={[s.accordionItem, { borderColor }, isOpen && s.accordionItemOpen]}>
                <TouchableOpacity style={s.accordionHeader} onPress={() => setOpenSectionIndex(index)} activeOpacity={0.7}>
                  <View style={s.accordionHeaderLeft}>
                    {isCritical && <Text style={{ color: wc.textDanger, fontSize: 14 }}>⚠️</Text>}
                    <Text style={[s.accordionTitle, isCritical && { color: wc.textDanger }]}>{section.title}</Text>
                  </View>
                  <View style={s.accordionHeaderRight}>
                    {complete ? (
                      <Text style={{ color: wc.textSuccess, fontSize: 15 }}>✓</Text>
                    ) : (
                      <Text style={s.accordionCount}>{answeredIn}/{section.questions.length}</Text>
                    )}
                    <Text style={[s.accordionChevron, isOpen && s.accordionChevronOpen]}>▾</Text>
                  </View>
                </TouchableOpacity>

                {isOpen && (
                  <View style={s.accordionBody}>
                    {section.questions.map(q => {
                      const val = answers[q.id];
                      const questionDisabled = isLocked || (hasEmergencyAnswer && val !== 'Yes');
                      return (
                        <View key={q.id}>
                          <Toggle label={q.label} value={val} onChange={v => answerQuestion(index, q.id, v)} critical={isCritical} disabled={questionDisabled} />
                          {val === 'Yes' && (
                            <View style={s.detailWrap}>
                              <TextInput
                                style={s.detailInput}
                                value={detailsByQ[q.id] || ''}
                                onChangeText={v => setDetailsByQ(prev => ({ ...prev, [q.id]: v }))}
                                placeholder="Add details (optional)"
                                placeholderTextColor={wc.textMuted}
                                editable={!questionDisabled}
                              />
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </React.Fragment>
          );
        })}

        {/* ── Submit ── */}
        {hasEmergencyAnswer ? (
          <View style={[ws.notice, ws.nDanger]}>
            <Text style={[ws.noticeText, ws.nDangerText]}>⚠️ This checklist can't be submitted while an emergency symptom is reported. Please dial 999.</Text>
          </View>
        ) : !isLocked && (
          <TouchableOpacity style={[ws.bp, submitting && ws.btnDisabled]} onPress={submit} disabled={submitting} activeOpacity={0.85}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={ws.bpText}>{isEdit ? 'Update & Continue' : 'Submit & Continue'}</Text>}
          </TouchableOpacity>
        )}

      </FormScrollView>

      <PatientSheet visible={showPatientSheet} options={patientOptions} selected={selectedPatientKey} onSelect={setSelectedPatientKey} onClose={() => setShowPatientSheet(false)} />

      <EmergencyModal visible={hasEmergencyAnswer && !emergencyModalDismissed} onClose={() => setEmergencyModalDismissed(true)} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, gap: 11 },

  progressPill: { height: 30, backgroundColor: wc.surface2, borderRadius: 15, borderWidth: 1, borderColor: wc.borderStrong, overflow: 'hidden', justifyContent: 'center', position: 'relative' },
  progressBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: wc.bgAccent },
  progressText: { textAlign: 'center', fontSize: 12, fontWeight: '600', color: wc.textAccent, zIndex: 1 },

  selector: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: wc.borderAccent, borderRadius: 8, backgroundColor: wc.bgAccent, paddingHorizontal: 12, paddingVertical: 9, gap: 8 },
  selectorText: { flex: 1, fontSize: 14, color: wc.textPrimary, fontWeight: '500' },
  selectorChevron: { fontSize: 19, color: wc.textMuted },

  emergencyBanner: { backgroundColor: wc.fillDanger, borderRadius: 8, padding: 14, gap: 4 },
  emergencyTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emergencyText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 18 },
  emergencyCallBtn: { backgroundColor: '#fff', borderRadius: 6, paddingVertical: 9, alignItems: 'center', marginTop: 4 },
  emergencyCallBtnText: { color: wc.textDanger, fontWeight: '700', fontSize: 14 },

  groupHint: { fontSize: 12, fontWeight: '600', color: wc.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },

  accordionItem: { backgroundColor: wc.surface2, borderRadius: 8, borderWidth: 1.5, overflow: 'hidden' },
  accordionItemOpen: { borderColor: wc.fillAccent },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11 },
  accordionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  accordionHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accordionTitle: { fontWeight: '600', fontSize: 14, color: wc.textPrimary },
  accordionCount: { fontSize: 12, fontWeight: '500', color: wc.textMuted },
  accordionChevron: { fontSize: 14, color: wc.textMuted },
  accordionChevronOpen: { color: wc.fillAccent },
  accordionBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: wc.border },

  detailWrap: { marginTop: -6, marginBottom: 4 },
  detailInput: { borderWidth: 1, borderColor: wc.borderStrong, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: wc.textPrimary, backgroundColor: wc.surface2 },
});

const t = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', lineHeight: 18 },
  hint: { fontSize: 12, color: wc.textMuted, fontStyle: 'italic' },
  btnRow: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  btnUnset: { backgroundColor: wc.surface1, borderColor: wc.borderStrong },
  btnNo: { backgroundColor: wc.fillAccent, borderColor: wc.fillAccent },
  btnYes: { backgroundColor: wc.fillDanger, borderColor: wc.fillDanger },
  btnTxt: { fontSize: 14, fontWeight: '500', color: wc.textMuted },
  btnTxtActive: { color: '#fff' },
});

const ps = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: wc.surface2, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 26 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: wc.borderStronger, alignSelf: 'center', marginTop: 12 },
  title: { fontSize: 16, fontWeight: '600', color: wc.textPrimary, textAlign: 'center', padding: 14 },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 13 },
  optionActive: { backgroundColor: wc.bgAccent },
  optLabel: { fontSize: 14, color: wc.textPrimary, fontWeight: '500' },
  optLabelActive: { color: wc.textAccent, fontWeight: '600' },
  optDob: { fontSize: 12, color: wc.textMuted, marginTop: 2 },
  cancelBtn: { marginHorizontal: 20, marginTop: 10, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: wc.borderStrong, alignItems: 'center' },
  cancelTxt: { fontSize: 14, fontWeight: '500', color: wc.textMuted },
});

const em = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  centerWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 20 },
  box: { backgroundColor: wc.surface2, borderRadius: 12, padding: 20, gap: 10, width: '100%', maxWidth: 360 },
  title: { fontSize: 17, fontWeight: '700', color: wc.textDanger },
  body: { fontSize: 14, color: wc.textPrimary, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
});
