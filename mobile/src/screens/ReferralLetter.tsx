// src/screens/ReferralLetter.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Linking, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL, resolveApiUrl, authFetch } from '../api';
import { Btn, Card, Muted, Strong, LoadingView, ErrorBanner } from '../components/UI';
import { ws, wc } from '../webStyle';
import { PageHeader } from '../components/PageHeader';
import { openPdf } from '../utils/openPdf';
import { FormScrollView } from '../components/FormScrollView';

const DOCTOR_NAME = 'Dr. Dimitris–Christos Zachariades';
const DOCTOR_REG = 'GMS101Z';
const DOCTOR_ADDR = 'GodwitCare Clinic, Healthville, HV5 9XY';
const DOCTOR_PHONE = 'godwitcare whatsapp';
const DOCTOR_EMAIL = 'godwitcare@gmail.com';

export default function ReferralLetter() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [c, setC] = useState<any>(null);
  const [body, setBody] = useState('');

  useEffect(() => {
    if (!id) return;
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await authFetch(`${API_BASE_URL}/doctor/consultations/${Number(id)}`);
        if (!res.ok) throw new Error(`Failed (${res.status}).`);
        const data = await res.json();
        if (ignore) return;
        setC(data);

        const fullName = [data.patient?.firstName, data.patient?.lastName].filter(Boolean).join(' ') || 'the patient';
        const dobStr = data.patient?.dob ? new Date(data.patient.dob).toLocaleDateString() : '—';
        const loc = data.currentLocation || 'the stated location';
        const dt = data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'the date of consultation';
        const pid = data.patientId || '—';

        setBody(
`Dear Dr (To Whom it May Concern),

I am writing to refer ${fullName}, born on ${dobStr}, Patient ID: ${pid}. During her travel to ${loc} on ${dt}, she presented with symptoms as assessed during the tele-consultation. Kindly review and consider further evaluation and management.

The patient's relevant medical history and current medication have been reviewed during the consultation. Based on the presenting complaint, please consider local assessment, and additional investigations if clinically indicated.

Thank you for considering this referral. Please feel free to contact me if you require any additional information.

Sincerely,

${DOCTOR_NAME}
Digital Signature Area
Referring Practitioner`
        );
      } catch (e: any) {
        if (!ignore) setErr(e?.message || 'Failed to load data.');
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [id]);

  async function onGeneratePdf() {
    if (!c?.id) return;
    try {
      const createRes = await authFetch(`${API_BASE_URL}/doctor/consultations/${c.id}/referrals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paragraph: body }),
      });
      if (!createRes.ok) throw new Error(`Failed (${createRes.status})`);

      const meta = await createRes.json().catch(() => ({}));
      if (meta?.pdfUrl) {
        openPdf(meta.pdfUrl, 'Referral Letter');
      } else if (meta?.id) {
        openPdf(`${API_BASE_URL}/doctor/referrals/${meta.id}/pdf`, 'Referral Letter');
      } else {
        Alert.alert('Error', 'Referral created but no PDF URL returned.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to generate PDF');
    }
  }

  const patientName = [c?.patient?.firstName, c?.patient?.lastName].filter(Boolean).join(' ') || '—';
  const patientId = c?.patientId || '—';
  const patientDob = c?.patient?.dob ? new Date(c.patient.dob).toLocaleDateString() : '—';

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Referral Letter" subtitle={patientName !== '—' ? patientName : undefined} showBack />
      {loading ? <LoadingView /> : (
      <FormScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {err && <ErrorBanner message={err} />}

      {!err && (
        <>
          {/* Patient Information */}
          <Card>
            <Strong style={{ marginBottom: 10 }}>Patient Information</Strong>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Muted style={styles.label}>Patient Name</Muted>
                <Strong>{patientName}</Strong>
              </View>
              <View style={{ flex: 1 }}>
                <Muted style={styles.label}>Patient ID</Muted>
                <Strong>{patientId}</Strong>
              </View>
              <View style={{ flex: 1 }}>
                <Muted style={styles.label}>Date of Birth</Muted>
                <Strong>{patientDob}</Strong>
              </View>
            </View>
          </Card>

          {/* Referral From */}
          <Card>
            <Strong style={{ marginBottom: 10 }}>Referral From</Strong>
            <Muted style={styles.label}>GP Name</Muted>
            <Strong>{DOCTOR_NAME}</Strong>
            <Muted style={[styles.label, { marginTop: 8 }]}>GMS Number</Muted>
            <Strong>{DOCTOR_REG}</Strong>
            <Muted style={[styles.label, { marginTop: 8 }]}>Address</Muted>
            <Strong>{DOCTOR_ADDR}</Strong>
            <Muted style={[styles.label, { marginTop: 8 }]}>Email</Muted>
            <Strong>{DOCTOR_EMAIL}</Strong>
            <Muted style={[styles.label, { marginTop: 8 }]}>Contact Number</Muted>
            <Strong>{DOCTOR_PHONE}</Strong>
          </Card>

          {/* Letter Body */}
          <Card>
            <Strong style={{ marginBottom: 8 }}>Letter Body</Strong>
            <TextInput
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={12}
              style={styles.textarea}
              placeholder="Type the referral text here…"
            />
          </Card>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn
              label="Generate PDF"
              onPress={onGeneratePdf}
              disabled={!c?.id}
              style={{ flex: 1 }}
            />
          </View>
        </>
      )}
      </FormScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  label: { fontSize: 12, marginBottom: 4 },
  textarea: {
    borderWidth: 1,
    borderColor: wc.borderStrong,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: wc.textPrimary,
    backgroundColor: wc.surface2,
    textAlignVertical: 'top',
    minHeight: 200,
  },
});
