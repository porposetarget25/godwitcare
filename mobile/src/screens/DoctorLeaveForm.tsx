// src/screens/DoctorLeaveForm.tsx — new/edit leave & exception entry. Mirrors web's .portal card/field styling.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL, authFetch } from '../api';
import type { LeaveRow } from './DoctorLeave';
import { ws, wc } from '../webStyle';
import { PageHeader } from '../components/PageHeader';
import { FormScrollView } from '../components/FormScrollView';

function dateKeyOf(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}
function timeOf(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function localInstant(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}
function timeOptions() {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += 30) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
}
const TIME_OPTIONS = timeOptions();

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

export default function DoctorLeaveForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ row?: string }>();
  const editing: LeaveRow | null = params.row ? JSON.parse(params.row) : null;

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [date, setDate] = useState(editing ? dateKeyOf(editing.startTime) : tomorrow);
  const [startTime, setStartTime] = useState(editing ? timeOf(editing.startTime) : '09:00');
  const [endTime, setEndTime] = useState(editing ? timeOf(editing.endTime) : '17:00');
  const [reason, setReason] = useState(editing?.reason || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartSheet, setShowStartSheet] = useState(false);
  const [showEndSheet, setShowEndSheet] = useState(false);

  async function save() {
    setErr(null);
    if (endTime <= startTime) { setErr('End time must be after start time.'); return; }
    setSaving(true);
    try {
      if (editing) {
        await authFetch(`${API_BASE_URL}/doctor/schedule/blocks/${editing.id}`, { method: 'DELETE' });
      }
      const res = await authFetch(`${API_BASE_URL}/doctor/schedule/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime: localInstant(date, startTime), endTime: localInstant(date, endTime), reason: reason.trim() }),
      });
      if (!res.ok) { const t = await res.json().catch(() => null); throw new Error(t?.message || `HTTP ${res.status}`); }
      router.replace('/(app)/doctor/leave' as any);
    } catch (e: any) {
      setErr(e?.message || 'Unable to save this entry.');
    } finally {
      setSaving(false);
    }
  }

  const errText = err && err.toLowerCase().includes('confirmed') ? `${err} Reschedule or cancel the affected consultation first.` : err;

  return (
    <View style={{ flex: 1 }}>
      <PageHeader
        title={editing ? 'Edit Entry' : 'New Entry'}
        right={
          <TouchableOpacity style={ws.bd} onPress={save} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator size="small" color={wc.textDanger} /> : <Text style={ws.bdText}>Save</Text>}
          </TouchableOpacity>
        }
      />
      <FormScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        {errText && <View style={[ws.notice, ws.nWarn]}><Text style={[ws.noticeText, ws.nWarnText]}>{errText}</Text></View>}

        <View style={ws.card}>
          <Text style={ws.ct}>Date & Time</Text>
          <Text style={ws.fl2}>Date</Text>
          <TouchableOpacity style={ws.input} onPress={() => setShowDatePicker(true)} activeOpacity={0.75}>
            <Text style={s.selectorText}>{date}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker value={new Date(`${date}T00:00:00`)} mode="date" display="default"
              onChange={(_, d) => { setShowDatePicker(Platform.OS === 'ios'); if (d) setDate(d.toISOString().slice(0, 10)); }} />
          )}
          <View style={ws.g2Row}>
            <View style={ws.g2Col}>
              <Text style={ws.fl2}>From</Text>
              <TouchableOpacity style={ws.input} onPress={() => setShowStartSheet(true)} activeOpacity={0.75}>
                <Text style={s.selectorText}>{startTime}</Text>
              </TouchableOpacity>
            </View>
            <View style={ws.g2Col}>
              <Text style={ws.fl2}>To</Text>
              <TouchableOpacity style={ws.input} onPress={() => setShowEndSheet(true)} activeOpacity={0.75}>
                <Text style={s.selectorText}>{endTime}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={ws.fiHint}>For a single day off, this is all you need.</Text>
        </View>

        <View style={ws.card}>
          <Text style={ws.ct}>Reason (optional)</Text>
          <TextInput style={ws.input} value={reason} maxLength={255} placeholder="Conference, annual leave…" placeholderTextColor={wc.textMuted} onChangeText={setReason} />
        </View>

        <View style={[ws.notice, ws.nInfo]}>
          <Text style={[ws.noticeText, ws.nInfoText]}>If this period contains a confirmed consultation, saving will be rejected — reschedule or cancel it first, then try again.</Text>
        </View>
      </FormScrollView>

      <TimeSheet visible={showStartSheet} title="From" value={startTime} onSelect={setStartTime} onClose={() => setShowStartSheet(false)} />
      <TimeSheet visible={showEndSheet} title="To" value={endTime} onSelect={setEndTime} onClose={() => setShowEndSheet(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  selectorText: { fontSize: 14, color: wc.textPrimary, fontWeight: '500' },
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
