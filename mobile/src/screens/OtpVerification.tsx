// src/screens/OtpVerification.tsx
// Reusable OTP screen — used for:
//   mode=signup  → verify account after registration
//   mode=forgot  → verify OTP for password reset (passes resetToken onward)
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Animated, Vibration, Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  sendOtpToWhatsApp, verifyOtp, forgotPassword, verifyForgotPasswordOtp,
  saveRegistration, uploadDocument, registerAuthUser, login,
} from '../api';
import { useAuth } from '../state/auth';
import { useReg } from '../state/registration';
import { colors, spacing, radius, typography, shadow } from '../theme';

const LOGO = require('../../assets/logo_dark.png');
const OTP_LENGTH = 6;

export default function OtpVerification() {
  const router = useRouter();
  const { refresh } = useAuth();
  const { draft, clearDraft } = useReg();
  const { mode, identifier } = useLocalSearchParams<{ mode: string; identifier: string }>();

  const isForgot   = mode === 'forgot';
  const decodedId  = identifier ? decodeURIComponent(identifier) : '';

  const [digits,    setDigits   ] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [sending,   setSending  ] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message,   setMessage  ] = useState<string | null>(null);
  const [error,     setError    ] = useState<string | null>(null);
  const [otpSent,    setOtpSent   ] = useState(false);
  const [countdown,  setCountdown ] = useState(0);
  const [completing, setCompleting] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Auto-send OTP on mount for signup mode
  useEffect(() => {
    if (!isForgot) {
      sendOtp();
    }
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function sendOtp() {
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      if (isForgot) {
        const res = await forgotPassword(decodedId);
        setMessage(res.message || 'OTP sent to your registered WhatsApp number.');
      } else {
        // Signup OTP flow:
        // 1. Register auth user → 2. Login (get session) → 3. Send OTP
        const email     = (draft['Email Address'] || '').trim() || null;
        const password  = (draft['Account Password'] || '').trim();
        const username  = (draft['Username'] || draft['Primary WhatsApp Number'] || '').trim();
        const firstName = draft['First Name'] || '';
        const lastName  = draft['Last Name']  || '';

        if (!password) throw new Error('Password is missing. Please go back and complete Step 1.');
        if (!username) throw new Error('WhatsApp number is missing. Please go back and complete Step 1.');

        // Step 1: Create the auth account (ignore duplicate-user errors on resend)
        try {
          await registerAuthUser(firstName, lastName, email, password, username);
        } catch (regErr: any) {
          const msg = (regErr?.message || '').toLowerCase();
          // Common "already exists" patterns from Spring Boot
          const isDuplicate = msg.includes('exist') || msg.includes('duplicate')
            || msg.includes('already') || msg.includes('409') || msg.includes('conflict');
          if (!isDuplicate) throw new Error(`Account creation failed: ${regErr?.message}`);
          // Duplicate → account already created (resend case), continue
        }

        // Step 2: Login to get session cookie
        try {
          await login(email ?? username, password);
        } catch (loginErr: any) {
          throw new Error(`Login failed after registration: ${loginErr?.message}`);
        }

        // Step 3: Send OTP (now authenticated)
        const res = await sendOtpToWhatsApp();
        setMessage(res.message || 'OTP sent to your registered WhatsApp number.');
      }
      setOtpSent(true);
      setCountdown(60);
      setDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } catch (e: any) {
      setError(e?.message || 'Failed to send OTP.');
    } finally {
      setSending(false);
    }
  }

  function shake() {
    Vibration.vibrate(300);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 50, useNativeDriver: true }),
    ]).start();
  }

  function onChangeDigit(text: string, index: number) {
    const cleaned = text.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    setError(null);
    if (cleaned && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    // Auto-verify when all digits entered
    if (cleaned && next.every(d => d)) {
      verify(next.join(''));
    }
  }

  function onKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function verify(code?: string) {
    const otp = code || digits.join('');
    if (otp.length < OTP_LENGTH) { setError(`Please enter all ${OTP_LENGTH} digits.`); return; }
    setVerifying(true);
    setError(null);
    try {
      if (isForgot) {
        const res = await verifyForgotPasswordOtp(decodedId, otp);
        router.replace({
          pathname: '/reset-password',
          params: { token: res.resetToken },
        } as any);
      } else {
        // Step 1: Verify OTP (session already exists from sendOtp phase)
        await verifyOtp(otp);

        // Step 2: OTP confirmed — save registration data
        setCompleting(true);
        try {
          const pendingFileStr = (draft as any)._pendingFile;
          const pendingFile    = pendingFileStr ? JSON.parse(pendingFileStr) : null;
          const travelers      = (draft as any).travelers || [];

          const created = await saveRegistration({ ...draft, travelers });

          if (pendingFile && created?.id) {
            try { await uploadDocument(created.id, pendingFile); } catch {}
          }

          clearDraft();
          await refresh();
          router.replace('/(app)/home');
        } catch (regErr: any) {
          // OTP verified, save failed — still proceed home
          clearDraft();
          await refresh();
          router.replace('/(app)/home');
        } finally {
          setCompleting(false);
        }
      }
    } catch (e: any) {
      shake();
      setError(e?.message || 'Invalid or expired OTP.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  }

  const otp = digits.join('');

  return (
    <View style={s.root}>
      {/* Teal hero header */}
      <View style={s.hero}>
        <View style={s.decor1} />
        <View style={s.decor2} />
        <Image source={LOGO} style={s.logo} resizeMode="contain" />
        <View style={s.heroIconWrap}>
          <Text style={{ fontSize: 40 }}>📲</Text>
        </View>
        <Text style={s.heroTitle}>OTP Verification</Text>
        <Text style={s.heroSub}>
          {isForgot
            ? `We'll send a code to your registered WhatsApp for ${decodedId}`
            : 'Verify your account to continue'}
        </Text>
        <View style={s.heroArc} />
      </View>

      <View style={s.formWrap}>
        <View style={s.card}>

          {/* Send OTP button (forgot mode: manual; signup mode: auto-sent) */}
          {isForgot && !otpSent ? (
            <TouchableOpacity style={s.sendBtn} onPress={sendOtp} disabled={sending} activeOpacity={0.85}>
              {sending
                ? <ActivityIndicator color={colors.brandDark} />
                : <Text style={s.sendBtnText}>Send OTP to WhatsApp</Text>
              }
            </TouchableOpacity>
          ) : (
            <>
              {/* Status message */}
              {message && (
                <View style={s.successBanner}>
                  <Text style={s.successIcon}>✅</Text>
                  <Text style={s.successText}>{message}</Text>
                </View>
              )}

              <Text style={s.otpLabel}>Enter {OTP_LENGTH}-digit OTP</Text>
              <Text style={s.otpHint}>
                {isForgot ? `Sent to WhatsApp for ${decodedId}` : 'Sent to your registered WhatsApp number'}
              </Text>

              {/* OTP digit boxes */}
              <Animated.View style={[s.digitsRow, { transform: [{ translateX: shakeAnim }] }]}>
                {digits.map((d, i) => (
                  <TextInput
                    key={i}
                    ref={r => { inputRefs.current[i] = r; }}
                    style={[s.digitBox, d && s.digitBoxFilled, !!error && s.digitBoxError]}
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

              {/* Error */}
              {error && (
                <View style={s.errorBanner}>
                  <Text style={s.errorIcon}>⚠️</Text>
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

              {/* Verify button */}
              <TouchableOpacity
                style={[s.verifyBtn, (verifying || completing || otp.length < OTP_LENGTH) && { opacity: 0.6 }]}
                onPress={() => verify()}
                disabled={verifying || completing || otp.length < OTP_LENGTH}
                activeOpacity={0.85}
              >
                {completing
                  ? <><ActivityIndicator color={colors.brandDark} /><Text style={[s.verifyBtnText, { marginLeft: 8 }]}>Completing registration…</Text></>
                  : verifying
                    ? <ActivityIndicator color={colors.brandDark} />
                    : <Text style={s.verifyBtnText}>Verify OTP</Text>
                }
              </TouchableOpacity>

              {/* Resend */}
              <View style={s.resendRow}>
                <Text style={s.resendText}>Didn't receive the OTP?  </Text>
                {countdown > 0 ? (
                  <Text style={s.resendCountdown}>Resend in {countdown}s</Text>
                ) : (
                  <TouchableOpacity onPress={sendOtp} disabled={sending} activeOpacity={0.7}>
                    <Text style={s.resendLink}>Resend OTP</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>

        <TouchableOpacity style={s.backRow} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.brand },

  hero: {
    backgroundColor: colors.brand,
    paddingTop: 60, paddingBottom: 60,
    alignItems: 'center', gap: spacing.sm,
    overflow: 'hidden', position: 'relative',
  },
  decor1: { position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.07)' },
  decor2: { position: 'absolute', bottom: 10, left: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)' },
  logo:   { width: 90, height: 36, marginBottom: spacing.sm },
  heroIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: typography.xxl, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroSub:   { fontSize: typography.sm, color: 'rgba(255,255,255,0.7)', textAlign: 'center', paddingHorizontal: spacing.xxxl },
  heroArc:   { position: 'absolute', bottom: -28, left: -20, right: -20, height: 56, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: colors.bgGray },

  formWrap: { flex: 1, backgroundColor: colors.bgGray, paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.md },

  card: { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.xl, gap: spacing.md, ...shadow.md },

  // Send button (forgot mode initial state)
  sendBtn:     { backgroundColor: colors.amber, borderRadius: radius.full, paddingVertical: 15, alignItems: 'center', ...shadow.brand },
  sendBtnText: { fontSize: typography.md, fontWeight: '800', color: colors.brandDark },

  // Success
  successBanner: { backgroundColor: colors.successBg, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: spacing.sm, borderWidth: 1, borderColor: colors.successBorder },
  successIcon:   { fontSize: 14 },
  successText:   { color: colors.success, fontSize: typography.sm, flex: 1, lineHeight: 18 },

  // OTP input
  otpLabel: { fontSize: typography.md, fontWeight: '700', color: colors.text },
  otpHint:  { fontSize: typography.xs, color: colors.muted, marginTop: -spacing.xs },
  digitsRow:{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', paddingVertical: spacing.sm },
  digitBox: {
    width: 46, height: 56, borderRadius: radius.md,
    borderWidth: 2, borderColor: colors.line,
    backgroundColor: colors.bgGray,
    fontSize: typography.xl, fontWeight: '700', color: colors.text,
    textAlign: 'center',
  },
  digitBoxFilled:{ borderColor: colors.brand, backgroundColor: colors.brandLight },
  digitBoxError: { borderColor: colors.error, backgroundColor: colors.errorBg },

  // Error
  errorBanner: { backgroundColor: colors.errorBg, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: spacing.sm, borderWidth: 1, borderColor: colors.errorBorder },
  errorIcon:   { fontSize: 14 },
  errorText:   { color: colors.error, fontSize: typography.sm, flex: 1, lineHeight: 18 },

  // Verify button
  verifyBtn:     { backgroundColor: colors.amber, borderRadius: radius.full, paddingVertical: 15, alignItems: 'center', ...shadow.brand },
  verifyBtnText: { fontSize: typography.md, fontWeight: '800', color: colors.brandDark },

  // Resend
  resendRow:      { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  resendText:     { fontSize: typography.sm, color: colors.muted },
  resendLink:     { fontSize: typography.sm, fontWeight: '700', color: colors.brand },
  resendCountdown:{ fontSize: typography.sm, color: colors.muted },

  backRow: { alignItems: 'center', paddingVertical: spacing.xs },
  backText:{ fontSize: typography.sm, color: colors.muted },
});
