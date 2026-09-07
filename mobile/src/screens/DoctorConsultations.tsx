// src/screens/DoctorConsultations.tsx — mirrors web's .portal card/tag/tabs styling.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE_URL, authFetch } from '../api';
import { LoadingView } from '../components/UI';
import { ws, wc } from '../webStyle';
import { PageHeader } from '../components/PageHeader';
import { FormScrollView } from '../components/FormScrollView';

type Item = {
  id: number;
  patientName: string;
  patientEmail: string;
  createdAt: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
};

const TABS = ['PENDING', 'COMPLETED', 'ALL'] as const;
type Tab = typeof TABS[number];
const TAB_LABELS: Record<Tab, string> = { PENDING: 'Upcoming', COMPLETED: 'Completed', ALL: 'All' };

type DateFilter = 'ALL' | 'LAST_7' | 'LAST_30';
const DATE_FILTER_LABELS: Record<DateFilter, string> = { ALL: 'All time', LAST_7: 'Last 7 Days', LAST_30: 'Last 30 Days' };

function dateInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function statusStyle(status: Item['status']) {
  if (status === 'PENDING') return { box: ws.tinfo, text: ws.tinfoText, label: 'Confirmed' };
  if (status === 'COMPLETED') return { box: ws.tmute, text: ws.tmuteText, label: 'Completed' };
  return { box: ws.twarn, text: ws.twarnText, label: status.replace('_', ' ') };
}

export default function DoctorConsultations() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('PENDING');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [showDateSheet, setShowDateSheet] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (which: Tab) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (which !== 'ALL') query.set('status', which);
      if (debouncedSearch) query.set('patientName', debouncedSearch);
      if (dateFilter === 'LAST_7' || dateFilter === 'LAST_30') {
        const from = new Date();
        from.setDate(from.getDate() - (dateFilter === 'LAST_7' ? 6 : 29));
        query.set('from', dateInputValue(from));
        query.set('to', dateInputValue(new Date()));
      }
      const q = query.toString();
      const res = await authFetch(`${API_BASE_URL}/doctor/consultations${q ? `?${q}` : ''}`);
      const j = await res.json();
      setItems(Array.isArray(j) ? j : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, debouncedSearch]);

  useEffect(() => { load(tab); }, [tab, load]);

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Consultation History" subtitle={`${items.length} ${items.length === 1 ? 'consultation' : 'consultations'}`} showBack={false} />
      <FormScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

        {/* Tabs */}
        <View style={s.tabRow}>
          {TABS.map(t => (
            <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabOn]} onPress={() => setTab(t)} activeOpacity={0.75}>
              <Text style={[s.tabText, tab === t && s.tabTextOn]}>{TAB_LABELS[t]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search + date filter */}
        <View style={s.filterRow}>
          <View style={s.searchWrap}>
            <Text style={{ fontSize: 14, opacity: 0.45 }}>🔍</Text>
            <TextInput style={s.searchInput} value={search} onChangeText={setSearch} placeholder="Search patient name…" placeholderTextColor={wc.textMuted} />
          </View>
          <TouchableOpacity style={s.dateBtn} onPress={() => setShowDateSheet(true)} activeOpacity={0.75}>
            <Text style={s.dateBtnText}>{DATE_FILTER_LABELS[dateFilter]}</Text>
            <Text style={{ fontSize: 10, color: wc.textMuted }}>▾</Text>
          </TouchableOpacity>
        </View>

        {loading && <LoadingView />}

        {!loading && items.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No consultations match your filters — try changing the patient name or date range.</Text>
          </View>
        )}

        {!loading && items.map(it => {
          const dt = new Date(it.createdAt);
          const st = statusStyle(it.status);
          return (
            <TouchableOpacity key={it.id} style={[ws.card, s.row]} onPress={() => router.push(`/(app)/doctor/consultation/${it.id}` as any)} activeOpacity={0.75}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowName}>{it.patientName || it.patientEmail || 'Unknown patient'}</Text>
                <Text style={s.rowMeta}>
                  Consultation #{it.id} · {dt.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
                  {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={[ws.tag, st.box]}><Text style={[ws.tagText, st.text]}>{st.label}</Text></View>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          );
        })}
      </FormScrollView>

      <Modal visible={showDateSheet} transparent animationType="slide" onRequestClose={() => setShowDateSheet(false)}>
        <TouchableOpacity style={ds.overlay} activeOpacity={1} onPress={() => setShowDateSheet(false)} />
        <View style={ds.sheet}>
          <View style={ds.handle} />
          <Text style={ds.title}>Filter by Date</Text>
          {(Object.keys(DATE_FILTER_LABELS) as DateFilter[]).map(df => (
            <TouchableOpacity key={df} style={[ds.option, dateFilter === df && ds.optionActive]} onPress={() => { setDateFilter(df); setShowDateSheet(false); }} activeOpacity={0.7}>
              <Text style={[ds.optLabel, dateFilter === df && ds.optLabelActive]}>{DATE_FILTER_LABELS[df]}</Text>
              {dateFilter === df && <Text style={{ color: wc.fillAccent, fontWeight: '700' }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tab: { flex: 1, borderWidth: 1, borderColor: wc.borderStrong, borderRadius: 8, paddingVertical: 8, alignItems: 'center', backgroundColor: wc.surface2 },
  tabOn: { backgroundColor: wc.fillAccent, borderColor: wc.fillAccent },
  tabText: { fontSize: 14, fontWeight: '500', color: wc.textSecondary },
  tabTextOn: { color: '#fff' },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 11 },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: wc.borderStrong, borderRadius: 8, backgroundColor: wc.surface2, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 14, color: wc.textPrimary, paddingVertical: 9 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: wc.borderStrong, borderRadius: 8, backgroundColor: wc.surface2, paddingHorizontal: 12, paddingVertical: 9 },
  dateBtnText: { fontSize: 12, fontWeight: '500', color: wc.textPrimary },

  emptyCard: { backgroundColor: wc.surface2, borderRadius: 8, borderWidth: 1, borderColor: wc.borderStrong, padding: 28, alignItems: 'center' },
  emptyText: { fontSize: 14, color: wc.textMuted, textAlign: 'center' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowName: { fontSize: 14, fontWeight: '600', color: wc.textPrimary },
  rowMeta: { fontSize: 12, color: wc.textMuted, marginTop: 1 },
  chevron: { fontSize: 19, color: wc.textMuted },
});

const ds = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: wc.surface2, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: wc.borderStronger, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '600', color: wc.textPrimary, textAlign: 'center', paddingVertical: 14 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  optionActive: { backgroundColor: wc.bgAccent },
  optLabel: { fontSize: 15, color: wc.textPrimary, fontWeight: '500' },
  optLabelActive: { fontWeight: '600', color: wc.textAccent },
});
