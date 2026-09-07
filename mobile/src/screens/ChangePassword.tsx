// src/screens/ChangePassword.tsx — mirrors web's screens/ChangePassword.tsx (.portal cards, no gradient stepper)
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../state/auth';
import { forgotPassword, verifyForgotPasswordOtp, resetPassword } from '../api';
import { PageHeader } from '../components/PageHeader';
import { FormScrollView } from '../components/FormScrollView';
import { ws, wc } from '../webStyle';

type Phase = 'send' | 'verify' | 'reset' | 'done';

export default function ChangePassword() {
  const router = useRouter();
  const { user } = useAuth();
  const identifier = useMemo(() => user?.username || user?.email || '', [user]);

  const [phase, setPhase] = useState<Phase>('send');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

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
      <FormScrollView style={{ flex: 1 }} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {message && (
          <View style={[ws.notice, ws.nInfo]}>
            <Text style={{ fontSize: 15 }}>{phase === 'done' ? '✅' : '📲'}</Text>
            <Text style={[ws.noticeText, ws.nInfoText]}>{message}</Text>
          </View>
        )}
        {error && (
          <View style={[ws.notice, ws.nWarn]}>
            <Text style={{ fontSize: 15 }}>⚠️</Text>
            <Text style={[ws.noticeText, ws.nWarnText]}>{error}</Text>
          </View>
        )}

        {/* Phase: Send OTP */}
        {phase === 'send' && (
          <View style={ws.card}>
            <Text style={ws.ct}>Step 1 — Verify it's you</Text>
            <Text style={s.cardSub}>We'll send a one-time code to your registered WhatsApp number{identifier ? ` (${identifier})` : ''}.</Text>
            <TouchableOpacity style={[ws.bp, loading && ws.btnDisabled]} onPress={sendOtp} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={ws.bpText}>Send OTP to WhatsApp</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Phase: Verify OTP */}
        {phase === 'verify' && (
          <View style={ws.card}>
            <Text style={ws.ct}>Step 1 — Verify it's you</Text>
            <Text style={s.cardSub}>Enter the 6-digit code sent to your WhatsApp.</Text>
            <View style={ws.fi}>
              <Text style={ws.fl2}>One-Time Password</Text>
              <TextInput
                style={ws.input}
                value={otp}
                onChangeText={t => { setOtp(t.replace(/\D/g, '')); setError(null); }}
                placeholder="6-digit OTP"
                placeholderTextColor={wc.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="go"
                onSubmitEditing={verifyOtp}
              />
            </View>
            <TouchableOpacity style={[ws.bp, loading && ws.btnDisabled]} onPress={verifyOtp} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={ws.bpText}>Verify OTP</Text>}
            </TouchableOpacity>
            <View style={s.resendRow}>
              <Text style={s.resendText}>Didn't get it?  </Text>
              {countdown > 0
                ? <Text style={s.resendText}>Resend in {countdown}s</Text>
                : <TouchableOpacity onPress={sendOtp} disabled={loading} activeOpacity={0.7}><Text style={s.resendLink}>Resend OTP</Text></TouchableOpacity>}
            </View>
          </View>
        )}

        {/* Phase: Reset */}
        {phase === 'reset' && (
          <View style={ws.card}>
            <Text style={ws.ct}>Step 2 — Set a new password</Text>
            <View style={ws.fi}>
              <Text style={ws.fl2}>New Password</Text>
              <View style={s.pwRow}>
                <TextInput style={s.pwInput} value={password} onChangeText={t => { setPassword(t); setError(null); }} placeholder="Min. 6 characters" placeholderTextColor={wc.textMuted} secureTextEntry={!showPass} textContentType="newPassword" />
                <TouchableOpacity onPress={() => setShowPass(v => !v)} activeOpacity={0.7}><Text style={s.eyeIcon}>{showPass ? '🙈' : '👁'}</Text></TouchableOpacity>
              </View>
            </View>
            <View style={ws.fi}>
              <Text style={ws.fl2}>Confirm Password</Text>
              <View style={[s.pwRow, confirmPassword && password !== confirmPassword && { borderColor: wc.textDanger }]}>
                <TextInput style={s.pwInput} value={confirmPassword} onChangeText={t => { setConfirmPassword(t); setError(null); }} placeholder="Re-enter password" placeholderTextColor={wc.textMuted} secureTextEntry={!showConfirm} textContentType="newPassword" returnKeyType="go" onSubmitEditing={submitPassword} />
                <TouchableOpacity onPress={() => setShowConfirm(v => !v)} activeOpacity={0.7}><Text style={s.eyeIcon}>{showConfirm ? '🙈' : '👁'}</Text></TouchableOpacity>
              </View>
              {confirmPassword && password !== confirmPassword && <Text style={s.matchErr}>Passwords do not match</Text>}
            </View>
            <TouchableOpacity style={[ws.bp, loading && ws.btnDisabled]} onPress={submitPassword} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={ws.bpText}>Update Password</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Phase: Done */}
        {phase === 'done' && (
          <View style={[ws.card, { alignItems: 'center', paddingVertical: 28 }]}>
            <Text style={{ fontSize: 41 }}>🎉</Text>
            <Text style={s.doneTitle}>Password Updated!</Text>
            <Text style={s.cardSub}>Redirecting you back to your profile…</Text>
            <ActivityIndicator color={wc.fillAccent} style={{ marginTop: 8 }} />
          </View>
        )}

      </FormScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60, gap: 11 },

  cardSub: { fontSize: 14, color: wc.textSecondary, lineHeight: 18, marginBottom: 10 },

  pwRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: wc.borderStrong, borderRadius: 8, backgroundColor: wc.surface2, paddingHorizontal: 12, gap: 8 },
  pwInput: { flex: 1, fontSize: 14, color: wc.textPrimary, paddingVertical: 9 },
  eyeIcon: { fontSize: 16 },
  matchErr: { fontSize: 12, color: wc.textDanger, marginTop: 3 },

  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  resendText: { fontSize: 13, color: wc.textMuted },
  resendLink: { fontSize: 13, fontWeight: '600', color: wc.fillAccent },

  doneTitle: { fontSize: 18, fontWeight: '600', color: wc.textPrimary, marginTop: 8 },
});
