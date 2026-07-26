// src/screens/ForgotPassword.tsx
// Single-screen forgot password:
//   1. Enter identifier → tap Continue → OTP sent automatically, OTP field appears
//   2. Resend link shown but disabled for 30s timer
//   3. Verify OTP → navigate to ResetPassword
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Image, ScrollView,
  Animated, Vibration,
} from 'react-native';
import { useRouter } from 'expo-router';
import { forgotPassword, verifyForgotPasswordOtp } from '../api';
import { colors, spacing, radius, typography, shadow } from '../theme';

const LOGO      = require('../../assets/logo_dark.png');
const OTP_LEN   = 6;
const RESEND_SEC = 30;

export default function ForgotPassword() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [otpSent,    setOtpSent   ] = useState(false);
  const [digits,     setDigits    ] = useState<string[]>(Array(OTP_LEN).fill(''));
  const [sending,    setSending   ] = useState(false);
  const [verifying,  setVerifying ] = useState(false);
  const [error,      setError     ] = useState<string | null>(null);
  const [info,       setInfo      ] = useState<string | null>(null);
  const [countdown,  setCountdown ] = useState(0);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown ticker
  useEffect(() => {
    if (countdown <= 0) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [countdown > 0]);

  function shake() {
    Vibration.vibrate(300);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   0, duration: 50, useNativeDriver: true }),
    ]).start();
  }

  // Send (or resend) OTP
  async function sendOtp() {
    if (!identifier.trim()) { setError('Please enter your WhatsApp number or email.'); return; }
    setSending(true); setError(null); setInfo(null);
    try {
      const res = await forgotPassword(identifier.trim());
      setOtpSent(true);
      setDigits(Array(OTP_LEN).fill(''));
      setInfo(res.message || 'OTP sent to your registered WhatsApp number.');
      setCountdown(RESEND_SEC);
      setTimeout(() => inputRefs.current[0]?.focus(), 400);
    } catch (e: any) {
      setError(e?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setSending(false);
    }
  }

  // Handle digit box input
  function onChangeDigit(text: string, index: number) {
    const c = text.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = c;
    setDigits(next);
    setError(null);
    if (c && index < OTP_LEN - 1) inputRefs.current[index + 1]?.focus();
    if (c && next.every(d => d)) verifyOtp(next.join(''));
  }

  function onKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  // Verify OTP
  async function verifyOtp(code?: string) {
    const otp = code ?? digits.join('');
    if (otp.length < OTP_LEN) { setError(`Please enter all ${OTP_LEN} digits.`); return; }
    setVerifying(true); setError(null);
    try {
      const res = await verifyForgotPasswordOtp(identifier.trim(), otp);
      router.replace({ pathname: '/reset-password', params: { token: res.resetToken } } as any);
    } catch (e: any) {
      shake();
      setError(e?.message || 'Invalid or expired OTP.');
      setDigits(Array(OTP_LEN).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  }

  const canResend  = otpSent && countdown <= 0 && !sending;
  const otp        = digits.join('');

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={s.hero}>
          <View style={s.decor1} /><View style={s.decor2} />
          <Image source={LOGO} style={s.logo} resizeMode="contain" />
          <View style={s.heroIconWrap}>
            <Text style={{ fontSize: 40 }}>{otpSent ? '📲' : '🔑'}</Text>
          </View>
          <Text style={s.heroTitle}>{otpSent ? 'Enter OTP' : 'Forgot Password'}</Text>
          <Text style={s.heroSub}>
            {otpSent
              ? `A ${OTP_LEN}-digit code was sent to your WhatsApp`
              : 'Enter your registered WhatsApp number or email to receive a reset code.'}
          </Text>
          <View style={s.heroArc} />
        </View>

        {/* ── Form ── */}
        <View style={s.formWrap}>
          <View style={s.card}>

            {/* ── Error / Info banners ── */}
            {info && !error && (
              <View style={s.infoBanner}>
                <Text style={s.infoIcon}>📲</Text>
                <Text style={s.infoText}>{info}</Text>
              </View>
            )}
            {error && (
              <View style={s.errorBanner}>
                <Text style={s.errorIcon}>⚠️</Text>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {/* ── Identifier field — always visible ── */}
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>WhatsApp Number / Email</Text>
              <View style={[s.inputRow, otpSent && s.inputRowDone]}>
                <Text style={s.inputIcon}>📱</Text>
                <TextInput
                  style={s.input}
                  value={identifier}
                  onChangeText={t => { setIdentifier(t); setError(null); }}
                  placeholder="e.g. +1234567890 or email"
                  placeholderTextColor={colors.mutedLight}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!otpSent}
                  returnKeyType="go"
                  onSubmitEditing={otpSent ? undefined : sendOtp}
                />
                {otpSent && <Text style={s.doneCheck}>✓</Text>}
              </View>
            </View>

            {/* ── Continue button (pre-OTP) ── */}
            {!otpSent && (
              <TouchableOpacity
                style={[s.primaryBtn, sending && { opacity: 0.7 }]}
                onPress={sendOtp}
                disabled={sending}
                activeOpacity={0.85}
              >
                {sending
                  ? <ActivityIndicator color={colors.brandDark} />
                  : <Text style={s.primaryBtnText}>Continue</Text>
                }
              </TouchableOpacity>
            )}

            {/* ── OTP section (post-send) ── */}
            {otpSent && (
              <>
                <View style={s.divider} />

                <View style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>Enter OTP</Text>
                  <Text style={s.otpHint}>
                    Enter the {OTP_LEN}-digit code sent to your WhatsApp
                  </Text>
                </View>

                {/* Digit boxes */}
                <Animated.View style={[s.digitsRow, { transform: [{ translateX: shakeAnim }] }]}>
                  {digits.map((d, i) => (
                    <TextInput
                      key={i}
                      ref={r => { inputRefs.current[i] = r; }}
                      style={[
                        s.digitBox,
                        d            && s.digitBoxFilled,
                        !!error      && s.digitBoxError,
                      ]}
                      value={d}
                      onChangeText={t => onChangeDigit(t, i)}
                      onKeyPress={({ nativeEvent }) => onKeyPress(nativeEvent.key, i)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      textAlign="center"
                    />
                  ))}
                </Animated.View>

                {/* Verify button */}
                <TouchableOpacity
                  style={[s.primaryBtn, (verifying || otp.length < OTP_LEN) && { opacity: 0.6 }]}
                  onPress={() => verifyOtp()}
                  disabled={verifying || otp.length < OTP_LEN}
                  activeOpacity={0.85}
                >
                  {verifying
                    ? <ActivityIndicator color={colors.brandDark} />
                    : <Text style={s.primaryBtnText}>Verify OTP</Text>
                  }
                </TouchableOpacity>

                {/* ── Resend row ── */}
                <View style={s.resendRow}>
                  <Text style={s.resendText}>Didn't receive the code? </Text>
                  {sending ? (
                    <ActivityIndicator size="small" color={colors.brand} style={{ marginLeft: 4 }} />
                  ) : countdown > 0 ? (
                    <Text style={s.resendDisabled}>Resend in {countdown}s</Text>
                  ) : (
                    <TouchableOpacity onPress={sendOtp} disabled={!canResend} activeOpacity={0.7}>
                      <Text style={s.resendLink}>Resend OTP</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>

          <TouchableOpacity style={s.backRow} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={s.backText}>← Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.brand },

  // Hero
  hero: {
    backgroundColor: colors.brand, paddingTop: 60, paddingBottom: 60,
    alignItems: 'center', gap: spacing.sm, overflow: 'hidden', position: 'relative',
  },
  decor1:       { position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.07)' },
  decor2:       { position: 'absolute', bottom: 10, left: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)' },
  logo:         { width: 90, height: 36, marginBottom: spacing.sm },
  heroIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroTitle:    { fontSize: typography.xxl, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroSub:      { fontSize: typography.sm, color: 'rgba(255,255,255,0.7)', textAlign: 'center', paddingHorizontal: spacing.xxxl, lineHeight: 20 },
  heroArc:      { position: 'absolute', bottom: -28, left: -20, right: -20, height: 56, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: colors.bgGray },

  // Form
  formWrap: { flex: 1, backgroundColor: colors.bgGray, paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.md },
  card:     { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.xl, gap: spacing.md, ...shadow.md },

  // Banners
  infoBanner:  { backgroundColor: colors.brandLight, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: spacing.sm, borderWidth: 1, borderColor: colors.brandMid },
  infoIcon:    { fontSize: 14 },
  infoText:    { color: colors.brandDark, fontSize: typography.sm, flex: 1, lineHeight: 18 },
  errorBanner: { backgroundColor: colors.errorBg, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: spacing.sm, borderWidth: 1, borderColor: colors.errorBorder },
  errorIcon:   { fontSize: 14 },
  errorText:   { color: colors.error, fontSize: typography.sm, flex: 1, lineHeight: 18 },

  // Fields
  fieldWrap:   { gap: 4 },
  fieldLabel:  { fontSize: typography.xs, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  otpHint:     { fontSize: typography.xs, color: colors.muted },
  inputRow:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.bgGray, paddingHorizontal: spacing.md, minHeight: 50, gap: spacing.sm },
  inputRowDone:{ borderColor: colors.brand + '60', backgroundColor: colors.brandLight },
  inputIcon:   { fontSize: 15, opacity: 0.5 },
  input:       { flex: 1, fontSize: typography.base, color: colors.text, paddingVertical: 12 },
  doneCheck:   { fontSize: 16, color: colors.brand, fontWeight: '700' },

  divider:     { height: 1, backgroundColor: colors.line, marginVertical: spacing.xs },

  // OTP digit boxes
  digitsRow:      { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', paddingVertical: spacing.xs },
  digitBox:       { width: 44, height: 54, borderRadius: radius.md, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.bgGray, fontSize: typography.xl, fontWeight: '700', color: colors.text },
  digitBoxFilled: { borderColor: colors.brand, backgroundColor: colors.brandLight },
  digitBoxError:  { borderColor: colors.error, backgroundColor: colors.errorBg },

  // Primary button
  primaryBtn:     { backgroundColor: colors.amber, borderRadius: radius.full, paddingVertical: 15, alignItems: 'center', ...shadow.brand },
  primaryBtnText: { fontSize: typography.md, fontWeight: '800', color: colors.brandDark },

  // Resend
  resendRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  resendText:     { fontSize: typography.sm, color: colors.muted },
  resendDisabled: { fontSize: typography.sm, color: colors.mutedLight, fontWeight: '600' },
  resendLink:     { fontSize: typography.sm, fontWeight: '700', color: colors.brand },

  backRow: { alignItems: 'center', paddingVertical: spacing.xs },
  backText:{ fontSize: typography.sm, color: colors.muted },
});
