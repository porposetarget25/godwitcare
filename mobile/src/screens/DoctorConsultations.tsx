// src/screens/DoctorConsultations.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '../api';
import { Btn, Card, Muted, Strong, LoadingView } from '../components/UI';
import { colors, spacing, radius, typography, shadow } from '../theme';
import { PageHeader } from '../components/PageHeader';

type Item = {
  id: number;
  patientName: string;
  patientEmail: string;
  createdAt: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
};

const TABS = ['PENDING', 'COMPLETED', 'ALL'] as const;
type Tab = typeof TABS[number];

export default function DoctorConsultations() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('PENDING');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (which: Tab) => {
    setLoading(true);
    try {
      const q = which === 'ALL' ? '' : `?status=${which}`;
      const res = await fetch(`${API_BASE_URL}/doctor/consultations${q}`, { credentials: 'include' });
      const j = await res.json();
      setItems(Array.isArray(j) ? j : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Consultation Requests" showBack={false} />
      <ScrollView contentContainerStyle={styles.container}>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Btn
            key={t}
            label={t}
            onPress={() => setTab(t)}
            variant={tab === t ? 'primary' : 'secondary'}
            style={{ flex: 1 }}
          />
        ))}
      </View>

      {loading && <LoadingView />}

      {!loading && items.length === 0 && (
        <Card><Muted>No consultations found.</Muted></Card>
      )}

      {!loading && items.map((it) => {
        const dt = new Date(it.createdAt);
        const when = `${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}`;
        return (
          <Card key={it.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Strong>{it.patientName || it.patientEmail}</Strong>
              <Muted style={{ fontSize: 12 }}>#{it.id} · {when} · {it.status}</Muted>
            </View>
            <Btn label="Open" onPress={() => router.push(`/(app)/doctor/consultation/${it.id}`)} />
          </Card>
        );
      })}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: 60, backgroundColor: colors.bgGray },
  tabRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
});
