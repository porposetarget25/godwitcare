// src/screens/More.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { PageHeader } from '../components/PageHeader';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, radius, shadow } from '../theme';

const MENU = [
  { icon: '📰', label: 'News & Announcements', sub: 'Latest updates from GodwitCare', href: '/(app)/more/news' },
  { icon: '❓', label: 'FAQs',                 sub: 'Common questions answered',       href: '/(app)/more/faqs' },
];

export default function More() {
  const router = useRouter();
  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="More" subtitle="Help & information" showBack={false} />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <View style={s.card}>
          {MENU.map((item, i) => (
            <React.Fragment key={item.label}>
              {i > 0 && <View style={s.sep} />}
              <TouchableOpacity style={s.row} onPress={() => router.push(item.href as any)} activeOpacity={0.7}>
                <View style={s.iconWrap}><Text style={{ fontSize: 20 }}>{item.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>{item.label}</Text>
                  <Text style={s.rowSub}>{item.sub}</Text>
                </View>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: colors.bgGray },
  content:  { padding: spacing.xl, paddingBottom: 60 },
  card:     { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, ...shadow.sm, overflow: 'hidden' },
  sep:      { height: 1, backgroundColor: colors.line, marginHorizontal: spacing.lg },
  row:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 16, gap: spacing.md },
  iconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.brandLight, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  rowSub:   { fontSize: typography.xs, color: colors.muted, marginTop: 2 },
  chevron:  { fontSize: 22, color: colors.muted },
});
