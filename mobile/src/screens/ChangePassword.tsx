// src/screens/ChangePassword.tsx — accessible from Profile screen
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../state/auth';
import { forgotPassword, verifyForgotPasswordOtp, resetPassword } from '../api';
import { PageHeader } from '../components/PageHeader';
import { colors, spacing, radius, typography, shadow } from '../theme';

type Phase = 'send' | 'verify' | 'reset' | 'done';

export default function ChangePassword() {
  const router = useRouter();
  const { user } = useAuth();
  const identifier = useMemo(() => user?.username || user?.email || '', [user]);

  const [phase,           setPhase          ] = useState<Phase>('send');
  const [otp,             setOtp            ] = useState('');
  const [resetToken,      setResetToken     ] = useState('');
  const [password,        setPassword       ] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass,        setShowPass       ] = useState(false);
  const [showConfirm,     setShowConfirm    ] = useState(false);
  const [loading,         setLoading        ] = useState(false);
  const [message,         setMessage        ] = useState<string | null>(null);
  const [error,           setError          ] = useState<string | null>(null);
  const [countdown,       setCountdown      ] = useState(0);

  React.useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function sendOtp() {
    if (!identifier) { setError('Unable to identify your account. Please log in again.'); return; }
    setLoading(true); setError(null); setMessage(null);
    try {
      const res = await forgotPassword(identifier);
      setMessage(res.message || 'OTP sent to your registered WhatsApp number.');
      setPhase('verify');
      setCountdown(60);
    } catch (e: any) {
      setError(e?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (!otp.trim()) { setError('Please enter the OTP.'); return; }
    setLoading(true); setError(null);
    try {
      const res = await verifyForgotPasswordOtp(identifier, otp.trim());
      setResetToken(res.resetToken);
      setMessage('OTP verified. Please set your new password.');
      setPhase('reset');
    } catch (e: any) {
      setError(e?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  }

  async function submitPassword() {
    if (!password.trim()) { setError('Please enter a new password.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true); setError(null);
    try {
      const res = await resetPassword(resetToken, password);
      setMessage(res.message || 'Password updated successfully.');
      setPhase('done');
      setTimeout(() => router.back(), 2000);
    } catch (e: any) {
      setError(e?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Change Password" subtitle="Update your account password" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Progress indicator */}
        <View style={s.progressCard}>
          <View style={s.progressDecor1} /><View style={s.progressDecor2} />
          {[
            { id: 'send',   label: 'Request OTP' },
            { id: 'verify', label: 'Verify OTP'  },
            { id: 'reset',  label: 'New Password'},
          ].map((step, i) => {
            const phases: Phase[] = ['send', 'verify', 'reset', 'done'];
            const idx     = phases.indexOf(phase);
            const stepIdx = phases.indexOf(step.id as Phase);
            const done    = idx > stepIdx;
            const active  = idx === stepIdx;
            return (
              <React.Fragment key={step.id}>
                {i > 0 && <View style={[s.progressLine, done && s.progressLineDone]} />}
                <View style={[s.progressDot, done && s.progressDotDone, active && s.progressDotActive]}>
                  {done
                    ? <Text style={s.progressDotCheck}>✓</Text>
                    : <Text style={[s.progressDotNum, active && s.progressDotNumActive]}>{i + 1}</Text>
                  }
                </View>
              </React.Fragment>
            );
          })}
        </View>

        {message && (
          <View style={s.successBanner}>
            <Text style={s.successIcon}>{phase === 'done' ? '✅' : '📲'}</Text>
            <Text style={s.successText}>{message}</Text>
          </View>
        )}

        {error && (
          <View style={s.errorBanner}>
            <Text style={s.errorIcon}>⚠️</Text>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* Phase: Send OTP */}
        {phase === 'send' && (
          <View style={s.card}>
            <View style={s.cardIcon}><Text style={{ fontSize: 24 }}>💬</Text></View>
            <Text style={s.cardTitle}>Request OTP</Text>
            <Text style={s.cardSub}>
              We'll send a one-time code to your registered WhatsApp number
              {identifier ? ` (${identifier})` : ''}.
            </Text>
            <TouchableOpacity style={[s.primaryBtn, loading && { opacity: 0.7 }]} onPress={sendOtp} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color={colors.brandDark} /> : <Text style={s.primaryBtnText}>Send OTP to WhatsApp</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Phase: Verify OTP */}
        {phase === 'verify' && (
          <View style={s.card}>
            <View style={s.cardIcon}><Text style={{ fontSize: 24 }}>🔢</Text></View>
            <Text style={s.cardTitle}>Enter OTP</Text>
            <Text style={s.cardSub}>Enter the 6-digit code sent to your WhatsApp.</Text>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>One-Time Password</Text>
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>🔢</Text>
                <TextInput
                  style={s.input}
                  value={otp}
                  onChangeText={t => { setOtp(t.replace(/\D/g, '')); setError(null); }}
                  placeholder="6-digit OTP"
                  placeholderTextColor={colors.mutedLight}
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="go"
                  onSubmitEditing={verifyOtp}
                />
              </View>
            </View>
            <TouchableOpacity style={[s.primaryBtn, loading && { opacity: 0.7 }]} onPress={verifyOtp} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color={colors.brandDark} /> : <Text style={s.primaryBtnText}>Verify OTP</Text>}
            </TouchableOpacity>
            <View style={s.resendRow}>
              <Text style={s.resendText}>Didn't get it?  </Text>
              {countdown > 0
                ? <Text style={s.resendCountdown}>Resend in {countdown}s</Text>
                : <TouchableOpacity onPress={sendOtp} disabled={loading} activeOpacity={0.7}><Text style={s.resendLink}>Resend OTP</Text></TouchableOpacity>
              }
            </View>
          </View>
        )}

        {/* Phase: Reset */}
        {phase === 'reset' && (
          <View style={s.card}>
            <View style={s.cardIcon}><Text style={{ fontSize: 24 }}>🔐</Text></View>
            <Text style={s.cardTitle}>New Password</Text>
            <Text style={s.cardSub}>Choose a strong password for your account.</Text>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>New Password</Text>
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>🔒</Text>
                <TextInput style={s.input} value={password} onChangeText={t => { setPassword(t); setError(null); }} placeholder="Min. 6 characters" placeholderTextColor={colors.mutedLight} secureTextEntry={!showPass} textContentType="newPassword" />
                <TouchableOpacity onPress={() => setShowPass(v => !v)} activeOpacity={0.7}><Text style={s.eyeIcon}>{showPass ? '🙈' : '👁'}</Text></TouchableOpacity>
              </View>
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Confirm Password</Text>
              <View style={[s.inputRow, confirmPassword && password !== confirmPassword && s.inputRowErr]}>
                <Text style={s.inputIcon}>🔒</Text>
                <TextInput style={s.input} value={confirmPassword} onChangeText={t => { setConfirmPassword(t); setError(null); }} placeholder="Re-enter password" placeholderTextColor={colors.mutedLight} secureTextEntry={!showConfirm} textContentType="newPassword" returnKeyType="go" onSubmitEditing={submitPassword} />
                <TouchableOpacity onPress={() => setShowConfirm(v => !v)} activeOpacity={0.7}><Text style={s.eyeIcon}>{showConfirm ? '🙈' : '👁'}</Text></TouchableOpacity>
              </View>
              {confirmPassword && password !== confirmPassword && <Text style={s.matchErr}>Passwords do not match</Text>}
            </View>
            <TouchableOpacity style={[s.primaryBtn, loading && { opacity: 0.7 }]} onPress={submitPassword} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color={colors.brandDark} /> : <Text style={s.primaryBtnText}>Update Password</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Phase: Done */}
        {phase === 'done' && (
          <View style={s.doneCard}>
            <Text style={{ fontSize: 48 }}>🎉</Text>
            <Text style={s.doneTitle}>Password Updated!</Text>
            <Text style={s.doneSub}>Redirecting you back to your profile…</Text>
            <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.md }} />
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  scroll:  { flex: 1, backgroundColor: colors.bgGray },
  content: { padding: spacing.xl, paddingBottom: 60, gap: spacing.md },

  // Progress card
  progressCard: {
    backgroundColor: colors.brand, borderRadius: radius.xl,
    padding: spacing.xl, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', overflow: 'hidden', position: 'relative', ...shadow.md,
  },
  progressDecor1: { position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.08)' },
  progressDecor2: { position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.06)' },
  progressLine:     { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: spacing.xs },
  progressLineDone: { backgroundColor: colors.amber },
  progressDot:      { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  progressDotActive:{ backgroundColor: colors.amber, borderColor: colors.amber },
  progressDotDone:  { backgroundColor: '#fff', borderColor: '#fff' },
  progressDotNum:   { fontSize: typography.sm, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  progressDotNumActive: { color: colors.brandDark },
  progressDotCheck: { fontSize: 14, fontWeight: '800', color: colors.brand },

  // Banners
  successBanner: { backgroundColor: colors.successBg, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: spacing.sm, borderWidth: 1, borderColor: colors.successBorder },
  successIcon:   { fontSize: 14 },
  successText:   { color: colors.success, fontSize: typography.sm, flex: 1, lineHeight: 18 },
  errorBanner:   { backgroundColor: colors.errorBg, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: spacing.sm, borderWidth: 1, borderColor: colors.errorBorder },
  errorIcon:     { fontSize: 14 },
  errorText:     { color: colors.error, fontSize: typography.sm, flex: 1, lineHeight: 18 },

  // Card
  card:       { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.xl, gap: spacing.md, ...shadow.sm },
  cardIcon:   { width: 52, height: 52, borderRadius: 14, backgroundColor: colors.brandLight, alignItems: 'center', justifyContent: 'center' },
  cardTitle:  { fontSize: typography.lg, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  cardSub:    { fontSize: typography.sm, color: colors.muted, lineHeight: 20 },

  // Fields
  fieldWrap:  { gap: 6 },
  fieldLabel: { fontSize: typography.xs, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.bgGray, paddingHorizontal: spacing.md, minHeight: 50, gap: spacing.sm },
  inputRowErr:{ borderColor: colors.error },
  inputIcon:  { fontSize: 15, opacity: 0.5 },
  input:      { flex: 1, fontSize: typography.base, color: colors.text, paddingVertical: 12 },
  eyeIcon:    { fontSize: 16 },
  matchErr:   { fontSize: typography.xs, color: colors.error, marginTop: 2 },

  // Buttons
  primaryBtn:     { backgroundColor: colors.amber, borderRadius: radius.full, paddingVertical: 14, alignItems: 'center', ...shadow.brand },
  primaryBtnText: { fontSize: typography.base, fontWeight: '800', color: colors.brandDark },

  // Resend
  resendRow:       { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  resendText:      { fontSize: typography.sm, color: colors.muted },
  resendLink:      { fontSize: typography.sm, fontWeight: '700', color: colors.brand },
  resendCountdown: { fontSize: typography.sm, color: colors.muted },

  // Done
  doneCard:  { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.successBorder, padding: spacing.xxl, alignItems: 'center', gap: spacing.md, ...shadow.sm },
  doneTitle: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  doneSub:   { fontSize: typography.sm, color: colors.muted },
});
