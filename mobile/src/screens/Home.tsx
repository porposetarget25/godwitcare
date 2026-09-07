// src/screens/Home.tsx — mirrors web's screens/Home.tsx (.portal card layout, no native hero/offers patterns).
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE_URL, authFetch, getActivationPaymentSummary, type ActivationPaymentSummary } from '../api';
import { useAuth } from '../state/auth';
import { ws, wc } from '../webStyle';
import { LoadingView } from '../components/UI';
import { PageHeader } from '../components/PageHeader';
import { openPdf } from '../utils/openPdf';
import { clinicDateKey, clinicDateTime } from '../lib/appointmentTime';

const STAGE_LABELS = ['Checklist', 'Appointment Booked', 'Prescription', 'Completed'];

type ActiveConsult = {
  consultationId: number;
  stage: number;
  detail: string;
  expired: boolean;
  appointment: { startTime: string; endTime: string } | null;
};

function formatCountdown(startTimeIso: string, now: number): string {
  const diffMs = new Date(startTimeIso).getTime() - now;
  if (diffMs <= 0) return 'Starting shortly';
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `in ${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `in ${hours}h ${minutes}m ${seconds}s`;
  return `in ${minutes}m ${seconds}s`;
}

type Traveler = { id?: number; fullName: string; dateOfBirth?: string };
type RegData = { id: number; from: string; to: string; start: string; end: string; packageDays: number | null; travelers: Traveler[] };

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

// ── Tag helper (.tag .tok/.twarn/.tinfo/.tmute) ───────────────────────────────
function Tag({ label, kind }: { label: string; kind: 'ok' | 'warn' | 'info' | 'mute' }) {
  const box = kind === 'ok' ? ws.tok : kind === 'warn' ? ws.twarn : kind === 'info' ? ws.tinfo : ws.tmute;
  const text = kind === 'ok' ? ws.tokText : kind === 'warn' ? ws.twarnText : kind === 'info' ? ws.tinfoText : ws.tmuteText;
  return (
    <View style={[ws.tag, box]}>
      <Text style={[ws.tagText, text]}>{label}</Text>
    </View>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <View style={[ws.notice, ws.nWarn, { marginTop: 10 }]}>
      <Text style={{ fontSize: 15 }}>⚠️</Text>
      <Text style={[ws.noticeText, ws.nWarnText]}>{text}</Text>
    </View>
  );
}

// ── New-consultation patient picker (mirrors web's Modal + traveler-pick list) ─
type PatientOpt = { key: string; name: string; travelerId?: number };

function NewConsultModal({ visible, patients, onSelect, onClose }: {
  visible: boolean; patients: PatientOpt[]; onSelect: (p: PatientOpt) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={ws.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[ws.modalBox, { maxWidth: 340 }]} onPress={() => {}}>
          <View style={ws.modalHead}>
            <Text style={ws.modalTitle}>Who is this consultation for?</Text>
            <TouchableOpacity onPress={onClose}><Text style={ws.modalClose}>×</Text></TouchableOpacity>
          </View>
          <View style={ws.modalBody}>
            {patients.map(p => (
              <TouchableOpacity key={p.key} style={pm.row} onPress={() => onSelect(p)} activeOpacity={0.7}>
                <View style={ws.ava}><Text style={ws.avaText}>{initialsOf(p.name)}</Text></View>
                <Text style={pm.rowText}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const pm = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: wc.border },
  rowText: { fontSize: 14, fontWeight: '500', color: wc.textPrimary },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [reg, setReg] = useState<RegData | null>(null);
  const [rxUrl, setRxUrl] = useState<string | null>(null);
  const [referralUrl, setReferralUrl] = useState<string | null>(null);
  const [activation, setActivation] = useState<ActivationPaymentSummary | null>(null);
  const [activeConsult, setActiveConsult] = useState<ActiveConsult | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [showNewConsultModal, setShowNewConsultModal] = useState(false);
  const router = useRouter();

  const isDoctor = !!user?.roles?.some(r => typeof r === 'string' && r.toUpperCase().includes('DOCTOR'));

  useEffect(() => {
    if (!authLoading && isDoctor) router.replace('/(app)/doctor/dashboard' as any);
  }, [authLoading, isDoctor]);

  useEffect(() => {
    if (!authLoading && user && !isDoctor && user.activated === false) router.replace('/(app)/activate' as any);
  }, [authLoading, isDoctor, user]);

  useEffect(() => {
    if (activeConsult?.stage !== 2 || !activeConsult.appointment) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [activeConsult?.stage, activeConsult?.appointment]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/(app)/login'); return; }
    let alive = true;
    (async () => {
      try {
        if (!user.email || isDoctor) { setChecking(false); return; }

        const res = await authFetch(`${API_BASE_URL}/registrations?email=${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          const latest = Array.isArray(data) ? data[data.length - 1] : data;
          if (latest && alive) {
            setReg({
              id: latest.id,
              from: latest['Travelling From'] ?? latest.travellingFrom ?? '',
              to: latest['Travelling To (UK & Europe)'] ?? latest.travellingTo ?? '',
              start: latest['Travel Start Date'] ?? latest.travelStartDate ?? '',
              end: latest['Travel End Date'] ?? latest.travelEndDate ?? '',
              packageDays: latest['Package Days'] ?? latest.packageDays ?? null,
              travelers: Array.isArray(latest.travelers) ? latest.travelers : [],
            });
          }
        }

        const rxRes = await authFetch(`${API_BASE_URL}/prescriptions/latest`);
        if (rxRes.ok && rxRes.status !== 204) {
          const j = await rxRes.json().catch(() => null);
          if (alive) setRxUrl(j?.pdfUrl ?? null);
        }

        const refRes = await authFetch(`${API_BASE_URL}/referrals/latest`);
        if (refRes.ok && refRes.status !== 204) {
          const j = await refRes.json().catch(() => null);
          if (alive) setReferralUrl(j?.pdfUrl ?? null);
        }
      } catch { /* ignore */ }
      finally { if (alive) setChecking(false); }
    })();
    return () => { alive = false; };
  }, [user, authLoading]);

  useEffect(() => {
    if (authLoading || !user?.email || isDoctor) return;
    let alive = true;
    getActivationPaymentSummary().then(a => { if (alive) setActivation(a); }).catch(() => { if (alive) setActivation(null); });
    return () => { alive = false; };
  }, [user?.email, authLoading, isDoctor]);

  useEffect(() => {
    if (authLoading || !user?.email || isDoctor) return;
    let alive = true;
    (async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/consultations/mine/latest`, { cache: 'no-store' });
        if (!alive) return;
        if (res.status === 204 || !res.ok) { setActiveConsult(null); return; }
        const c = await res.json().catch(() => null);
        if (!c || !alive) { setActiveConsult(null); return; }

        const completedToday = c.status === 'COMPLETED' && c.createdAt && clinicDateKey(c.createdAt) === clinicDateKey(new Date());

        const apptRes = await authFetch(`${API_BASE_URL}/appointments/mine`, { cache: 'no-store' }).catch(() => null);
        const appts: any[] = apptRes && apptRes.ok ? await apptRes.json().catch(() => []) : [];
        const matchedAppointment = (Array.isArray(appts) ? appts : []).find(
          a => a.consultationId === c.id && a.status === 'SCHEDULED'
        );
        const hasAppointment = !!matchedAppointment;
        const expiredPending = !c.active && !hasAppointment && c.status !== 'COMPLETED';
        if (!c.active && !completedToday && !expiredPending) { setActiveConsult(null); return; }

        let stage = hasAppointment ? 2 : 1;
        if (hasAppointment) {
          const rxRes = await authFetch(`${API_BASE_URL}/prescriptions/latest`, { cache: 'no-store' }).catch(() => null);
          if (rxRes && rxRes.ok && rxRes.status !== 204) {
            const j = await rxRes.json().catch(() => null);
            if (j?.pdfUrl && j?.consultationId === c.id) stage = 3;
          }
        }
        if (c.status === 'COMPLETED') stage = 4;

        const detail = expiredPending ? 'Expired'
          : stage === 1 ? 'Checklist Pending'
          : stage === 2 ? 'Appointment Booked'
          : stage === 3 ? 'Prescription Ready'
          : 'Consultation Completed';

        if (!alive) return;
        setActiveConsult({
          consultationId: c.id,
          stage,
          detail,
          expired: expiredPending,
          appointment: matchedAppointment ? { startTime: matchedAppointment.startTime, endTime: matchedAppointment.endTime } : null,
        });
      } catch { if (alive) setActiveConsult(null); }
    })();
    return () => { alive = false; };
  }, [user?.email, authLoading, isDoctor]);

  const fullName = useMemo(() => [user?.firstName, user?.lastName].filter(Boolean).join(' '), [user]);
  const today = useMemo(() => new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date()), []);
  const patients: PatientOpt[] = useMemo(() => {
    const primaryName = fullName || 'Primary Member';
    return [
      { key: 'primary', name: primaryName },
      ...(reg?.travelers || []).filter(t => t.id != null).map(t => ({ key: `trav-${t.id}`, name: t.fullName, travelerId: t.id })),
    ];
  }, [fullName, reg?.travelers]);

  const todayKey = clinicDateKey(new Date());
  const isExpired = !!reg?.end && todayKey > reg.end;
  const daysLeft = reg?.end ? Math.max(0, Math.ceil((new Date(`${reg.end}T23:59:59`).getTime() - now) / 86400000)) : null;
  const packageDaysPurchased = activation?.packageDays || reg?.packageDays || 0;

  if (checking) return <LoadingView />;
  if (isDoctor) return <LoadingView />;
  if (user && user.activated === false) return <LoadingView />;

  function startNewConsultation(p: PatientOpt) {
    setShowNewConsultModal(false);
    const qs = p.travelerId ? `?travelerId=${p.travelerId}` : '';
    router.push(`/(app)/consultation/questionnaire${qs}` as any);
  }

  function goConsult() {
    if (isExpired) return;
    if (patients.length > 1) { setShowNewConsultModal(true); return; }
    startNewConsultation(patients[0]);
  }

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title={`Welcome back${user?.firstName ? `, ${user.firstName}` : ''}`} subtitle={`${today}${reg?.to ? ` · Currently travelling in ${reg.to}` : ''}`} showBack={false} />
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

        {/* Active consultation / New consultation CTA */}
        {activeConsult ? (
          <>
            <View style={s.activeHeadRow}>
              <Text style={s.activeHeadTitle}>Your Active Consultation</Text>
              <TouchableOpacity style={[ws.bp, s.newConsultBtn]} onPress={goConsult} disabled={isExpired} activeOpacity={0.8}>
                <Text style={ws.bpText}>+ New Consultation</Text>
              </TouchableOpacity>
            </View>
            {isExpired && <Notice text="Your coverage has expired. Renew your package to start a new consultation." />}
            <TouchableOpacity style={[s.heroCard, activeConsult.expired && s.heroCardExpired]} onPress={() => router.push(`/(app)/consultation/tracker?cid=${activeConsult.consultationId}` as any)} activeOpacity={0.85}>
              <View style={s.heroTop}>
                <Text style={s.heroEyebrow}>Your Consultation</Text>
                <Tag label={activeConsult.expired ? 'Expired' : STAGE_LABELS[activeConsult.stage - 1]} kind={activeConsult.expired ? 'warn' : 'info'} />
              </View>
              <Text style={s.heroDetail}>🩺 {activeConsult.detail}</Text>
              {activeConsult.expired && (
                <Text style={s.heroExpiredText}>No appointment was booked within the consultation window, so it has expired. Start a new consultation to continue.</Text>
              )}
              {activeConsult.appointment && activeConsult.stage === 2 && (
                <View style={{ marginTop: 6 }}>
                  <Text style={s.heroApptTime}>📅 {clinicDateTime(activeConsult.appointment.startTime)}</Text>
                  <Text style={s.heroCountdown}>💬 {formatCountdown(activeConsult.appointment.startTime, now)}</Text>
                </View>
              )}
              <View style={[ws.bp, { marginTop: 12 }]}>
                <Text style={ws.bpText}>{activeConsult.expired ? 'View Details' : activeConsult.stage === 1 ? 'Continue Checklist' : 'View Details'}</Text>
              </View>
            </TouchableOpacity>
          </>
        ) : (
          <View style={[ws.card, { backgroundColor: wc.bgAccent, borderColor: wc.borderAccent }]}>
            <View style={s.ctaRow}>
              <View style={{ flex: 1, minWidth: 180 }}>
                <Text style={s.ctaTitle}>Need to speak to a doctor?</Text>
                <Text style={s.ctaSub}>Start a consultation and we'll guide you through a short checklist, then book you an appointment.</Text>
              </View>
              <TouchableOpacity style={[ws.bp, s.ctaBtn]} onPress={goConsult} disabled={isExpired} activeOpacity={0.8}>
                <Text style={ws.bpText}>🩺 I Need a Consultation</Text>
              </TouchableOpacity>
            </View>
            {isExpired && <Notice text="Your coverage has expired. Renew your package to start a new consultation." />}
          </View>
        )}

        {/* Emergency */}
        <View style={[ws.card, { borderColor: wc.borderDanger }]}>
          <View style={s.emergencyRow}>
            <Text style={{ fontSize: 21, color: wc.textDanger }}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.emergencyTitle}>Medical emergency?</Text>
              <Text style={s.emergencySub}>For life-threatening symptoms, please contact emergency services directly — GodwitCare's team is not equipped to respond to emergencies.</Text>
            </View>
          </View>
          <TouchableOpacity style={[ws.bd, { marginTop: 10, alignSelf: 'flex-start' }]} onPress={() => router.push('tel:999' as any)} activeOpacity={0.8}>
            <Text style={ws.bdText}>📞 Call 999 (NHS Emergency)</Text>
          </TouchableOpacity>
        </View>

        {/* Coverage Status */}
        {reg && (
          <View style={ws.card}>
            <View style={s.cardHeadRow}>
              <Text style={ws.ct}>Coverage Status</Text>
              <Tag label={isExpired ? 'Expired' : activation?.activated ? 'Activated' : 'Not Activated'} kind={isExpired ? 'warn' : activation?.activated ? 'ok' : 'mute'} />
            </View>
            <Text style={s.covDestination}>📍 {reg.to || '—'}</Text>
            <Text style={s.covDates}>📅 {reg.start || '—'} – {reg.end || '—'}</Text>
            <View style={ws.g2Row}>
              <View style={ws.g2Col}>
                <Text style={ws.fiHint}>Days Purchased</Text>
                <Text style={s.covValue}>{packageDaysPurchased ? `${packageDaysPurchased} days` : '—'}</Text>
              </View>
              <View style={ws.g2Col}>
                <Text style={ws.fiHint}>Days Left</Text>
                <Text style={[s.covValue, isExpired && { color: wc.textDanger }]}>
                  {daysLeft === null ? '—' : isExpired ? 'Expired' : `${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
                </Text>
              </View>
            </View>
            {isExpired && <Notice text="Your coverage has expired. Renew your package to book new consultations." />}
            {reg.travelers.length > 0 && (
              <>
                <Text style={[ws.fiHint, { marginTop: 12, marginBottom: 8 }]}>Members Covered</Text>
                <View style={{ gap: 8 }}>
                  {reg.travelers.map((t, i) => (
                    <View key={t.id ?? i} style={s.memberRow}>
                      <View style={ws.ava}><Text style={ws.avaText}>{initialsOf(t.fullName)}</Text></View>
                      <Text style={s.memberName}>{t.fullName}</Text>
                      {i === 0 && <Tag label="Primary" kind="info" />}
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* Quick document links */}
        <View style={ws.card}>
          <Text style={ws.ct}>Documents</Text>
          <View style={s.linkRow}>
            <TouchableOpacity style={s.linkItem} onPress={() => router.push('/(app)/documents' as any)} activeOpacity={0.7}>
              <Text style={s.linkText}>🗂️ My Documents</Text><Text style={s.linkChevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.linkItem} onPress={() => rxUrl && openPdf(rxUrl, 'Prescription')} disabled={!rxUrl} activeOpacity={0.7}>
              <Text style={[s.linkText, !rxUrl && s.linkTextDisabled]}>💊 Latest Prescription</Text><Text style={s.linkChevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.linkItem} onPress={() => referralUrl && openPdf(referralUrl, 'Referral Letter')} disabled={!referralUrl} activeOpacity={0.7}>
              <Text style={[s.linkText, !referralUrl && s.linkTextDisabled]}>📨 Referral Letter</Text><Text style={s.linkChevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.linkItem, { borderBottomWidth: 0 }]} onPress={() => router.push('/(app)/payment-history' as any)} activeOpacity={0.7}>
              <Text style={s.linkText}>🧾 Payment History</Text><Text style={s.linkChevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Travel support */}
        <View style={ws.card}>
          <View style={s.cardHeadRow}>
            <Text style={ws.ct}>Travel Support</Text>
            <Tag label="Online Now" kind="ok" />
          </View>
          <Text style={s.supportLine}>🕐 9:00 AM – 5:00 PM local time</Text>
          <Text style={s.supportLine}>💬 Video and audio consultations are conducted over WhatsApp</Text>
          <Text style={[s.supportLine, { marginBottom: 0 }]}>🧭 To book an appointment, use the "New Consultation" button</Text>
        </View>

      </ScrollView>

      <NewConsultModal
        visible={showNewConsultModal}
        patients={patients}
        onSelect={startNewConsultation}
        onClose={() => setShowNewConsultModal(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  body: { padding: 20, paddingBottom: 40 },

  activeHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  activeHeadTitle: { fontSize: 14, fontWeight: '500', color: wc.textPrimary },
  newConsultBtn: { paddingVertical: 8, paddingHorizontal: 14 },

  heroCard: { backgroundColor: wc.surface2, borderWidth: 1.5, borderColor: wc.fillAccent, borderRadius: 10, padding: 16, marginBottom: 11 },
  heroCardExpired: { borderColor: wc.borderDanger },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  heroEyebrow: { fontSize: 12, fontWeight: '600', color: wc.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroDetail: { fontSize: 16, fontWeight: '600', color: wc.textPrimary },
  heroExpiredText: { fontSize: 14, color: wc.textWarning, lineHeight: 18, marginTop: 4 },
  heroApptTime: { fontSize: 14, color: wc.textSecondary },
  heroCountdown: { fontSize: 16, fontWeight: '700', color: wc.fillAccent, marginTop: 2 },

  ctaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  ctaTitle: { fontSize: 16, fontWeight: '600', color: wc.textPrimary, marginBottom: 4 },
  ctaSub: { fontSize: 14, color: wc.textSecondary, lineHeight: 18 },
  ctaBtn: { paddingVertical: 11, paddingHorizontal: 18 },

  emergencyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  emergencyTitle: { fontSize: 14, fontWeight: '600', color: wc.textPrimary },
  emergencySub: { fontSize: 13, color: wc.textMuted, marginTop: 2, lineHeight: 16 },

  cardHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  covDestination: { fontSize: 15, fontWeight: '600', color: wc.textPrimary, marginBottom: 6 },
  covDates: { fontSize: 14, color: wc.textSecondary, marginBottom: 10 },
  covValue: { fontSize: 15, fontWeight: '600', color: wc.textPrimary, marginTop: 2 },

  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { fontSize: 14, color: wc.textPrimary, flex: 1 },

  linkRow: { marginTop: 2 },
  linkItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: wc.border },
  linkText: { fontSize: 14, color: wc.textPrimary },
  linkTextDisabled: { color: wc.textMuted },
  linkChevron: { fontSize: 17, color: wc.textMuted },

  supportLine: { fontSize: 14, color: wc.textSecondary, marginBottom: 8 },
});
