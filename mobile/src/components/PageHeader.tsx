// src/components/PageHeader.tsx — mirrors web's plain .page-head (title + sub + actions), no color bar.
// Screens with showBack merge into PortalShell's persistent topbar (single row: back + title +
// actions) instead of rendering a second bar here; root screens (showBack={false}) still render
// their own inline header, same as before.
import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ws, wc } from '../webStyle';
import { usePortalHeader } from './PortalShell';

type Props = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  showLogo?: boolean; // unused now that PortalShell owns the persistent logo; kept for call-site compatibility
};

export function PageHeader({ title, subtitle, showBack = true, onBack, right }: Props) {
  const router = useRouter();
  const setHeader = usePortalHeader();

  // Re-registered on every focus (not just mount) because expo-router keeps prior stack
  // screens mounted — without this, navigating back to a screen wouldn't restore its header.
  useFocusEffect(
    useCallback(() => {
      if (!showBack) return;
      setHeader({ title, subtitle, right, onBack: () => { if (onBack) onBack(); else router.back(); } });
      return () => setHeader(null);
    }, [showBack, title, subtitle, right, onBack, router, setHeader])
  );

  if (showBack) return null;

  return (
    <View style={s.wrap}>
      <View style={ws.pageHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={ws.pageTitle} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={[ws.pageSub, { marginBottom: 0 }]} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <View style={ws.pageHeadActions}>{right}</View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 16, backgroundColor: wc.surface0 },
});
