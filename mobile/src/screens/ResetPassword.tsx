// src/screens/ResetPassword.tsx
// Step 3 of forgot-password flow: set new password using resetToken
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Image, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { resetPassword } from '../api';
import { colors, spacing, radius, typography, shadow } from '../theme';

const LOGO = require('../../assets/logo_dark.png');

export default function ResetPassword() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [password,        setPassword       ] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass,        setShowPass       ] = useState(false);
  const [showConfirm,     setShowConfirm    ] = useState(false);
  const [loading,         setLoading        ] = useState(false);
  const [success,         setSuccess        ] = useState(false);
  const [error,           setError          ] = useState<string | null>(null);

  async function submit() {
    if (!token) { setError('Reset session expired. Please request a new OTP.'); return; }
    if (!password.trim()) { setError('Please enter a new password.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true); setError(null);
    try {
      const res = await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.replace('/(app)/login' as any), 1800);
    } catch (e: any) {
      setError(e?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={s.hero}>
          <View style={s.decor1} /><View style={s.decor2} />
          <Image source={LOGO} style={s.logo} resizeMode="contain" />
          <View style={s.heroIconWrap}>
            <Text style={{ fontSize: 40 }}>{success ? '✅' : '🔐'}</Text>
          </View>
          <Text style={s.heroTitle}>{success ? 'Password Reset!' : 'New Password'}</Text>
          <Text style={s.heroSub}>{success ? 'Redirecting you to sign in…' : 'Choose a strong password for your account.'}</Text>
          <View style={s.heroArc} />
        </View>

        <View style={s.formWrap}>
          {success ? (
            <View style={s.successCard}>
              <Text style={s.successText}>Your password has been updated successfully.</Text>
              <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.md }} />
            </View>
          ) : (
            <View style={s.card}>
              <Text style={s.cardTitle}>Set New Password</Text>
              <Text style={s.cardSub}>Enter and confirm your new password.</Text>

              {error && (
                <View style={s.errorBanner}>
                  <Text style={s.errorIcon}>⚠️</Text>
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

              <View style={s.fieldWrap}>
                <Text style={s.fieldLabel}>New Password</Text>
                <View style={s.inputRow}>
                  <Text style={s.inputIcon}>🔒</Text>
                  <TextInput
                    style={s.input}
                    value={password}
                    onChangeText={t => { setPassword(t); setError(null); }}
                    placeholder="Min. 6 characters"
                    placeholderTextColor={colors.mutedLight}
                    secureTextEntry={!showPass}
                    textContentType="newPassword"
                  />
                  <TouchableOpacity onPress={() => setShowPass(v => !v)} activeOpacity={0.7}>
                    <Text style={s.eyeIcon}>{showPass ? '🙈' : '👁'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.fieldWrap}>
                <Text style={s.fieldLabel}>Confirm Password</Text>
                <View style={[s.inputRow, confirmPassword && password !== confirmPassword && s.inputRowErr]}>
                  <Text style={s.inputIcon}>🔒</Text>
                  <TextInput
                    style={s.input}
                    value={confirmPassword}
                    onChangeText={t => { setConfirmPassword(t); setError(null); }}
                    placeholder="Re-enter password"
                    placeholderTextColor={colors.mutedLight}
                    secureTextEntry={!showConfirm}
                    textContentType="newPassword"
                    returnKeyType="go"
                    onSubmitEditing={submit}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(v => !v)} activeOpacity={0.7}>
                    <Text style={s.eyeIcon}>{showConfirm ? '🙈' : '👁'}</Text>
                  </TouchableOpacity>
                </View>
                {confirmPassword && password !== confirmPassword && (
                  <Text style={s.matchErr}>Passwords do not match</Text>
                )}
              </View>

              <TouchableOpacity
                style={[s.submitBtn, loading && { opacity: 0.7 }]}
                onPress={submit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={colors.brandDark} />
                  : <Text style={s.submitBtnText}>Reset Password</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={s.backRow} onPress={() => router.replace('/(app)/login' as any)} activeOpacity={0.7}>
            <Text style={s.backText}>← Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: colors.brand },
  hero:         { backgroundColor: colors.brand, paddingTop: 60, paddingBottom: 60, alignItems: 'center', gap: spacing.sm, overflow: 'hidden', position: 'relative' },
  decor1:       { position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.07)' },
  decor2:       { position: 'absolute', bottom: 10, left: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)' },
  logo:         { width: 90, height: 36, marginBottom: spacing.sm },
  heroIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroTitle:    { fontSize: typography.xxl, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroSub:      { fontSize: typography.sm, color: 'rgba(255,255,255,0.7)', textAlign: 'center', paddingHorizontal: spacing.xxxl },
  heroArc:      { position: 'absolute', bottom: -28, left: -20, right: -20, height: 56, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: colors.bgGray },
  formWrap:     { flex: 1, backgroundColor: colors.bgGray, paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.md },
  card:         { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.xl, gap: spacing.md, ...shadow.md },
  cardTitle:    { fontSize: typography.xl, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  cardSub:      { fontSize: typography.sm, color: colors.muted },
  successCard:  { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.successBorder, padding: spacing.xl, alignItems: 'center', ...shadow.md },
  successText:  { fontSize: typography.base, color: colors.success, textAlign: 'center', fontWeight: '600' },
  errorBanner:  { backgroundColor: colors.errorBg, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: spacing.sm, borderWidth: 1, borderColor: colors.errorBorder },
  errorIcon:    { fontSize: 14 },
  errorText:    { color: colors.error, fontSize: typography.sm, flex: 1, lineHeight: 18 },
  fieldWrap:    { gap: 6 },
  fieldLabel:   { fontSize: typography.xs, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.bgGray, paddingHorizontal: spacing.md, minHeight: 50, gap: spacing.sm },
  inputRowErr:  { borderColor: colors.error },
  inputIcon:    { fontSize: 15, opacity: 0.5 },
  input:        { flex: 1, fontSize: typography.base, color: colors.text, paddingVertical: 12 },
  eyeIcon:      { fontSize: 16 },
  matchErr:     { fontSize: typography.xs, color: colors.error, marginTop: 2 },
  submitBtn:    { backgroundColor: '#FFD580', borderRadius: radius.full, paddingVertical: 15, alignItems: 'center', ...shadow.brand },
  submitBtnText:{ fontSize: typography.md, fontWeight: '800', color: colors.brandDark },
  backRow:      { alignItems: 'center', paddingVertical: spacing.xs },
  backText:     { fontSize: typography.sm, color: colors.muted },
});
