// src/screens/Home.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE_URL, authFetch, getActivationPaymentSummary, type ActivationPaymentSummary } from '../api';
import { useAuth } from '../state/auth';
import { colors, spacing, radius, typography, shadow } from '../theme';
import { Btn, Card, Muted, Strong, LoadingView } from '../components/UI';
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

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

type Traveler = { id?: number; fullName: string; dateOfBirth?: string; };
type RegData  = { id: number; from: string; to: string; start: string; end: string; packageDays: number | null; travelers: Traveler[] };

// ── Quick link card ───────────────────────────────────────────────────────────
function QuickLink({ icon, label, onPress, disabled }: {
  icon: string; label: string; onPress?: () => void; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      style={[ql.card, disabled && { opacity: 0.4 }]}
      activeOpacity={disabled ? 1 : 0.75}
    >
      <View style={ql.iconWrap}>
        <Text style={{ fontSize: 26 }}>{icon}</Text>
      </View>
      <Text style={ql.label}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Traveller avatar + collapsible row ────────────────────────────────────────
function TravellerRow({ traveler, index }: { traveler: Traveler; index: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const initials = traveler.fullName
    .split(' ').map(w => w[0] || '').slice(0, 2).join('').toUpperCase() || '?';

  // Pick a deterministic accent colour from the brand palette
  const ACCENTS = [colors.brand, '#1B8494', colors.brandDark, '#2F8FA0', '#0F5C50'];
  const accent  = ACCENTS[index % ACCENTS.length];

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(o => !o);
  }

  function goToCareHistory() {
    if (traveler.id) {
      router.push(`/(app)/care-history?travelerId=${traveler.id}` as any);
    }
  }

  return (
    <TouchableOpacity style={tv.row} onPress={toggle} activeOpacity={0.75}>
      {/* Avatar */}
      <View style={[tv.avatar, { backgroundColor: accent }]}>
        <Text style={tv.avatarText}>{initials}</Text>
      </View>

      {/* Name + DOB */}
      <View style={{ flex: 1 }}>
        <Text style={tv.name}>{traveler.fullName}</Text>
        {open && traveler.dateOfBirth ? (
          <Text style={tv.dob}>
            Date of Birth: {new Date(traveler.dateOfBirth + 'T00:00:00').toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' })}
          </Text>
        ) : open ? (
          <Text style={tv.dob}>No DOB recorded</Text>
        ) : null}
      </View>

      {/* Caret */}
      <Text style={[tv.caret, open && tv.caretOpen]}>›</Text>
    </TouchableOpacity>
  );
}

// ── Travel info hero card ─────────────────────────────────────────────────────
function TravelCard({ reg }: { reg: RegData }) {
  const startDate = reg.start ? new Date(reg.start + 'T00:00:00') : null;
  const endDate   = reg.end   ? new Date(reg.end   + 'T00:00:00') : null;
  const nights    = startDate && endDate
    ? Math.round((endDate.getTime() - startDate.getTime()) / 86400000)
    : null;

  function fmtDate(d: Date | null) {
    if (!d || isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' });
  }

  return (
    <View style={tc.card}>
      {/* Gradient-like teal header */}
      <View style={tc.header}>
        <View style={tc.headerDecor1} />
        <View style={tc.headerDecor2} />
        <Text style={tc.headerLabel}>Active Package</Text>
        <Text style={tc.headerTitle}>Your Travel Coverage</Text>

        {/* Route row */}
        <View style={tc.routeRow}>
          <View style={tc.routeStop}>
            <Text style={tc.stopDot}>●</Text>
            <Text style={tc.stopName}>{reg.from || '—'}</Text>
          </View>
          <View style={tc.routeLine}>
            <View style={tc.line} />
            <Text style={tc.planeIcon}>✈</Text>
            <View style={tc.line} />
          </View>
          <View style={tc.routeStop}>
            <Text style={tc.stopDot}>●</Text>
            <Text style={tc.stopName}>{reg.to || '—'}</Text>
          </View>
        </View>
      </View>

      {/* Date strip */}
      <View style={tc.dateStrip}>
        <View style={tc.dateBlock}>
          <Text style={tc.dateLabel}>Departure</Text>
          <Text style={tc.dateValue}>{fmtDate(startDate)}</Text>
        </View>
        <View style={tc.dateDivider} />
        <View style={tc.dateBlock}>
          <Text style={tc.dateLabel}>Return</Text>
          <Text style={tc.dateValue}>{fmtDate(endDate)}</Text>
        </View>
        {(nights !== null || reg.packageDays) && (
          <>
            <View style={tc.dateDivider} />
            <View style={tc.dateBlock}>
              <Text style={tc.dateLabel}>Package Days</Text>
              <Text style={tc.dateValue}>{reg.packageDays ? `${reg.packageDays}d` : `${nights}n`}</Text>
            </View>
          </>
        )}
      </View>

      {/* Info pills */}
      <View style={tc.pills}>
        <View style={tc.pill}>
          <Text style={tc.pillIcon}>📦</Text>
          <Text style={tc.pillText}>{reg.packageDays ? `${reg.packageDays}-Day Package` : 'Package'}</Text>
        </View>
        <View style={tc.pill}>
          <Text style={tc.pillIcon}>👥</Text>
          <Text style={tc.pillText}>{reg.travelers.length} traveller{reg.travelers.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* Travellers */}
      {reg.travelers.length > 0 && (
        <View style={tc.travSection}>
          <Text style={tc.travSectionLabel}>Travellers  <Text style={{ fontWeight: '400', color: colors.muted, fontSize: typography.xs }}>tap to show more details</Text></Text>
          <View style={tc.travList}>
            {reg.travelers.map((t, i) => (
              <React.Fragment key={t.id ?? i}>
                {i > 0 && <View style={tc.travSep} />}
                <TravellerRow traveler={t} index={i} />
              </React.Fragment>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ── Consultation CTA card ─────────────────────────────────────────────────────
function ConsultCard({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return (
    <View style={[cc.card, disabled && { opacity: 0.6 }]}>
      <View style={cc.left}>
        <Text style={cc.title}>Need Medical Help?</Text>
        <Text style={cc.sub}>Clinicians available Mon–Fri{'\n'}09:00 – 17:00 UK time</Text>
        <TouchableOpacity style={cc.btn} onPress={disabled ? undefined : onPress} activeOpacity={disabled ? 1 : 0.85}>
          <Text style={cc.btnIcon}>📞</Text>
          <Text style={cc.btnText}>Start Consultation</Text>
        </TouchableOpacity>
      </View>
      <View style={cc.iconWrap}>
        <Text style={{ fontSize: 56 }}>🩺</Text>
      </View>
    </View>
  );
}

// ── Active consultation hero card ───────────────────────────────────────────────
function ActiveConsultCard({ consult, now, onPress }: { consult: ActiveConsult; now: number; onPress: () => void }) {
  return (
    <TouchableOpacity style={[ac.card, consult.expired && ac.cardExpired]} onPress={onPress} activeOpacity={0.85}>
      <View style={ac.topRow}>
        <Text style={ac.eyebrow}>Your Consultation</Text>
        <View style={[ac.tag, consult.expired && ac.tagWarn]}>
          <Text style={[ac.tagText, consult.expired && ac.tagTextWarn]}>{consult.expired ? 'Expired' : STAGE_LABELS[consult.stage - 1]}</Text>
        </View>
      </View>
      <Text style={ac.detail}>🩺 {consult.detail}</Text>

      {consult.expired && (
        <Text style={ac.expiredText}>No appointment was booked within the consultation window, so it has expired.</Text>
      )}

      {consult.appointment && consult.stage === 2 && (
        <View style={{ marginTop: spacing.xs }}>
          <Text style={ac.apptTime}>📅 {clinicDateTime(consult.appointment.startTime)}</Text>
          <Text style={ac.countdown}>💬 {formatCountdown(consult.appointment.startTime, now)}</Text>
        </View>
      )}

      <Text style={ac.btnText}>{consult.expired ? 'View Details' : consult.stage === 1 ? 'Continue Checklist →' : 'View Details →'}</Text>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [checking,    setChecking   ] = useState(true);
  const [reg,         setReg        ] = useState<RegData | null>(null);
  const [rxUrl,       setRxUrl      ] = useState<string | null>(null);
  const [referralUrl, setReferralUrl] = useState<string | null>(null);
  const [activation,  setActivation ] = useState<ActivationPaymentSummary | null>(null);
  const [activeConsult, setActiveConsult] = useState<ActiveConsult | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const router = useRouter();

  const isDoctor = !!user?.roles?.some(r => typeof r === 'string' && r.toUpperCase().includes('DOCTOR'));

  // Only tick while there's a booked appointment countdown to show.
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
          const data   = await res.json();
          const latest = Array.isArray(data) ? data[data.length - 1] : data;
          if (latest && alive) {
            setReg({
              id:       latest.id,
              from:     latest['Travelling From']          ?? latest.travellingFrom    ?? '',
              to:       latest['Travelling To (UK & Europe)'] ?? latest.travellingTo  ?? '',
              start:    latest['Travel Start Date']        ?? latest.travelStartDate   ?? '',
              end:      latest['Travel End Date']          ?? latest.travelEndDate     ?? '',
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

  // Coverage activation summary (Days Purchased / Days Left / Activated tag)
  useEffect(() => {
    if (authLoading || !user?.email || isDoctor) return;
    let alive = true;
    getActivationPaymentSummary().then(a => { if (alive) setActivation(a); }).catch(() => { if (alive) setActivation(null); });
    return () => { alive = false; };
  }, [user?.email, authLoading, isDoctor]);

  // Primary patient's active consultation — stage, expiry, and appointment countdown.
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

  const todayKey = clinicDateKey(new Date());
  const isExpired = !!reg?.end && todayKey > reg.end;
  const daysLeft = reg?.end ? Math.max(0, Math.ceil((new Date(`${reg.end}T23:59:59`).getTime() - now) / 86400000)) : null;
  const packageDaysPurchased = activation?.packageDays || reg?.packageDays || 0;

  if (checking) return <LoadingView />;

  // ── Doctor view ────────────────────────────────────────────────────────────
  if (isDoctor) {
    return (
      <View style={{ flex: 1 }}>
        <PageHeader title="Doctor Console" showBack={false} />
        <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}>
          <View style={s.doctorHero}>
            <Text style={{ fontSize: 44 }}>🏥</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.doctorTitle}>Welcome, Dr. {user?.lastName || fullName}</Text>
              <Text style={s.doctorSub}>{user?.email}</Text>
            </View>
          </View>
          <Card>
            <Muted>View and manage your consultation queue, review patient details and issue prescriptions.</Muted>
            <Btn label="Open Consultations" onPress={() => router.push('/(app)/doctor/consultations')} style={{ marginTop: spacing.md }} />
          </Card>
        </ScrollView>
      </View>
    );
  }

  // ── Patient view ───────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="My Package" subtitle="Your active coverage" showBack={false} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Greeting */}
        {fullName ? (
          <View style={s.greetRow}>
            <Text style={s.greetHi}>👋  Hello,</Text>
            <Text style={s.greetName}>{fullName}</Text>
          </View>
        ) : null}

        {/* Travel hero card */}
        {reg
          ? <TravelCard reg={reg} />
          : (
            <View style={s.noPackageCard}>
              <Text style={{ fontSize: 40 }}>📦</Text>
              <Text style={s.noPackageTitle}>No Active Package</Text>
              <Text style={s.noPackageSub}>Register your trip to activate coverage.</Text>
              <TouchableOpacity style={s.noPackageBtn} onPress={() => router.push('/(app)/register/step1' as any)} activeOpacity={0.8}>
                <Text style={s.noPackageBtnText}>Register Now</Text>
              </TouchableOpacity>
            </View>
          )
        }

        {/* Consultation CTA — active-consultation hero when there's one in progress */}
        {activeConsult ? (
          <ActiveConsultCard
            consult={activeConsult}
            now={now}
            onPress={() => router.push(`/(app)/consultation/tracker?cid=${activeConsult.consultationId}` as any)}
          />
        ) : (
          <ConsultCard
            disabled={isExpired}
            onPress={() => {
              if (isExpired) return;
              const t = reg?.travelers?.[0];
              const qs = t?.id ? `?travelerId=${t.id}` : '';
              router.push(`/(app)/consultation/tracker${qs}` as any);
            }}
          />
        )}
        {isExpired && (
          <View style={s.expiredNotice}>
            <Text style={s.expiredNoticeText}>⚠️ Your coverage has expired. Renew your package to start a new consultation.</Text>
          </View>
        )}

        {/* Coverage Status */}
        {reg && (
          <View style={s.covCard}>
            <View style={s.covHeadRow}>
              <Text style={s.covTitle}>Coverage Status</Text>
              <View style={[s.covTag, isExpired ? s.covTagWarn : activation?.activated ? s.covTagOk : s.covTagMute]}>
                <Text style={[s.covTagText, isExpired ? s.covTagTextWarn : activation?.activated ? s.covTagTextOk : s.covTagTextMute]}>
                  {isExpired ? 'Expired' : activation?.activated ? 'Activated' : 'Not Activated'}
                </Text>
              </View>
            </View>
            <View style={s.covGrid}>
              <View>
                <Text style={s.covLabel}>Days Purchased</Text>
                <Text style={s.covValue}>{packageDaysPurchased ? `${packageDaysPurchased} days` : '—'}</Text>
              </View>
              <View>
                <Text style={s.covLabel}>Days Left</Text>
                <Text style={[s.covValue, isExpired && { color: colors.error }]}>
                  {daysLeft === null ? '—' : isExpired ? 'Expired' : `${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Links */}
        <Text style={s.sectionLabel}>Quick Links</Text>
        <View style={s.quickGrid}>
          <QuickLink icon="📄" label="Care History"
            onPress={() => {
              const t = reg?.travelers?.[0];
              const qs = t?.id ? `?travelerId=${t.id}` : '';
              router.push(`/(app)/care-history${qs}` as any);
            }}
          />
          <QuickLink icon="🔖" label="Tracker" disabled={isExpired}
            onPress={() => {
              const t = reg?.travelers?.[0];
              const qs = t?.id ? `?travelerId=${t.id}` : '';
              router.push(`/(app)/consultation/tracker${qs}` as any);
            }}
          />
          <QuickLink icon="💊" label="Prescription"    onPress={() => rxUrl       && openPdf(rxUrl,       'Prescription')}   disabled={!rxUrl} />
          <QuickLink icon="📨" label="Referral Letter" onPress={() => referralUrl && openPdf(referralUrl, 'Referral Letter')} disabled={!referralUrl} />
        </View>

        {/* Offers */}
        <Text style={s.sectionLabel}>Featured Offers</Text>
        <View style={s.offersGrid}>
          {[
            { label: 'Food & Drink',     url: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format' },
            { label: 'Taxi & Transport', url: 'https://images.unsplash.com/photo-1593950315186-76a92975b60c?q=80&w=800&auto=format' },
            { label: 'Entertainment',    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format' },
            { label: 'Accommodation',    url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format' },
          ].map(o => (
            <View key={o.label} style={s.offerCard}>
              <Image source={{ uri: o.url }} style={s.offerImg} resizeMode="cover" />
              <Text style={s.offerTitle}>{o.label}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll:         { padding: spacing.xl, paddingBottom: 60, backgroundColor: colors.bgGray, gap: spacing.md },
  greetRow:       { marginBottom: spacing.xs },
  greetHi:        { fontSize: typography.sm, color: colors.muted },
  greetName:      { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  sectionLabel:   { fontWeight: '700', fontSize: typography.base, color: colors.text, marginTop: spacing.md },
  quickGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  offersGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  offerCard:      { width: '47%', backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', ...shadow.sm },
  offerImg:       { width: '100%', height: 110 },
  offerTitle:     { padding: spacing.sm, fontWeight: '700', color: colors.text, fontSize: typography.sm },
  noPackageCard:  { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.xxl, alignItems: 'center', gap: spacing.md, ...shadow.sm },
  noPackageTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  noPackageSub:   { fontSize: typography.sm, color: colors.muted },
  noPackageBtn:   { backgroundColor: colors.brand, borderRadius: radius.full, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, marginTop: spacing.sm },
  noPackageBtnText:{ color: '#fff', fontWeight: '700', fontSize: typography.base },
  doctorHero:     { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, ...shadow.sm },
  doctorTitle:    { fontSize: typography.md, fontWeight: '700', color: colors.text },
  doctorSub:      { fontSize: typography.sm, color: colors.muted },

  expiredNotice:     { backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warningBorder, borderRadius: radius.lg, padding: spacing.md },
  expiredNoticeText: { fontSize: typography.sm, color: colors.warning, lineHeight: 18 },

  covCard:     { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.md, ...shadow.sm },
  covHeadRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  covTitle:    { fontSize: typography.base, fontWeight: '700', color: colors.text },
  covTag:      { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  covTagOk:    { backgroundColor: colors.successBg },
  covTagWarn:  { backgroundColor: colors.warningBg },
  covTagMute:  { backgroundColor: colors.surface },
  covTagText:  { fontSize: typography.xs, fontWeight: '700' },
  covTagTextOk:   { color: colors.success },
  covTagTextWarn: { color: colors.warning },
  covTagTextMute: { color: colors.muted },
  covGrid:     { flexDirection: 'row', gap: spacing.xxl },
  covLabel:    { fontSize: typography.xs, color: colors.muted },
  covValue:    { fontSize: typography.base, fontWeight: '700', color: colors.text, marginTop: 2 },
});

// Travel card styles
const tc = StyleSheet.create({
  card:             { borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, ...shadow.md, marginBottom: spacing.xs },
  header:           { backgroundColor: colors.brand, padding: spacing.xl, paddingBottom: spacing.xxl, overflow: 'hidden', position: 'relative' },
  headerDecor1:     { position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.08)' },
  headerDecor2:     { position: 'absolute', bottom: -30, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.06)' },
  headerLabel:      { color: 'rgba(255,255,255,0.7)', fontSize: typography.xs, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  headerTitle:      { color: colors.white, fontSize: typography.xl, fontWeight: '800', marginBottom: spacing.xl, letterSpacing: -0.3 },
  routeRow:         { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  routeStop:        { alignItems: 'center', gap: 4, flex: 1 },
  stopDot:          { color: colors.amber, fontSize: 10 },
  stopName:         { color: colors.white, fontSize: typography.sm, fontWeight: '700', textAlign: 'center' },
  routeLine:        { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 4 },
  line:             { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.35)' },
  planeIcon:        { color: colors.amber, fontSize: 18 },
  dateStrip:        { flexDirection: 'row', backgroundColor: colors.bgGray, paddingVertical: spacing.md },
  dateBlock:        { flex: 1, alignItems: 'center', gap: 2 },
  dateDivider:      { width: 1, backgroundColor: colors.line },
  dateLabel:        { fontSize: typography.xs, color: colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  dateValue:        { fontSize: typography.sm, color: colors.text, fontWeight: '700' },
  pills:            { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  pill:             { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brandLight, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6 },
  pillIcon:         { fontSize: 14 },
  pillText:         { fontSize: typography.xs, color: colors.brandDark, fontWeight: '600' },
  travSection:      { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  travSectionLabel: { fontSize: typography.xs, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: spacing.sm },
  travList:         { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  travSep:          { height: 1, backgroundColor: colors.line },
});

// Traveller row styles
const tv = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 10, gap: spacing.md, backgroundColor: colors.white },
  avatar:     { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: typography.sm },
  name:       { fontSize: typography.base, fontWeight: '600', color: colors.text },
  dob:        { fontSize: typography.xs, color: colors.muted, marginTop: 2 },
  caret:      { fontSize: 20, color: colors.muted, transform: [{ rotate: '0deg' }] },
  caretOpen:  { transform: [{ rotate: '90deg' }], color: colors.brand },
  historyLink:     { marginTop: 4 },
  historyLinkText: { fontSize: typography.xs, color: colors.brand, fontWeight: '700' },
});

// Consult card styles
const cc = StyleSheet.create({
  card:    { backgroundColor: colors.text, borderRadius: radius.xl, padding: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.md, ...shadow.md },
  left:    { flex: 1, gap: spacing.sm },
  title:   { fontSize: typography.md, fontWeight: '800', color: '#fff' },
  sub:     { fontSize: typography.xs, color: 'rgba(255,255,255,0.65)', lineHeight: 18 },
  btn:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.brand, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, alignSelf: 'flex-start', marginTop: spacing.xs },
  btnIcon: { fontSize: 14 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: typography.sm },
  iconWrap:{ width: 70, height: 70, alignItems: 'center', justifyContent: 'center' },
});

// Active-consultation hero card styles
const ac = StyleSheet.create({
  card:        { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.brand + '50', padding: spacing.xl, gap: spacing.xs, ...shadow.md },
  cardExpired: { borderColor: colors.errorBorder },
  topRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow:     { fontSize: typography.xs, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  tag:         { backgroundColor: colors.brandLight, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  tagWarn:     { backgroundColor: colors.warningBg },
  tagText:     { fontSize: typography.xs, fontWeight: '700', color: colors.brandDark },
  tagTextWarn: { color: colors.warning },
  detail:      { fontSize: typography.md, fontWeight: '700', color: colors.text, marginTop: 2 },
  expiredText: { fontSize: typography.sm, color: colors.warning, lineHeight: 18, marginTop: 2 },
  apptTime:    { fontSize: typography.sm, color: colors.textSec },
  countdown:   { fontSize: typography.base, fontWeight: '700', color: colors.brand, marginTop: 2 },
  btnText:     { fontSize: typography.sm, fontWeight: '700', color: colors.brand, marginTop: spacing.sm },
});

// Quick link styles
const ql = StyleSheet.create({
  card:    { width: '47%', backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, alignItems: 'center', gap: spacing.sm, ...shadow.sm },
  iconWrap:{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.brandLight, alignItems: 'center', justifyContent: 'center' },
  label:   { fontWeight: '600', color: colors.text, fontSize: typography.sm, textAlign: 'center' },
});
