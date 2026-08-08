// src/screens/ConsultationTracker.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, Modal, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL, authFetch } from '../api';
import { clinicDateTime, clinicTime } from '../lib/appointmentTime';
import { colors, spacing, radius, typography, shadow } from '../theme';
import { PageHeader } from '../components/PageHeader';
import { openPdf } from '../utils/openPdf';

type Slot = { startTime: string; endTime: string; label: string; available: boolean };
type AvailabilityDay = { date: string; slots: Slot[] };
type Appointment = { id: number; consultationId: number; status?: string; startTime: string; endTime: string };

function dayShort(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00`);
  return {
    dow: d.toLocaleDateString('en-GB', { weekday: 'short' }),
    dnum: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  };
}

// ── Simple centered confirm/info modal ─────────────────────────────────────────
function ConfirmModal({ visible, title, body, onClose, danger, confirmLabel, onConfirm, confirming }: {
  visible: boolean; title: string; body: string; onClose: () => void;
  danger?: boolean; confirmLabel?: string; onConfirm?: () => void; confirming?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={cx.overlay} activeOpacity={1} onPress={onClose} />
      <View style={cx.centerWrap} pointerEvents="box-none">
        <View style={cx.box}>
          <Text style={cx.title}>{title}</Text>
          <Text style={cx.body}>{body}</Text>
          <View style={cx.actions}>
            <TouchableOpacity style={cx.closeBtn} onPress={onClose} activeOpacity={0.75}>
              <Text style={cx.closeBtnText}>{onConfirm ? 'Keep Appointment' : 'Close'}</Text>
            </TouchableOpacity>
            {onConfirm && (
              <TouchableOpacity
                style={[cx.confirmBtn, danger && cx.confirmBtnDanger]}
                onPress={onConfirm}
                disabled={confirming}
                activeOpacity={0.85}
              >
                {confirming
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={cx.confirmBtnText}>{confirmLabel || 'Confirm'}</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Appointment booking widget (Step 2) ─────────────────────────────────────────
function AppointmentBooking({ consultationId, consultationActive, patientId, onBookingChange }: {
  consultationId: number; consultationActive: boolean; patientId: string;
  onBookingChange: (a: Appointment | null) => void;
}) {
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookedAppointment, setBookedAppointment] = useState<Appointment | null>(null);
  const [historicalAppointment, setHistoricalAppointment] = useState<Appointment | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [changing, setChanging] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<{ startTime: string; endTime: string } | null>(null);

  const loadBookedAppointment = useCallback(async () => {
    const res = await authFetch(`${API_BASE_URL}/appointments/mine`, { cache: 'no-store' });
    const items: unknown[] = res.ok ? await res.json().catch(() => []) : [];
    const mine = (Array.isArray(items) ? items : []).filter(
      (a: any) => a.consultationId === consultationId
    ) as Appointment[];
    const next = mine.find(a => a.status === 'SCHEDULED') ?? null;
    setBookedAppointment(next);
    setHistoricalAppointment(mine.sort((a, b) => b.id - a.id)[0] ?? null);
    onBookingChange(next);
    return next;
  }, [consultationId, onBookingChange]);

  useEffect(() => { loadBookedAppointment().catch(() => undefined); }, [loadBookedAppointment]);

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/appointments/availability`, { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Unable to load appointment slots.');
      const nextDays: AvailabilityDay[] = Array.isArray(data?.days) ? data.days : [];
      setDays(nextDays);
      const firstWithSlots = nextDays.find(d => d.slots.some(s => s.available));
      setSelectedDate((firstWithSlots ?? nextDays[0])?.date ?? '');
      setSelectedSlot('');
    } catch (e: any) {
      setError(e?.message || 'Unable to load appointment slots.');
      setDays([]); setSelectedDate(''); setSelectedSlot('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (consultationActive) loadAvailability(); }, [loadAvailability, consultationActive]);

  const selectedDay = useMemo(() => days.find(d => d.date === selectedDate) ?? null, [days, selectedDate]);
  // `label` is already clinic-local (Europe/London) time — deriving the hour from
  // `startTime` via Date.getHours() would use the *device's* local timezone instead.
  const morningSlots = useMemo(() => selectedDay?.slots.filter(s => Number(s.label.split(':')[0]) < 12) ?? [], [selectedDay]);
  const afternoonSlots = useMemo(() => selectedDay?.slots.filter(s => Number(s.label.split(':')[0]) >= 12) ?? [], [selectedDay]);

  async function confirmBooking() {
    if (!selectedSlot) return;
    setBooking(true); setError(null); setMessage(null);
    try {
      const res = await authFetch(
        rescheduling ? `${API_BASE_URL}/appointments/${bookedAppointment!.id}/reschedule` : `${API_BASE_URL}/appointments`,
        {
          method: rescheduling ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consultationId, startTime: selectedSlot, patientId }),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Unable to book that slot.');
      await loadBookedAppointment().catch(() => undefined);
      setRescheduling(false);
      setSelectedSlot('');
      setConfirmedBooking({ startTime: data.startTime, endTime: data.endTime });
      await loadAvailability();
    } catch (e: any) {
      setError(e?.message || 'Unable to book that slot.');
    } finally {
      setBooking(false);
    }
  }

  async function cancelAppointment() {
    if (!bookedAppointment) return;
    setChanging(true); setError(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/appointments/${bookedAppointment.id}/cancel`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Unable to cancel this appointment.');
      setBookedAppointment(null);
      onBookingChange(null);
      setRescheduling(false);
      setShowCancelModal(false);
      setMessage('Appointment cancelled. The reserved slot is available again.');
      await loadAvailability();
    } catch (e: any) {
      setError(e?.message || 'Unable to cancel this appointment.');
    } finally {
      setChanging(false);
    }
  }

  const canChangeAppointment = !!bookedAppointment && bookedAppointment.status === 'SCHEDULED'
    && consultationActive && new Date(bookedAppointment.startTime).getTime() > Date.now();
  const showBookingFlow = consultationActive && (!bookedAppointment || rescheduling);

  const historicalStatusLabel = (status?: string) => {
    switch (status) {
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      case 'NO_SHOW':   return 'No-show';
      case 'SCHEDULED': return 'Scheduled';
      default:          return status || 'Recorded';
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      {bookedAppointment && !rescheduling && (
        <View style={ab.infoNotice}>
          <Text style={ab.infoNoticeTitle}>Upcoming Appointment</Text>
          <Text style={ab.infoNoticeBody}>{clinicDateTime(bookedAppointment.startTime)} – {clinicTime(bookedAppointment.endTime)}</Text>
          <Text style={ab.infoNoticeHint}>We'll remind you over WhatsApp before your appointment.</Text>
        </View>
      )}

      {bookedAppointment && !rescheduling && canChangeAppointment && (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            style={ab.secondaryBtn}
            onPress={() => { setRescheduling(true); setMessage(null); loadAvailability(); }}
            disabled={changing}
            activeOpacity={0.75}
          >
            <Text style={ab.secondaryBtnText}>↻ Reschedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={ab.dangerBtn}
            onPress={() => setShowCancelModal(true)}
            disabled={changing}
            activeOpacity={0.75}
          >
            <Text style={ab.dangerBtnText}>✕ Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {rescheduling && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontWeight: '700', fontSize: typography.sm, color: colors.text }}>Choose a replacement appointment</Text>
          <TouchableOpacity onPress={() => { setRescheduling(false); setSelectedSlot(''); }}>
            <Text style={{ color: colors.brand, fontWeight: '600', fontSize: typography.sm }}>Keep Original</Text>
          </TouchableOpacity>
        </View>
      )}

      {showBookingFlow && (
        <>
          {loading && <Text style={ab.hint}>Loading available slots…</Text>}
          {error && <View style={ab.warnNotice}><Text style={ab.warnNoticeText}>{error}</Text></View>}
          {message && <View style={ab.infoNoticeSm}><Text style={ab.infoNoticeSmText}>{message}</Text></View>}

          <Text style={ab.hint}>Choose a future appointment slot. You'll be connected with the next available doctor.</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {days.map(day => {
              const { dow, dnum } = dayShort(day.date);
              const availableCount = day.slots.filter(s => s.available).length;
              const active = selectedDate === day.date;
              return (
                <TouchableOpacity
                  key={day.date}
                  style={[ab.datePill, active && ab.datePillActive]}
                  onPress={() => { setSelectedDate(day.date); setSelectedSlot(''); }}
                  activeOpacity={0.75}
                >
                  <Text style={[ab.datePillDow, active && ab.datePillTextActive]}>{dow}</Text>
                  <Text style={[ab.datePillNum, active && ab.datePillTextActive]}>{dnum}</Text>
                  <Text style={[ab.datePillCount, active && ab.datePillTextActive]}>{availableCount > 0 ? `${availableCount} slots` : 'Full'}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedDay && selectedDay.slots.length === 0 && (
            <View style={ab.warnNotice}><Text style={ab.warnNoticeText}>No doctors are available on this date.</Text></View>
          )}

          {selectedDay && selectedDay.slots.length > 0 && (
            <>
              {morningSlots.length > 0 && (
                <>
                  <Text style={ab.sessionLabel}>Morning</Text>
                  <View style={ab.slotGrid}>
                    {morningSlots.map(slot => (
                      <TouchableOpacity
                        key={slot.startTime}
                        disabled={!slot.available}
                        style={[ab.slotChip, !slot.available && ab.slotChipDisabled, selectedSlot === slot.startTime && ab.slotChipActive]}
                        onPress={() => setSelectedSlot(slot.startTime)}
                        activeOpacity={0.75}
                      >
                        <Text style={[ab.slotChipText, !slot.available && ab.slotChipTextDisabled, selectedSlot === slot.startTime && ab.slotChipTextActive]}>{slot.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              {afternoonSlots.length > 0 && (
                <>
                  <Text style={ab.sessionLabel}>Afternoon</Text>
                  <View style={ab.slotGrid}>
                    {afternoonSlots.map(slot => (
                      <TouchableOpacity
                        key={slot.startTime}
                        disabled={!slot.available}
                        style={[ab.slotChip, !slot.available && ab.slotChipDisabled, selectedSlot === slot.startTime && ab.slotChipActive]}
                        onPress={() => setSelectedSlot(slot.startTime)}
                        activeOpacity={0.75}
                      >
                        <Text style={[ab.slotChipText, !slot.available && ab.slotChipTextDisabled, selectedSlot === slot.startTime && ab.slotChipTextActive]}>{slot.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </>
          )}

          <TouchableOpacity
            style={[ab.confirmBtn, (!selectedSlot || booking || !consultationActive) && { opacity: 0.5 }]}
            disabled={!selectedSlot || booking || !consultationActive}
            onPress={confirmBooking}
            activeOpacity={0.85}
          >
            {booking
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={ab.confirmBtnText}>
                  {!consultationActive ? 'Consultation expired' : rescheduling ? 'Confirm Reschedule' : 'Confirm Appointment'}
                </Text>
            }
          </TouchableOpacity>
        </>
      )}

      {!consultationActive && !bookedAppointment && (
        historicalAppointment ? (
          <View style={historicalAppointment.status === 'CANCELLED' || historicalAppointment.status === 'NO_SHOW' ? ab.warnNotice : ab.infoNoticeSm}>
            <Text style={historicalAppointment.status === 'CANCELLED' || historicalAppointment.status === 'NO_SHOW' ? ab.warnNoticeText : ab.infoNoticeSmText}>
              Appointment {historicalStatusLabel(historicalAppointment.status)} — {clinicDateTime(historicalAppointment.startTime)}
            </Text>
          </View>
        ) : (
          <Text style={ab.hint}>No appointment was booked for this consultation.</Text>
        )
      )}

      <ConfirmModal
        visible={showCancelModal && !!bookedAppointment}
        title="Cancel Appointment"
        body={bookedAppointment ? `Are you sure you want to cancel your appointment on ${clinicDateTime(bookedAppointment.startTime)}? This slot will be released back to other patients.` : ''}
        onClose={() => setShowCancelModal(false)}
        onConfirm={cancelAppointment}
        confirming={changing}
        confirmLabel="Cancel Appointment"
        danger
      />

      <ConfirmModal
        visible={!!confirmedBooking}
        title="Appointment Confirmed"
        body={confirmedBooking ? `Your appointment is booked for ${clinicDateTime(confirmedBooking.startTime)} – ${clinicTime(confirmedBooking.endTime)}. We'll remind you over WhatsApp before your appointment.` : ''}
        onClose={() => setConfirmedBooking(null)}
      />
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ConsultationTracker() {
  const router = useRouter();
  const params = useLocalSearchParams<{ travelerId?: string; cid?: string }>();
  const travelerId = params.travelerId || null;
  const viewCid = params.cid || null;

  const [latestCid,     setLatestCid    ] = useState<number | null>(null);
  const [latestStatus,  setLatestStatus ] = useState<string | null>(null);
  const [latestActive,  setLatestActive ] = useState(false);
  const [completedAt,   setCompletedAt  ] = useState<string | null>(null);
  const [patientId,     setPatientId    ] = useState<string>('');
  const [loading,       setLoading      ] = useState(true);
  const [appointmentBooked, setAppointmentBooked] = useState(false);

  const [summary, setSummary] = useState<{
    presentingComplaint?: string; diagnosis?: string; recommendations?: string; medicines?: string;
  } | null>(null);

  const [rxUrl,          setRxUrl         ] = useState<string | null>(null);
  const [findingPharm,   setFindingPharm  ] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const qp = new URLSearchParams();
        if (travelerId) qp.set('travelerId', travelerId);
        if (viewCid) qp.set('cid', viewCid);
        const res = await authFetch(`${API_BASE_URL}/consultations/mine/latest?${qp.toString()}`, { cache: 'no-store' });
        if (!alive) return;
        if (res.status === 204 || !res.ok) {
          setLatestCid(null); setLatestStatus(null); setLatestActive(false); setCompletedAt(null);
          return;
        }
        const j = await res.json();
        setLatestCid(typeof j?.id === 'number' ? j.id : null);
        setLatestStatus(typeof j?.status === 'string' ? j.status : null);
        setLatestActive(j?.active === true);
        setCompletedAt(typeof j?.completedAt === 'string' ? j.completedAt : null);
        setPatientId(typeof j?.patientId === 'string' ? j.patientId : '');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [travelerId, viewCid]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const qp = new URLSearchParams();
        if (travelerId) qp.set('travelerId', travelerId);
        const res = await authFetch(`${API_BASE_URL}/prescriptions/latest?${qp.toString()}`, { cache: 'no-store' });
        if (ignore) return;
        if (res.status === 204 || !res.ok) { setRxUrl(null); return; }
        const j = await res.json().catch(() => null);
        const matches = !viewCid || String(j?.consultationId) === viewCid;
        setRxUrl(j?.pdfUrl && matches ? j.pdfUrl : null);
      } catch { if (!ignore) setRxUrl(null); }
    })();
    return () => { ignore = true; };
  }, [travelerId, viewCid]);

  useEffect(() => {
    if (latestStatus !== 'COMPLETED' || !latestCid) { setSummary(null); return; }
    let ignore = false;
    (async () => {
      try {
        const qp = new URLSearchParams();
        if (travelerId) qp.set('travelerId', travelerId);
        const res = await authFetch(`${API_BASE_URL}/care-history/mine?${qp.toString()}`, { cache: 'no-store' });
        if (ignore) return;
        if (res.status === 204 || !res.ok) { setSummary(null); return; }
        const j = await res.json().catch(() => null);
        const items: any[] = Array.isArray(j?.items) ? j.items : [];
        const match = items.find(it => it.consultationId === latestCid);
        setSummary(match ? {
          presentingComplaint: match.presentingComplaint,
          diagnosis: match.diagnosis,
          recommendations: match.recommendations,
          medicines: match.medicines,
        } : null);
      } catch { if (!ignore) setSummary(null); }
    })();
    return () => { ignore = true; };
  }, [travelerId, latestStatus, latestCid]);

  async function openPrescription() {
    if (!rxUrl) return;
    openPdf(rxUrl, 'Prescription');
  }

  async function openNearbyPharmacies() {
    setFindingPharm(true);
    Linking.openURL('https://www.google.com/maps/search/pharmacy').finally(() => setFindingPharm(false));
  }

  const hasLatestConsultation = !!latestCid;
  const isLatestCompleted     = latestStatus === 'COMPLETED';
  const canViewPrescription   = isLatestCompleted && !!rxUrl;
  // Never got an appointment booked before the 48h consultation window closed.
  const isExpiredPending = hasLatestConsultation && !latestActive && !isLatestCompleted && !appointmentBooked;

  const checklistHref = () => {
    const lockedQs = (appointmentBooked || isExpiredPending) ? '&locked=1' : '';
    const travQs = travelerId ? `&travelerId=${travelerId}` : '';
    return `/(app)/consultation/questionnaire?cid=${latestCid}${travQs}${lockedQs}`;
  };

  const checklistViewHref = () => {
    const travQs = travelerId ? `&travelerId=${travelerId}` : '';
    return `/(app)/consultation/questionnaire?cid=${latestCid}${travQs}&locked=1`;
  };

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <PageHeader title="Consultation" subtitle="Track your journey" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Consultation" subtitle="Track your journey" />
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

        {!hasLatestConsultation ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>No active consultation</Text>
            <Text style={s.cardBody}>Start a new consultation from the Home screen to begin the pre-consultation checklist.</Text>
            <TouchableOpacity style={s.primaryBtn} onPress={() => router.replace('/(app)/home' as any)} activeOpacity={0.85}>
              <Text style={s.primaryBtnText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {isExpiredPending && (
              <View style={ab.warnNotice}>
                <Text style={ab.warnNoticeText}>No appointment was booked within the consultation window, so it has expired. Start a new consultation from Home to continue.</Text>
              </View>
            )}

            {isLatestCompleted ? (
              // Completed consultations collapse to a single summary card — booking is no longer relevant.
              <View style={s.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={s.cardTitle}>Consultation #{latestCid}</Text>
                  <View style={s.doneTag}><Text style={s.doneTagText}>Completed</Text></View>
                </View>
                <Text style={s.cardBody}>
                  {completedAt ? `Completed on ${clinicDateTime(completedAt)}.` : 'This consultation is complete.'} View your checklist, prescription, and find a pharmacy below.
                </Text>

                {summary && (summary.presentingComplaint || summary.diagnosis || summary.medicines || summary.recommendations) && (
                  <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
                    {summary.presentingComplaint && <View style={s.dr}><Text style={s.dk}>Presenting Complaint</Text><Text style={s.dv}>{summary.presentingComplaint}</Text></View>}
                    {summary.diagnosis && <View style={s.dr}><Text style={s.dk}>Diagnosis</Text><Text style={s.dv}>{summary.diagnosis}</Text></View>}
                    {summary.medicines && <View style={s.dr}><Text style={s.dk}>Medicines</Text><Text style={s.dv}>{summary.medicines.split(/\r?\n/).filter(Boolean).join(', ')}</Text></View>}
                    {summary.recommendations && <View style={s.dr}><Text style={s.dk}>Recommendations</Text><Text style={s.dv}>{summary.recommendations}</Text></View>}
                  </View>
                )}

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
                  <TouchableOpacity style={s.secondaryBtn} onPress={() => router.push(checklistViewHref() as any)} activeOpacity={0.75}>
                    <Text style={s.secondaryBtnText}>View Checklist</Text>
                  </TouchableOpacity>
                  {canViewPrescription ? (
                    <TouchableOpacity style={s.primaryBtnSm} onPress={openPrescription} activeOpacity={0.85}>
                      <Text style={s.primaryBtnSmText}>View Prescription</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[s.secondaryBtn, { opacity: 0.5 }]}><Text style={s.secondaryBtnText}>No Prescription</Text></View>
                  )}
                  <TouchableOpacity style={s.primaryBtnSm} onPress={openNearbyPharmacies} disabled={findingPharm} activeOpacity={0.85}>
                    <Text style={s.primaryBtnSmText}>{findingPharm ? 'Finding…' : 'Find Nearby Pharmacies'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {/* Step 1: Checklist */}
                <View style={s.card}>
                  <View style={s.stepRow}>
                    <View style={[s.stepIcon, s.stepIconDone]}><Text style={s.stepIconCheck}>✓</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardTitle}>Pre-Consultation Checklist</Text>
                      <Text style={s.cardBody}>Health questionnaire and consent forms completed before your session.</Text>
                      <TouchableOpacity style={s.secondaryBtn} onPress={() => router.push(checklistHref() as any)} activeOpacity={0.75}>
                        <Text style={s.secondaryBtnText}>{(appointmentBooked || isExpiredPending) ? 'View Checklist' : 'Edit Checklist'}</Text>
                      </TouchableOpacity>
                      {appointmentBooked && <Text style={s.stepHint}>Locked while your appointment is booked — cancel it to make changes.</Text>}
                    </View>
                  </View>
                </View>

                {/* Step 2: Book an Appointment */}
                <View style={s.card}>
                  <View style={s.stepRow}>
                    <View style={[s.stepIcon, appointmentBooked && s.stepIconDone]}>
                      {appointmentBooked ? <Text style={s.stepIconCheck}>✓</Text> : <Text style={s.stepIconNum}>2</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardTitle}>Book an Appointment</Text>
                      <Text style={s.cardBody}>Choose a future 10-minute appointment slot with an available doctor.</Text>
                    </View>
                  </View>
                  {latestCid ? (
                    <View style={{ marginTop: spacing.md }}>
                      <AppointmentBooking
                        consultationId={latestCid}
                        consultationActive={latestActive}
                        patientId={patientId}
                        onBookingChange={a => setAppointmentBooked(!!a)}
                      />
                    </View>
                  ) : null}
                </View>

                {/* Step 3: Prescription (upcoming) */}
                <View style={s.card}>
                  <View style={s.stepRow}>
                    <View style={s.stepIcon}><Text style={s.stepIconNum}>3</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardTitle}>Prescription Issued</Text>
                      <Text style={s.cardBody}>Your digital prescription with dosage instructions and medication details.</Text>
                      <View style={[s.secondaryBtn, { opacity: 0.5, alignSelf: 'flex-start' }]}><Text style={s.secondaryBtnText}>Upcoming</Text></View>
                    </View>
                  </View>
                </View>

                {/* Step 4: Pharmacy (upcoming) */}
                <View style={s.card}>
                  <View style={s.stepRow}>
                    <View style={s.stepIcon}><Text style={s.stepIconNum}>4</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardTitle}>Locate Pharmacy</Text>
                      <Text style={s.cardBody}>Find the nearest pharmacy to pick up your prescribed medication.</Text>
                      <View style={[s.secondaryBtn, { opacity: 0.5, alignSelf: 'flex-start' }]}><Text style={s.secondaryBtnText}>Upcoming</Text></View>
                    </View>
                  </View>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: 60, backgroundColor: colors.bgGray, gap: spacing.md },

  card: { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.xs, ...shadow.sm },
  cardTitle: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  cardBody:  { fontSize: typography.sm, color: colors.textSec, lineHeight: 19, marginBottom: spacing.xs },

  doneTag: { backgroundColor: colors.successBg, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  doneTagText: { color: colors.success, fontWeight: '700', fontSize: typography.xs },

  dr: { gap: 2 },
  dk: { fontSize: typography.xs, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  dv: { fontSize: typography.sm, color: colors.text, lineHeight: 19 },

  stepRow: { flexDirection: 'row', gap: spacing.md },
  stepIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  stepIconDone: { backgroundColor: colors.brand },
  stepIconNum: { fontWeight: '700', fontSize: typography.sm, color: colors.muted },
  stepIconCheck: { fontWeight: '800', fontSize: typography.base, color: '#fff' },
  stepHint: { fontSize: typography.xs, color: colors.muted, marginTop: 4 },

  primaryBtn: { backgroundColor: colors.amber, borderRadius: radius.full, paddingVertical: 14, alignItems: 'center', marginTop: spacing.sm, ...shadow.brand },
  primaryBtnText: { fontWeight: '800', fontSize: typography.md, color: colors.brandDark },

  primaryBtnSm: { backgroundColor: colors.brand, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 10 },
  primaryBtnSmText: { color: '#fff', fontWeight: '700', fontSize: typography.sm },

  secondaryBtn: { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 10, alignSelf: 'flex-start', marginTop: spacing.xs },
  secondaryBtnText: { color: colors.text, fontWeight: '600', fontSize: typography.sm },
});

const ab = StyleSheet.create({
  hint: { fontSize: typography.xs, color: colors.muted },

  infoNotice: { backgroundColor: colors.accentBg, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: radius.lg, padding: spacing.md, gap: 2 },
  infoNoticeTitle: { fontWeight: '700', fontSize: typography.sm, color: colors.accentText },
  infoNoticeBody: { fontSize: typography.sm, color: colors.accentText },
  infoNoticeHint: { fontSize: typography.xs, color: colors.muted, marginTop: 2 },

  infoNoticeSm: { backgroundColor: colors.accentBg, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: radius.lg, padding: spacing.sm },
  infoNoticeSmText: { fontSize: typography.xs, color: colors.accentText },

  warnNotice: { backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warningBorder, borderRadius: radius.lg, padding: spacing.md },
  warnNoticeText: { fontSize: typography.sm, color: colors.warning, lineHeight: 18 },

  secondaryBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.full, paddingVertical: 10, alignItems: 'center' },
  secondaryBtnText: { color: colors.text, fontWeight: '600', fontSize: typography.sm },
  dangerBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.errorBorder, backgroundColor: colors.errorBg, borderRadius: radius.full, paddingVertical: 10, alignItems: 'center' },
  dangerBtnText: { color: colors.error, fontWeight: '600', fontSize: typography.sm },

  datePill: { width: 76, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.lg, paddingVertical: spacing.sm, alignItems: 'center', gap: 2 },
  datePillActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  datePillDow: { fontSize: typography.xs, fontWeight: '700', color: colors.muted },
  datePillNum: { fontSize: typography.sm, fontWeight: '700', color: colors.text },
  datePillCount: { fontSize: typography.xxs, color: colors.muted },
  datePillTextActive: { color: '#fff' },

  sessionLabel: { fontSize: typography.xs, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slotChip: { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  slotChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  slotChipDisabled: { opacity: 0.4 },
  slotChipText: { fontSize: typography.sm, fontWeight: '600', color: colors.text },
  slotChipTextActive: { color: '#fff' },
  slotChipTextDisabled: { color: colors.muted },

  confirmBtn: { backgroundColor: colors.amber, borderRadius: radius.full, paddingVertical: 14, alignItems: 'center', marginTop: spacing.xs, ...shadow.brand },
  confirmBtnText: { fontWeight: '800', fontSize: typography.md, color: colors.brandDark },
});

const cx = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  centerWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  box:        { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md, width: '100%', maxWidth: 380, ...shadow.md },
  title:      { fontSize: typography.lg, fontWeight: '800', color: colors.text },
  body:       { fontSize: typography.sm, color: colors.textSec, lineHeight: 20 },
  actions:    { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  closeBtn:   { flex: 1, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.full, paddingVertical: 12, alignItems: 'center' },
  closeBtnText: { fontSize: typography.sm, fontWeight: '600', color: colors.muted },
  confirmBtn: { flex: 1, backgroundColor: colors.brand, borderRadius: radius.full, paddingVertical: 12, alignItems: 'center' },
  confirmBtnDanger: { backgroundColor: colors.error },
  confirmBtnText: { fontSize: typography.sm, fontWeight: '700', color: '#fff' },
});
