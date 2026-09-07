// src/screens/DoctorAvailabilityForm.tsx — new/edit availability block. Mirrors web's .portal card/field styling.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Platform, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL, authFetch } from '../api';
import type { AvailabilityRow } from './DoctorAvailability';
import { ws, wc } from '../webStyle';
import { PageHeader } from '../components/PageHeader';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function timeOptions() {
  const out: string[] = [];
  for (let m = 6 * 60; m <= 22 * 60; m += 30) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
}
const TIME_OPTIONS = timeOptions();

function countWorkDays(startDate: string, endDate: string, activeDays: number[]) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (!startDate || !endDate || end < start) return 0;
  let count = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const weekday = ((d.getDay() + 6) % 7) + 1;
    if (activeDays.includes(weekday)) count++;
  }
  return count;
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function TimeSheet({ visible, title, value, onSelect, onClose }: {
  visible: boolean; title: string; value: string; onSelect: (v: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={ts.overlay} activeOpacity={1} onPress={onClose} />
      <View style={ts.sheet}>
        <View style={ts.handle} />
        <Text style={ts.title}>{title}</Text>
        <ScrollView style={{ maxHeight: 340 }}>
          {TIME_OPTIONS.map(t => (
            <TouchableOpacity key={t} style={[ts.option, t === value && ts.optionActive]} onPress={() => { onSelect(t); onClose(); }} activeOpacity={0.7}>
              <Text style={[ts.optLabel, t === value && ts.optLabelActive]}>{t}</Text>
              {t === value && <Text style={{ color: wc.fillAccent, fontWeight: '700' }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function DoctorAvailabilityForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ row?: string }>();
  const editing: AvailabilityRow | null = params.row ? JSON.parse(params.row) : null;

  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(editing?.startDate || today);
  const [endDate, setEndDate] = useState(editing?.endDate || today);
  const [startTime, setStartTime] = useState(editing?.startTime.slice(0, 5) || '09:00');
  const [endTime, setEndTime] = useState(editing?.endTime.slice(0, 5) || '17:00');
  const [activeDays, setActiveDays] = useState<number[]>(editing?.activeDays || [1, 2, 3, 4, 5]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showStartSheet, setShowStartSheet] = useState(false);
  const [showEndSheet, setShowEndSheet] = useState(false);

  function toggleDay(d: number) {
    setActiveDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  const workDays = countWorkDays(startDate, endDate, activeDays);
  const windowMinutes = useMemo(() => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
  }, [startTime, endTime]);
  const slotsPerDay = Math.floor(windowMinutes / 15);
  const totalSlots = workDays * slotsPerDay;

  async function save() {
    setErr(null);
    if (activeDays.length === 0) { setErr('Select at least one active day.'); return; }
    if (endTime <= startTime) { setErr('Closing time must be after opening time.'); return; }
    if (endDate < startDate) { setErr('End date must be on or after the start date.'); return; }
    setSaving(true);
    try {
      if (editing) {
        await authFetch(`${API_BASE_URL}/doctor/schedule/availability/${editing.id}`, { method: 'DELETE' });
      }
      const res = await authFetch(`${API_BASE_URL}/doctor/schedule/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, startTime, endTime, activeDays }),
      });
      if (!res.ok) { const t = await res.json().catch(() => null); throw new Error(t?.message || `HTTP ${res.status}`); }
      router.replace('/(app)/doctor/availability' as any);
    } catch (e: any) {
      setErr(e?.message || 'Unable to save availability.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <PageHeader
        title={editing ? 'Edit Availability' : 'New Availability'}
        right={
          <TouchableOpacity style={ws.bp} onPress={save} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={ws.bpText}>Save</Text>}
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        {err && <View style={[ws.notice, ws.nWarn]}><Text style={[ws.noticeText, ws.nWarnText]}>{err}</Text></View>}

        <View style={ws.card}>
          <Text style={ws.ct}>Date Range</Text>
          <View style={ws.g2Row}>
            <View style={ws.g2Col}>
              <Text style={ws.fl2}>From</Text>
              <TouchableOpacity style={ws.input} onPress={() => setShowFromPicker(true)} activeOpacity={0.75}>
                <Text style={s.selectorText}>{startDate}</Text>
              </TouchableOpacity>
            </View>
            <View style={ws.g2Col}>
              <Text style={ws.fl2}>To</Text>
              <TouchableOpacity style={ws.input} onPress={() => setShowToPicker(true)} activeOpacity={0.75}>
                <Text style={s.selectorText}>{endDate}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={ws.fiHint}>For a single day, set the same date for From and To.</Text>
          {showFromPicker && (
            <DateTimePicker value={new Date(`${startDate}T00:00:00`)} mode="date" display="default"
              onChange={(_, d) => { setShowFromPicker(Platform.OS === 'ios'); if (d) setStartDate(ymd(d)); }} />
          )}
          {showToPicker && (
            <DateTimePicker value={new Date(`${endDate}T00:00:00`)} mode="date" display="default"
              onChange={(_, d) => { setShowToPicker(Platform.OS === 'ios'); if (d) setEndDate(ymd(d)); }} />
          )}
        </View>

        <View style={ws.card}>
          <Text style={ws.ct}>Time Window</Text>
          <View style={ws.g2Row}>
            <View style={ws.g2Col}>
              <Text style={ws.fl2}>Opens at</Text>
              <TouchableOpacity style={ws.input} onPress={() => setShowStartSheet(true)} activeOpacity={0.75}>
                <Text style={s.selectorText}>{startTime}</Text>
              </TouchableOpacity>
            </View>
            <View style={ws.g2Col}>
              <Text style={ws.fl2}>Closes at</Text>
              <TouchableOpacity style={ws.input} onPress={() => setShowEndSheet(true)} activeOpacity={0.75}>
                <Text style={s.selectorText}>{endTime}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={ws.fiHint}>For more than one session per day, save this block, then add a second one for the same dates/days.</Text>
        </View>

        <View style={ws.card}>
          <Text style={ws.ct}>Active Days</Text>
          <View style={s.dayChips}>
            {DAY_NAMES.map((d, i) => (
              <TouchableOpacity key={d} style={[ws.tag, s.dayChip, activeDays.includes(i + 1) && s.dayChipOn]} onPress={() => toggleDay(i + 1)} activeOpacity={0.75}>
                <Text style={[s.dayChipText, activeDays.includes(i + 1) && s.dayChipTextOn]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[ws.fiHint, { marginTop: 6 }]}>Active: {activeDays.length ? activeDays.slice().sort().map(d => DAY_NAMES[d - 1]).join(', ') : 'none selected'}</Text>
        </View>

        <View style={[ws.notice, ws.nInfo]}>
          <Text style={[ws.noticeText, ws.nInfoText]}>{workDays} working day{workDays === 1 ? '' : 's'} · {slotsPerDay} slots per day · {totalSlots} total slots</Text>
        </View>
        <View style={[ws.notice, ws.nWarn]}>
          <Text style={[ws.noticeText, ws.nWarnText]}>Changing this schedule will not affect already confirmed consultations.</Text>
        </View>
      </ScrollView>

      <TimeSheet visible={showStartSheet} title="Opens at" value={startTime} onSelect={setStartTime} onClose={() => setShowStartSheet(false)} />
      <TimeSheet visible={showEndSheet} title="Closes at" value={endTime} onSelect={setEndTime} onClose={() => setShowEndSheet(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  selectorText: { fontSize: 14, color: wc.textPrimary, fontWeight: '500' },

  dayChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: { borderWidth: 1, borderColor: wc.borderStrong, backgroundColor: wc.surface2, paddingHorizontal: 12, paddingVertical: 7 },
  dayChipOn: { backgroundColor: wc.fillAccent, borderColor: wc.fillAccent },
  dayChipText: { fontSize: 13, fontWeight: '500', color: wc.textSecondary },
  dayChipTextOn: { color: '#fff' },
});

const ts = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: wc.surface2, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: wc.borderStronger, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '600', color: wc.textPrimary, textAlign: 'center', paddingVertical: 14 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 13 },
  optionActive: { backgroundColor: wc.bgAccent },
  optLabel: { fontSize: 14, color: wc.textPrimary },
  optLabelActive: { fontWeight: '600', color: wc.textAccent },
});
