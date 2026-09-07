// src/screens/DoctorAvailability.tsx — Availability Setup (list). Mirrors web's .portal card/tag styling.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE_URL, authFetch } from '../api';
import { ws, wc } from '../webStyle';
import { PageHeader } from '../components/PageHeader';

export type AvailabilityRow = { id: number; startDate: string; endDate: string; startTime: string; endTime: string; activeDays: number[] };

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function countWorkDays(startDate: string, endDate: string, activeDays: number[]) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (end < start) return 0;
  let count = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const weekday = ((d.getDay() + 6) % 7) + 1;
    if (activeDays.includes(weekday)) count++;
  }
  return count;
}
function slotsFor(row: AvailabilityRow) {
  const [sh, sm] = row.startTime.slice(0, 5).split(':').map(Number);
  const [eh, em] = row.endTime.slice(0, 5).split(':').map(Number);
  const minutes = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
  const perDay = Math.floor(minutes / 15);
  return perDay * countWorkDays(row.startDate, row.endDate, row.activeDays);
}

function Row({ row, expired, onEdit, onDelete, busy }: {
  row: AvailabilityRow; expired?: boolean; onEdit: () => void; onDelete: () => void; busy: boolean;
}) {
  return (
    <View style={[ws.dr, s.row]}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowDates}>{row.startDate} – {row.endDate}</Text>
        <Text style={s.rowMeta}>{row.startTime.slice(0, 5)} – {row.endTime.slice(0, 5)} · {row.activeDays.slice().sort().map(d => DAY_NAMES[d - 1]).join(', ')}</Text>
        <Text style={s.rowMeta}>{slotsFor(row)} slots</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <View style={[ws.tag, expired ? ws.tmute : ws.tok]}><Text style={[ws.tagText, expired ? ws.tmuteText : ws.tokText]}>{expired ? 'Expired' : 'Active'}</Text></View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {!expired && <TouchableOpacity style={ws.bg} onPress={onEdit} activeOpacity={0.75}><Text style={ws.bgText}>Edit</Text></TouchableOpacity>}
          <TouchableOpacity style={ws.bg} onPress={onDelete} disabled={busy} activeOpacity={0.75}>
            <Text style={ws.bgText}>{busy ? '…' : 'Delete'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function DoctorAvailability() {
  const router = useRouter();
  const [rows, setRows] = useState<AvailabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/doctor/schedule`, { cache: 'no-store' });
      const j = res.ok ? await res.json() : { availability: [] };
      setRows(Array.isArray(j.availability) ? j.availability : []);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function remove(id: number) {
    setBusyId(id);
    try {
      await authFetch(`${API_BASE_URL}/doctor/schedule/availability/${id}`, { method: 'DELETE' });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const active = rows.filter(r => r.endDate >= today);
  const past = rows.filter(r => r.endDate < today);

  return (
    <View style={{ flex: 1 }}>
      <PageHeader
        title="Availability Setup"
        showBack={false}
        right={
          <TouchableOpacity style={ws.bp} onPress={() => router.push('/(app)/doctor/availability/new' as any)} activeOpacity={0.8}>
            <Text style={ws.bpText}>+ New</Text>
          </TouchableOpacity>
        }
      />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={wc.fillAccent} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
          <View style={ws.card}>
            <Text style={ws.ct}>Active schedules — {active.length} {active.length === 1 ? 'block' : 'blocks'}</Text>
            {active.length === 0 ? (
              <Text style={s.emptyText}>No availability configured. The default 09:00–17:00 clinic schedule remains active.</Text>
            ) : (
              active.map(r => <Row key={r.id} row={r} onEdit={() => router.push({ pathname: '/(app)/doctor/availability/new', params: { row: JSON.stringify(r) } } as any)} onDelete={() => remove(r.id)} busy={busyId === r.id} />)
            )}
          </View>

          {past.length > 0 && (
            <View style={[ws.card, { opacity: 0.7 }]}>
              <Text style={ws.ct}>Past schedules — {past.length} {past.length === 1 ? 'block' : 'blocks'}</Text>
              {past.map(r => <Row key={r.id} row={r} expired onEdit={() => {}} onDelete={() => remove(r.id)} busy={busyId === r.id} />)}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  emptyText: { fontSize: 14, color: wc.textMuted },

  row: { alignItems: 'flex-start' },
  rowDates: { fontSize: 14, fontWeight: '600', color: wc.textPrimary },
  rowMeta: { fontSize: 12, color: wc.textMuted, marginTop: 1 },
});
