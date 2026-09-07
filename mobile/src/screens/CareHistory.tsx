// src/screens/CareHistory.tsx — mirrors web's .portal card/dr-dk-dv styling, no gradient hero.
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  LayoutAnimation, Platform, UIManager, ActivityIndicator,
  Modal, FlatList,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { API_BASE_URL, authFetch } from '../api';
import { useAuth } from '../state/auth';
import { ws, wc } from '../webStyle';
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
  pdfUrl?: string;
  referralPdfUrl?: string;
};
type Payload = {
  patient: { name: string; patientId?: string | number; dob?: string; gender?: string };
  items: Item[];
};

function fmtDate(d: string) {
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Patient overview card ─────────────────────────────────────────────────────
function PatientCard({ patient, total, rxUrl }: { patient: Payload['patient']; total: number; rxUrl: string | null }) {
  return (
    <View style={ws.card}>
      <View style={s.heroTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.heroLabel}>Patient Overview</Text>
          <Text style={s.heroName}>{patient.name || '—'}</Text>
        </View>
        <View style={[ws.tag, ws.tinfo]}><Text style={[ws.tagText, ws.tinfoText]}>{total} visit{total !== 1 ? 's' : ''}</Text></View>
      </View>

      <View style={ws.dr}>
        <Text style={ws.dk}>Patient ID</Text>
        <Text style={ws.dv}>{String(patient.patientId ?? '—')}</Text>
      </View>
      <View style={ws.dr}>
        <Text style={ws.dk}>Gender</Text>
        <Text style={ws.dv}>{patient.gender || '—'}</Text>
      </View>
      <View style={ws.dr}>
        <Text style={ws.dk}>Date of Birth</Text>
        <Text style={ws.dv}>{patient.dob || '—'}</Text>
      </View>

      {rxUrl && (
        <TouchableOpacity style={[ws.bp, { marginTop: 12 }]} onPress={() => openPdf(rxUrl, 'Prescription')} activeOpacity={0.85}>
          <Text style={ws.bpText}>💊 View Latest Prescription</Text>
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
    { label: 'Location', value: item.locationTravellingTo },
    { label: 'Presenting Complaint', value: item.presentingComplaint },
    { label: 'Diagnosis', value: item.diagnosis },
    { label: 'Recommendations', value: item.recommendations },
  ];

  return (
    <View style={ws.card}>
      <TouchableOpacity style={s.cardHeader} onPress={toggle} activeOpacity={0.75}>
        <View style={{ flex: 1 }}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardTitle}>Consultation #{item.consultationId}</Text>
            <View style={[ws.tag, ws.tinfo]}><Text style={[ws.tagText, ws.tinfoText]}>{fmtDate(item.date)}</Text></View>
          </View>
          {!open && (item.diagnosis || item.presentingComplaint) && (
            <Text style={s.cardPreview} numberOfLines={1}>{item.diagnosis || item.presentingComplaint}</Text>
          )}
        </View>
        <Text style={[s.caret, open && s.caretOpen]}>›</Text>
      </TouchableOpacity>

      {open && (
        <View style={s.cardBody}>
          {SECTIONS.map(sec => sec.value ? (
            <View key={sec.label} style={s.section}>
              <Text style={ws.fiHint}>{sec.label}</Text>
              <Text style={s.sectionValue}>{sec.value}</Text>
            </View>
          ) : null)}

          {meds.length > 0 && (
            <View style={s.section}>
              <Text style={ws.fiHint}>Medicines Given</Text>
              {meds.map((m, i) => (
                <View key={i} style={s.medRow}>
                  <View style={s.medDot} />
                  <Text style={s.sectionValue}>{m}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {item.pdfUrl && (
              <TouchableOpacity style={ws.bs} onPress={() => openPdf(item.pdfUrl!, 'Prescription')} activeOpacity={0.75}>
                <Text style={ws.bsText}>View Prescription</Text>
              </TouchableOpacity>
            )}
            {item.referralPdfUrl ? (
              <TouchableOpacity style={ws.bs} onPress={() => openPdf(item.referralPdfUrl!, 'Referral Letter')} activeOpacity={0.75}>
                <Text style={ws.bsText}>View Referral Letter</Text>
              </TouchableOpacity>
            ) : (
              <View style={[ws.bs, ws.btnDisabled]}>
                <Text style={ws.bsText}>Referral Letter Not Generated</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ── Traveller picker sheet ─────────────────────────────────────────────────────
type TravellerOpt = { key: string; label: string; travellerId?: number };

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
          ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: wc.border, marginHorizontal: 20 }} />}
          renderItem={({ item }) => {
            const active = item.key === selected;
            return (
              <TouchableOpacity style={[ts.option, active && ts.optionActive]} onPress={() => { onSelect(item.key); onClose(); }} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  <Text style={[ts.optLabel, active && ts.optLabelActive]}>{item.label}</Text>
                </View>
                {active && <Text style={{ color: wc.fillAccent, fontWeight: '700', fontSize: 16 }}>✓</Text>}
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
  const params = useLocalSearchParams<{ travelerId?: string; patientId?: string; doctorConsultationId?: string }>();
  const initTravelerId = params.travelerId;
  const patientId = params.patientId;
  const doctorConsultationId = params.doctorConsultationId;

  const [data, setData] = useState<Payload | null>(null);
  const [rxUrl, setRxUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [travellerOptions, setTravellerOptions] = useState<TravellerOpt[]>([]);
  const [selectedTravellerKey, setSelectedTravellerKey] = useState<string>('all');
  const [showSheet, setShowSheet] = useState(false);

  useEffect(() => {
    if (doctorConsultationId) return;
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
                opts.push({ key: `trav-${t?.id ?? idx}`, label: t?.fullName || `Traveller ${idx + 1}`, travellerId: t?.id });
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
        if (patientId) qp.set('patientId', patientId);
        const qs = qp.toString() ? `?${qp.toString()}` : '';

        const historyUrl = doctorConsultationId
          ? `${API_BASE_URL}/doctor/consultations/${encodeURIComponent(doctorConsultationId)}/care-history`
          : `${API_BASE_URL}/care-history/mine${qs}`;
        const r = await authFetch(historyUrl);
        if (!ignore) {
          if (r.status === 204) setData(null);
          else if (r.ok) setData(await r.json());
          else setErr(`Failed to load (HTTP ${r.status})`);
        }

        if (!doctorConsultationId) {
          const r2 = await authFetch(`${API_BASE_URL}/prescriptions/latest${qs}`);
          if (!ignore && r2.ok && r2.status !== 204) {
            const j = await r2.json().catch(() => null);
            setRxUrl(j?.pdfUrl ?? null);
          }
        }
      } catch (e: any) {
        if (!ignore) setErr(e?.message || 'Failed to load');
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [effectiveTravelerId, patientId, doctorConsultationId]);

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Care History" subtitle={doctorConsultationId ? 'Patient history' : undefined} />

      {!doctorConsultationId && (
        <TouchableOpacity style={s.travellerBar} onPress={() => setShowSheet(true)} activeOpacity={0.7}>
          <Text style={s.travellerBarLabel}>Showing</Text>
          <Text style={s.travellerBarValue}>{selectedLabel}</Text>
          <Text style={s.travellerBarCaret}>▼</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={wc.fillAccent} />
          <Text style={s.loadingText}>Loading your history…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

          {err && (
            <View style={[ws.notice, ws.nWarn]}>
              <Text style={{ fontSize: 15 }}>⚠️</Text>
              <Text style={[ws.noticeText, ws.nWarnText]}>{err}</Text>
            </View>
          )}

          {!err && !data && (
            <View style={s.emptyCard}>
              <Text style={{ fontSize: 41 }}>📋</Text>
              <Text style={s.emptyTitle}>No history yet</Text>
              <Text style={s.emptySub}>Your consultation history will appear here after your first visit.</Text>
            </View>
          )}

          {data && (
            <>
              <PatientCard patient={data.patient} total={data.items.length} rxUrl={rxUrl} />

              {data.items.length === 0 ? (
                <View style={s.emptyCard}>
                  <Text style={{ fontSize: 33 }}>🩺</Text>
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: wc.surface2, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: wc.borderStronger, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '600', color: wc.textPrimary, textAlign: 'center', paddingVertical: 14 },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 10 },
  optionActive: { backgroundColor: wc.bgAccent },
  optLabel: { fontSize: 15, color: wc.textPrimary, fontWeight: '500' },
  optLabelActive: { fontWeight: '600', color: wc.textAccent },
  cancelBtn: { marginTop: 10, marginHorizontal: 20, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: wc.borderStrong, alignItems: 'center' },
  cancelTxt: { fontSize: 14, fontWeight: '500', color: wc.textMuted },
});

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  travellerBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: wc.bgAccent, paddingHorizontal: 20, paddingVertical: 9, gap: 8 },
  travellerBarLabel: { fontSize: 12, color: wc.textAccent, fontWeight: '500' },
  travellerBarValue: { fontSize: 14, color: wc.textAccent, fontWeight: '600', flex: 1 },
  travellerBarCaret: { fontSize: 10, color: wc.textAccent },
  container: { padding: 20, paddingBottom: 40 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: wc.textMuted, fontSize: 14 },

  emptyCard: { backgroundColor: wc.surface2, borderRadius: 8, borderWidth: 1, borderColor: wc.borderStrong, padding: 28, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: wc.textPrimary },
  emptySub: { fontSize: 14, color: wc.textMuted, textAlign: 'center', lineHeight: 18 },

  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  heroLabel: { fontSize: 12, fontWeight: '600', color: wc.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  heroName: { fontSize: 18, fontWeight: '600', color: wc.textPrimary, marginTop: 2 },

  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  listHeaderText: { fontSize: 14, fontWeight: '600', color: wc.textPrimary },
  listHeaderSub: { fontSize: 12, color: wc.textMuted },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: wc.textPrimary },
  cardPreview: { fontSize: 12, color: wc.textMuted, marginTop: 2 },
  caret: { fontSize: 21, color: wc.textMuted, transform: [{ rotate: '0deg' }] },
  caretOpen: { transform: [{ rotate: '90deg' }], color: wc.fillAccent },

  cardBody: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: wc.border, marginTop: 10, paddingTop: 10, gap: 10 },
  section: { gap: 3 },
  sectionValue: { fontSize: 14, color: wc.textPrimary, lineHeight: 19 },
  medRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 2 },
  medDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: wc.fillAccent, marginTop: 6 },
});
