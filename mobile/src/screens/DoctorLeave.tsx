// src/screens/DoctorLeave.tsx — Leave & Exceptions (list). Mirrors web's .portal card/tag styling.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE_URL, authFetch } from '../api';
import { clinicDateTime, clinicTime } from '../lib/appointmentTime';
import { ws, wc } from '../webStyle';
import { PageHeader } from '../components/PageHeader';

export type LeaveRow = { id: number; startTime: string; endTime: string; reason?: string };

function isSingleDay(row: LeaveRow) {
  return new Date(row.startTime).toDateString() === new Date(row.endTime).toDateString();
}

function Row({ row, expired, onEdit, onDelete, busy }: {
  row: LeaveRow; expired?: boolean; onEdit: () => void; onDelete: () => void; busy: boolean;
}) {
  return (
    <View style={[ws.dr, s.row]}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowDate}>{clinicDateTime(row.startTime).split(',')[0]} · {isSingleDay(row) ? 'Single day' : 'Date range'}</Text>
        <Text style={s.rowMeta}>{clinicTime(row.startTime)} – {clinicTime(row.endTime)}</Text>
        {row.reason ? <Text style={s.rowMeta}>{row.reason}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <View style={[ws.tag, expired ? ws.tmute : ws.tok]}><Text style={[ws.tagText, expired ? ws.tmuteText : ws.tokText]}>{expired ? 'Expired' : 'Blocked'}</Text></View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {!expired && <TouchableOpacity style={ws.bg} onPress={onEdit} activeOpacity={0.75}><Text style={ws.bgText}>Edit</Text></TouchableOpacity>}
          <TouchableOpacity style={ws.bg} onPress={onDelete} disabled={busy} activeOpacity={0.75}>
            <Text style={ws.bgText}>{busy ? '…' : 'Remove'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function DoctorLeave() {
  const router = useRouter();
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/doctor/schedule`, { cache: 'no-store' });
      const j = res.ok ? await res.json() : { blocks: [] };
      setRows(Array.isArray(j.blocks) ? j.blocks : []);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function remove(id: number) {
    setBusyId(id);
    try {
      await authFetch(`${API_BASE_URL}/doctor/schedule/blocks/${id}`, { method: 'DELETE' });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const now = new Date();
  const upcoming = rows.filter(r => new Date(r.endTime) >= now).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const past = rows.filter(r => new Date(r.endTime) < now).sort((a, b) => b.startTime.localeCompare(a.startTime));

  return (
    <View style={{ flex: 1 }}>
      <PageHeader
        title="Leave & Exceptions"
        showBack={false}
        right={
          <TouchableOpacity style={ws.bp} onPress={() => router.push('/(app)/doctor/leave/new' as any)} activeOpacity={0.8}>
            <Text style={ws.bpText}>+ New</Text>
          </TouchableOpacity>
        }
      />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={wc.fillAccent} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
          <View style={ws.card}>
            <Text style={ws.ct}>Upcoming blocked periods — {upcoming.length} {upcoming.length === 1 ? 'entry' : 'entries'}</Text>
            {upcoming.length === 0 ? (
              <Text style={s.emptyText}>No upcoming blocked periods.</Text>
            ) : (
              upcoming.map(r => <Row key={r.id} row={r} onEdit={() => router.push({ pathname: '/(app)/doctor/leave/new', params: { row: JSON.stringify(r) } } as any)} onDelete={() => remove(r.id)} busy={busyId === r.id} />)
            )}
          </View>

          {past.length > 0 && (
            <View style={[ws.card, { opacity: 0.7 }]}>
              <Text style={ws.ct}>Past blocked periods — {past.length} {past.length === 1 ? 'entry' : 'entries'}</Text>
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
  rowDate: { fontSize: 14, fontWeight: '600', color: wc.textPrimary },
  rowMeta: { fontSize: 12, color: wc.textMuted, marginTop: 1 },
});
