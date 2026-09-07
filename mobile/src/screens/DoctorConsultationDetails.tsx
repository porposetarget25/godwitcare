// src/screens/DoctorConsultationDetails.tsx — mirrors web's .portal card/tag styling (Card/Btn/Muted/Strong already updated in UI.tsx).
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Linking, Modal,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  doctorGetConsultation, doctorLatestPrescriptionMeta, doctorCreatePrescription,
  API_BASE_URL, authFetch,
} from '../api';
import { QUESTIONNAIRE_SECTIONS } from '../questionnaire';
import { Btn, Card, Muted, Strong, LoadingView } from '../components/UI';
import { ws, wc } from '../webStyle';
import { PageHeader } from '../components/PageHeader';
import { FormScrollView } from '../components/FormScrollView';
import { openPdf } from '../utils/openPdf';

function statusStyle(isNoShow: boolean, readOnly: boolean) {
  if (isNoShow) return { box: ws.twarn, text: ws.twarnText, label: 'No-show' };
  if (readOnly) return { box: ws.tmute, text: ws.tmuteText, label: 'Completed' };
  return { box: ws.tinfo, text: ws.tinfoText, label: 'In Progress' };
}

export default function DoctorConsultationDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState<string[]>(['']);
  const [recommendations, setRecommendations] = useState('');
  const [prescriptionRequired, setPrescriptionRequired] = useState(true);
  const [creatingRx, setCreatingRx] = useState(false);
  const [rxErr, setRxErr] = useState<string | null>(null);
  const [rxId, setRxId] = useState<number | null>(null);
  const [rxPdfUrl, setRxPdfUrl] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const [referralPdfUrl, setReferralPdfUrl] = useState<string | null>(null);
  const [openingReferral, setOpeningReferral] = useState(false);

  const [completing, setCompleting] = useState(false);
  const [completeErr, setCompleteErr] = useState<string | null>(null);

  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [noShowNote, setNoShowNote] = useState('');
  const [markingNoShow, setMarkingNoShow] = useState(false);
  const [noShowErr, setNoShowErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const d = await doctorGetConsultation(Number(id));
        setData(d);
        const answers = (d?.answers || {}) as Record<string, string>;
        const sectionsWithYes = QUESTIONNAIRE_SECTIONS
          .filter(sec => sec.questions.some(q => answers[q.id] === 'Yes'))
          .map(sec => sec.title);
        setExpandedSections(new Set(sectionsWithYes));
        setHistory(d?.historyOfPresentingComplaint || '');
        setDiagnosis(d?.diagnosis || '');
        setRecommendations(d?.recommendations || '');
        setPrescriptionRequired(d?.prescriptionRequired !== false);

        const meta = await doctorLatestPrescriptionMeta(Number(id)).catch(() => null);
        if (meta?.id) {
          setRxId(meta.id);
          setRxPdfUrl(meta.pdfUrl ? meta.pdfUrl : null);
        }

        const refRes = await authFetch(`${API_BASE_URL}/doctor/consultations/${Number(id)}/referrals/latest`).catch(() => null);
        if (refRes && refRes.ok && refRes.status !== 204) {
          const refMeta = await refRes.json().catch(() => null);
          if (refMeta?.id) setReferralPdfUrl(`${API_BASE_URL}/doctor/referrals/${refMeta.id}/pdf`);
          else if (refMeta?.pdfUrl) setReferralPdfUrl(refMeta.pdfUrl);
        }
      } catch {}
    })();
  }, [id]);

  if (!data) return <LoadingView />;

  const phoneDigits = (data.contactPhone || '').replace(/[^\d+]/g, '');
  const waUrl = phoneDigits ? `https://wa.me/${phoneDigits.replace(/^0+/, '')}` : '';
  const readOnly = data.status === 'COMPLETED';
  const appointmentStatus: string | undefined = data.appointmentStatus;
  const isNoShow = appointmentStatus === 'NO_SHOW';
  const st = statusStyle(isNoShow, readOnly);

  function setMed(idx: number, val: string) {
    setMedicines((list) => list.map((m, i) => (i === idx ? val : m)));
  }

  function toggleSection(title: string) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title); else next.add(title);
      return next;
    });
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

  async function completeConsultation() {
    setCompleteErr(null);
    setCompleting(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/doctor/consultations/${data.id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: history.trim(), diagnosis: diagnosis.trim(), recommendations: recommendations.trim(), prescriptionRequired }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((prev: any) => ({ ...prev, status: 'COMPLETED' }));
    } catch (err: any) {
      setCompleteErr(err?.message || 'Failed to complete consultation');
    } finally {
      setCompleting(false);
    }
  }

  async function confirmNoShow() {
    setMarkingNoShow(true);
    setNoShowErr(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/doctor/consultations/${data.id}/no-show`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noShowNote.trim() }),
      });
      if (!res.ok) { const t = await res.json().catch(() => null); throw new Error(t?.message || `HTTP ${res.status}`); }
      const appt = await res.json();
      setData((prev: any) => ({ ...prev, appointmentStatus: appt.status, appointmentNoShowNote: appt.noShowNote }));
      setShowNoShowModal(false);
      setNoShowNote('');
    } catch (err: any) {
      setNoShowErr(err?.message || 'Failed to mark as no-show.');
    } finally {
      setMarkingNoShow(false);
    }
  }

  async function onViewReferral() {
    if (!referralPdfUrl) return;
    setOpeningReferral(true);
    try { await openPdf(referralPdfUrl, 'Referral Letter'); }
    finally { setOpeningReferral(false); }
  }

  const dobStr = data?.patient?.dob ? new Date(data.patient.dob).toLocaleDateString() : '—';

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title={`Consultation #${data.id}`} />
      <FormScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <View style={styles.statusRow}>
          <View style={[ws.tag, st.box]}><Text style={[ws.tagText, st.text]}>{st.label}</Text></View>
        </View>

        {readOnly && (
          <View style={[ws.notice, ws.nInfo]}><Text style={[ws.noticeText, ws.nInfoText]}>🔒 Completed consultation — view only.</Text></View>
        )}
        {isNoShow && (
          <View style={[ws.notice, ws.nWarn]}>
            <Text style={[ws.noticeText, ws.nWarnText]}>Marked as no-show. {data.appointmentNoShowNote || 'No note recorded.'}</Text>
          </View>
        )}

        {/* Patient summary */}
        <Card>
          <Strong style={{ fontSize: 16 }}>
            {data.patient.firstName} {data.patient.lastName}
          </Strong>
          <Muted>DOB: {dobStr}</Muted>
          <Muted>Patient ID: {data.patientId ?? '—'}</Muted>
        </Card>

        {/* Contact */}
        <Card>
          <Strong style={{ marginBottom: 8 }}>Patient Contact & Address</Strong>
          <Muted>Phone: {data.contactPhone || '—'}</Muted>
          <Muted>Address: {data.contactAddress || '—'}</Muted>
          <Muted>Email: {data.patient.email || '—'}</Muted>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {waUrl && <Btn label="WhatsApp Patient" onPress={() => Linking.openURL(waUrl)} variant="secondary" />}
            <Btn label="Patient Care History" onPress={() => router.push(`/(app)/care-history?doctorConsultationId=${id}` as any)} variant="secondary" />
          </View>
        </Card>

        {/* Questionnaire */}
        {data.answers && Object.keys(data.answers).length > 0 && (
          <Card>
            <Strong style={{ marginBottom: 8 }}>Questionnaire — {Object.keys(data.answers).length} responses</Strong>
            {QUESTIONNAIRE_SECTIONS.map(section => {
              const answers = data.answers as Record<string, string>;
              const details = (data.detailsByQuestion || {}) as Record<string, string>;
              const answeredCount = section.questions.filter(q => answers[q.id] != null).length;
              const open = expandedSections.has(section.title);
              return (
                <View key={section.title} style={styles.qSection}>
                  <TouchableOpacity style={styles.qSectionHeader} onPress={() => toggleSection(section.title)} activeOpacity={0.7}>
                    <Text style={styles.qSectionTitle}>{section.title}</Text>
                    <Text style={styles.qSectionCount}>{answeredCount}/{section.questions.length}</Text>
                  </TouchableOpacity>
                  {open && section.questions.map(q => {
                    const ans = answers[q.id];
                    const note = details[q.id];
                    const isYes = ans === 'Yes';
                    return (
                      <View key={q.id} style={[styles.answerRow, isYes && { backgroundColor: wc.bgDanger }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.qLabel}>{q.label}</Text>
                          {isYes && note ? <Muted style={{ fontSize: 13 }}>{note}</Muted> : null}
                        </View>
                        <View style={[ws.tag, isYes ? ws.tdanger : ws.tmute]}>
                          <Text style={[ws.tagText, isYes ? ws.tdangerText : ws.tmuteText]}>{ans || 'Unanswered'}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </Card>
        )}

        {/* Prescription requirement */}
        <Card>
          <Strong style={{ marginBottom: 8 }}>Prescription Requirement</Strong>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <TouchableOpacity
              style={[styles.radioBtn, !prescriptionRequired && styles.radioBtnOn]}
              onPress={() => !readOnly && setPrescriptionRequired(false)}
              disabled={readOnly}
              activeOpacity={0.75}
            >
              <Text style={[styles.radioBtnText, !prescriptionRequired && styles.radioBtnTextOn]}>No Prescription</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioBtn, prescriptionRequired && styles.radioBtnOn]}
              onPress={() => !readOnly && setPrescriptionRequired(true)}
              disabled={readOnly}
              activeOpacity={0.75}
            >
              <Text style={[styles.radioBtnText, prescriptionRequired && styles.radioBtnTextOn]}>Prescription Required</Text>
            </TouchableOpacity>
          </View>
          <Muted style={{ marginBottom: 6 }}>History of Presenting Complaint</Muted>
          <TextInput
            value={history}
            onChangeText={setHistory}
            editable={!readOnly}
            placeholder="Detail patient's complaint history here..."
            multiline
            numberOfLines={4}
            style={styles.textarea}
          />
        </Card>

        {/* Diagnosis */}
        <Card style={{ opacity: prescriptionRequired ? 1 : 0.5 }}>
          <Strong style={{ marginBottom: 8 }}>Diagnosis</Strong>
          <TextInput
            value={diagnosis}
            onChangeText={setDiagnosis}
            editable={!readOnly}
            placeholder="Enter patient diagnosis…"
            multiline
            numberOfLines={3}
            style={styles.textarea}
          />
        </Card>

        {/* Medicines */}
        <Card>
          <Strong style={{ marginBottom: 8 }}>Medicines</Strong>
          {medicines.map((m, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <TextInput
                value={m}
                onChangeText={(v) => setMed(i, v)}
                editable={!readOnly && prescriptionRequired}
                placeholder="e.g., Amoxicillin 500mg…"
                multiline
                numberOfLines={2}
                style={[styles.textarea, { flex: 1 }]}
              />
              {medicines.length > 1 && !readOnly && (
                <Btn label="✕" onPress={() => setMedicines((list) => list.filter((_, idx) => idx !== i))} variant="secondary" disabled={!prescriptionRequired} />
              )}
            </View>
          ))}
          {!readOnly && (
            <Btn label="Add another medicine" onPress={() => setMedicines((list) => [...list, ''])} variant="secondary" disabled={!prescriptionRequired} />
          )}
        </Card>

        {/* Recommendations */}
        <Card>
          <Strong style={{ marginBottom: 8 }}>Recommendations</Strong>
          <TextInput
            value={recommendations}
            onChangeText={setRecommendations}
            editable={!readOnly}
            placeholder="Provide recommendations…"
            multiline
            numberOfLines={3}
            style={styles.textarea}
          />
        </Card>

        {/* Actions */}
        <Card>
          {prescriptionRequired && !readOnly && (
            <Btn label={creatingRx ? 'Creating…' : 'Create Prescription'} onPress={createPrescription} loading={creatingRx} />
          )}
          {rxErr && <Muted style={{ color: wc.textDanger, marginTop: 8 }}>{rxErr}</Muted>}
          {rxId && <Muted style={{ marginTop: 8 }}>Prescription created (#{rxId})</Muted>}
          {!isNoShow && appointmentStatus === 'SCHEDULED' && !readOnly && (
            <Btn label="Mark No-Show" onPress={() => setShowNoShowModal(true)} variant="danger" style={{ marginTop: 8 }} />
          )}

          {!readOnly && (
            <>
              <Btn
                label={completing ? 'Completing…' : 'Complete Consultation'}
                onPress={completeConsultation}
                loading={completing}
                disabled={prescriptionRequired && !rxId}
                style={{ marginTop: 10 }}
              />
              {completeErr && <Muted style={{ color: wc.textDanger, marginTop: 6 }}>{completeErr}</Muted>}
              {prescriptionRequired && !rxId && <Muted style={{ marginTop: 6 }}>Create a prescription first, or switch to No Prescription to complete.</Muted>}
            </>
          )}
        </Card>

        {/* Patient Records */}
        <Card>
          <Strong style={{ marginBottom: 8 }}>Patient Records</Strong>
          <View style={{ gap: 8 }}>
            <Btn
              label="View Prescription"
              onPress={() => rxPdfUrl && openPdf(rxPdfUrl, 'Prescription')}
              disabled={!rxPdfUrl}
              variant="secondary"
            />
            <Btn label="Patient Care History" onPress={() => router.push(`/(app)/care-history?doctorConsultationId=${id}` as any)} variant="secondary" />
            {prescriptionRequired && !readOnly ? (
              <Btn label="Referral Letter" onPress={() => router.push(`/(app)/doctor/referral/${id}` as any)} variant="secondary" />
            ) : (
              <Btn label="Referral Letter" onPress={() => {}} disabled variant="secondary" />
            )}
            {prescriptionRequired && (
              <Btn
                label={openingReferral ? 'Opening…' : 'View Generated Referral Letter'}
                onPress={onViewReferral}
                disabled={!referralPdfUrl || openingReferral}
                variant="secondary"
              />
            )}
          </View>
        </Card>
      </FormScrollView>

      <Modal visible={showNoShowModal} transparent animationType="fade" onRequestClose={() => setShowNoShowModal(false)}>
        <TouchableOpacity style={ws.modalOverlay} activeOpacity={1} onPress={() => setShowNoShowModal(false)} />
        <View style={mx.centerWrap} pointerEvents="box-none">
          <View style={[ws.modalBox, { padding: 18 }]}>
            <Text style={mx.title}>Mark as No-Show</Text>
            <Text style={ws.fl2}>Note (visible only to doctors on this case)</Text>
            <TextInput
              value={noShowNote}
              onChangeText={setNoShowNote}
              multiline
              numberOfLines={4}
              placeholder="e.g. Patient did not join the WhatsApp call after 15 minutes."
              placeholderTextColor={wc.textMuted}
              style={mx.textarea}
            />
            {noShowErr && <Text style={{ color: wc.textDanger, fontSize: 14 }}>{noShowErr}</Text>}
            <View style={mx.actions}>
              <TouchableOpacity style={[ws.bs, { flex: 1 }]} onPress={() => setShowNoShowModal(false)} activeOpacity={0.75}>
                <Text style={ws.bsText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[ws.bd, { flex: 1 }]} onPress={confirmNoShow} disabled={markingNoShow} activeOpacity={0.85}>
                {markingNoShow ? <ActivityIndicator color={wc.textDanger} size="small" /> : <Text style={ws.bdText}>Save & Mark No-Show</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, gap: 11 },
  textarea: {
    borderWidth: 1,
    borderColor: wc.borderStrong,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: wc.textPrimary,
    backgroundColor: wc.surface2,
    textAlignVertical: 'top',
  },
  statusRow: { flexDirection: 'row' },

  qSection: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: wc.border, paddingTop: 8, marginTop: 8 },
  qSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  qSectionTitle: { fontSize: 14, fontWeight: '600', color: wc.textPrimary },
  qSectionCount: { fontSize: 12, color: wc.textMuted },
  qLabel: { fontSize: 14, color: wc.textPrimary },
  answerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, paddingHorizontal: 6, borderRadius: 6,
  },

  radioBtn: { flex: 1, borderWidth: 1, borderColor: wc.borderStrong, borderRadius: 8, paddingVertical: 9, alignItems: 'center', backgroundColor: wc.surface2 },
  radioBtnOn: { backgroundColor: wc.fillAccent, borderColor: wc.fillAccent },
  radioBtnText: { fontSize: 14, fontWeight: '500', color: wc.textSecondary },
  radioBtnTextOn: { color: '#fff' },
});

const mx = StyleSheet.create({
  centerWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 17, fontWeight: '700', color: wc.textPrimary, marginBottom: 8 },
  textarea: { borderWidth: 1, borderColor: wc.borderStrong, borderRadius: 8, padding: 12, fontSize: 14, color: wc.textPrimary, minHeight: 90, textAlignVertical: 'top', marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
});
