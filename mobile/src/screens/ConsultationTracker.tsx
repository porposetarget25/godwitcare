// src/screens/ConsultationTracker.tsx — mirrors web's .portal card/tag/notice styling.
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, Modal, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL, authFetch } from '../api';
import { clinicDateTime, clinicTime } from '../lib/appointmentTime';
import { ws, wc } from '../webStyle';
import { PageHeader } from '../components/PageHeader';
import { openPdf } from '../utils/openPdf';

type Slot = { startTime: string; endTime: string; label: string; available: boolean };
type AvailabilityDay = { date: string; slots: Slot[] };
type Appointment = { id: number; consultationId: number; status?: string; startTime: string; endTime: string };

// Mobile-only display restriction (server still returns its full 9:00-17:00 window): only
// show 9:00-10:45 and 14:00-15:45 slots, hiding the rest — no backend change involved.
const ALLOWED_WINDOWS = [
  { startMin: 9 * 60, endMin: 10 * 60 + 45 },
  { startMin: 14 * 60, endMin: 15 * 60 + 45 },
];
function isAllowedSlot(label: string) {
  const [h, m] = label.split(':').map(Number);
  const mins = h * 60 + m;
  return ALLOWED_WINDOWS.some(w => mins >= w.startMin && mins <= w.endMin);
}

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
      <TouchableOpacity style={ws.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={cx.centerWrap} pointerEvents="box-none">
        <View style={[ws.modalBox, { padding: 18 }]}>
          <Text style={cx.title}>{title}</Text>
          <Text style={cx.body}>{body}</Text>
          <View style={cx.actions}>
            <TouchableOpacity style={[ws.bs, { flex: 1 }]} onPress={onClose} activeOpacity={0.75}>
              <Text style={ws.bsText}>{onConfirm ? 'Keep Appointment' : 'Close'}</Text>
            </TouchableOpacity>
            {onConfirm && (
              <TouchableOpacity
                style={[danger ? ws.bd : ws.bp, { flex: 1 }]}
                onPress={onConfirm}
                disabled={confirming}
                activeOpacity={0.85}
              >
                {confirming
                  ? <ActivityIndicator color={danger ? wc.textDanger : '#fff'} size="small" />
                  : <Text style={danger ? ws.bdText : ws.bpText}>{confirmLabel || 'Confirm'}</Text>}
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
      const rawDays: AvailabilityDay[] = Array.isArray(data?.days) ? data.days : [];
      const nextDays: AvailabilityDay[] = rawDays.map(d => ({ ...d, slots: d.slots.filter(s => isAllowedSlot(s.label)) }));
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
      case 'NO_SHOW': return 'No-show';
      case 'SCHEDULED': return 'Scheduled';
      default: return status || 'Recorded';
    }
  };

  return (
    <View style={{ gap: 10 }}>
      {bookedAppointment && !rescheduling && (
        <View style={[ws.notice, ws.nInfo, { flexDirection: 'column', alignItems: 'flex-start', gap: 2 }]}>
          <Text style={s.infoNoticeTitle}>Upcoming Appointment</Text>
          <Text style={[ws.noticeText, ws.nInfoText]}>{clinicDateTime(bookedAppointment.startTime)} – {clinicTime(bookedAppointment.endTime)}</Text>
          <Text style={s.infoNoticeHint}>We'll remind you over WhatsApp before your appointment.</Text>
        </View>
      )}

      {bookedAppointment && !rescheduling && canChangeAppointment && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[ws.bs, { flex: 1 }]} onPress={() => { setRescheduling(true); setMessage(null); loadAvailability(); }} disabled={changing} activeOpacity={0.75}>
            <Text style={ws.bsText}>↻ Reschedule</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[ws.bd, { flex: 1 }]} onPress={() => setShowCancelModal(true)} disabled={changing} activeOpacity={0.75}>
            <Text style={ws.bdText}>✕ Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {rescheduling && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontWeight: '600', fontSize: 14, color: wc.textPrimary }}>Choose a replacement appointment</Text>
          <TouchableOpacity onPress={() => { setRescheduling(false); setSelectedSlot(''); }}>
            <Text style={{ color: wc.fillAccent, fontWeight: '600', fontSize: 14 }}>Keep Original</Text>
          </TouchableOpacity>
        </View>
      )}

      {showBookingFlow && (
        <>
          {loading && <Text style={s.hint}>Loading available slots…</Text>}
          {error && <View style={[ws.notice, ws.nWarn]}><Text style={[ws.noticeText, ws.nWarnText]}>{error}</Text></View>}
          {message && <View style={[ws.notice, ws.nInfo]}><Text style={[ws.noticeText, ws.nInfoText]}>{message}</Text></View>}

          <Text style={s.hint}>Choose a future appointment slot. You'll be connected with the next available doctor.</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {days.map(day => {
              const { dow, dnum } = dayShort(day.date);
              const availableCount = day.slots.filter(s => s.available).length;
              const active = selectedDate === day.date;
              return (
                <TouchableOpacity key={day.date} style={[s.datePill, active && s.datePillActive]} onPress={() => { setSelectedDate(day.date); setSelectedSlot(''); }} activeOpacity={0.75}>
                  <Text style={[s.datePillDow, active && s.datePillTextActive]}>{dow}</Text>
                  <Text style={[s.datePillNum, active && s.datePillTextActive]}>{dnum}</Text>
                  <Text style={[s.datePillCount, active && s.datePillTextActive]}>{availableCount > 0 ? `${availableCount} slots` : 'Full'}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedDay && selectedDay.slots.length === 0 && (
            <View style={[ws.notice, ws.nWarn]}><Text style={[ws.noticeText, ws.nWarnText]}>No doctors are available on this date.</Text></View>
          )}

          {selectedDay && selectedDay.slots.length > 0 && (
            <>
              {morningSlots.length > 0 && (
                <>
                  <Text style={ws.fiHint}>Morning</Text>
                  <View style={s.slotGrid}>
                    {morningSlots.map(slot => (
                      <TouchableOpacity key={slot.startTime} disabled={!slot.available} style={[s.slotChip, !slot.available && s.slotChipDisabled, selectedSlot === slot.startTime && s.slotChipActive]} onPress={() => setSelectedSlot(slot.startTime)} activeOpacity={0.75}>
                        <Text style={[s.slotChipText, !slot.available && s.slotChipTextDisabled, selectedSlot === slot.startTime && s.slotChipTextActive]}>{slot.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              {afternoonSlots.length > 0 && (
                <>
                  <Text style={ws.fiHint}>Afternoon</Text>
                  <View style={s.slotGrid}>
                    {afternoonSlots.map(slot => (
                      <TouchableOpacity key={slot.startTime} disabled={!slot.available} style={[s.slotChip, !slot.available && s.slotChipDisabled, selectedSlot === slot.startTime && s.slotChipActive]} onPress={() => setSelectedSlot(slot.startTime)} activeOpacity={0.75}>
                        <Text style={[s.slotChipText, !slot.available && s.slotChipTextDisabled, selectedSlot === slot.startTime && s.slotChipTextActive]}>{slot.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </>
          )}

          <TouchableOpacity style={[ws.bp, (!selectedSlot || booking || !consultationActive) && ws.btnDisabled]} disabled={!selectedSlot || booking || !consultationActive} onPress={confirmBooking} activeOpacity={0.85}>
            {booking
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={ws.bpText}>{!consultationActive ? 'Consultation expired' : rescheduling ? 'Confirm Reschedule' : 'Confirm Appointment'}</Text>}
          </TouchableOpacity>
        </>
      )}

      {!consultationActive && !bookedAppointment && (
        historicalAppointment ? (
          <View style={[ws.notice, (historicalAppointment.status === 'CANCELLED' || historicalAppointment.status === 'NO_SHOW') ? ws.nWarn : ws.nInfo]}>
            <Text style={[ws.noticeText, (historicalAppointment.status === 'CANCELLED' || historicalAppointment.status === 'NO_SHOW') ? ws.nWarnText : ws.nInfoText]}>
              Appointment {historicalStatusLabel(historicalAppointment.status)} — {clinicDateTime(historicalAppointment.startTime)}
            </Text>
          </View>
        ) : (
          <Text style={s.hint}>No appointment was booked for this consultation.</Text>
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

  const [latestCid, setLatestCid] = useState<number | null>(null);
  const [latestStatus, setLatestStatus] = useState<string | null>(null);
  const [latestActive, setLatestActive] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [appointmentBooked, setAppointmentBooked] = useState(false);

  const [summary, setSummary] = useState<{
    presentingComplaint?: string; diagnosis?: string; recommendations?: string; medicines?: string;
  } | null>(null);

  const [rxUrl, setRxUrl] = useState<string | null>(null);
  const [findingPharm, setFindingPharm] = useState(false);

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
  const isLatestCompleted = latestStatus === 'COMPLETED';
  const canViewPrescription = isLatestCompleted && !!rxUrl;
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
          <ActivityIndicator color={wc.fillAccent} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Consultation" subtitle="Track your journey" />
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

        {!hasLatestConsultation ? (
          <View style={ws.card}>
            <Text style={ws.ct}>No active consultation</Text>
            <Text style={s.cardBody}>Start a new consultation from the Home screen to begin the pre-consultation checklist.</Text>
            <TouchableOpacity style={[ws.bp, { marginTop: 6 }]} onPress={() => router.replace('/(app)/home' as any)} activeOpacity={0.85}>
              <Text style={ws.bpText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {isExpiredPending && (
              <View style={[ws.notice, ws.nWarn]}>
                <Text style={[ws.noticeText, ws.nWarnText]}>No appointment was booked within the consultation window, so it has expired. Start a new consultation from Home to continue.</Text>
              </View>
            )}

            {isLatestCompleted ? (
              <View style={ws.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={ws.ct}>Consultation #{latestCid}</Text>
                  <View style={[ws.tag, ws.tok]}><Text style={[ws.tagText, ws.tokText]}>Completed</Text></View>
                </View>
                <Text style={s.cardBody}>
                  {completedAt ? `Completed on ${clinicDateTime(completedAt)}.` : 'This consultation is complete.'} View your checklist, prescription, and find a pharmacy below.
                </Text>

                {summary && (summary.presentingComplaint || summary.diagnosis || summary.medicines || summary.recommendations) && (
                  <View style={{ marginTop: 4 }}>
                    {summary.presentingComplaint && <View style={ws.dr}><Text style={ws.dk}>Presenting Complaint</Text><Text style={ws.dv}>{summary.presentingComplaint}</Text></View>}
                    {summary.diagnosis && <View style={ws.dr}><Text style={ws.dk}>Diagnosis</Text><Text style={ws.dv}>{summary.diagnosis}</Text></View>}
                    {summary.medicines && <View style={ws.dr}><Text style={ws.dk}>Medicines</Text><Text style={ws.dv}>{summary.medicines.split(/\r?\n/).filter(Boolean).join(', ')}</Text></View>}
                    {summary.recommendations && <View style={ws.dr}><Text style={ws.dk}>Recommendations</Text><Text style={ws.dv}>{summary.recommendations}</Text></View>}
                  </View>
                )}

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity style={ws.bs} onPress={() => router.push(checklistViewHref() as any)} activeOpacity={0.75}>
                    <Text style={ws.bsText}>View Checklist</Text>
                  </TouchableOpacity>
                  {canViewPrescription ? (
                    <TouchableOpacity style={ws.bp} onPress={openPrescription} activeOpacity={0.85}>
                      <Text style={ws.bpText}>View Prescription</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[ws.bs, ws.btnDisabled]}><Text style={ws.bsText}>No Prescription</Text></View>
                  )}
                  <TouchableOpacity style={ws.bp} onPress={openNearbyPharmacies} disabled={findingPharm} activeOpacity={0.85}>
                    <Text style={ws.bpText}>{findingPharm ? 'Finding…' : 'Find Nearby Pharmacies'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {/* Step 1: Checklist */}
                <View style={ws.card}>
                  <View style={s.stepRow}>
                    <View style={[s.stepIcon, s.stepIconDone]}><Text style={s.stepIconCheck}>✓</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={ws.ct}>Pre-Consultation Checklist</Text>
                      <Text style={s.cardBody}>Health questionnaire and consent forms completed before your session.</Text>
                      <TouchableOpacity style={[ws.bs, { alignSelf: 'flex-start' }]} onPress={() => router.push(checklistHref() as any)} activeOpacity={0.75}>
                        <Text style={ws.bsText}>{(appointmentBooked || isExpiredPending) ? 'View Checklist' : 'Edit Checklist'}</Text>
                      </TouchableOpacity>
                      {appointmentBooked && <Text style={s.stepHint}>Locked while your appointment is booked — cancel it to make changes.</Text>}
                    </View>
                  </View>
                </View>

                {/* Step 2: Book an Appointment */}
                <View style={ws.card}>
                  <View style={s.stepRow}>
                    <View style={[s.stepIcon, appointmentBooked && s.stepIconDone]}>
                      {appointmentBooked ? <Text style={s.stepIconCheck}>✓</Text> : <Text style={s.stepIconNum}>2</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={ws.ct}>Book an Appointment</Text>
                      <Text style={s.cardBody}>Choose a future 10-minute appointment slot with an available doctor.</Text>
                    </View>
                  </View>
                  {latestCid ? (
                    <View style={{ marginTop: 10 }}>
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
                <View style={ws.card}>
                  <View style={s.stepRow}>
                    <View style={s.stepIcon}><Text style={s.stepIconNum}>3</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={ws.ct}>Prescription Issued</Text>
                      <Text style={s.cardBody}>Your digital prescription with dosage instructions and medication details.</Text>
                      <View style={[ws.bs, ws.btnDisabled, { alignSelf: 'flex-start' }]}><Text style={ws.bsText}>Upcoming</Text></View>
                    </View>
                  </View>
                </View>

                {/* Step 4: Pharmacy (upcoming) */}
                <View style={ws.card}>
                  <View style={s.stepRow}>
                    <View style={s.stepIcon}><Text style={s.stepIconNum}>4</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={ws.ct}>Locate Pharmacy</Text>
                      <Text style={s.cardBody}>Find the nearest pharmacy to pick up your prescribed medication.</Text>
                      <View style={[ws.bs, ws.btnDisabled, { alignSelf: 'flex-start' }]}><Text style={ws.bsText}>Upcoming</Text></View>
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
  container: { padding: 20, paddingBottom: 40 },

  cardBody: { fontSize: 14, color: wc.textSecondary, lineHeight: 18, marginTop: 2, marginBottom: 4 },

  infoNoticeTitle: { fontWeight: '600', fontSize: 14, color: wc.textAccent },
  infoNoticeHint: { fontSize: 12, color: wc.textMuted, marginTop: 2 },

  hint: { fontSize: 12, color: wc.textMuted },

  stepRow: { flexDirection: 'row', gap: 10 },
  stepIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: wc.surface1, alignItems: 'center', justifyContent: 'center' },
  stepIconDone: { backgroundColor: wc.fillAccent },
  stepIconNum: { fontWeight: '600', fontSize: 14, color: wc.textMuted },
  stepIconCheck: { fontWeight: '800', fontSize: 15, color: '#fff' },
  stepHint: { fontSize: 12, color: wc.textMuted, marginTop: 4 },

  datePill: { width: 72, borderWidth: 1, borderColor: wc.borderStrong, borderRadius: 8, paddingVertical: 8, alignItems: 'center', gap: 2 },
  datePillActive: { backgroundColor: wc.fillAccent, borderColor: wc.fillAccent },
  datePillDow: { fontSize: 12, fontWeight: '600', color: wc.textMuted },
  datePillNum: { fontSize: 14, fontWeight: '600', color: wc.textPrimary },
  datePillCount: { fontSize: 11, color: wc.textMuted },
  datePillTextActive: { color: '#fff' },

  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: { borderWidth: 1, borderColor: wc.borderStrong, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  slotChipActive: { backgroundColor: wc.fillAccent, borderColor: wc.fillAccent },
  slotChipDisabled: { opacity: 0.4 },
  slotChipText: { fontSize: 14, fontWeight: '500', color: wc.textPrimary },
  slotChipTextActive: { color: '#fff' },
  slotChipTextDisabled: { color: wc.textMuted },
});

const cx = StyleSheet.create({
  centerWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 16, fontWeight: '600', color: wc.textPrimary, marginBottom: 8 },
  body: { fontSize: 14, color: wc.textSecondary, lineHeight: 18, marginBottom: 14 },
  actions: { flexDirection: 'row', gap: 8 },
});
