// src/screens/Dashboard.tsx
// Authenticated: shows marketing landing page
// Unauthenticated: shows onboarding carousel
import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../state/auth';
import { colors, spacing, radius, typography, shadow } from '../theme';

const LOGO_DARK   = require('../../assets/logo_dark.png');
const DOCTOR_IMG  = require('../../assets/doctor10.png');
const CONSULT_IMG = require('../../assets/consultation.png');

type Feature = { title: string; desc: string; icon: string };

const HOW_CARDS = [
  { title: 'Connect',  desc: 'Reach out to our platform from anywhere in the world, effortlessly.', icon: '📶' },
  { title: 'Consult',  desc: 'Have a virtual consultation with an experienced medical professional.', icon: '💬' },
  { title: 'Continue', desc: 'Receive timely advice, recover and feel confident to continue your journey.', icon: '✈️' },
];

const FEATURES: Feature[] = [
  { title: '9 to 5 Availability',      desc: 'Medical advice accessible anytime, from any time zone.',          icon: '⏰' },
  { title: 'Certified Experts',         desc: 'Connect with licensed and experienced healthcare professionals.',  icon: '🏅' },
  { title: 'Worldwide Access',          desc: 'Receive care globally, ensuring support wherever you are.',        icon: '🌍' },
  { title: 'Personalized Plans',        desc: 'Flexible plans tailored to your specific health needs.',           icon: '⚙️' },
  { title: 'Inclusive for All Ages',    desc: 'Fair pricing with no age-linked costs or restrictions.',           icon: '👨‍👩‍👧' },
  { title: 'Effortless Digital',        desc: 'No reimbursements; manage everything digitally with ease.',        icon: '📱' },
  { title: 'Transparent Pricing',       desc: 'Full outpatient coverage with no hidden fees.',                    icon: '🏷️' },
  { title: 'Cancel Anytime',            desc: 'Freedom to cancel your plan without penalties.',                   icon: '🚫' },
  { title: 'Comprehensive Coverage',    desc: 'Full support, even for pre-existing conditions.',                  icon: '🛡️' },
  { title: 'Zero Excess Fees',          desc: 'No additional costs applied to your medical care.',                icon: '💳' },
  { title: 'Flexible Start',            desc: 'Begin coverage even after your journey has commenced.',            icon: '📅' },
  { title: 'Pre-Existing Welcome',      desc: 'Coverage thoughtfully designed for pre-existing conditions.',      icon: '📋' },
];

const TESTIMONIALS = [
  { text: '"As a frequent traveler, GodwitCare has been a lifesaver. Quick, reliable advice when I needed it most!"', author: '— Sarah J., London, UK' },
  { text: '"I had an urgent question while abroad, and their WhatsApp consultation was incredibly convenient."', author: '— Michael P., Sydney, AU' },
  { text: '"Getting medical advice during my trip has never been easier. The doctors were thorough."', author: '— Aisha K., Dubai, UAE' },
];

