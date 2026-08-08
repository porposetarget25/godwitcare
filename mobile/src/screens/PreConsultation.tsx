// src/screens/PreConsultation.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, TextInput,
  TouchableOpacity, Modal, FlatList, ActivityIndicator, Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL, authFetch } from '../api';
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
            <TouchableOpacity style={em.closeBtn} onPress={onClose} activeOpacity={0.75}>
              <Text style={em.closeBtnText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={em.callBtn} onPress={() => Linking.openURL('tel:999')} activeOpacity={0.85}>
              <Text style={em.callBtnText}>📞 Call 999 Now</Text>
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
  const labelColor = critical ? colors.error : colors.success;
  return (
    <View style={[t.wrap, disabled && { opacity: 0.5 }]}>
      <Text style={[t.label, { color: labelColor }]}>{label}</Text>
      {value === undefined && <Text style={t.hint}>← please choose</Text>}
      <View style={t.btnRow}>
        <TouchableOpacity
          style={[t.btn, value === 'No' ? t.btnNo : t.btnUnset]}
          onPress={() => onChange('No')}
          activeOpacity={0.75}
          disabled={disabled}
        >
          <Text style={[t.btnTxt, value === 'No' && t.btnTxtActive]}>No</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[t.btn, value === 'Yes' ? t.btnYes : t.btnUnset]}
          onPress={() => onChange('Yes')}
          activeOpacity={0.75}
          disabled={disabled}
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
  const params = useLocalSearchParams<{ cid?: string; travelerId?: string; patientId?: string; locked?: string }>();
  const cid        = params.cid;
  const isEdit     = !!cid;
  const isLocked   = params.locked === '1';
  const initTravId = params.travelerId;
  const initPatId  = params.patientId;

  const [contactName,    setContactName   ] = useState('');
  const [contactPhone,   setContactPhone  ] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [dob,            setDob           ] = useState('');
  const [submitting,     setSubmitting    ] = useState(false);

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

  // Sections are walked through one at a time; only this index is expanded.
  const [openSectionIndex, setOpenSectionIndex] = useState(0);

  // ── Prefill (new mode) ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isEdit) return;
    let ignore = false;
    (async () => {
      // 1. Latest registration → build patient options
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

      // 2. Latest consultation → prefill address
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

      // 3. Fallback /auth/me
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

  // ── Prefill (edit mode) ─────────────────────────────────────────────────────
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
          // A previously-submitted checklist means every section is already reviewed —
          // land on the last section rather than forcing a walk-through.
          setOpenSectionIndex(FORM.length - 1);
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

  /** Lock the whole checklist and show the 999 warning if ANY "Yes" is answered inside a critical section. */
  const hasEmergencyAnswer = useMemo(() =>
    FORM.filter(s => CRITICAL.has(s.title))
        .some(s => s.questions.some(q => answers[q.id] === 'Yes'))
  , [answers]);

  const [emergencyModalDismissed, setEmergencyModalDismissed] = useState(false);
  useEffect(() => {
    if (!hasEmergencyAnswer) setEmergencyModalDismissed(false);
  }, [hasEmergencyAnswer]);

  /** Answer a question and, if that completes the section with a "No", auto-advance to the next one.
   *  A "Yes" reveals a details textbox the patient may want to fill in, so it never auto-folds. */
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

  // ── Submit ──────────────────────────────────────────────────────────────────
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

      const payload = {
        currentLocation: null,
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

  const selectedPatient  = patientOptions.find(o => o.key === selectedPatientKey);
  const answeredCount    = Object.values(answers).filter(v => v !== undefined).length;
  const totalCount       = Object.keys(answers).length;
  const initials         = contactName.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGray }}>
      <PageHeader
        title={isEdit ? 'Edit Consultation' : 'Pre-Consultation Checklist'}
        subtitle="Health questionnaire"
      />
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {isLocked && (
          <View style={s.lockNotice}>
            <Text style={s.lockNoticeText}>🔒 This checklist is locked while your appointment is booked. Cancel the appointment to make changes.</Text>
          </View>
        )}

        {/* ── Progress pill ── */}
        <View style={s.progressPill}>
          <View style={[s.progressBar, { width: `${totalCount ? (answeredCount / totalCount) * 100 : 0}%` as any }]} />
          <Text style={s.progressText}>{answeredCount} of {totalCount} answered</Text>
        </View>

        {/* ── Patient Contact & Address ── */}
        <View style={s.card}>
          <Text style={s.cardHeader}>👤  Patient Contact & Address</Text>

          {patientOptions.length > 0 ? (
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Consultation for</Text>
              <TouchableOpacity
                style={s.selector}
                onPress={() => setShowPatientSheet(true)}
                activeOpacity={0.75}
                disabled={isLocked || hasEmergencyAnswer}
              >
                <View style={s.avatarBadge}><Text style={s.avatarBadgeText}>{initials}</Text></View>
                <Text style={s.selectorText}>{selectedPatient?.label || 'Select patient'}</Text>
                <Text style={s.selectorChevron}>›</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Full Name</Text>
              <TextInput
                style={s.input}
                value={contactName}
                onChangeText={setContactName}
                placeholder="Full name"
                placeholderTextColor={colors.mutedLight}
                autoCapitalize="words"
                editable={!isLocked && !hasEmergencyAnswer}
              />
            </View>
          )}

          <View style={s.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Phone / WhatsApp</Text>
              <TextInput style={[s.input, s.inputDisabled]} value={contactPhone} editable={false} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Date of Birth</Text>
              <TextInput style={[s.input, s.inputDisabled]} value={dob} editable={false} />
            </View>
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
          const isCritical  = CRITICAL.has(section.title);
          const answeredIn  = section.questions.filter(q => answers[q.id] !== undefined).length;
          const complete    = answeredIn === section.questions.length;
          const isOpen      = openSectionIndex === index;
          const isFirstGeneral = !isCritical && FORM[index - 1] && CRITICAL.has(FORM[index - 1].title);
          const borderColor = isCritical ? colors.errorBorder : (complete ? colors.successBorder : colors.line);

          return (
            <React.Fragment key={section.title}>
              {index === 0 && <Text style={s.groupHint}>EMERGENCY SYMPTOM CHECK</Text>}
              {isFirstGeneral && <Text style={[s.groupHint, { marginTop: spacing.sm }]}>GENERAL HEALTH QUESTIONS</Text>}

              <View style={[s.accordionItem, { borderColor }, isOpen && s.accordionItemOpen]}>
                <TouchableOpacity
                  style={s.accordionHeader}
                  onPress={() => setOpenSectionIndex(index)}
                  activeOpacity={0.7}
                >
                  <View style={s.accordionHeaderLeft}>
                    {isCritical && <Text style={{ color: colors.error, fontSize: 14 }}>⚠️</Text>}
                    <Text style={[s.accordionTitle, isCritical && { color: colors.error }]}>{section.title}</Text>
                  </View>
                  <View style={s.accordionHeaderRight}>
                    {complete ? (
                      <Text style={{ color: colors.success, fontSize: 15 }}>✓</Text>
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
                      // Keep the question that actually triggered the emergency lock editable
                      // so the patient can correct a misclick — everything else stays blocked.
                      const questionDisabled = isLocked || (hasEmergencyAnswer && val !== 'Yes');
                      return (
                        <View key={q.id}>
                          <Toggle
                            label={q.label}
                            value={val}
                            onChange={v => answerQuestion(index, q.id, v)}
                            critical={isCritical}
                            disabled={questionDisabled}
                          />
                          {val === 'Yes' && (
                            <View style={s.detailWrap}>
                              <TextInput
                                style={s.detailInput}
                                value={detailsByQ[q.id] || ''}
                                onChangeText={v => setDetailsByQ(prev => ({ ...prev, [q.id]: v }))}
                                placeholder="Add details (optional)"
                                placeholderTextColor={colors.mutedLight}
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
          <View style={s.blockedNotice}>
            <Text style={s.blockedNoticeText}>⚠️ This checklist can't be submitted while an emergency symptom is reported. Please dial 999.</Text>
          </View>
        ) : !isLocked && (
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
        )}

      </ScrollView>

      <PatientSheet
        visible={showPatientSheet}
        options={patientOptions}
        selected={selectedPatientKey}
        onSelect={setSelectedPatientKey}
        onClose={() => setShowPatientSheet(false)}
      />

      <EmergencyModal
        visible={hasEmergencyAnswer && !emergencyModalDismissed}
        onClose={() => setEmergencyModalDismissed(true)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: 60, gap: spacing.md },

  lockNotice:     { backgroundColor: colors.accentBg, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: radius.lg, padding: spacing.md },
  lockNoticeText: { color: colors.accentText, fontSize: typography.sm, lineHeight: 18 },

  progressPill: { height: 32, backgroundColor: colors.white, borderRadius: radius.full, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', justifyContent: 'center', position: 'relative' },
  progressBar:  { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.brandLight, borderRadius: radius.full },
  progressText: { textAlign: 'center', fontSize: typography.xs, fontWeight: '700', color: colors.brand, zIndex: 1 },

  card:       { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.md, ...shadow.sm },
  cardHeader: { fontSize: typography.base, fontWeight: '700', color: colors.text },

  fieldWrap:   { gap: 4 },
  fieldLabel:  { fontSize: typography.xs, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldRow:    { flexDirection: 'row', gap: spacing.md },
  input:       { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: typography.base, color: colors.text, backgroundColor: colors.bgGray, minHeight: 46 },
  inputDisabled: { color: colors.muted, backgroundColor: colors.surface },
  textarea:    { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: typography.base, color: colors.text, backgroundColor: colors.bgGray, minHeight: 80 },

  selector:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.brand + '60', borderRadius: radius.md, backgroundColor: colors.brandLight, paddingHorizontal: spacing.md, paddingVertical: 10, gap: spacing.sm },
  avatarBadge:     { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  selectorText:    { flex: 1, fontSize: typography.base, color: colors.text, fontWeight: '600' },
  selectorChevron: { fontSize: 20, color: colors.muted },

  emergencyBanner:    { backgroundColor: colors.error, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.xs, ...shadow.md },
  emergencyTitle:     { color: '#fff', fontWeight: '800', fontSize: typography.md },
  emergencyText:      { color: 'rgba(255,255,255,0.9)', fontSize: typography.sm, lineHeight: 20 },
  emergencyCallBtn:   { backgroundColor: '#fff', borderRadius: radius.full, paddingVertical: 10, alignItems: 'center', marginTop: spacing.xs },
  emergencyCallBtnText: { color: colors.error, fontWeight: '800', fontSize: typography.sm },

  groupHint: { fontSize: typography.xs, fontWeight: '700', color: colors.muted, letterSpacing: 0.6, textTransform: 'uppercase' },

  accordionItem:     { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1.5, overflow: 'hidden', ...shadow.sm },
  accordionItemOpen: { borderColor: colors.brand },
  accordionHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  accordionHeaderLeft:  { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  accordionHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  accordionTitle:  { fontWeight: '700', fontSize: typography.base, color: colors.text },
  accordionCount:  { fontSize: typography.xs, fontWeight: '600', color: colors.muted },
  accordionChevron:     { fontSize: 14, color: colors.muted },
  accordionChevronOpen: { color: colors.brand },
  accordionBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.line },

  detailWrap:  { marginTop: -spacing.sm, marginBottom: spacing.xs },
  detailInput: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8, fontSize: typography.sm, color: colors.text, backgroundColor: colors.bgGray },

  blockedNotice:     { backgroundColor: colors.errorBg, borderWidth: 1, borderColor: colors.errorBorder, borderRadius: radius.lg, padding: spacing.md },
  blockedNoticeText: { color: colors.error, fontSize: typography.sm, fontWeight: '600', lineHeight: 18 },

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

const em = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  centerWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  box:        { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md, width: '100%', maxWidth: 360, ...shadow.md },
  title:      { fontSize: typography.lg, fontWeight: '800', color: colors.error },
  body:       { fontSize: typography.sm, color: colors.text, lineHeight: 20 },
  actions:    { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  closeBtn:   { flex: 1, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.full, paddingVertical: 12, alignItems: 'center' },
  closeBtnText: { fontSize: typography.sm, fontWeight: '600', color: colors.muted },
  callBtn:    { flex: 1, backgroundColor: colors.error, borderRadius: radius.full, paddingVertical: 12, alignItems: 'center' },
  callBtnText:{ fontSize: typography.sm, fontWeight: '700', color: '#fff' },
});
