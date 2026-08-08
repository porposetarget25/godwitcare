// src/screens/DoctorConsultationDetails.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doctorGetConsultation, doctorLatestPrescriptionMeta, doctorCreatePrescription, API_BASE_URL, resolveApiUrl } from '../api';
import { Btn, Card, Muted, Strong, LoadingView } from '../components/UI';
import { colors, spacing, radius, typography, shadow } from '../theme';
import { PageHeader } from '../components/PageHeader';
import { openPdf } from '../utils/openPdf';

export default function DoctorConsultationDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState<string[]>(['']);
  const [recommendations, setRecommendations] = useState('');
  const [creatingRx, setCreatingRx] = useState(false);
  const [rxErr, setRxErr] = useState<string | null>(null);
  const [rxId, setRxId] = useState<number | null>(null);
  const [rxPdfUrl, setRxPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const d = await doctorGetConsultation(Number(id));
        setData(d);
        const meta = await doctorLatestPrescriptionMeta(Number(id)).catch(() => null);
        if (meta?.id) {
          setRxId(meta.id);
          setRxPdfUrl(meta.pdfUrl ? meta.pdfUrl : null);
        }
      } catch {}
    })();
  }, [id]);

  if (!data) return <LoadingView />;

  const phoneDigits = (data.contactPhone || '').replace(/[^\d+]/g, '');
  const waUrl = phoneDigits ? `https://wa.me/${phoneDigits.replace(/^0+/, '')}` : '';

  function setMed(idx: number, val: string) {
    setMedicines((list) => list.map((m, i) => (i === idx ? val : m)));
  }

  async function createPrescription() {
    setRxErr(null);
    const meds = medicines.map((m) => m.trim()).filter(Boolean);
    if (!diagnosis.trim()) { setRxErr('Please enter a diagnosis.'); return; }
    if (meds.length === 0) { setRxErr('Please add at least one medicine.'); return; }
    setCreatingRx(true);
    try {
      const j = await doctorCreatePrescription(data.id, {
        history: history.trim(), diagnosis: diagnosis.trim(), medicines: meds, recommendations: recommendations.trim(),
      });
      setRxId(typeof j.id === 'number' ? j.id : null);
      if (j.id) setRxPdfUrl(`${API_BASE_URL}/doctor/prescriptions/${j.id}/pdf`);
    } catch (err: any) {
      setRxErr(err?.message || 'Failed to create prescription');
    } finally {
      setCreatingRx(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <PageHeader title={`Consultation #${data.id}`} />

      {/* Patient summary */}
      <Card>
        <Strong style={{ fontSize: typography.md }}>
          {data.patient.firstName} {data.patient.lastName}
        </Strong>
        <Muted>DOB: {data.patient?.dob ? new Date(data.patient.dob).toLocaleDateString() : '—'}</Muted>
        <Muted>Patient ID: {data.patientId ?? '—'}</Muted>
      </Card>

      {/* Contact */}
      <Card>
        <Strong style={{ marginBottom: spacing.sm }}>Patient Contact & Address</Strong>
        <Muted>Phone: {data.contactPhone || '—'}</Muted>
        <Muted>Address: {data.contactAddress || '—'}</Muted>
        <Muted>Email: {data.patient.email || '—'}</Muted>
        {waUrl && (
          <Btn label="WhatsApp Patient" onPress={() => Linking.openURL(waUrl)} style={{ marginTop: spacing.sm }} />
        )}
      </Card>

      {/* Questionnaire */}
      {data.answers && Object.keys(data.answers).length > 0 && (
        <Card>
          <Strong style={{ marginBottom: spacing.sm }}>Questionnaire</Strong>
          {Object.entries(data.answers).map(([qid, ans]) => {
            const note = (data.detailsByQuestion || {})[qid];
            const isYes = String(ans).toLowerCase() === 'yes';
            return (
              <View key={qid} style={[styles.answerRow, isYes && { backgroundColor: colors.errorBg }]}>
                <Text style={styles.qid}>{qid}</Text>
                <Text style={{ fontWeight: isYes ? '700' : '400' }}>{String(ans)}</Text>
                {note && <Muted style={{ fontSize: 12 }}>{note}</Muted>}
              </View>
            );
          })}
        </Card>
      )}

      {/* History */}
      <Card>
        <Strong style={{ marginBottom: spacing.sm }}>History of Presenting Complaint</Strong>
        <TextInput
          value={history}
          onChangeText={setHistory}
          placeholder="Detail patient's complaint history here..."
          multiline
          numberOfLines={4}
          style={styles.textarea}
        />
      </Card>

      {/* Diagnosis */}
      <Card>
        <Strong style={{ marginBottom: spacing.sm }}>Diagnosis</Strong>
        <TextInput
          value={diagnosis}
          onChangeText={setDiagnosis}
          placeholder="Enter patient diagnosis…"
          multiline
          numberOfLines={3}
          style={styles.textarea}
        />
      </Card>

      {/* Medicines */}
      <Card>
        <Strong style={{ marginBottom: spacing.sm }}>Medicines</Strong>
        {medicines.map((m, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
            <TextInput
              value={m}
              onChangeText={(v) => setMed(i, v)}
              placeholder="e.g., Amoxicillin 500mg…"
              multiline
              numberOfLines={2}
              style={[styles.textarea, { flex: 1 }]}
            />
            {medicines.length > 1 && (
              <Btn label="✕" onPress={() => setMedicines((list) => list.filter((_, idx) => idx !== i))} variant="secondary" />
            )}
          </View>
        ))}
        <Btn label="Add another medicine" onPress={() => setMedicines((list) => [...list, ''])} variant="secondary" />
      </Card>

      {/* Recommendations */}
      <Card>
        <Strong style={{ marginBottom: spacing.sm }}>Recommendations</Strong>
        <TextInput
          value={recommendations}
          onChangeText={setRecommendations}
          placeholder="Provide recommendations…"
          multiline
          numberOfLines={3}
          style={styles.textarea}
        />
      </Card>

      {/* Create Prescription */}
      <Card>
        <Btn
          label={creatingRx ? 'Creating…' : 'Create Prescription'}
          onPress={createPrescription}
          loading={creatingRx}
        />
        {rxErr && <Muted style={{ color: colors.error, marginTop: spacing.sm }}>{rxErr}</Muted>}
        {rxId && (
          <View style={{ marginTop: spacing.sm }}>
            <Muted>Prescription created (ID #{rxId})</Muted>
            {rxPdfUrl && (
              <Btn label="View Prescription (PDF)" onPress={() => openPdf(rxPdfUrl, 'Prescription')} variant="secondary" style={{ marginTop: spacing.sm }} />
            )}
          </View>
        )}
      </Card>

      {/* Patient Records */}
      <Card>
        <Strong style={{ marginBottom: spacing.sm }}>Patient Records</Strong>
        <View style={{ gap: spacing.sm }}>
          <Btn
            label="View Prescription"
            onPress={() => rxPdfUrl && openPdf(rxPdfUrl, 'Prescription')}
            disabled={!rxPdfUrl}
            variant="secondary"
          />
          <Btn label="View Case History" onPress={() => {}} disabled variant="secondary" />
          <Btn
            label="Referral Letter"
            onPress={() => router.push(`/(app)/doctor/referral/${id}`)}
            variant="secondary"
          />
        </View>
      </Card>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: 60, backgroundColor: colors.bgGray },
  textarea: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.base,
    color: colors.text,
    backgroundColor: colors.white,
    textAlignVertical: 'top',
  },
  answerRow: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  qid: { fontSize: 12, fontWeight: '600', color: colors.muted },
});
