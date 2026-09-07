// src/screens/DoctorCalendar.tsx — My Calendar (Day / Week / Month). Mirrors web's .portal card/tag styling.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE_URL, authFetch } from '../api';
import { clinicDateKey, clinicDateTime, clinicTime } from '../lib/appointmentTime';
import { ws, wc } from '../webStyle';
import { PageHeader } from '../components/PageHeader';

type Appointment = {
  id: number; startTime: string; endTime: string; documentationEndTime: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  patientName: string; patientEmail?: string; contactPhone?: string; contactAddress?: string;
  consultationId: number; reason?: string;
};
type Availability = { id: number; startDate: string; endDate: string; startTime: string; endTime: string; activeDays: number[] };
type TimeBlock = { id: number; startTime: string; endTime: string; reason?: string };
type Schedule = { availability: Availability[]; blocks: TimeBlock[] };

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOT_MINUTES = 15;
const DEFAULT_START = '09:00';
const DEFAULT_END = '17:00';

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function mondayOf(d: Date) {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  return copy;
}
function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}
function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function fromMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const CLINIC_ZONE = 'Europe/London';
function londonOffsetMinutes(utcMs: number) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: CLINIC_ZONE, timeZoneName: 'shortOffset' }).formatToParts(new Date(utcMs));
  const raw = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+0';
  const match = raw.match(/GMT([+-]\d+)(?::(\d+))?/);
  if (!match) return 0;
  const sign = match[1].startsWith('-') ? -1 : 1;
  const hours = Math.abs(parseInt(match[1], 10));
  const mins = match[2] ? parseInt(match[2], 10) : 0;
  return sign * (hours * 60 + mins);
}
function londonInstantMs(dateKeyStr: string, minutesFromMidnight: number) {
  const [y, mo, d] = dateKeyStr.split('-').map(Number);
  const guessUtc = Date.UTC(y, mo - 1, d, Math.floor(minutesFromMidnight / 60), minutesFromMidnight % 60);
  const offset = londonOffsetMinutes(guessUtc);
  return guessUtc - offset * 60000;
}

function dayWindows(key: string, weekday: number, availability: Availability[]): Array<[number, number]> {
  const configured = availability.filter(a => key >= a.startDate && key <= a.endDate);
  if (configured.length === 0) return [[toMinutes(DEFAULT_START), toMinutes(DEFAULT_END)]];
  return configured
    .filter(a => a.activeDays.includes(weekday))
    .map(a => [toMinutes(a.startTime.slice(0, 5)), toMinutes(a.endTime.slice(0, 5))]);
}
function isBlocked(dateKeyForDay: string, slotStartMin: number, slotEndMin: number, blocks: TimeBlock[]) {
  const slotStart = londonInstantMs(dateKeyForDay, slotStartMin);
  const slotEnd = londonInstantMs(dateKeyForDay, slotEndMin);
  return blocks.some(b => new Date(b.startTime).getTime() < slotEnd && new Date(b.endTime).getTime() > slotStart);
}
function bookedAppointment(dateKeyForDay: string, slotStartMin: number, slotEndMin: number, items: Appointment[]) {
  const slotStart = londonInstantMs(dateKeyForDay, slotStartMin);
  const slotEnd = londonInstantMs(dateKeyForDay, slotEndMin);
  return items.find(a => a.status !== 'CANCELLED' && new Date(a.startTime).getTime() < slotEnd && new Date(a.endTime).getTime() > slotStart);
}

type SlotState = { startMin: number; endMin: number; state: 'available' | 'booked' | 'blocked'; appointment?: Appointment };

function computeDaySlots(key: string, weekday: number, availability: Availability[], blocks: TimeBlock[], items: Appointment[]): SlotState[] {
  const windows = dayWindows(key, weekday, availability);
  const slotsByStart = new Map<number, SlotState>();
  for (const [winStart, winEnd] of windows) {
    for (let m = winStart; m + SLOT_MINUTES <= winEnd; m += SLOT_MINUTES) {
      if (slotsByStart.has(m)) continue;
      const startMin = m;
      const endMin = m + SLOT_MINUTES;
      const appt = bookedAppointment(key, startMin, endMin, items);
      const state: SlotState['state'] = appt ? 'booked' : isBlocked(key, startMin, endMin, blocks) ? 'blocked' : 'available';
      slotsByStart.set(m, { startMin, endMin, state, appointment: appt });
    }
  }
  return Array.from(slotsByStart.values()).sort((a, b) => a.startMin - b.startMin);
}

