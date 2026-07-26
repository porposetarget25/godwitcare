// src/screens/ConsultationTracker.tsx — widget-style flow
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, TextInput, Modal,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL, getMe } from '../api';
import { colors, spacing, radius, typography, shadow } from '../theme';
import { PageHeader } from '../components/PageHeader';
import { openPdf } from '../utils/openPdf';

const WA_NUMBER = '447783579014';

// ── Step status types ─────────────────────────────────────────────────────────
type StepStatus = 'done' | 'active' | 'upcoming';

const STEPS = [
  { id: 1, icon: '📋', label: 'Pre-Consultation',     sub: 'Complete health checklist' },
  { id: 2, icon: '📲', label: 'Notify Clinician',     sub: 'Alert via WhatsApp'        },
  { id: 3, icon: '📞', label: 'Clinician Call',       sub: 'Receive WhatsApp call'     },
  { id: 4, icon: '💊', label: 'Prescription',         sub: 'Digital prescription'      },
  { id: 5, icon: '🗺️', label: 'Locate Pharmacy',     sub: 'Find nearby pharmacy'      },
];

// ── Contact-preference modal ──────────────────────────────────────────────────
function ContactModal({ visible, onClose, onConfirm }: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (choice: 'SAME' | 'DIFFERENT', alt: string) => void;
}) {
  const [choice, setChoice] = useState<'SAME' | 'DIFFERENT'>('SAME');
  const [alt,    setAlt   ] = useState('');
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={cm.overlay} activeOpacity={1} onPress={onClose} />
      <View style={cm.sheet}>
        <View style={cm.handle} />
        <Text style={cm.title}>Contact Preference</Text>
        <Text style={cm.sub}>How should the clinician reach you?</Text>

        {(['SAME', 'DIFFERENT'] as const).map(opt => (
          <TouchableOpacity
            key={opt}
            style={[cm.option, choice === opt && cm.optionActive]}
            onPress={() => setChoice(opt)}
            activeOpacity={0.75}
          >
            <View style={[cm.radio, choice === opt && cm.radioActive]}>
              {choice === opt && <View style={cm.radioDot} />}
            </View>
            <Text style={[cm.optLabel, choice === opt && cm.optLabelActive]}>
              {opt === 'SAME' ? 'Same WhatsApp number' : 'Different number'}
            </Text>
          </TouchableOpacity>
        ))}

        {choice === 'DIFFERENT' && (
          <View style={cm.altWrap}>
            <TextInput
              style={cm.altInput}
              value={alt}
              onChangeText={setAlt}
              placeholder="+44 7xxx xxxxxx"
              placeholderTextColor={colors.mutedLight}
              keyboardType="phone-pad"
            />
          </View>
        )}

        <View style={cm.btnRow}>
          <TouchableOpacity style={cm.cancelBtn} onPress={onClose} activeOpacity={0.75}>
            <Text style={cm.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[cm.confirmBtn, choice === 'DIFFERENT' && !alt.trim() && cm.confirmDisabled]}
            onPress={() => {
              if (choice === 'DIFFERENT' && !alt.trim()) return;
              onConfirm(choice, alt);
            }}
            activeOpacity={0.8}
          >
            <Text style={cm.confirmTxt}>Open WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ConsultationTracker() {
  const router   = useRouter();
  const params   = useLocalSearchParams<{ travelerId?: string; logged?: string }>();
  const travelerId = params.travelerId || null;

  const [latestCid,    setLatestCid   ] = useState<number | null>(null);
  const [latestStatus, setLatestStatus] = useState<string | null>(null);
  const [patientName,  setPatientName ] = useState('N/A');
  const [dob,          setDob         ] = useState('N/A');
  const [mobile,       setMobile      ] = useState('N/A');
  const [address,      setAddress     ] = useState('N/A');
  const [rxUrl,        setRxUrl       ] = useState<string | null>(null);
  const [showContact,  setShowContact ] = useState(false);
  const [findingPharm, setFindingPharm] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await getMe().catch(() => null);
        if (!alive) return;
        if (me) {
          const n = [me.firstName, me.lastName].filter(Boolean).join(' ');
          if (n) setPatientName(n);
        }
        const travQs = travelerId ? `?travelerId=${travelerId}` : '';
        const res = await fetch(`${API_BASE_URL}/consultations/mine/latest${travQs}`, { credentials: 'include', cache: 'no-store' });
        if (!alive || res.status === 204 || !res.ok) return;
        const j = await res.json();
        setLatestCid(typeof j?.id === 'number' ? j.id : null);
        setLatestStatus(typeof j?.status === 'string' ? j.status : null);
        if (j?.patientName)              setPatientName(j.patientName);
        if (j?.contactPhone || j?.mobile) setMobile(j.contactPhone || j.mobile);
        if (j?.contactAddress || j?.address) setAddress(j.contactAddress || j.address);
        if (j?.dob)                       setDob(j.dob);
      } catch {}
    })();
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/prescriptions/latest${travelerId ? `?travelerId=${travelerId}` : ''}`, { credentials: 'include', cache: 'no-store' });
        if (res.status === 204 || !res.ok) return;
        const j = await res.json().catch(() => null);
        if (j?.pdfUrl) setRxUrl(j.pdfUrl);
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  const isStep1Done        = !!latestCid;
  const hasRxOrCompleted   = !!rxUrl || latestStatus === 'COMPLETED';

  function getStatus(id: number): StepStatus {
    if (id === 1) return isStep1Done ? 'done' : 'active';
    if (id === 2) return isStep1Done ? 'active' : 'upcoming';
    if (id === 3) return 'upcoming';
    if (id === 4) return hasRxOrCompleted ? 'active' : 'upcoming';
    if (id === 5) return hasRxOrCompleted ? 'active' : 'upcoming';
    return 'upcoming';
  }

  // Build WhatsApp URL
  function buildWaHref(choice: 'SAME' | 'DIFFERENT', alt: string) {
    const contactLine = choice === 'SAME'
      ? 'Please contact me on the same number from which I am messaging.'
      : `Please contact me on the number ${alt}.`;
    const msg = `Hi, This is the patient ${patientName}, I have logged a consultation call with GodwitCare, ` +
      `my details are Address: ${address}, DOB: ${dob}, Mobile: ${mobile}. ` +
      `Consultation ID: ${latestCid ?? 'N/A'}. Please look into my case. ${contactLine}`;
    return `https://api.whatsapp.com/send?phone=${WA_NUMBER}&text=${encodeURIComponent(msg)}`;
  }

  async function openPharmacy() {
    setFindingPharm(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        Linking.openURL(`https://www.google.com/maps/search/pharmacy/@${loc.coords.latitude},${loc.coords.longitude},14z`);
      } else {
        Linking.openURL('https://www.google.com/maps/search/pharmacy');
      }
    } catch {
      Linking.openURL('https://www.google.com/maps/search/pharmacy');
    } finally {
      setFindingPharm(false);
    }
  }

  function stepAction(id: number) {
    if (id === 1) {
      if (isStep1Done) {
        router.push(`/(app)/consultation/questionnaire?cid=${latestCid}${travelerId ? `&travelerId=${travelerId}` : ''}` as any);
      } else {
        router.push(`/(app)/consultation/questionnaire${travelerId ? `?travelerId=${travelerId}` : ''}` as any);
      }
    }
    if (id === 2) setShowContact(true);
    if (id === 4 && rxUrl) openPdf(rxUrl, 'Prescription');
    if (id === 5) openPharmacy();
  }

  function stepActionLabel(id: number): string | null {
    if (id === 1) return isStep1Done ? 'Edit Details' : 'Start Checklist';
    if (id === 2) return 'Notify via WhatsApp';
    if (id === 3) return null; // no action — passive
    if (id === 4) return rxUrl ? 'View Prescription' : null;
    if (id === 5) return hasRxOrCompleted ? (findingPharm ? 'Finding…' : 'Find Nearby Pharmacy') : null;
    return null;
  }

  const activeStep = STEPS.find(s => getStatus(s.id) === 'active')?.id ?? 1;
  const progressPct = ((activeStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Consultation Tracker" subtitle="Track your journey" />
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

        {/* ── Progress header card ── */}
        <View style={s.progressCard}>
          <View style={s.progressHeader}>
            <View>
              <Text style={s.progressTitle}>Step {activeStep} of {STEPS.length}</Text>
              <Text style={s.progressSub}>{STEPS[activeStep - 1]?.label}</Text>
            </View>
            <View style={s.progressBadge}>
              <Text style={s.progressBadgeText}>{Math.round(progressPct)}%</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={s.progressBarBg}>
            <View style={[s.progressBarFill, { width: `${progressPct}%` as any }]} />
          </View>

          {/* Step dots */}
          <View style={s.dotRow}>
            {STEPS.map((step, i) => {
              const st = getStatus(step.id);
              return (
                <React.Fragment key={step.id}>
                  <View style={[s.dot, st === 'done' && s.dotDone, st === 'active' && s.dotActive]}>
                    {st === 'done'
                      ? <Text style={s.dotCheck}>✓</Text>
                      : <Text style={[s.dotNum, st === 'active' && s.dotNumActive]}>{step.id}</Text>
                    }
                  </View>
                  {i < STEPS.length - 1 && (
                    <View style={[s.dotConnector, getStatus(step.id) === 'done' && s.dotConnectorDone]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* ── Step widgets ── */}
        {STEPS.map(step => {
          const st     = getStatus(step.id);
          const action = stepActionLabel(step.id);
          const isDone = st === 'done';
          const isAct  = st === 'active';

          return (
            <View key={step.id} style={[s.stepCard, isAct && s.stepCardActive, isDone && s.stepCardDone]}>
              <View style={s.stepRow}>
                {/* Icon circle */}
                <View style={[s.stepIconCircle, isAct && s.stepIconCircleActive, isDone && s.stepIconCircleDone]}>
                  {isDone
                    ? <Text style={s.stepCheckIcon}>✓</Text>
                    : <Text style={s.stepEmoji}>{step.icon}</Text>
                  }
                </View>

                {/* Text */}
                <View style={{ flex: 1 }}>
                  <View style={s.stepLabelRow}>
                    <Text style={[s.stepLabel, isDone && s.stepLabelDone]}>{step.label}</Text>
                    <View style={[s.statusPill, isDone && s.pillDone, isAct && s.pillActive]}>
                      <Text style={[s.statusPillText, isDone && s.pillDoneText, isAct && s.pillActiveText]}>
                        {isDone ? 'Done' : isAct ? 'In Progress' : 'Upcoming'}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.stepSub}>{step.sub}</Text>
                </View>
              </View>

              {/* Action button — only for active steps with an action */}
              {isAct && action && (
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => stepAction(step.id)}
                  activeOpacity={0.8}
                >
                  <Text style={s.actionBtnText}>{action}</Text>
                </TouchableOpacity>
              )}

              {/* Done state: secondary re-action (e.g. Edit for step 1) */}
              {isDone && step.id === 1 && (
                <TouchableOpacity
                  style={s.secondaryBtn}
                  onPress={() => router.push(`/(app)/consultation/questionnaire?cid=${latestCid}${travelerId ? `&travelerId=${travelerId}` : ''}` as any)}
                  activeOpacity={0.75}
                >
                  <Text style={s.secondaryBtnText}>Edit Details</Text>
                </TouchableOpacity>
              )}
              {isDone && step.id === 4 && rxUrl && (
                <TouchableOpacity
                  style={s.secondaryBtn}
                  onPress={() => openPdf(rxUrl, 'Prescription')}
                  activeOpacity={0.75}
                >
                  <Text style={s.secondaryBtnText}>View Prescription</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      <ContactModal
        visible={showContact}
        onClose={() => setShowContact(false)}
        onConfirm={(choice, alt) => {
          setShowContact(false);
          Linking.openURL(buildWaHref(choice, alt));
        }}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: 60, backgroundColor: colors.bgGray, gap: spacing.md },

  // Progress card
  progressCard: {
    backgroundColor: colors.brand, borderRadius: radius.xl, padding: spacing.xl,
    gap: spacing.md, overflow: 'hidden', ...shadow.md,
  },
  progressHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  progressTitle:      { fontSize: typography.sm, fontWeight: '600', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.8 },
  progressSub:        { fontSize: typography.lg, fontWeight: '800', color: '#fff', marginTop: 2 },
  progressBadge:      { backgroundColor: colors.amber, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 4 },
  progressBadgeText:  { fontSize: typography.sm, fontWeight: '800', color: colors.brandDark },
  progressBarBg:      { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill:    { height: 6, backgroundColor: colors.amber, borderRadius: 3 },

  // Dot row
  dotRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dot:              { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  dotActive:        { backgroundColor: colors.amber, borderColor: colors.amber },
  dotDone:          { backgroundColor: '#fff', borderColor: '#fff' },
  dotNum:           { fontSize: typography.xs, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  dotNumActive:     { color: colors.brandDark },
  dotCheck:         { fontSize: 13, fontWeight: '800', color: colors.brand },
  dotConnector:     { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 2 },
  dotConnectorDone: { backgroundColor: 'rgba(255,255,255,0.7)' },

  // Step cards
  stepCard: {
    backgroundColor: colors.white, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.line,
    padding: spacing.lg, gap: spacing.md, ...shadow.sm,
  },
  stepCardActive: { borderColor: colors.brand + '60', backgroundColor: colors.brandLight },
  stepCardDone:   { backgroundColor: colors.bgGray, borderColor: colors.line },

  stepRow:            { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepIconCircle:     { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  stepIconCircleActive:{ backgroundColor: colors.brandLight, borderWidth: 2, borderColor: colors.brand + '40' },
  stepIconCircleDone: { backgroundColor: colors.brand },
  stepEmoji:          { fontSize: 22 },
  stepCheckIcon:      { fontSize: 20, color: '#fff', fontWeight: '800' },

  stepLabelRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  stepLabel:          { fontSize: typography.base, fontWeight: '700', color: colors.text },
  stepLabelDone:      { color: colors.muted },
  stepSub:            { fontSize: typography.xs, color: colors.muted, marginTop: 2 },

  // Status pills
  statusPill:         { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full, backgroundColor: colors.line },
  pillActive:         { backgroundColor: colors.brand + '20' },
  pillDone:           { backgroundColor: colors.successBg },
  statusPillText:     { fontSize: typography.xxs, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  pillActiveText:     { color: colors.brand },
  pillDoneText:       { color: colors.success },

  // Action buttons
  actionBtn:          { backgroundColor: colors.brand, borderRadius: radius.full, paddingVertical: 12, alignItems: 'center', ...shadow.brand },
  actionBtnText:      { color: '#fff', fontWeight: '700', fontSize: typography.base },
  secondaryBtn:       { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.full, paddingVertical: 10, alignItems: 'center' },
  secondaryBtnText:   { color: colors.muted, fontWeight: '600', fontSize: typography.sm },
});

// Contact modal styles
const cm = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 32 },
  handle:      { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, alignSelf: 'center', marginTop: 12 },
  title:       { fontSize: typography.lg, fontWeight: '700', color: colors.text, textAlign: 'center', paddingTop: spacing.lg, paddingHorizontal: spacing.xl },
  sub:         { fontSize: typography.sm, color: colors.muted, textAlign: 'center', paddingHorizontal: spacing.xl, marginTop: 4, marginBottom: spacing.lg },
  option:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: 14, gap: spacing.md },
  optionActive:{ backgroundColor: colors.brandLight },
  radio:       { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.lineMid, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.brand },
  radioDot:    { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.brand },
  optLabel:    { fontSize: typography.base, color: colors.text, fontWeight: '500' },
  optLabelActive: { color: colors.brand, fontWeight: '700' },
  altWrap:     { paddingHorizontal: spacing.xl, marginBottom: spacing.sm },
  altInput:    { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: typography.base, color: colors.text, backgroundColor: colors.bgGray },
  btnRow:      { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  cancelBtn:   { flex: 1, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.full, paddingVertical: 14, alignItems: 'center' },
  cancelTxt:   { fontSize: typography.base, fontWeight: '600', color: colors.muted },
  confirmBtn:  { flex: 2, backgroundColor: colors.brand, borderRadius: radius.full, paddingVertical: 14, alignItems: 'center' },
  confirmDisabled: { backgroundColor: colors.lineMid },
  confirmTxt:  { fontSize: typography.base, fontWeight: '700', color: '#fff' },
});
