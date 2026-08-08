import React, { useRef, useEffect, useState } from 'react';
import {
  View, ActivityIndicator, Text, StyleSheet,
  TouchableOpacity, Alert,
} from 'react-native';
import Pdf from 'react-native-pdf';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { PageHeader } from '../components/PageHeader';
import { colors, typography, spacing } from '../theme';
import { authFetch } from '../api';

function ShareIcon() {
  return (
    <View style={{ width: 20, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', top: 0, alignSelf: 'center', width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', bottom: 0, right: 0, width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#fff' }} />
      <View style={{ position: 'absolute', top: 3, left: 2, width: 1.5, height: 11, backgroundColor: '#fff', transform: [{ rotate: '28deg' }] }} />
      <View style={{ position: 'absolute', top: 3, right: 2, width: 1.5, height: 11, backgroundColor: '#fff', transform: [{ rotate: '-28deg' }] }} />
    </View>
  );
}

export default function PdfViewer() {
  const { url, title } = useLocalSearchParams<{ url: string; title: string }>();

  const input     = url   ? decodeURIComponent(url)   : '';
  const pageTitle = title ? decodeURIComponent(title) : 'Document';
  const filename  = pageTitle.replace(/[^a-z0-9]/gi, '_') + '.pdf';

  const [pdfUri,  setPdfUri ] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error,   setError  ] = useState<string | null>(null);

  // Keep the local file path in a ref so share always has it
  const localPathRef = useRef<string | null>(null);

  function getLocalPath(): string {
    const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!dir) throw new Error('Storage not accessible');
    return dir + (dir.endsWith('/') ? '' : '/') + filename;
  }

  // Fetch PDF bytes with credentials and write to local file
  async function fetchAndSave(remoteUrl: string): Promise<string> {
    const localPath = getLocalPath();

    // Fetch with the Bearer auth token — this is critical for authenticated PDFs
    const res = await authFetch(remoteUrl);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);

    // Convert response to base64 via FileReader
    const blob   = await res.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // result is "data:application/pdf;base64,XXXX"
        const b64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(b64);
      };
      reader.onerror = () => reject(new Error('Failed to read PDF bytes'));
      reader.readAsDataURL(blob);
    });

    if (!base64 || base64.length === 0) throw new Error('Empty PDF response');

    // Write base64 to local file
    await FileSystem.writeAsStringAsync(localPath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Verify file was written with actual bytes
    const info = await FileSystem.getInfoAsync(localPath);
    if (!info.exists) throw new Error('File was not created');
    const size = (info as any).size ?? 0;
    if (size === 0) throw new Error('File is empty after write (0 bytes)');

    return localPath;
  }

  // Load on mount
  useEffect(() => {
    if (!input) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const localPath = await fetchAndSave(input);
        localPathRef.current = localPath;
        // react-native-pdf needs file:// URI
        const fileUri = localPath.startsWith('file://') ? localPath : `file://${localPath}`;
        setPdfUri(fileUri);
      } catch (e: any) {
        setError(e?.message || 'Failed to load PDF');
      } finally {
        setLoading(false);
      }
    })();
  }, [input]);

  // Share the already-downloaded local file
  async function handleShare() {
    if (sharing) return;
    const localPath = localPathRef.current;
    if (!localPath) { Alert.alert('Not ready', 'PDF is still loading.'); return; }

    setSharing(true);
    try {
      // Double-check file still exists and has bytes
      const info = await FileSystem.getInfoAsync(localPath);
      if (!info.exists || (info as any).size === 0) {
        // Re-fetch if file was cleared from cache
        const freshPath = await fetchAndSave(input);
        localPathRef.current = freshPath;
      }

      const shareUri = localPathRef.current!;

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) { Alert.alert('Not available', 'Sharing is not supported on this device.'); return; }

      await Sharing.shareAsync(shareUri, {
        mimeType:    'application/pdf',
        dialogTitle: `Share ${pageTitle}`,
        UTI:         'com.adobe.pdf',
      });
    } catch (e: any) {
      Alert.alert('Share failed', e?.message || 'Could not share PDF');
    } finally {
      setSharing(false);
    }
  }

  const shareBtn = (
    <TouchableOpacity
      onPress={handleShare}
      disabled={sharing || !pdfUri}
      style={[s.btn, (sharing || !pdfUri) && { opacity: 0.4 }]}
      activeOpacity={0.75}
    >
      {sharing
        ? <ActivityIndicator size="small" color="#fff" />
        : <ShareIcon />
      }
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title={pageTitle} right={shareBtn} />

      {loading && (
        <View style={s.overlay}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={s.loadingText}>Loading PDF…</Text>
        </View>
      )}

      {error && !loading && (
        <View style={s.overlay}>
          <Text style={{ fontSize: 40 }}>⚠️</Text>
          <Text style={s.errorTitle}>Could not load PDF</Text>
          <Text style={s.errorMsg}>{error}</Text>
        </View>
      )}

      {pdfUri && !loading && !error && (
        <Pdf
          source={{ uri: pdfUri, cache: false }}
          style={{ flex: 1 }}
          trustAllCerts={false}
          onError={(err) => {
            console.log('PDF ERROR:', err);
            setError('Failed to display PDF');
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgGray, zIndex: 10, gap: spacing.sm,
  },
  loadingText: { fontSize: typography.base, color: colors.muted },
  errorTitle:  { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  errorMsg:    { fontSize: typography.sm, color: colors.error, textAlign: 'center', paddingHorizontal: spacing.xl },
  btn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
});