export default function Dashboard() {
  const { user, loading } = useAuth();

  // Still loading auth — show blank teal screen (splash already covered this)
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  // Unauthenticated — _layout.tsx redirects to /onboarding, nothing to render here
  if (!user) return null;

  // Authenticated — show marketing/landing page
  return (
    <View style={{ flex: 1 }}>
      {/* Top Nav Bar */}
      <View style={styles.navBar}>
        <View style={styles.logoBadge}>
          <Image source={LOGO_DARK} style={styles.logoImg} resizeMode="contain" />
        </View>
        <View style={styles.navTextWrap}>
          <View style={styles.navTitleRow}>
            <Text style={styles.navTitleGodwit}>Godwit</Text>
            <Text style={styles.navTitleCare}>Care</Text>
          </View>
          <Text style={styles.navSub}>Care Beyond Borders</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Your Trusted Medical Advisor on the Go</Text>
          <Text style={styles.heroSub}>
            GodwitCare provides instant, reliable medical advice and consultations via WhatsApp,
            ensuring your health is never compromised, no matter where you are in the world.
          </Text>
          <Image source={DOCTOR_IMG} style={styles.heroImg} resizeMode="cover" />
        </View>

        {/* How it works */}
        <View style={styles.section}>
          <Text style={styles.h2}>How It Works</Text>
          <Text style={styles.kicker}>Connect · Consult · Continue</Text>
          {HOW_CARDS.map((c) => (
            <View key={c.title} style={styles.howCard}>
              <Text style={styles.howIcon}>{c.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardDesc}>{c.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Key Features */}
        <View style={[styles.section, { backgroundColor: colors.brandLight }]}>
          <Text style={styles.h2}>Key Features</Text>
          <Text style={styles.kicker}>12 Reasons to Join GodwitCare</Text>
          <View style={styles.featureGrid}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.featureCard}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Seamless consultations */}
        <View style={styles.section}>
          <Image source={CONSULT_IMG} style={styles.consultImg} resizeMode="cover" />
          <Text style={[styles.h2, { textAlign: 'left', marginTop: spacing.lg }]}>
            Seamless Consultations, Anywhere, Anytime
          </Text>
          <Text style={styles.muted}>
            Leverage the convenience of WhatsApp for secure video and chat consultations with
            certified doctors. Our platform integrates seamlessly, providing you with peace of mind
            and expert medical guidance at your fingertips.
          </Text>
        </View>

        {/* Testimonials */}
        <View style={[styles.section, { borderTopWidth: 1, borderTopColor: colors.line }]}>
          <Text style={styles.h2}>What Our Travelers Say</Text>
          {TESTIMONIALS.map((t) => (
            <View key={t.author} style={styles.card}>
              <Text style={{ fontStyle: 'italic', color: colors.text }}>{t.text}</Text>
              <Text style={[styles.muted, { marginTop: spacing.sm }]}>{t.author}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2024 GodwitCare. All rights reserved.</Text>
          <Text style={styles.footerText}>Privacy · Terms · Cookie Policy</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    paddingBottom: 12,
    gap: spacing.md,
    elevation: 6,
    shadowColor: colors.brandDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  logoBadge: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  logoImg:   { width: 52, height: 52 },
  navTextWrap: { flex: 1 },
  navTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  navTitleGodwit: { color: '#fff', fontSize: typography.xl, fontWeight: '300', letterSpacing: 0.5 },
  navTitleCare:   { color: colors.amber, fontSize: typography.xl, fontWeight: '800', letterSpacing: 0.5 },
  navSub: { color: 'rgba(255,255,255,0.72)', fontSize: typography.xs, fontWeight: '500', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 1 },

  scroll: { flex: 1, backgroundColor: colors.white },
  hero: { backgroundColor: colors.brandLight, padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.line },
  heroTitle: { fontSize: typography.xxl, fontWeight: '800', color: colors.text, marginBottom: spacing.md, lineHeight: 34, letterSpacing: -0.5 },
  heroSub:   { fontSize: typography.base, color: colors.muted, lineHeight: 22 },
  heroImg:   { width: '100%', height: 220, borderRadius: radius.xl, marginTop: spacing.lg },

  section: { padding: spacing.xl },
  h2: { fontSize: typography.xl, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: spacing.xs },
  kicker: { textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700', color: colors.brand, fontSize: typography.sm, textAlign: 'center', marginBottom: spacing.lg },

  howCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: colors.white, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.line,
    padding: spacing.lg, marginBottom: spacing.md, ...shadow.sm,
  },
  howIcon:   { fontSize: 28, marginTop: 2 },
  cardTitle: { fontWeight: '700', fontSize: typography.md, color: colors.text, marginBottom: spacing.xs },
  cardDesc:  { fontSize: typography.sm, color: colors.muted, lineHeight: 20 },

  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  featureCard: { width: '47%', backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.md, ...shadow.sm },
  featureIcon:  { fontSize: 24, marginBottom: spacing.xs },
  featureTitle: { fontWeight: '700', fontSize: typography.sm, color: colors.text, marginBottom: spacing.xs },
  featureDesc:  { fontSize: 12, color: colors.muted, lineHeight: 17 },

  consultImg: { width: '100%', height: 200, borderRadius: radius.xl },
  muted: { color: colors.muted, fontSize: typography.base, lineHeight: 22 },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, marginBottom: spacing.md },

  footer: { padding: spacing.xl, borderTopWidth: 1, borderTopColor: colors.line, alignItems: 'center', gap: spacing.xs },
  footerText: { color: colors.muted, fontSize: typography.sm },
});
