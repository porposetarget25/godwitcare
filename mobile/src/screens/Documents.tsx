// src/screens/Documents.tsx — travel documents (passport / travel document) per traveller. Matches web's .portal cards/tags.
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../state/auth';
import {
  getLatestRegistrationByEmail, listDocuments, uploadDocument, deleteDocument,
  downloadDocumentAsDataUri, type DocSummary, type DocumentType, type RNFile,
} from '../api';
import { PageHeader } from '../components/PageHeader';
import { ws, wc } from '../webStyle';

const DOC_TYPES: { type: DocumentType; label: string }[] = [
  { type: 'PASSPORT', label: 'Passport' },
  { type: 'TRAVEL_DOCUMENT', label: 'Boarding Pass' },
];

function formatSize(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

type Person = { name: string; patientId: string };

export default function Documents() {
  const { user } = useAuth();
  const [regId, setRegId] = useState<number | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [docs, setDocs] = useState<Record<string, DocSummary[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Person | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocSummary | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const reg = await getLatestRegistrationByEmail(user.email!);
        if (!alive) return;
        if (!reg?.id) { setRegId(null); return; }
        setRegId(reg.id);
        const primaryName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'You';
        const ppl: Person[] = [
          ...(reg.primaryPatientId ? [{ name: primaryName, patientId: reg.primaryPatientId }] : []),
          ...(reg.travelers || []).filter(t => t.patientId).map(t => ({ name: t.fullName, patientId: t.patientId! })),
        ];
        setPeople(ppl);
        const entries = await Promise.all(ppl.map(async p => [p.patientId, await listDocuments(reg.id, p.patientId).catch(() => [])] as const));
        if (alive) setDocs(Object.fromEntries(entries));
      } catch {
        if (alive) setError('Unable to load travel documents.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [user?.email]);

  async function refreshDocs(patientId: string) {
    if (!regId) return;
    const fresh = await listDocuments(regId, patientId);
    setDocs(prev => ({ ...prev, [patientId]: fresh }));
  }

  async function onUpload(patientId: string, type: DocumentType) {
    if (!regId) return;
    const result = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png', 'application/pdf'] });
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    const file: RNFile = { uri: a.uri, name: a.name, type: a.mimeType || 'application/octet-stream' };
    setError('');
    setBusyKey(`${patientId}:${type}`);
    try {
      await uploadDocument(regId, patientId, type, file);
      await refreshDocs(patientId);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setBusyKey(null);
    }
  }

  async function onView(doc: DocSummary) {
    if (!regId) return;
    setBusyKey(`view:${doc.id}`);
    try {
      const dataUri = await downloadDocumentAsDataUri(regId, doc.patientId, doc.id);
      const base64 = dataUri.split(',')[1] || '';
      const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!dir) throw new Error('Storage not accessible');
      const localPath = dir + doc.fileName;
      await FileSystem.writeAsStringAsync(localPath, base64, { encoding: FileSystem.EncodingType.Base64 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localPath, { dialogTitle: doc.fileName });
      } else {
        await Linking.openURL(localPath);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Unable to open document.');
    } finally {
      setBusyKey(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !regId) return;
    setBusyKey(`delete:${deleteTarget.id}`);
    try {
      await deleteDocument(regId, deleteTarget.id);
      await refreshDocs(deleteTarget.patientId);
    } catch {
      setError('Unable to delete document.');
    } finally {
      setBusyKey(null);
      setDeleteTarget(null);
    }
  }

  const initials = (name: string) => name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Documents" subtitle="Passports & boarding passes" showBack />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={wc.fillAccent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
          {error && <View style={[ws.notice, ws.nWarn]}><Text style={[ws.noticeText, ws.nWarnText]}>{error}</Text></View>}

          {!regId ? (
            <View style={s.emptyCard}>
              <Text style={{ fontSize: 37 }}>📄</Text>
              <Text style={s.emptyTitle}>No registration found</Text>
              <Text style={s.emptySub}>Register your trip to manage travel documents.</Text>
            </View>
          ) : !selected ? (
            people.map(p => {
              const personDocs = docs[p.patientId] || [];
              return (
                <TouchableOpacity key={p.patientId} style={ws.card} onPress={() => setSelected(p)} activeOpacity={0.75}>
                  <View style={s.personRow}>
                    <View style={ws.ava}><Text style={ws.avaText}>{initials(p.name)}</Text></View>
                    <Text style={s.personName}>{p.name}</Text>
                    <Text style={s.chevron}>›</Text>
                  </View>
                  {DOC_TYPES.map(dt => {
                    const doc = personDocs.find(d => d.type === dt.type);
                    return (
                      <View key={dt.type} style={ws.dr}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.docLabel}>{dt.label}</Text>
                          <Text style={s.docSub}>{doc ? doc.fileName : 'Not uploaded yet'}</Text>
                        </View>
                        <View style={[ws.tag, doc ? ws.tok : ws.tmute]}>
                          <Text style={[ws.tagText, doc ? ws.tokText : ws.tmuteText]}>{doc ? 'Uploaded' : 'Missing'}</Text>
                        </View>
                      </View>
                    );
                  })}
                </TouchableOpacity>
              );
            })
          ) : (
            <>
              <TouchableOpacity style={s.backRow} onPress={() => setSelected(null)} activeOpacity={0.7}>
                <Text style={s.backRowText}>‹ All Travellers</Text>
              </TouchableOpacity>
              <Text style={s.selectedName}>{selected.name}</Text>

              {DOC_TYPES.map(dt => {
                const doc = (docs[selected.patientId] || []).find(d => d.type === dt.type);
                const uploading = busyKey === `${selected.patientId}:${dt.type}`;
                return (
                  <View key={dt.type} style={ws.card}>
                    <Text style={ws.ct}>{dt.label}</Text>
                    {!doc ? (
                      <View style={s.docEmpty}>
                        <Text style={{ fontSize: 27 }}>📤</Text>
                        <Text style={s.docEmptyText}>No {dt.label.toLowerCase()} uploaded yet</Text>
                        <TouchableOpacity style={ws.bp} onPress={() => onUpload(selected.patientId, dt.type)} disabled={uploading} activeOpacity={0.85}>
                          <Text style={ws.bpText}>{uploading ? 'Uploading…' : `Upload ${dt.label}`}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <View style={s.docFilled}>
                          <Text style={{ fontSize: 19 }}>📄</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={s.docFileName}>{doc.fileName}</Text>
                            <Text style={s.docFileMeta}>{formatSize(doc.sizeBytes)}{doc.createdAt ? ` · ${new Date(doc.createdAt).toLocaleDateString()}` : ''}</Text>
                          </View>
                        </View>
                        <View style={s.docActions}>
                          <TouchableOpacity style={ws.bs} onPress={() => onView(doc)} disabled={busyKey === `view:${doc.id}`} activeOpacity={0.75}>
                            <Text style={ws.bsText}>{busyKey === `view:${doc.id}` ? 'Opening…' : 'View'}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={ws.bs} onPress={() => onUpload(selected.patientId, dt.type)} disabled={uploading} activeOpacity={0.75}>
                            <Text style={ws.bsText}>{uploading ? 'Uploading…' : 'Replace'}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={ws.bd} onPress={() => setDeleteTarget(doc)} activeOpacity={0.75}>
                            <Text style={ws.bdText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                );
              })}
            </>
          )}

          <Text style={s.hint}>Accepted formats: JPG, PNG, PDF. Documents are stored securely and only used to support your consultations.</Text>
        </ScrollView>
      )}

      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <TouchableOpacity style={ws.modalOverlay} activeOpacity={1} onPress={() => setDeleteTarget(null)} />
        <View style={cx.centerWrap} pointerEvents="box-none">
          <View style={[ws.modalBox, { padding: 18 }]}>
            <Text style={s.modalTitle}>Delete Document</Text>
            <Text style={s.modalBody}>Are you sure you want to delete {deleteTarget?.fileName}? This cannot be undone.</Text>
            <View style={cx.actions}>
              <TouchableOpacity style={[ws.bs, { flex: 1 }]} onPress={() => setDeleteTarget(null)} activeOpacity={0.75}>
                <Text style={ws.bsText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[ws.bd, { flex: 1 }]} onPress={confirmDelete} disabled={busyKey === `delete:${deleteTarget?.id}`} activeOpacity={0.85}>
                {busyKey === `delete:${deleteTarget?.id}` ? <ActivityIndicator color={wc.textDanger} size="small" /> : <Text style={ws.bdText}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },

  emptyCard: { backgroundColor: wc.surface2, borderRadius: 8, borderWidth: 1, borderColor: wc.borderStrong, padding: 28, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: wc.textPrimary },
  emptySub: { fontSize: 14, color: wc.textMuted, textAlign: 'center' },

  personRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  personName: { flex: 1, fontSize: 15, fontWeight: '600', color: wc.textPrimary },
  chevron: { fontSize: 19, color: wc.textMuted },

  docLabel: { fontSize: 14, fontWeight: '500', color: wc.textPrimary },
  docSub: { fontSize: 12, color: wc.textMuted, marginTop: 1 },

  backRow: { alignSelf: 'flex-start', marginBottom: 4 },
  backRowText: { fontSize: 14, fontWeight: '500', color: wc.fillAccent },
  selectedName: { fontSize: 18, fontWeight: '600', color: wc.textPrimary, marginBottom: 4 },

  docEmpty: { alignItems: 'center', gap: 8, paddingVertical: 10 },
  docEmptyText: { fontSize: 14, color: wc.textMuted },

  docFilled: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  docFileName: { fontSize: 14, fontWeight: '500', color: wc.textPrimary },
  docFileMeta: { fontSize: 12, color: wc.textMuted, marginTop: 1 },

  docActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 10 },

  hint: { fontSize: 12, color: wc.textMuted, textAlign: 'center', paddingHorizontal: 8 },

  modalTitle: { fontSize: 16, fontWeight: '600', color: wc.textPrimary, marginBottom: 8 },
  modalBody: { fontSize: 14, color: wc.textSecondary, lineHeight: 18, marginBottom: 14 },
});

const cx = StyleSheet.create({
  centerWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 20 },
  actions: { flexDirection: 'row', gap: 8 },
});
