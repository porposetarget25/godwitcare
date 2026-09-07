// src/screens/DoctorDashboard.tsx — Today's Schedule (doctor landing page). Mirrors web's .portal card/tag styling.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE_URL, authFetch } from '../api';
import { clinicDateKey, clinicTime, clinicTodayLabel } from '../lib/appointmentTime';
import { ws, wc } from '../webStyle';
import { PageHeader } from '../components/PageHeader';

type Appointment = {
  id: number;
  startTime: string;
  endTime: string;
  documentationEndTime: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  patientName: string;
  consultationId: number;
};

function appointmentCountdown(startTime: string) {
  const minutes = Math.ceil((new Date(startTime).getTime() - Date.now()) / 60000);
  if (minutes <= 0) return 'Ready now';
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `in ${hours}h${remainder ? ` ${remainder}m` : ''}`;
}

export default function DoctorDashboard() {
  const router = useRouter();
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    authFetch(`${API_BASE_URL}/doctor/appointments`, { cache: 'no-store' })
      .then(res => res.ok ? res.json() : [])
      .then(data => { if (alive) setItems(Array.isArray(data) ? data : []); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const todayKey = clinicDateKey();
  const todayItems = useMemo(
    () => items.filter(a => clinicDateKey(a.startTime) === todayKey && a.status !== 'CANCELLED').sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [items, todayKey],
  );
  const nextAppointment = todayItems.find(a => new Date(a.endTime).getTime() > Date.now());
  const queue = nextAppointment ? todayItems.filter(a => a.id !== nextAppointment.id) : todayItems;

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Today's Schedule" subtitle={clinicTodayLabel()} showBack={false} />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={wc.fillAccent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
          {nextAppointment ? (
            <View style={s.nextCard}>
              <Text style={s.nextEyebrow}>▶ NEXT UP — {appointmentCountdown(nextAppointment.startTime)}</Text>
              <Text style={s.nextName}>{nextAppointment.patientName || 'Patient'}</Text>
              <View style={s.nextMetaRow}>
                <Text style={s.nextTime}>{clinicTime(nextAppointment.startTime)} – {clinicTime(nextAppointment.endTime)}</Text>
                <View style={[ws.tag, ws.tinfo]}><Text style={[ws.tagText, ws.tinfoText]}>{nextAppointment.status}</Text></View>
              </View>
              <TouchableOpacity style={[ws.bp, { marginTop: 8 }]} onPress={() => router.push(`/(app)/doctor/consultation/${nextAppointment.consultationId}` as any)} activeOpacity={0.85}>
                <Text style={ws.bpText}>▶ Start</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>No more appointments today — your schedule is clear.</Text>
            </View>
          )}

          <View style={ws.card}>
            <View style={s.queueHeader}>
              <Text style={ws.ct}>Today's Queue</Text>
              <Text style={s.queueCount}>{queue.length} remaining</Text>
            </View>
            {queue.length === 0 ? (
              <Text style={s.emptySub}>There are no other appointments in today's queue.</Text>
            ) : (
              queue.map(a => (
                <View key={a.id} style={[ws.dr, s.queueRow]}>
                  <Text style={s.queueTime}>{clinicTime(a.startTime)} – {clinicTime(a.endTime)}</Text>
                  <Text style={s.queuePatient} numberOfLines={1}>{a.patientName || 'Patient'} · Doc. until {clinicTime(a.documentationEndTime)}</Text>
                  <TouchableOpacity style={ws.bg} onPress={() => router.push(`/(app)/doctor/consultation/${a.consultationId}` as any)} activeOpacity={0.75}>
                    <Text style={ws.bgText}>View</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },

  nextCard: { backgroundColor: wc.surface2, borderRadius: 8, borderWidth: 1, borderColor: wc.borderStrong, borderLeftWidth: 3, borderLeftColor: wc.fillAccent, padding: 14, marginBottom: 11 },
  nextEyebrow: { fontSize: 12, fontWeight: '600', color: wc.textMuted, letterSpacing: 0.4 },
  nextName: { fontSize: 17, fontWeight: '600', color: wc.textPrimary, marginTop: 2 },
  nextMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  nextTime: { fontSize: 14, color: wc.textSecondary },

  emptyCard: { backgroundColor: wc.surface2, borderRadius: 8, borderWidth: 1, borderColor: wc.borderStrong, padding: 28, alignItems: 'center', marginBottom: 11 },
  emptyText: { fontSize: 14, color: wc.textMuted, textAlign: 'center' },

  queueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  queueCount: { fontSize: 12, color: wc.textMuted },
  emptySub: { fontSize: 14, color: wc.textMuted },

  queueRow: { alignItems: 'center', gap: 8 },
  queueTime: { fontSize: 12, fontWeight: '600', color: wc.textPrimary, minWidth: 92 },
  queuePatient: { flex: 1, fontSize: 12, color: wc.textSecondary },
});
