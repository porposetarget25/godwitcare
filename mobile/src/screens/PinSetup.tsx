// src/screens/PinSetup.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Vibration, Switch, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { PageHeader } from '../components/PageHeader';
import { colors, spacing, radius, typography, shadow } from '../theme';

const PIN_KEY         = 'gc_pin';
const PIN_ENABLED_KEY = 'gc_pin_enabled';
const BIO_ENABLED_KEY = 'gc_bio_enabled';

const PAD = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']];

type Phase = 'idle' | 'set' | 'confirm' | 'done';

// ── Keypad ────────────────────────────────────────────────────────────────────
function Keypad({ pin, onKey }: { pin: string; onKey: (k: string) => void }) {
  return (
    <View>
      {/* Dots */}
      <View style={k.dots}>
        {[0,1,2,3].map(i => (
          <View key={i} style={[k.dot, i < pin.length && k.dotOn]} />
        ))}
      </View>
      {/* Keys */}
      <View style={k.pad}>
        {PAD.map((row, ri) => (
          <View key={ri} style={k.row}>
            {row.map((key, ci) => {
              if (!key) return <View key={ci} style={k.keyEmpty} />;
              return (
                <TouchableOpacity key={key} style={[k.key, key==='⌫' && k.keyDel]} onPress={() => onKey(key)} activeOpacity={0.65}>
                  <Text style={[k.keyTxt, key==='⌫' && k.keyDelTxt]}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function PinSetup() {
  const router = useRouter();

  const [phase,      setPhase     ] = useState<Phase>('idle');
  const [pin,        setPin       ] = useState('');
  const [firstPin,   setFirstPin  ] = useState('');
  const [pinEnabled, setPinEnabled] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioAvail,   setBioAvail  ] = useState(false);
  const [error,      setError     ] = useState('');

  useEffect(() => {
    (async () => {
      const pe  = await AsyncStorage.getItem(PIN_ENABLED_KEY);
      const be  = await AsyncStorage.getItem(BIO_ENABLED_KEY);
      const hw  = await LocalAuthentication.hasHardwareAsync();
      const enr = await LocalAuthentication.isEnrolledAsync();
      setPinEnabled(pe === 'true');
      setBioEnabled(be === 'true');
      setBioAvail(hw && enr);
      setPhase(pe === 'true' ? 'done' : 'idle');
    })();
  }, []);

  async function onKey(key: string) {
    if (key === '⌫') { setPin(p => p.slice(0,-1)); setError(''); return; }
    if (pin.length >= 4) return;
    const next = pin + key;
    setPin(next);
    if (next.length < 4) return;

    if (phase === 'set') {
      setFirstPin(next);
      setPin('');
      setPhase('confirm');
    } else if (phase === 'confirm') {
      if (next === firstPin) {
        await AsyncStorage.multiSet([[PIN_KEY, next], [PIN_ENABLED_KEY, 'true']]);
        setPinEnabled(true);
        setPhase('done');
        setError('');
      } else {
        Vibration.vibrate(400);
        setError('PINs don\'t match — try again');
        setPin(''); setFirstPin('');
        setPhase('set');
      }
    }
  }

  async function disablePin() {
    Alert.alert('Disable PIN', 'This will remove your PIN lock.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disable', style: 'destructive', onPress: async () => {
        await AsyncStorage.multiRemove([PIN_KEY, PIN_ENABLED_KEY, BIO_ENABLED_KEY]);
        setPinEnabled(false); setBioEnabled(false);
        setPhase('idle'); setPin(''); setFirstPin('');
      }},
    ]);
  }

  async function toggleBio(val: boolean) {
    setBioEnabled(val);
    await AsyncStorage.setItem(BIO_ENABLED_KEY, val ? 'true' : 'false');
  }

  const phaseTitle = phase === 'set'     ? 'Set PIN'
                   : phase === 'confirm' ? 'Confirm PIN'
                   : '';
  const phaseSub   = phase === 'set'     ? 'Enter a new 4-digit PIN'
                   : phase === 'confirm' ? 'Re-enter to confirm'
                   : '';

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="PIN & Security" subtitle="App lock settings" />
      <View style={s.container}>

        {/* Toggle row */}
        <View style={s.card}>
          <View style={s.toggleRow}>
            <View style={s.toggleIcon}><Text style={{ fontSize: 20 }}>🔒</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleLabel}>PIN Lock</Text>
              <Text style={s.toggleSub}>Require PIN when reopening the app</Text>
            </View>
            <Switch
              value={pinEnabled}
              onValueChange={v => { if (!v) disablePin(); else { setPinEnabled(true); setPhase('set'); setPin(''); setFirstPin(''); }}}
              trackColor={{ true: colors.brand, false: colors.lineMid }}
              thumbColor={colors.white}
            />
          </View>

          {pinEnabled && bioAvail && (
            <>
              <View style={s.divider} />
              <View style={s.toggleRow}>
                <View style={s.toggleIcon}><Text style={{ fontSize: 20 }}>🔐</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.toggleLabel}>Fingerprint / Face ID</Text>
                  <Text style={s.toggleSub}>Use biometrics instead of PIN</Text>
                </View>
                <Switch
                  value={bioEnabled}
                  onValueChange={toggleBio}
                  trackColor={{ true: colors.brand, false: colors.lineMid }}
                  thumbColor={colors.white}
                />
              </View>
            </>
          )}
        </View>

        {/* PIN entry */}
        {(phase === 'set' || phase === 'confirm') && (
          <View style={s.card}>
            <Text style={s.pinTitle}>{phaseTitle}</Text>
            <Text style={s.pinSub}>{phaseSub}</Text>
            {!!error && (
              <View style={s.errorBanner}><Text style={s.errorTxt}>⚠️  {error}</Text></View>
            )}
            <Keypad pin={pin} onKey={onKey} />
          </View>
        )}

        {/* Done / change */}
        {phase === 'done' && (
          <View style={s.successCard}>
            <Text style={s.successIcon}>✅</Text>
            <Text style={s.successTitle}>PIN Enabled</Text>
            <Text style={s.successSub}>
              Your app is protected{bioEnabled && bioAvail ? ' with PIN and fingerprint' : ' by PIN'}.
            </Text>
            <TouchableOpacity
              style={s.changeBtn}
              onPress={() => { setPhase('set'); setPin(''); setFirstPin(''); }}
              activeOpacity={0.75}
            >
              <Text style={s.changeBtnTxt}>Change PIN</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info note when PIN off */}
        {phase === 'idle' && !pinEnabled && (
          <View style={s.infoCard}>
            <Text style={s.infoTxt}>
              💡 PIN lock keeps your health data private. It activates when you reopen the app after closing it.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.bgGray },
  card:        { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...shadow.sm },
  toggleRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md },
  toggleIcon:  { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.brandLight, alignItems: 'center', justifyContent: 'center' },
  toggleLabel: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  toggleSub:   { fontSize: typography.xs, color: colors.muted, marginTop: 2 },
  divider:     { height: 1, backgroundColor: colors.line, marginHorizontal: -spacing.lg },
  pinTitle:    { fontSize: typography.lg, fontWeight: '700', color: colors.text, textAlign: 'center', paddingTop: spacing.sm },
  pinSub:      { fontSize: typography.sm, color: colors.muted, textAlign: 'center', marginBottom: spacing.lg },
  errorBanner: { backgroundColor: colors.errorBg, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorTxt:    { color: colors.error, fontSize: typography.sm, fontWeight: '600' },
  successCard: { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.xl, alignItems: 'center', gap: spacing.md, ...shadow.sm },
  successIcon: { fontSize: 48 },
  successTitle:{ fontSize: typography.xl, fontWeight: '700', color: colors.text },
  successSub:  { fontSize: typography.sm, color: colors.muted, textAlign: 'center' },
  changeBtn:   { marginTop: spacing.sm, backgroundColor: colors.brandLight, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.full },
  changeBtnTxt:{ color: colors.brand, fontWeight: '700', fontSize: typography.sm },
  infoCard:    { backgroundColor: colors.brandLight, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.brandMid },
  infoTxt:     { fontSize: typography.sm, color: colors.brandDark, lineHeight: 20 },
});

const k = StyleSheet.create({
  dots:    { flexDirection: 'row', justifyContent: 'center', gap: 18, paddingVertical: spacing.xl },
  dot:     { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.lineMid },
  dotOn:   { backgroundColor: colors.brand, borderColor: colors.brand },
  pad:     { gap: spacing.md, paddingBottom: spacing.md },
  row:     { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  key:     { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.bgGray, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  keyDel:  { backgroundColor: colors.errorBg, borderColor: colors.errorBorder },
  keyEmpty:{ width: 76, height: 76 },
  keyTxt:  { fontSize: typography.xxl, fontWeight: '600', color: colors.text },
  keyDelTxt:{ fontSize: typography.xl, color: colors.error },
});
