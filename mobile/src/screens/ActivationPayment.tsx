// src/screens/ActivationPayment.tsx — one-time registration + trip coverage checkout. Mirrors web's .portal styling.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../state/auth';
import {
  getActivationPaymentSummary, getStripePaymentConfig, createActivationPaymentIntent, confirmPaymentIntent,
  type ActivationPaymentSummary, type StripePaymentConfig, type PaymentMethodKind,
} from '../api';
import { ws, wc } from '../webStyle';
import { PageHeader } from '../components/PageHeader';

const METHODS: { key: PaymentMethodKind; label: string }[] = [
  { key: 'CARD', label: 'Card' },
  { key: 'EFT', label: 'EFT' },
  { key: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { key: 'DIGITAL_WALLET', label: 'Digital Wallet' },
];

function money(value?: number, currency = 'GBP') {
  try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(value || 0)); }
  catch { return `${currency} ${Number(value || 0).toFixed(2)}`; }
}

function CheckoutForm({ summary }: { summary: ActivationPaymentSummary }) {
  const router = useRouter();
  const { refresh } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [method, setMethod] = useState<PaymentMethodKind>('CARD');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const intent = await createActivationPaymentIntent({ method, currency: summary.currency || 'GBP' });

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'GodwitCare',
        paymentIntentClientSecret: intent.clientSecret,
        allowsDelayedPaymentMethods: false,
      });
      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') setError(presentError.message);
        return;
      }

      const synced = await confirmPaymentIntent(intent.stripePaymentIntentId);
      if ((synced.status || '').toLowerCase() === 'succeeded') {
        setMessage('Payment successful — activating your account…');
        await refresh();
        router.replace('/(app)/home' as any);
      } else {
        setError(synced.failureMessage || `Payment status: ${synced.status}`);
      }
    } catch (e: any) {
      setError(e?.message || 'Payment failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <View style={ws.card}>
        <Text style={ws.ct}>Payment Summary</Text>
        <Text style={s.cardSub}>A one-time registration fee applies in addition to your selected package.</Text>

        <View style={ws.dr}>
          <Text style={s.summaryLabel}>One-time registration fee</Text>
          <Text style={s.summaryValue}>{money(summary.registrationFee, summary.currency)}</Text>
        </View>
        <View style={ws.dr}>
          <Text style={s.summaryLabel}>Trip Coverage — {summary.packageLabel || 'selected package'}</Text>
          <Text style={s.summaryValue}>{money(summary.tripCoverageFee, summary.currency)}</Text>
        </View>
        <View style={[ws.dr, s.summaryTotalRow]}>
          <Text style={s.summaryTotalLabel}>Total due today</Text>
          <Text style={s.summaryTotalValue}>{money(summary.totalAmount, summary.currency)}</Text>
        </View>
      </View>

      <View style={ws.card}>
        <Text style={ws.ct}>Payment Method</Text>
        <View style={s.methodRow}>
          {METHODS.map(m => (
            <TouchableOpacity key={m.key} style={[ws.tag, s.methodChip, method === m.key && s.methodChipOn]} onPress={() => setMethod(m.key)} activeOpacity={0.75}>
              <Text style={[s.methodChipText, method === m.key && s.methodChipTextOn]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error && <View style={[ws.notice, ws.nWarn]}><Text style={[ws.noticeText, ws.nWarnText]}>{error}</Text></View>}
        {message && <View style={[ws.notice, ws.nInfo]}><Text style={[ws.noticeText, ws.nInfoText]}>{message}</Text></View>}

        <TouchableOpacity style={[ws.bp, busy && ws.btnDisabled, { marginTop: 4 }]} onPress={pay} disabled={busy} activeOpacity={0.85}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={ws.bpText}>Pay {money(summary.totalAmount, summary.currency)} & Activate Account</Text>}
        </TouchableOpacity>
        <Text style={s.note}>Card details are collected securely by Stripe and are never stored by GodwitCare.</Text>
      </View>
    </>
  );
}

export default function ActivationPayment() {
  const router = useRouter();
  const { user } = useAuth();
  const [summary, setSummary] = useState<ActivationPaymentSummary | null>(null);
  const [config, setConfig] = useState<StripePaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (user?.activated) router.replace('/(app)/home' as any);
  }, [user?.activated]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [sum, cfg] = await Promise.all([getActivationPaymentSummary(), getStripePaymentConfig()]);
        if (!alive) return;
        setSummary(sum);
        setConfig(cfg);
        if (!cfg.frontendConfigured || cfg.backendConfigured === false) setLoadErr('Stripe is not configured for payments.');
      } catch (e: any) {
        if (alive) setLoadErr(e?.message || 'Unable to load activation payment.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Activate Account" subtitle="Complete payment to activate your membership" showBack={false} />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={wc.fillAccent} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
          <View style={s.stepsRow}>
            {['Personal Info', 'Health Info', 'Trip Details', 'Verify Account', 'Payment'].map((step, i) => (
              <View key={step} style={[ws.tag, i === 4 ? ws.tinfo : ws.tmute]}>
                <Text style={[ws.tagText, i === 4 ? ws.tinfoText : ws.tmuteText]}>{i < 4 ? '✓' : '5'} {step}</Text>
              </View>
            ))}
          </View>

          {loadErr && <View style={[ws.notice, ws.nWarn]}><Text style={[ws.noticeText, ws.nWarnText]}>{loadErr}</Text></View>}

          {summary && config?.publishableKey ? (
            <StripeProvider publishableKey={config.publishableKey}>
              <CheckoutForm summary={summary} />
            </StripeProvider>
          ) : !loadErr ? (
            <View style={ws.card}><Text style={s.cardSub}>Unable to load checkout right now.</Text></View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },

  stepsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 11 },

  cardSub: { fontSize: 14, color: wc.textMuted },

  summaryLabel: { fontSize: 14, color: wc.textSecondary, flex: 1 },
  summaryValue: { fontSize: 14, fontWeight: '600', color: wc.textPrimary },
  summaryTotalRow: { borderTopWidth: 1.5, borderTopColor: wc.borderStrong, marginTop: 4 },
  summaryTotalLabel: { fontSize: 15, fontWeight: '700', color: wc.textPrimary },
  summaryTotalValue: { fontSize: 17, fontWeight: '700', color: wc.fillAccent },

  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  methodChip: { borderWidth: 1, borderColor: wc.borderStrong, backgroundColor: wc.surface2, paddingHorizontal: 12, paddingVertical: 7 },
  methodChipOn: { backgroundColor: wc.fillAccent, borderColor: wc.fillAccent },
  methodChipText: { fontSize: 13, fontWeight: '500', color: wc.textSecondary },
  methodChipTextOn: { color: '#fff' },

  note: { fontSize: 12, color: wc.textMuted, textAlign: 'center', marginTop: 6 },
});
