// src/screens/Login.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { login, API_BASE_URL } from '../api';
import { useAuth } from '../state/auth';
import { colors, spacing, radius, typography, shadow } from '../theme';

const LOGO_DARK = require('../../assets/logo_white.png');

export default function Login() {
  const [username, setUsername ] = useState('');
  const [password, setPassword ] = useState('');
  const [loading,  setLoading  ] = useState(false);
  const [error,    setError    ] = useState<string | null>(null);
  const [showPass, setShowPass ] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  async function onSubmit() {
    if (!username.trim() || !password.trim()) {
      setError('Please enter your WhatsApp number or email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
      await refresh();
      router.replace('/(app)/home');
    } catch (err: any) {
      const msg = err?.message || 'Login failed';
      const isNetwork = /network|fetch|connect/i.test(msg);
      setError(isNetwork
        ? `Cannot reach server. Make sure your device and server are on the same WiFi network.\n\nServer: ${API_BASE_URL}`
        : msg
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Teal hero header — same style as Home travel card ── */}
        <View style={s.hero}>
          {/* Decorative circles */}
          <View style={s.decor1} />
          <View style={s.decor2} />

          {/* Logo */}
          <Image source={LOGO_DARK} style={s.logo} resizeMode="contain" />

          {/* Brand text */}
          <View style={s.brandRow}>
            <Text style={s.brandGodwit}>Godwit</Text>
            <Text style={s.brandCare}>Care</Text>
          </View>
          <Text style={s.tagline}>CARE BEYOND BORDERS</Text>

          {/* Bottom arc — bleeds into form area */}
          <View style={s.heroArc} />
        </View>

        {/* ── Form card ── */}
        <View style={s.formWrap}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Welcome back</Text>
            <Text style={s.cardSub}>Sign in to access your account</Text>

            {/* Error banner */}
            {error && (
              <View style={s.errorBanner}>
                <Text style={s.errorIcon}>⚠️</Text>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {/* Username field */}
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>WhatsApp Number / Email</Text>
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>📱</Text>
                <TextInput
                  style={s.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="e.g. +1234567890 or email"
                  placeholderTextColor={colors.mutedLight}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="username"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password field */}
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Password</Text>
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>🔒</Text>
                <TextInput
                  style={s.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedLight}
                  secureTextEntry={!showPass}
                  autoComplete="password"
                  returnKeyType="go"
                  onSubmitEditing={onSubmit}
                />
                <TouchableOpacity onPress={() => setShowPass(v => !v)} style={s.eyeBtn} activeOpacity={0.7}>
                  <Text style={s.eyeIcon}>{showPass ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign In button — gold pill matching Home's consult button */}
            <TouchableOpacity
              style={[s.signInBtn, loading && s.signInBtnLoading]}
              onPress={onSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={colors.brandDark} size="small" />
                : <Text style={s.signInBtnText}>Sign In</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Forgot password */}
          <TouchableOpacity
            style={{ alignItems: 'center', paddingVertical: spacing.xs }}
            onPress={() => router.push('/forgot-password' as any)}
            activeOpacity={0.7}
          >
            <Text style={s.forgotLink}>Forgot your password?</Text>
          </TouchableOpacity>

          {/* Register link */}
          <View style={s.registerRow}>
            <Text style={s.registerText}>Don't have an account?  </Text>
            <TouchableOpacity onPress={() => router.push('/(app)/register/step1' as any)} activeOpacity={0.7}>
              <Text style={s.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>

          {/* Back to onboarding */}
          <TouchableOpacity style={s.backRow} onPress={() => router.replace('/onboarding' as any)} activeOpacity={0.7}>
            <Text style={s.backText}>← Back to overview</Text>
          </TouchableOpacity>

          <Text style={s.version}>GodwitCare · Secure Health Platform</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: colors.brand },
  scroll:{ flexGrow: 1 },

  // ── Hero header (teal) ──────────────────────────────────────────────────
  hero: {
    backgroundColor: colors.brand,
    paddingTop: 60,
    paddingBottom: 60,
    alignItems: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  decor1: { position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.07)' },
  decor2: { position: 'absolute', bottom: 10, left: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)' },

  logo: { width: 90, height: 90, marginBottom: spacing.sm },

  brandRow:    { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  brandGodwit: { fontSize: typography.xxxl, fontWeight: '300', color: '#fff', letterSpacing: 0.5 },
  brandCare:   { fontSize: typography.xxxl, fontWeight: '800', color: colors.amber, letterSpacing: 0.5 },
  tagline:     { fontSize: typography.xs, color: 'rgba(255,255,255,0.65)', letterSpacing: 2.5, fontWeight: '600' },

  // Arc that creates overlap effect
  heroArc: {
    position: 'absolute', bottom: -28, left: -20, right: -20,
    height: 56, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    backgroundColor: colors.bgGray,
  },

  // ── Form area ───────────────────────────────────────────────────────────
  formWrap: {
    flex: 1,
    backgroundColor: colors.bgGray,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadow.md,
  },
  cardTitle: { fontSize: typography.xl, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  cardSub:   { fontSize: typography.sm, color: colors.muted, marginBottom: spacing.xs },

  // Error
  errorBanner: {
    backgroundColor: colors.errorBg,
    borderWidth: 1, borderColor: colors.errorBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
  },
  errorIcon: { fontSize: 14 },
  errorText: { color: colors.error, fontSize: typography.sm, flex: 1, lineHeight: 18 },

  // Fields
  fieldWrap:  { gap: 6 },
  fieldLabel: { fontSize: typography.xs, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md,
    backgroundColor: colors.bgGray, paddingHorizontal: spacing.md,
    minHeight: 50, gap: spacing.sm,
  },
  inputIcon: { fontSize: 15, opacity: 0.5 },
  input:     { flex: 1, fontSize: typography.base, color: colors.text, paddingVertical: 12 },
  eyeBtn:    { padding: 4 },
  eyeIcon:   { fontSize: 16 },

  // Sign In button — gold like Home's consult CTA
  signInBtn: {
    backgroundColor: colors.amber,
    borderRadius: radius.full,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.xs,
    ...shadow.brand,
  },
  signInBtnLoading: { opacity: 0.8 },
  signInBtnText: {
    fontSize: typography.md,
    fontWeight: '800',
    color: colors.brandDark,
    letterSpacing: 0.3,
  },

  // Register / back links
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText:{ fontSize: typography.base, color: colors.muted },
  registerLink:{ fontSize: typography.base, fontWeight: '700', color: colors.brand },

  backRow: { alignItems: 'center', paddingVertical: spacing.xs },
  backText:{ fontSize: typography.sm, color: colors.muted },

  forgotLink: { fontSize: typography.sm, color: colors.brand, fontWeight: '600' },
  version: { textAlign: 'center', color: colors.mutedLight, fontSize: typography.xs, letterSpacing: 0.5 },
});
