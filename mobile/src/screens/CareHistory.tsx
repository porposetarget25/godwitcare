// src/screens/CareHistory.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  LayoutAnimation, Platform, UIManager, ActivityIndicator,
  Modal, FlatList,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { API_BASE_URL, authFetch } from '../api';
import { useAuth } from '../state/auth';
import { colors, spacing, radius, typography, shadow } from '../theme';
import { PageHeader } from '../components/PageHeader';
import { openPdf } from '../utils/openPdf';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

type Item = {
  consultationId: number;
  date: string;
  locationTravellingTo?: string;
  presentingComplaint?: string;
  diagnosis?: string;
  medicines?: string;
  recommendations?: string;
  pdfUrl?: string;          // this item's own prescription
  referralPdfUrl?: string;  // this item's own referral letter
};
type Payload = {
  patient: {
    name: string;
    patientId?: string | number;
    dob?: string;
    gender?: string;
  };
  items: Item[];
};

function fmtDate(d: string) {
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── Patient overview header card ──────────────────────────────────────────────
function PatientCard({ patient, total, rxUrl }: {
  patient: Payload['patient']; total: number; rxUrl: string | null;
}) {
  return (
    <View style={s.heroCard}>
      <View style={s.heroDecor1} />
      <View style={s.heroDecor2} />

      <View style={s.heroTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.heroLabel}>Patient Overview</Text>
          <Text style={s.heroName}>{patient.name || '—'}</Text>
        </View>
        <View style={s.heroBadge}>
          <Text style={s.heroBadgeText}>{total} visit{total !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      <View style={s.heroStats}>
        <View style={s.heroStat}>
          <Text style={s.heroStatLabel}>Patient ID</Text>
          <Text style={s.heroStatValue}>{String(patient.patientId ?? '—')}</Text>
        </View>
        <View style={s.heroStatDivider} />
        <View style={s.heroStat}>
          <Text style={s.heroStatLabel}>Gender</Text>
          <Text style={s.heroStatValue}>{patient.gender || '—'}</Text>
        </View>
        <View style={s.heroStatDivider} />
        <View style={s.heroStat}>
          <Text style={s.heroStatLabel}>Date of Birth</Text>
          <Text style={s.heroStatValue}>{patient.dob || '—'}</Text>
        </View>
      </View>

      {rxUrl && (
        <TouchableOpacity style={s.rxBtn} onPress={() => openPdf(rxUrl, 'Prescription')} activeOpacity={0.85}>
          <Text style={s.rxBtnIcon}>💊</Text>
          <Text style={s.rxBtnText}>View Latest Prescription</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Consultation item card ────────────────────────────────────────────────────
function ConsultCard({ item, index }: { item: Item; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const meds = (item.medicines || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(o => !o);
  }

  const SECTIONS = [
    { label: 'Location',             value: item.locationTravellingTo },
    { label: 'Presenting Complaint', value: item.presentingComplaint  },
    { label: 'Diagnosis',            value: item.diagnosis            },
    { label: 'Recommendations',      value: item.recommendations      },
  ];

  return (
    <View style={s.card}>
      <TouchableOpacity style={s.cardHeader} onPress={toggle} activeOpacity={0.75}>
        <View style={[s.cardIcon, open && s.cardIconOpen]}>
          <Text style={s.cardIconEmoji}>🩺</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardTitle}>Consultation #{item.consultationId}</Text>
            <View style={s.datePill}>
              <Text style={s.datePillText}>{fmtDate(item.date)}</Text>
            </View>
          </View>
          {!open && (item.diagnosis || item.presentingComplaint) && (
            <Text style={s.cardPreview} numberOfLines={1}>
              {item.diagnosis || item.presentingComplaint}
            </Text>
          )}
        </View>
        <Text style={[s.caret, open && s.caretOpen]}>›</Text>
      </TouchableOpacity>

      {open && (
        <View style={s.cardBody}>
          {SECTIONS.map(sec => sec.value ? (
            <View key={sec.label} style={s.section}>
              <Text style={s.sectionLabel}>{sec.label}</Text>
              <Text style={s.sectionValue}>{sec.value}</Text>
            </View>
          ) : null)}

          {meds.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>Medicines Given</Text>
              {meds.map((m, i) => (
                <View key={i} style={s.medRow}>
                  <View style={s.medDot} />
                  <Text style={s.sectionValue}>{m}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {item.pdfUrl && (
                <TouchableOpacity style={s.itemActionBtn} onPress={() => openPdf(item.pdfUrl!, 'Prescription')} activeOpacity={0.75}>
                  <Text style={s.itemActionBtnText}>View Prescription</Text>
                </TouchableOpacity>
              )}
              {item.referralPdfUrl ? (
                <TouchableOpacity style={s.itemActionBtn} onPress={() => openPdf(item.referralPdfUrl!, 'Referral Letter')} activeOpacity={0.75}>
                  <Text style={s.itemActionBtnText}>View Referral Letter</Text>
                </TouchableOpacity>
              ) : (
                <View style={[s.itemActionBtn, { opacity: 0.5 }]}>
                  <Text style={s.itemActionBtnText}>Referral Letter Not Generated</Text>
                </View>
              )}
          </View>
        </View>
      )}
    </View>
  );
}

// ── Traveller option type ──────────────────────────────────────────────────────
type TravellerOpt = { key: string; label: string; travellerId?: number };

// ── Traveller picker sheet ─────────────────────────────────────────────────────
function TravellerSheet({ visible, options, selected, onSelect, onClose }: {
  visible: boolean; options: TravellerOpt[]; selected: string;
  onSelect: (k: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={ts.overlay} activeOpacity={1} onPress={onClose} />
      <View style={ts.sheet}>
        <View style={ts.handle} />
        <Text style={ts.title}>Select Traveller</Text>
        <FlatList
          data={options}
          keyExtractor={i => i.key}
          style={{ maxHeight: 300 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.line, marginHorizontal: spacing.xl }} />}
          renderItem={({ item }) => {
            const active = item.key === selected;
            return (
              <TouchableOpacity
                style={[ts.option, active && ts.optionActive]}
                onPress={() => { onSelect(item.key); onClose(); }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[ts.optLabel, active && ts.optLabelActive]}>{item.label}</Text>
                </View>
                {active && <Text style={{ color: colors.brand, fontWeight: '700', fontSize: 16 }}>✓</Text>}
              </TouchableOpacity>
            );
          }}
        />
        <TouchableOpacity style={ts.cancelBtn} onPress={onClose} activeOpacity={0.75}>
          <Text style={ts.cancelTxt}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CareHistory() {
  const { user } = useAuth();
  const params     = useLocalSearchParams<{ travelerId?: string; patientId?: string }>();
  const initTravelerId = params.travelerId;
  const patientId  = params.patientId;

  const [data,    setData   ] = useState<Payload | null>(null);
  const [rxUrl,   setRxUrl  ] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr    ] = useState<string | null>(null);

  const [travellerOptions, setTravellerOptions] = useState<TravellerOpt[]>([]);
  const [selectedTravellerKey, setSelectedTravellerKey] = useState<string>('all');
  const [showSheet, setShowSheet] = useState(false);

  useEffect(() => {
    const email = user?.email;
    if (!email) return;
    let alive = true;
    (async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/registrations?email=${encodeURIComponent(email)}`);
        if (!alive) return;
        if (res.ok) {
          const json = await res.json();
          const reg = Array.isArray(json) ? json[json.length - 1] : json;
          if (reg) {
            const opts: TravellerOpt[] = [{ key: 'all', label: 'All Travellers' }];
            if (Array.isArray(reg.travelers)) {
              reg.travelers.forEach((t: any, idx: number) => {
                opts.push({
                  key: `trav-${t?.id ?? idx}`,
                  label: t?.fullName || `Traveller ${idx + 1}`,
                  travellerId: t?.id,
                });
              });
            }
            setTravellerOptions(opts);
            if (initTravelerId) {
              const match = opts.find(o => o.travellerId === Number(initTravelerId));
              if (match) setSelectedTravellerKey(match.key);
            }
          }
        }
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, [user?.email, initTravelerId]);

  const effectiveTravelerId = useMemo(() => {
    if (selectedTravellerKey === 'all') return undefined;
    const opt = travellerOptions.find(o => o.key === selectedTravellerKey);
    return opt?.travellerId;
  }, [selectedTravellerKey, travellerOptions]);

  const selectedLabel = useMemo(() => {
    const opt = travellerOptions.find(o => o.key === selectedTravellerKey);
    return opt?.label ?? 'All Travellers';
  }, [selectedTravellerKey, travellerOptions]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        setData(null);
        setRxUrl(null);

        const qp = new URLSearchParams();
        if (effectiveTravelerId) qp.set('travelerId', String(effectiveTravelerId));
        if (patientId)  qp.set('patientId',  patientId);
        const qs = qp.toString() ? `?${qp.toString()}` : '';

        const r = await authFetch(`${API_BASE_URL}/care-history/mine${qs}`);
        if (!ignore) {
          if      (r.status === 204) setData(null);
          else if (r.ok)             setData(await r.json());
          else                       setErr(`Failed to load (HTTP ${r.status})`);
        }

        const r2 = await authFetch(`${API_BASE_URL}/prescriptions/latest${qs}`);
        if (!ignore && r2.ok && r2.status !== 204) {
          const j = await r2.json().catch(() => null);
          setRxUrl(j?.pdfUrl ?? null);
        }
      } catch (e: any) {
        if (!ignore) setErr(e?.message || 'Failed to load');
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [effectiveTravelerId, patientId]);

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Care History" />

      <TouchableOpacity style={s.travellerBar} onPress={() => setShowSheet(true)} activeOpacity={0.7}>
        <Text style={s.travellerBarLabel}>Showing</Text>
        <Text style={s.travellerBarValue}>{selectedLabel}</Text>
        <Text style={s.travellerBarCaret}>▼</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={s.loadingText}>Loading your history…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

          {err && (
            <View style={s.errorBanner}>
              <Text style={s.errorIcon}>⚠️</Text>
              <Text style={s.errorText}>{err}</Text>
            </View>
          )}

          {!err && !data && (
            <View style={s.emptyCard}>
              <Text style={{ fontSize: 44 }}>📋</Text>
              <Text style={s.emptyTitle}>No history yet</Text>
              <Text style={s.emptySub}>Your consultation history will appear here after your first visit.</Text>
            </View>
          )}

          {data && (
            <>
              <PatientCard patient={data.patient} total={data.items.length} rxUrl={rxUrl} />

              {data.items.length === 0 ? (
                <View style={s.emptyCard}>
                  <Text style={{ fontSize: 36 }}>🩺</Text>
                  <Text style={s.emptyTitle}>No consultations yet</Text>
                  <Text style={s.emptySub}>Completed consultations will appear here.</Text>
                </View>
              ) : (
                <>
                  <View style={s.listHeader}>
                    <Text style={s.listHeaderText}>Consultation History</Text>
                    <Text style={s.listHeaderSub}>Tap a card to expand</Text>
                  </View>
                  {data.items.map((item, i) => (
                    <ConsultCard key={item.consultationId} item={item} index={i} />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}

      <TravellerSheet
        visible={showSheet}
        options={travellerOptions}
        selected={selectedTravellerKey}
        onSelect={(key) => setSelectedTravellerKey(key)}
        onClose={() => setShowSheet(false)}
      />
    </View>
  );
}

// ── Traveller sheet styles ─────────────────────────────────────────────────────
const ts = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:     { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 },
  handle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  title:     { fontSize: typography.md, fontWeight: '700', color: colors.text, textAlign: 'center', paddingVertical: spacing.lg },
  option:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: 16, gap: spacing.md },
  optionActive: { backgroundColor: colors.brandLight },
  optLabel:  { fontSize: typography.md, color: colors.text, fontWeight: '500' },
  optLabelActive: { fontWeight: '700', color: colors.brand },
  cancelBtn: { marginTop: spacing.md, marginHorizontal: spacing.xl, paddingVertical: 14, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center' },
  cancelTxt: { fontSize: typography.base, fontWeight: '600', color: colors.muted },
});

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  travellerBar:    { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.brandLight, paddingHorizontal: spacing.xl, paddingVertical: 10, gap: spacing.sm },
  travellerBarLabel: { fontSize: typography.xs, color: colors.brandDark, fontWeight: '600' },
  travellerBarValue: { fontSize: typography.sm, color: colors.brand, fontWeight: '700', flex: 1 },
  travellerBarCaret: { fontSize: 10, color: colors.brand },
  container:   { padding: spacing.xl, paddingBottom: 60, backgroundColor: colors.bgGray, gap: spacing.md },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.bgGray },
  loadingText: { color: colors.muted, fontSize: typography.base },

  errorBanner: { backgroundColor: colors.errorBg, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', gap: spacing.sm, borderWidth: 1, borderColor: colors.errorBorder },
  errorIcon:   { fontSize: 14 },
  errorText:   { color: colors.error, fontSize: typography.sm, flex: 1, lineHeight: 18 },

  emptyCard:  { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.xxl, alignItems: 'center', gap: spacing.md, ...shadow.sm },
  emptyTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  emptySub:   { fontSize: typography.sm, color: colors.muted, textAlign: 'center', lineHeight: 20 },

  heroCard:    { backgroundColor: colors.brand, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md, overflow: 'hidden', position: 'relative', ...shadow.md },
  heroDecor1:  { position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroDecor2:  { position: 'absolute', bottom: -30, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.06)' },
  heroTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLabel:   { fontSize: typography.xs, fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroName:    { fontSize: typography.xl, fontWeight: '800', color: '#fff', marginTop: 2 },
  heroBadge:   { backgroundColor: colors.amber, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 4 },
  heroBadgeText: { fontSize: typography.sm, fontWeight: '800', color: colors.brandDark },
  heroStats:       { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.lg },
  heroStat:        { flex: 1, alignItems: 'center', paddingVertical: spacing.md, gap: 3 },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: spacing.sm },
  heroStatLabel:   { fontSize: typography.xxs, color: 'rgba(255,255,255,0.65)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroStatValue:   { fontSize: typography.sm, color: '#fff', fontWeight: '700' },
  rxBtn:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.amber, borderRadius: radius.full, paddingVertical: 12, paddingHorizontal: spacing.xl, alignSelf: 'stretch', justifyContent: 'center' },
  rxBtnIcon: { fontSize: 16 },
  rxBtnText: { fontSize: typography.base, fontWeight: '800', color: colors.brandDark },

  listHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  listHeaderText:{ fontSize: typography.base, fontWeight: '700', color: colors.text },
  listHeaderSub: { fontSize: typography.xs, color: colors.muted },

  card:        { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', ...shadow.sm },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  cardIcon:    { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.brandLight, borderWidth: 2, borderColor: colors.brand + '30', alignItems: 'center', justifyContent: 'center' },
  cardIconOpen:{ backgroundColor: colors.brand, borderColor: colors.brand },
  cardIconEmoji: { fontSize: 20 },
  cardTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  cardTitle:   { fontSize: typography.base, fontWeight: '700', color: colors.text },
  cardPreview: { fontSize: typography.xs, color: colors.muted, marginTop: 2 },
  caret:       { fontSize: 22, color: colors.muted, transform: [{ rotate: '0deg' }] },
  caretOpen:   { transform: [{ rotate: '90deg' }], color: colors.brand },
  datePill:    { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full, backgroundColor: colors.brandLight },
  datePillText:{ fontSize: typography.xxs, fontWeight: '700', color: colors.brand, letterSpacing: 0.3 },

  cardBody:     { borderTopWidth: 1, borderTopColor: colors.line, padding: spacing.lg, gap: spacing.md },
  section:      { gap: 4 },
  sectionLabel: { fontSize: typography.xs, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.7 },
  sectionValue: { fontSize: typography.base, color: colors.text, lineHeight: 22 },
  medRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: 2 },
  medDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand, marginTop: 7 },

  itemActionBtn:     { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 8 },
  itemActionBtnText: { color: colors.text, fontWeight: '600', fontSize: typography.xs },
});
