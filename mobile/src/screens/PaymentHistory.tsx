// src/screens/PaymentHistory.tsx — read-only transaction history, mirrors web's .portal card/tag styling.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { getLatestPayment, getPaymentHistory, type PaymentHistoryResponse } from '../api';
import { PageHeader } from '../components/PageHeader';
import { ws, wc } from '../webStyle';

function formatAmount(p: PaymentHistoryResponse) {
  const value = Number(p.amount);
  const currency = (p.currency || 'GBP').toUpperCase();
  try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(value); }
  catch { return `${currency} ${Number.isFinite(value) ? value.toFixed(2) : p.amount}`; }
}
function formatDate(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}
function statusInfo(status?: string): { label: string; box: any; text: any } {
  const n = (status || '').toLowerCase();
  if (n === 'succeeded') return { label: 'Paid', box: ws.tok, text: ws.tokText };
  if (n === 'failed' || n === 'canceled' || n === 'cancelled') return { label: 'Failed', box: ws.tdanger, text: ws.tdangerText };
  if (n === 'processing') return { label: 'Processing', box: ws.twarn, text: ws.twarnText };
  return { label: status ? status.replace(/_/g, ' ') : 'Unknown', box: ws.tmute, text: ws.tmuteText };
}

export default function PaymentHistory() {
  const [history, setHistory] = useState<PaymentHistoryResponse[]>([]);
  const [latest, setLatest] = useState<PaymentHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const [l, h] = await Promise.all([getLatestPayment(), getPaymentHistory()]);
        if (!alive) return;
        setLatest(l);
        setHistory(Array.isArray(h) ? h : []);
      } catch (e: any) {
        if (alive) setError(e?.message || 'Unable to load payment history.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const totalPaid = useMemo(() => {
    const sum = history.filter(p => (p.status || '').toLowerCase() === 'succeeded').reduce((n, p) => n + Number(p.amount || 0), 0);
    const currencyCode = history[0]?.currency || 'GBP';
    try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currencyCode }).format(sum); }
    catch { return `£${sum.toFixed(2)}`; }
  }, [history]);

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Payment History" showBack />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={wc.fillAccent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
          {error && <View style={[ws.notice, ws.nWarn]}><Text style={[ws.noticeText, ws.nWarnText]}>{error}</Text></View>}

          <View style={ws.g2Row}>
            <View style={[ws.card, ws.g2Col, { marginBottom: 0 }]}>
              <Text style={ws.fiHint}>Total Paid</Text>
              <Text style={s.statValue}>{totalPaid}</Text>
            </View>
            <View style={[ws.card, ws.g2Col, { marginBottom: 0 }]}>
              <Text style={ws.fiHint}>Last Payment</Text>
              <Text style={s.statValueSm}>
                {latest ? `${statusInfo(latest.status).label} · ${formatDate(latest.updatedAt || latest.createdAt)}` : 'None yet'}
              </Text>
            </View>
          </View>

          <View style={[ws.card, { marginTop: 11 }]}>
            <Text style={ws.ct}>Transactions</Text>
            {history.length === 0 ? (
              <Text style={s.emptyText}>No payment transactions yet.</Text>
            ) : (
              history.map(p => {
                const st = statusInfo(p.status);
                return (
                  <View key={p.id} style={[ws.dr, s.txRow]}>
                    <Text style={{ fontSize: 17 }}>🧾</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.txName}>{p.packageLabel || 'Payment'}</Text>
                      <Text style={s.txSub}>{formatDate(p.updatedAt || p.createdAt)}{p.cardLast4 ? ` · •••• ${p.cardLast4}` : ''}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.txAmount}>{formatAmount(p)}</Text>
                      <View style={[ws.tag, st.box, { marginTop: 4 }]}><Text style={[ws.tagText, st.text]}>{st.label}</Text></View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },

  statValue: { fontSize: 18, fontWeight: '700', color: wc.textPrimary, marginTop: 2 },
  statValueSm: { fontSize: 14, fontWeight: '600', color: wc.textPrimary, marginTop: 2 },

  emptyText: { fontSize: 14, color: wc.textMuted, textAlign: 'center', paddingVertical: 12 },

  txRow: { alignItems: 'center', gap: 8 },
  txName: { fontSize: 14, fontWeight: '500', color: wc.textPrimary },
  txSub: { fontSize: 12, color: wc.textMuted, marginTop: 1 },
  txAmount: { fontSize: 14, fontWeight: '600', color: wc.textPrimary },
});
