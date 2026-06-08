// src/components/BottomNav.tsx — 3 tabs: Home / Profile / More (hidden for unauth)
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../state/auth';
import { colors, typography } from '../theme';

const TABS = [
  { label: 'Home',    href: '/(app)/home',    match: ['/home'] },
  { label: 'Profile', href: '/(app)/account', match: ['/account'] },
  { label: 'More',    href: '/(app)/more',    match: ['/more', '/more/news', '/more/notifications', '/more/terms', '/more/privacy'] },
];

function HomeIcon({ active }: { active: boolean }) {
  const c = active ? colors.brand : '#94a3b8';
  return (
    <View style={{ width: 24, height: 22, alignItems: 'center' }}>
      <View style={{ width: 0, height: 0, borderLeftWidth: 12, borderRightWidth: 12, borderBottomWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: c, position: 'absolute', top: 0 }} />
      <View style={{ position: 'absolute', bottom: 0, width: 16, height: 12, backgroundColor: active ? colors.brandLight : '#f1f5f9', borderWidth: 2, borderColor: c, borderTopWidth: 0 }}>
        <View style={{ position: 'absolute', bottom: 0, left: '50%', marginLeft: -3, width: 6, height: 7, backgroundColor: c, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
      </View>
    </View>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  const c = active ? colors.brand : '#94a3b8';
  return (
    <View style={{ width: 22, height: 22, alignItems: 'center' }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: c, backgroundColor: active ? colors.brandLight : '#f1f5f9', position: 'absolute', top: 0 }} />
      <View style={{ position: 'absolute', bottom: 0, width: 20, height: 11, borderTopLeftRadius: 11, borderTopRightRadius: 11, borderWidth: 2, borderColor: c, borderBottomWidth: 0, backgroundColor: active ? colors.brandLight : '#f1f5f9' }} />
    </View>
  );
}

function MoreIcon({ active }: { active: boolean }) {
  const c = active ? colors.brand : '#94a3b8';
  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', height: 22, justifyContent: 'center' }}>
      {[0,1,2].map(i => <View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c, opacity: i === 1 ? 1 : 0.7 }} />)}
    </View>
  );
}

const ICONS = [HomeIcon, ProfileIcon, MoreIcon];

export function BottomNav() {
  const { user, loading } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  if (loading || !user) return null;

  const isActive = (tab: typeof TABS[0]) =>
    tab.match.some(m => pathname === m || pathname.startsWith(m + '/'));

  return (
    <View style={s.container}>
      {TABS.map((tab, idx) => {
        const active = isActive(tab);
        const Icon   = ICONS[idx];
        return (
          <TouchableOpacity key={tab.label} style={s.tab} onPress={() => router.push(tab.href as any)} activeOpacity={0.75}>
            <View style={[s.topBar, active && s.topBarActive]} />
            <View style={[s.iconWrap, active && s.iconWrapActive]}>
              <Icon active={active} />
            </View>
            <Text style={[s.label, active && s.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flexDirection: 'row', backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: '#e8edf2', paddingBottom: 8, paddingTop: 4, elevation: 16, shadowColor: '#1a2e4a', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 10 },
  tab:          { flex: 1, alignItems: 'center', paddingVertical: 4, gap: 3, position: 'relative' },
  topBar:       { position: 'absolute', top: 0, width: 28, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: 'transparent' },
  topBarActive: { backgroundColor: colors.brand },
  iconWrap:     { width: 46, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  iconWrapActive:{ backgroundColor: colors.brandLight },
  label:        { fontSize: 10, color: '#94a3b8', fontWeight: '500', letterSpacing: 0.3 },
  labelActive:  { color: colors.brand, fontWeight: '700' },
});
