// src/utils/openPdf.ts
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { API_BASE_URL } from '../api';

function toAbsoluteUrl(url: string): string {
  if (!url) return '';

  const originMatch = API_BASE_URL.match(/^(https?:\/\/[^/]+)/);
  const origin = originMatch ? originMatch[1] : '';

  // Already absolute — replace localhost/127.0.0.1 with configured host
  if (/^https?:\/\//i.test(url)) {
    if (!origin) return url;
    return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, origin);
  }

  // Relative path — prepend origin
  if (!origin) return url;
  return origin + (url.startsWith('/') ? url : '/' + url);
}

export function openPdf(rawUrl: string, title = 'Document') {
  if (!rawUrl) {
    Alert.alert('Not available', 'PDF is not available yet.');
    return;
  }

  const url = toAbsoluteUrl(rawUrl);

  if (!url.startsWith('http')) {
    Alert.alert('Error', `Cannot resolve PDF URL.\nRaw: ${rawUrl}\nBase: ${API_BASE_URL}`);
    return;
  }

  // Open in the in-app WebView viewer — works for LAN IPs, no external app needed
  router.push({
    pathname: '/(app)/pdf-viewer',
    params: {
      url: encodeURIComponent(url),
      title: encodeURIComponent(title),
    },
  } as any);
}
