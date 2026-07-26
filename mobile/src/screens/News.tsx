// src/screens/News.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, typography, radius, shadow } from '../theme';
import { PageHeader } from '../components/PageHeader';

export default function News() {
  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="News & Announcements" subtitle="Latest updates" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>📰</Text>
          <Text style={styles.emptyTitle}>News & Announcements</Text>
          <Text style={styles.emptyBody}>
            Important updates, new features, and announcements from GodwitCare will be posted here.
            Check back soon!
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>COMING SOON</Text>
          </View>
          <Text style={styles.cardTitle}>We're working on something great</Text>
          <Text style={styles.cardBody}>
            This section will feature the latest news, product updates, and important announcements
            from the GodwitCare team.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgGray },
  content: { padding: spacing.lg, gap: spacing.lg },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  emptyBody: {
    fontSize: typography.base,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.line,
  },
  badgeText: { fontSize: typography.xs, color: colors.brand, fontWeight: '700' },
  cardTitle: { fontSize: typography.md, fontWeight: '700', color: colors.text },
  cardBody: { fontSize: typography.base, color: colors.muted, lineHeight: 22 },
});
