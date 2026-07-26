// src/screens/Notifications.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, typography, radius, shadow } from '../theme';
import { PageHeader } from '../components/PageHeader';

export default function Notifications() {
  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Notifications" subtitle="Recent alerts" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyIcon}>🔔</Text>
        <Text style={styles.emptyTitle}>Notifications</Text>
        <Text style={styles.emptyBody}>
          You're all caught up! Appointment reminders, consultation updates, and alerts will
          appear here.
        </Text>
      </View>

      <View style={styles.placeholder}>
        <View style={styles.placeholderIcon}>
          <Text style={{ fontSize: 22 }}>✅</Text>
        </View>
        <Text style={styles.placeholderText}>No new notifications</Text>
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
  placeholder: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  placeholderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { fontSize: typography.base, color: colors.muted, fontWeight: '500' },
});