function SlotRow({ slot, onOpen }: { slot: SlotState; onOpen: () => void }) {
  const label = `${fromMinutes(slot.startMin)} – ${fromMinutes(slot.endMin)}`;
  const st = slot.state === 'booked' ? { box: ws.tinfo, text: ws.tinfoText, label: 'Booked' }
    : slot.state === 'blocked' ? { box: ws.tmute, text: ws.tmuteText, label: 'Blocked' }
    : { box: ws.tok, text: ws.tokText, label: 'Available' };
  return (
    <TouchableOpacity style={s.slotRow} onPress={slot.state === 'booked' ? onOpen : undefined} activeOpacity={slot.state === 'booked' ? 0.7 : 1} disabled={slot.state !== 'booked'}>
      <Text style={s.slotTime}>{label}</Text>
      <Text style={s.slotPatient} numberOfLines={1}>{slot.state === 'booked' ? (slot.appointment?.patientName || 'Patient') : ''}</Text>
      <View style={[ws.tag, st.box]}><Text style={[ws.tagText, st.text]}>{st.label}</Text></View>
    </TouchableOpacity>
  );
}

export default function DoctorCalendar() {
  const router = useRouter();
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [items, setItems] = useState<Appointment[]>([]);
  const [schedule, setSchedule] = useState<Schedule>({ availability: [], blocks: [] });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => clinicDateKey());
  const [month, setMonth] = useState(() => {
    const [y, m] = clinicDateKey().split('-').map(Number);
    return new Date(y, m - 1, 1);
  });
  const [selected, setSelected] = useState<Appointment | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      authFetch(`${API_BASE_URL}/doctor/appointments`, { cache: 'no-store' }).then(r => r.ok ? r.json() : []),
      authFetch(`${API_BASE_URL}/doctor/schedule`, { cache: 'no-store' }).then(r => r.ok ? r.json() : { availability: [], blocks: [] }),
    ]).then(([a, sch]) => {
      if (!alive) return;
      setItems(Array.isArray(a) ? a : []);
      setSchedule(sch || { availability: [], blocks: [] });
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const todayKey = clinicDateKey();
  const selectedDateObj = useMemo(() => new Date(`${selectedDate}T00:00:00`), [selectedDate]);
  const selectedWeekday = ((selectedDateObj.getDay() + 6) % 7) + 1;
  const weekStart = mondayOf(selectedDateObj);
  const weekDays = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const daySlots = useMemo(
    () => computeDaySlots(selectedDate, selectedWeekday, schedule.availability, schedule.blocks, items),
    [selectedDate, selectedWeekday, schedule, items],
  );
  const morningSlots = daySlots.filter(sl => sl.startMin < 12 * 60);
  const afternoonSlots = daySlots.filter(sl => sl.startMin >= 12 * 60);
  const availableCount = daySlots.filter(sl => sl.state === 'available').length;
  const bookedCount = daySlots.filter(sl => sl.state === 'booked').length;

  function openDay(key: string) {
    setSelectedDate(key);
    setView('day');
  }

  const headerSub = view === 'day'
    ? selectedDateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
    : view === 'week'
    ? `Week of ${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
    : month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="My Calendar" subtitle={headerSub} showBack={false} />
      <View style={s.viewTabs}>
        {(['day', 'week', 'month'] as const).map(v => (
          <TouchableOpacity key={v} style={[s.viewTab, view === v && s.viewTabOn]} onPress={() => setView(v)} activeOpacity={0.75}>
            <Text style={[s.viewTabText, view === v && s.viewTabTextOn]}>{v[0].toUpperCase() + v.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={wc.fillAccent} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

          {view === 'day' && (
            <View style={ws.card}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 10 }}>
                {weekDays.map(d => {
                  const key = dateKey(d);
                  const isLeave = dayWindows(key, ((d.getDay() + 6) % 7) + 1, schedule.availability).length === 0;
                  const active = key === selectedDate;
                  return (
                    <TouchableOpacity key={key} style={[s.dayPill, active && s.dayPillOn, isLeave && !active && s.dayPillWarn]} onPress={() => setSelectedDate(key)} activeOpacity={0.75}>
                      <Text style={[s.dayPillText, active && s.dayPillTextOn]}>{d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={s.legendRow}>
                <Text style={s.legendItem}>🟢 {availableCount} available</Text>
                <Text style={s.legendItem}>🔵 {bookedCount} booked</Text>
              </View>

              {daySlots.length === 0 ? (
                <Text style={s.emptyText}>No working hours configured for this day.</Text>
              ) : (
                <>
                  {morningSlots.length > 0 && <Text style={ws.fiHint}>Morning</Text>}
                  {morningSlots.map(sl => <SlotRow key={sl.startMin} slot={sl} onOpen={() => sl.appointment && setSelected(sl.appointment)} />)}
                  {afternoonSlots.length > 0 && <Text style={[ws.fiHint, { marginTop: 6 }]}>Afternoon</Text>}
                  {afternoonSlots.map(sl => <SlotRow key={sl.startMin} slot={sl} onOpen={() => sl.appointment && setSelected(sl.appointment)} />)}
                </>
              )}
            </View>
          )}

          {view === 'week' && (
            <View style={ws.card}>
              <Text style={ws.ct}>This Week's Bookings</Text>
              {weekDays.map(d => {
                const key = dateKey(d);
                const daySlotsForWeek = computeDaySlots(key, ((d.getDay() + 6) % 7) + 1, schedule.availability, schedule.blocks, items);
                const booked = daySlotsForWeek.filter(sl => sl.state === 'booked');
                const isLeave = dayWindows(key, ((d.getDay() + 6) % 7) + 1, schedule.availability).length === 0;
                return (
                  <TouchableOpacity key={key} style={[ws.dr, s.weekDayRow]} onPress={() => openDay(key)} activeOpacity={0.75}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.weekDayName, key === todayKey && { color: wc.fillAccent }]}>
                        {d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}{key === todayKey ? ' · Today' : ''}
                      </Text>
                      {isLeave ? (
                        <Text style={s.weekDaySub}>On leave</Text>
                      ) : booked.length === 0 ? (
                        <Text style={s.weekDaySub}>No bookings</Text>
                      ) : (
                        <Text style={s.weekDaySub} numberOfLines={1}>
                          {booked.map(b => `${fromMinutes(b.startMin)} ${b.appointment?.patientName?.split(' ')[0] || ''}`).join(' · ')}
                        </Text>
                      )}
                    </View>
                    <View style={[ws.tag, booked.length > 0 ? ws.tinfo : ws.tmute]}>
                      <Text style={[ws.tagText, booked.length > 0 ? ws.tinfoText : ws.tmuteText]}>{booked.length} booked</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {view === 'month' && (
            <View style={ws.card}>
              <View style={s.monthNav}>
                <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={s.navBtn}><Text style={s.navArrow}>‹</Text></TouchableOpacity>
                <Text style={s.monthLabel}>{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Text>
                <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={s.navBtn}><Text style={s.navArrow}>›</Text></TouchableOpacity>
              </View>
              <View style={s.weekRow}>
                {DAY_NAMES.map(d => <Text key={d} style={s.weekLabel}>{d}</Text>)}
              </View>
              <MonthGrid month={month} schedule={schedule} items={items} selectedDate={selectedDate} onSelect={openDay} />
              <View style={s.legendRow}>
                <Text style={s.legendItem}>🔵 Has bookings</Text>
                <Text style={s.legendItem}>🔴 On leave</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={ws.modalOverlay} activeOpacity={1} onPress={() => setSelected(null)} />
        <View style={dx.centerWrap} pointerEvents="box-none">
          {selected && (
            <View style={[ws.modalBox, { padding: 18 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={dx.title}>Appointment Details</Text>
                <TouchableOpacity onPress={() => setSelected(null)}><Text style={{ fontSize: 17, color: wc.textMuted }}>✕</Text></TouchableOpacity>
              </View>
              <View style={ws.dr}><Text style={ws.dk}>Patient</Text><Text style={ws.dv}>{selected.patientName}</Text></View>
              <View style={ws.dr}><Text style={ws.dk}>Date/time</Text><Text style={ws.dv}>{clinicDateTime(selected.startTime)} – {clinicTime(selected.endTime)}</Text></View>
              <View style={ws.dr}><Text style={ws.dk}>Status</Text><Text style={ws.dv}>{selected.status}</Text></View>
              <View style={ws.dr}><Text style={ws.dk}>Reason</Text><Text style={ws.dv}>{selected.reason || '—'}</Text></View>
              <View style={ws.dr}><Text style={ws.dk}>Contact</Text><Text style={ws.dv}>{[selected.contactPhone, selected.patientEmail, selected.contactAddress].filter(Boolean).join(' · ') || '—'}</Text></View>
              <TouchableOpacity
                style={[ws.bp, { marginTop: 10 }]}
                onPress={() => { const cid = selected.consultationId; setSelected(null); router.push(`/(app)/doctor/consultation/${cid}` as any); }}
                activeOpacity={0.85}
              >
                <Text style={ws.bpText}>Open Consultation #{selected.consultationId}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

function MonthGrid({ month, schedule, items, selectedDate, onSelect }: {
  month: Date; schedule: Schedule; items: Appointment[]; selectedDate: string; onSelect: (key: string) => void;
}) {
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = mondayOf(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);

  return (
    <View style={s.monthGrid}>
      {days.map(d => {
        const key = dateKey(d);
        const weekday = ((d.getDay() + 6) % 7) + 1;
        const windows = dayWindows(key, weekday, schedule.availability);
        const isOtherMonth = d.getMonth() !== month.getMonth();
        const bookedCountForDay = items.filter(a => a.status !== 'CANCELLED' && clinicDateKey(a.startTime) === key).length;
        const fullyBlocked = windows.length > 0 && windows.every(([st, en]) => isBlocked(key, st, en, schedule.blocks));
        return (
          <TouchableOpacity
            key={key}
            style={[s.monthCell, key === selectedDate && s.monthCellSel, fullyBlocked && s.monthCellWarn, bookedCountForDay > 0 && !fullyBlocked && s.monthCellBooked, isOtherMonth && { opacity: 0.35 }]}
            onPress={() => onSelect(key)}
            activeOpacity={0.75}
          >
            <Text style={[s.monthCellNum, key === selectedDate && { color: '#fff' }]}>{d.getDate()}</Text>
            {fullyBlocked ? <Text style={s.monthCellSub}>Leave</Text> : bookedCountForDay > 0 ? <Text style={s.monthCellSub}>{bookedCountForDay}</Text> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingTop: 10, paddingBottom: 40 },

  viewTabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 8 },
  viewTab: { flex: 1, borderWidth: 1, borderColor: wc.borderStrong, borderRadius: 8, paddingVertical: 7, alignItems: 'center', backgroundColor: wc.surface2 },
  viewTabOn: { backgroundColor: wc.fillAccent, borderColor: wc.fillAccent },
  viewTabText: { fontSize: 14, fontWeight: '500', color: wc.textSecondary },
  viewTabTextOn: { color: '#fff' },

  dayPill: { borderWidth: 1, borderColor: wc.borderStrong, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: wc.surface2 },
  dayPillOn: { backgroundColor: wc.fillAccent, borderColor: wc.fillAccent },
  dayPillWarn: { borderColor: wc.borderDanger, backgroundColor: wc.bgDanger },
  dayPillText: { fontSize: 12, fontWeight: '500', color: wc.textSecondary },
  dayPillTextOn: { color: '#fff' },

  legendRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  legendItem: { fontSize: 12, color: wc.textMuted },

  emptyText: { fontSize: 14, color: wc.textMuted },

  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: wc.border },
  slotTime: { fontSize: 12, fontWeight: '600', color: wc.textPrimary, minWidth: 90 },
  slotPatient: { flex: 1, fontSize: 12, color: wc.textSecondary },

  weekDayRow: { alignItems: 'center', gap: 8 },
  weekDayName: { fontSize: 14, fontWeight: '600', color: wc.textPrimary },
  weekDaySub: { fontSize: 12, color: wc.textMuted, marginTop: 1 },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  navBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: wc.surface1, alignItems: 'center', justifyContent: 'center' },
  navArrow: { fontSize: 17, color: wc.textPrimary },
  monthLabel: { fontSize: 14, fontWeight: '600', color: wc.textPrimary },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 11, color: wc.textMuted, fontWeight: '600' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 6, gap: 1 },
  monthCellSel: { backgroundColor: wc.fillAccent },
  monthCellWarn: { backgroundColor: wc.bgDanger },
  monthCellBooked: { backgroundColor: wc.bgAccent },
  monthCellNum: { fontSize: 12, color: wc.textPrimary, fontWeight: '600' },
  monthCellSub: { fontSize: 9, color: wc.textMuted },
});

const dx = StyleSheet.create({
  centerWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 16, fontWeight: '600', color: wc.textPrimary },
});
