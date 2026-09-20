// src/screens/Home.tsx — mirrors web's screens/Home.tsx (.portal card layout, no native hero/offers patterns).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL, authFetch } from '../api';
import { useAuth } from '../state/auth';
import { ws, wc } from '../webStyle';
import { LoadingView } from '../components/UI';
import { PageHeader } from '../components/PageHeader';
import { openPdf } from '../utils/openPdf';
import { clinicDateKey, clinicDateTime } from '../lib/appointmentTime';
import { useCoverageStatus } from '../hooks/useCoverageStatus';

const STAGE_LABELS = ['Checklist', 'Appointment Booked', 'Prescription', 'Completed'];

type ActiveConsult = {
  consultationId: number;
  stage: number;
  detail: string;
  expired: boolean;
  cancelled: boolean;
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

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function fmtDate(v?: string): string {
  if (!v) return '—';
  const d = new Date(v.length <= 10 ? `${v}T00:00:00` : v);
  if (isNaN(d.getTime())) return v;
  return fmtDateObj(d);
}
function fmtDateObj(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mmm = d.toLocaleDateString('en-GB', { month: 'short' });
  return `${dd}-${mmm}-${d.getFullYear()}`;
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

function Notice({ text, kind = 'warn' }: { text: string; kind?: 'warn' | 'danger' }) {
  const box = kind === 'danger' ? ws.nDanger : ws.nWarn;
  const txt = kind === 'danger' ? ws.nDangerText : ws.nWarnText;
  return (
    <View style={[ws.notice, box, { marginTop: 10 }]}>
      <Text style={{ fontSize: 15 }}>⚠️</Text>
      <Text style={[ws.noticeText, txt]}>{text}</Text>
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
  const [rxUrl, setRxUrl] = useState<string | null>(null);
  const [referralUrl, setReferralUrl] = useState<string | null>(null);
  const [activeConsult, setActiveConsult] = useState<ActiveConsult | null>(null);
  const {
    reg, activation,
    isExpired, packageDaysPurchased,
    coverageStart, coverageEnd, coverageDaysLeft, coverageDaysElapsed, coverageProgress,
    coverageState, bookingBlocked,
  } = useCoverageStatus();
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
  }, [user, authLoading]);

  // Prescription / referral — refetched on every focus, not just on mount. Home is a plain
  // Stack screen (see PortalShell), so returning here from e.g. the consultation tracker after
  // a prescription is issued does NOT remount it — a mount-only effect would keep showing
  // whatever was fetched the first time Home ever opened. (Registration/activation data itself
  // comes from useCoverageStatus, which does its own focus-refetch.)
  useFocusEffect(
    useCallback(() => {
      if (authLoading || !user) return;
      if (!user.email || isDoctor) { setChecking(false); return; }
      let alive = true;
      (async () => {
        try {
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
    }, [user, authLoading, isDoctor])
  );

  // Active consultation / appointment status — this is what "Your Active Consultation" and
  // its stage badge (Checklist → Appointment Booked → …) are driven by. Booking happens on
  // the consultation tracker screen, which is pushed on top of Home rather than replacing
  // it, so Home doesn't remount when the user navigates back — only useFocusEffect catches
  // that the appointment now exists.
  useFocusEffect(
    useCallback(() => {
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
          const consultAppts = (Array.isArray(appts) ? appts : []).filter(a => a.consultationId === c.id);
          const matchedAppointment = consultAppts.find(a => a.status === 'SCHEDULED');
          const hasAppointment = !!matchedAppointment;
          // A cancelled appointment also has no SCHEDULED match, but it's a different situation
          // from never having booked one — surface it distinctly instead of silently reverting
          // to a "book your first appointment" state as if nothing had happened.
          const cancelled = !hasAppointment && consultAppts.some(a => a.status === 'CANCELLED');
          const expiredPending = !c.active && !hasAppointment && c.status !== 'COMPLETED' && !cancelled;
          if (!c.active && !completedToday && !expiredPending && !cancelled) { setActiveConsult(null); return; }

          let stage = hasAppointment ? 2 : 1;
          if (hasAppointment) {
            const rxRes = await authFetch(`${API_BASE_URL}/prescriptions/latest`, { cache: 'no-store' }).catch(() => null);
            if (rxRes && rxRes.ok && rxRes.status !== 204) {
              const j = await rxRes.json().catch(() => null);
              if (j?.pdfUrl && j?.consultationId === c.id) stage = 3;
            }
          }
          if (c.status === 'COMPLETED') stage = 4;

          // The pre-consultation checklist is already submitted by the time a consultation
          // record exists at all (it's required to create one) — "stage 1" really means
          // "booking still needed", not "checklist still needed".
          const detail = expiredPending ? 'Expired'
            : cancelled ? 'Appointment Cancelled'
            : stage === 1 ? 'Book Appointment'
            : stage === 2 ? 'Appointment Booked'
            : stage === 3 ? 'Prescription Ready'
            : 'Consultation Completed';

          if (!alive) return;
          setActiveConsult({
            consultationId: c.id,
            stage,
            detail,
            expired: expiredPending,
            cancelled,
            appointment: matchedAppointment ? { startTime: matchedAppointment.startTime, endTime: matchedAppointment.endTime } : null,
          });
        } catch { if (alive) setActiveConsult(null); }
      })();
      return () => { alive = false; };
    }, [user?.email, authLoading, isDoctor])
  );

  const fullName = useMemo(() => [user?.firstName, user?.lastName].filter(Boolean).join(' '), [user]);
  const today = useMemo(() => new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date()), []);
  const patients: PatientOpt[] = useMemo(() => {
    const primaryName = fullName || 'Primary Member';
    return [
      { key: 'primary', name: primaryName },
      ...(reg?.travelers || []).filter(t => t.id != null).map(t => ({ key: `trav-${t.id}`, name: t.fullName, travelerId: t.id })),
    ];
  }, [fullName, reg?.travelers]);

  // The card's own badge/colors/messaging are driven entirely by `coverageState` (purchase-
  // anchored), not `isExpired` (trip-anchored) — otherwise the badge could say "Activated"
  // while the numbers right below it show 0 days left. This is Home-specific presentation, so
  // it stays here rather than in the shared hook.
  const coverageTheme = {
    unactivated: { tint: wc.surface1, border: wc.borderStrong, fg: wc.textMuted, bar: wc.borderStrong, badge: 'mute' as const, label: 'Not Activated', icon: '○' },
    active:      { tint: wc.bgSuccess, border: wc.borderSuccess, fg: wc.textSuccess, bar: wc.textSuccess, badge: 'ok' as const, label: 'Active', icon: '●' },
    expiring:    { tint: wc.bgWarning, border: wc.borderWarning, fg: wc.textWarning, bar: wc.textWarning, badge: 'warn' as const, label: 'Expiring Soon', icon: '◐' },
    expired:     { tint: wc.bgDanger, border: wc.borderDanger, fg: wc.textDanger, bar: wc.textDanger, badge: 'warn' as const, label: 'Expired', icon: '○' },
  }[coverageState];

  if (checking) return <LoadingView />;
  if (isDoctor) return <LoadingView />;
  if (user && user.activated === false) return <LoadingView />;

  function startNewConsultation(p: PatientOpt) {
    setShowNewConsultModal(false);
    const qs = p.travelerId ? `?travelerId=${p.travelerId}` : '';
    router.push(`/(app)/consultation/questionnaire${qs}` as any);
  }

  function goConsult() {
    if (bookingBlocked) return;
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
              <TouchableOpacity style={[ws.bp, s.newConsultBtn, bookingBlocked && ws.btnDisabled]} onPress={goConsult} disabled={bookingBlocked} activeOpacity={0.8}>
                <Text style={ws.bpText}>+ New Consultation</Text>
              </TouchableOpacity>
            </View>
            {bookingBlocked && <Notice text="Your coverage has expired. Renew your package to start a new consultation." />}
            {(() => {
              // Booking a new/replacement slot for THIS consultation is just as blocked by
              // expired coverage as starting a brand-new one — only stages 1 (never booked) and
              // "cancelled" actually involve booking; stage 2+ is already past that point.
              const needsBooking = activeConsult.stage === 1 || activeConsult.cancelled;
              const bookingBlockedHere = !activeConsult.expired && needsBooking && bookingBlocked;
              const tagLabel = activeConsult.expired ? 'Expired'
                : activeConsult.cancelled ? 'Cancelled'
                : bookingBlockedHere ? 'Coverage Expired'
                : STAGE_LABELS[activeConsult.stage - 1];
              const tagWarn = activeConsult.expired || activeConsult.cancelled || bookingBlockedHere;
              const ctaLabel = activeConsult.expired ? 'View Details'
                : activeConsult.cancelled ? (bookingBlockedHere ? 'View Details' : 'Rebook Appointment')
                : activeConsult.stage === 1 ? (bookingBlockedHere ? 'View Details' : 'Book Appointment')
                : 'View Details';
              return (
                <TouchableOpacity style={[s.heroCard, (activeConsult.expired || activeConsult.cancelled || bookingBlockedHere) && s.heroCardExpired]} onPress={() => router.push(`/(app)/consultation/tracker?cid=${activeConsult.consultationId}` as any)} activeOpacity={0.85}>
                  <View style={s.heroTop}>
                    <Text style={s.heroEyebrow}>Your Consultation</Text>
                    <Tag label={tagLabel} kind={tagWarn ? 'warn' : 'info'} />
                  </View>
                  <Text style={s.heroDetail}>🩺 {activeConsult.detail}</Text>
                  {activeConsult.expired && (
                    <Text style={s.heroExpiredText}>No appointment was booked within the consultation window, so it has expired. Start a new consultation to continue.</Text>
                  )}
                  {activeConsult.cancelled && !bookingBlockedHere && (
                    <Text style={s.heroExpiredText}>Your appointment was cancelled. Book a new appointment to continue this consultation.</Text>
                  )}
                  {bookingBlockedHere && (
                    <Text style={s.heroExpiredText}>
                      {activeConsult.cancelled
                        ? 'Your appointment was cancelled, and your coverage has since expired. Renew your package to book a new appointment.'
                        : 'Your coverage has expired. Renew your package to book an appointment for this consultation.'}
                    </Text>
                  )}
                  {activeConsult.appointment && activeConsult.stage === 2 && (
                    <View style={{ marginTop: 6 }}>
                      <Text style={s.heroApptTime}>📅 {clinicDateTime(activeConsult.appointment.startTime)}</Text>
                      <Text style={s.heroCountdown}>💬 {formatCountdown(activeConsult.appointment.startTime, now)}</Text>
                    </View>
                  )}
                  <View style={[ws.bp, { marginTop: 12 }]}>
                    <Text style={ws.bpText}>{ctaLabel}</Text>
                  </View>
                </TouchableOpacity>
              );
            })()}
          </>
        ) : (
          <View style={[ws.card, { backgroundColor: wc.bgAccent, borderColor: wc.borderAccent }]}>
            <View style={s.ctaRow}>
              <View style={{ flex: 1, minWidth: 180 }}>
                <Text style={s.ctaTitle}>Need to speak to a doctor?</Text>
                <Text style={s.ctaSub}>Start a consultation and we'll guide you through a short checklist, then book you an appointment.</Text>
              </View>
              <TouchableOpacity style={[ws.bp, s.ctaBtn, bookingBlocked && ws.btnDisabled]} onPress={goConsult} disabled={bookingBlocked} activeOpacity={0.8}>
                <Text style={ws.bpText}>🩺 I Need a Consultation</Text>
              </TouchableOpacity>
            </View>
            {bookingBlocked && <Notice text="Your coverage has expired. Renew your package to start a new consultation." />}
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
          <View style={[ws.card, s.covCard, { borderColor: coverageTheme.border }]}>
            <View style={[s.covHeaderStripe, { backgroundColor: coverageTheme.fg }]} />

            <View style={s.cardHeadRow}>
              <Text style={ws.ct}>Coverage Status</Text>
              <View style={[s.covBadge, { backgroundColor: coverageTheme.tint, borderColor: coverageTheme.border }]}>
                <Text style={[s.covBadgeDot, { color: coverageTheme.fg }]}>{coverageTheme.icon}</Text>
                <Text style={[s.covBadgeText, { color: coverageTheme.fg }]}>{coverageTheme.label}</Text>
              </View>
            </View>

            <View style={s.covDestRow}>
              <Text style={s.covDestIcon}>📍</Text>
              <Text style={s.covDestination}>{reg.to || '—'}</Text>
            </View>

            {coverageStart ? (
              <>
                <View style={s.covHeroRow}>
                  <View style={[s.covHeroCircle, { backgroundColor: coverageTheme.fg }]}>
                    <Text style={s.covHeroNumber}>{coverageDaysLeft}</Text>
                    <Text style={s.covHeroCaption}>{coverageDaysLeft === 1 ? 'DAY LEFT' : 'DAYS LEFT'}</Text>
                  </View>
                  <View style={s.covHeroSide}>
                    <View style={s.covProgressTrack}>
                      <View style={[s.covProgressFill, { width: `${Math.round(Math.min(1, coverageProgress) * 100)}%`, backgroundColor: coverageTheme.bar }]} />
                    </View>
                    <Text style={s.covProgressLabel}>Day {coverageDaysElapsed} of {packageDaysPurchased} used</Text>
                    <View style={s.covMiniStatsRow}>
                      <View style={s.covMiniStat}>
                        <Text style={s.covMiniStatLabel}>Start</Text>
                        <Text style={s.covMiniStatValue}>{fmtDate(activation?.activatedAt || undefined)}</Text>
                      </View>
                      <View style={s.covMiniStat}>
                        <Text style={s.covMiniStatLabel}>Ends</Text>
                        <Text style={s.covMiniStatValue}>{coverageEnd ? fmtDateObj(coverageEnd) : '—'}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                {coverageState === 'expired' && (
                  <Notice kind="danger" text="Your coverage window has ended. Renew your package to book new consultations." />
                )}
                {coverageState === 'expiring' && (
                  <Notice text={`Your coverage ends in ${coverageDaysLeft} day${coverageDaysLeft === 1 ? '' : 's'} — renew soon to stay covered.`} />
                )}
              </>
            ) : (
              <Text style={s.covUnactivatedHint}>Activate your package to start your coverage countdown.</Text>
            )}
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

  cardHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },

  // Coverage Status — self-contained "fancy" widget, colored end-to-end by `coverageTheme`.
  covCard: { borderWidth: 1.5, overflow: 'hidden', paddingTop: 0 },
  covHeaderStripe: { height: 4, marginHorizontal: -14, marginTop: -14, marginBottom: 14 },

  covBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  covBadgeDot: { fontSize: 9 },
  covBadgeText: { fontSize: 12, fontWeight: '700' },

  covDestRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  covDestIcon: { fontSize: 14 },
  covDestination: { fontSize: 15, fontWeight: '600', color: wc.textPrimary },

  covHeroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  covHeroCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  covHeroNumber: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 32 },
  covHeroCaption: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 },
  covHeroSide: { flex: 1, gap: 7 },

  covProgressTrack: { height: 7, borderRadius: 4, backgroundColor: wc.surface1, overflow: 'hidden' },
  covProgressFill: { height: '100%', borderRadius: 4 },
  covProgressLabel: { fontSize: 12, color: wc.textMuted },

  covMiniStatsRow: { flexDirection: 'row', gap: 16, marginTop: 2 },
  covMiniStat: { gap: 1 },
  covMiniStatLabel: { fontSize: 11, color: wc.textMuted },
  covMiniStatValue: { fontSize: 13, fontWeight: '700', color: wc.textPrimary },

  covUnactivatedHint: { fontSize: 13, color: wc.textMuted, fontStyle: 'italic' },

  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { fontSize: 14, color: wc.textPrimary, flex: 1 },

  linkRow: { marginTop: 2 },
  linkItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: wc.border },
  linkText: { fontSize: 14, color: wc.textPrimary },
  linkTextDisabled: { color: wc.textMuted },
  linkChevron: { fontSize: 17, color: wc.textMuted },

  supportLine: { fontSize: 14, color: wc.textSecondary, marginBottom: 8 },
});
