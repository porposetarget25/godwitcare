// src/screens/PrivacyPolicy.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, typography, radius, shadow } from '../theme';
import { PageHeader } from '../components/PageHeader';

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: 'We collect personal information you provide when registering, including your name, email address, phone number, and health-related information necessary to provide travel health consultations.',
  },
  {
    title: 'How We Use Your Information',
    body: 'Your information is used to provide consultations, send appointment reminders, improve our services, and communicate important health information relevant to your travel.',
  },
  {
    title: 'Data Security',
    body: 'We implement industry-standard security measures to protect your personal and health data. All data is encrypted in transit and at rest.',
  },
  {
    title: 'Sharing of Information',
    body: 'We do not sell your personal information. We may share data with licensed healthcare providers involved in your care, or as required by law.',
  },
  {
    title: 'Your Rights',
    body: 'You have the right to access, correct, or delete your personal data. Contact our support team to exercise these rights.',
  },
  {
    title: 'Contact Us',
    body: 'For privacy-related questions or concerns, please reach out to privacy@godwitcare.com.',
  },
];

export default function PrivacyPolicy() {
  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Privacy Policy" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🔒</Text>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <Text style={styles.headerSub}>Last updated: January 2025</Text>
      </View>

      <View style={styles.intro}>
        <Text style={styles.introText}>
          At GodwitCare, we are committed to protecting your privacy and ensuring your personal
          health information is handled with the utmost care and security.
        </Text>
      </View>

      {SECTIONS.map((s) => (
        <View key={s.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{s.title}</Text>
          <Text style={styles.sectionBody}>{s.body}</Text>
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2025 GodwitCare. All rights reserved.</Text>
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
  headerIcon: { fontSize: 45 },
  headerTitle: { fontSize: typography.xl, fontWeight: '800', color: colors.text },
  headerSub: { fontSize: typography.sm, color: colors.muted },
  intro: {
    backgroundColor: `${colors.brand}12`,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.brand}30`,
  },
  introText: {
    fontSize: typography.base,
    color: colors.text,
    lineHeight: 22,
    fontStyle: 'italic',
  },
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
  footer: { alignItems: 'center', padding: spacing.lg },
  footerText: { fontSize: typography.sm, color: colors.muted },
});
