// src/screens/TermsOfUse.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, typography, radius, shadow } from '../theme';
import { PageHeader } from '../components/PageHeader';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using GodwitCare, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our services.',
  },
  {
    title: '2. Use of Services',
    body: 'GodwitCare provides travel health consultation services. You agree to use these services only for lawful purposes and in accordance with these terms.',
  },
  {
    title: '3. Medical Disclaimer',
    body: 'The information and consultations provided by GodwitCare are for informational purposes. They do not replace professional medical advice, diagnosis, or treatment.',
  },
  {
    title: '4. Privacy',
    body: 'Your use of GodwitCare is also governed by our Privacy Policy, which is incorporated into these Terms by reference.',
  },
  {
    title: '5. Changes to Terms',
    body: 'GodwitCare reserves the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.',
  },
];

export default function TermsOfUse() {
  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Terms of Use" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>📄</Text>
        <Text style={styles.headerTitle}>Terms of Use</Text>
        <Text style={styles.headerSub}>Last updated: January 2025</Text>
      </View>

      {SECTIONS.map((s) => (
        <View key={s.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{s.title}</Text>
          <Text style={styles.sectionBody}>{s.body}</Text>
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          For questions about these terms, contact us at legal@godwitcare.com
        </Text>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  headerIcon: { fontSize: 44 },
  headerTitle: { fontSize: typography.xl, fontWeight: '800', color: colors.text },
  headerSub: { fontSize: typography.sm, color: colors.muted },
  section: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
  },
  sectionTitle: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  sectionBody: { fontSize: typography.base, color: colors.muted, lineHeight: 22 },
  footer: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  footerText: { fontSize: typography.sm, color: colors.muted, textAlign: 'center' },
});
