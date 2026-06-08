// src/screens/PinLock.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Image, Vibration, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { useAuth } from '../state/auth';
import { colors, spacing, radius, typography } from '../theme';

const LOGO        = require('../../assets/logo_dark.png');
const PIN_KEY     = 'gc_pin';
const BIO_ENABLED = 'gc_bio_enabled';
const MAX_ATT     = 5;

const PAD = [['1','2','3'],['4','5','6'],['7','8','9'],['bio','0','⌫']];

export default function PinLock() {
  const router  = useRouter();
  const { logout } = useAuth();

  const [pin,      setPin     ] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [error,    setError   ] = useState('');
  const [bioAvail, setBioAvail] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const hw  = await LocalAuthentication.hasHardwareAsync();
      const enr = await LocalAuthentication.isEnrolledAsync();
      const bio = await AsyncStorage.getItem(BIO_ENABLED);
      if (hw && enr && bio === 'true') {
        setBioAvail(true);
        // Auto-trigger biometric prompt
        setTimeout(() => tryBiometric(), 600);
      }
    })();
  }, []);

  async function tryBiometric() {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock GodwitCare',
      fallbackLabel:  'Use PIN',
      cancelLabel:    'Cancel',
    });
    if (res.success) router.replace('/(app)/home');
  }

  function doShake() {
    Vibration.vibrate(400);
    Animated.sequence([
      Animated.timing(shake, { toValue:  14, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -14, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue:  8,  duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8,  duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue:  0,  duration: 50, useNativeDriver: true }),
    ]).start();
  }

  async function pressKey(key: string) {
    if (key === '⌫') { setPin(p => p.slice(0,-1)); setError(''); return; }
    if (key === 'bio') { if (bioAvail) tryBiometric(); return; }
    if (pin.length >= 4) return;

    const next = pin + key;
    setPin(next);

    if (next.length === 4) {
      const saved = await AsyncStorage.getItem(PIN_KEY);
      if (next === saved) {
        router.replace('/(app)/home');
      } else {
        doShake();
        const att = attempts + 1;
        setAttempts(att);
        setPin('');
        if (att >= MAX_ATT) {
          Alert.alert('Too Many Attempts', 'Signed out for security.', [
            { text: 'OK', onPress: logout },
          ]);
        } else {
          setError(`Wrong PIN — ${MAX_ATT - att} attempt${MAX_ATT - att !== 1 ? 's' : ''} left`);
        }
      }
    }
  }

  return (
    <View style={s.root}>
      <View style={s.circle1} />
      <View style={s.circle2} />

      <Image source={LOGO} style={s.logo} resizeMode="contain" />
      <Text style={s.title}>Enter PIN</Text>
      <Text style={s.sub}>Enter your 4-digit PIN to continue</Text>

      {/* Dots */}
      <Animated.View style={[s.dots, { transform: [{ translateX: shake }] }]}>
        {[0,1,2,3].map(i => (
          <View key={i} style={[s.dot, i < pin.length && s.dotOn]} />
        ))}
      </Animated.View>

      {!!error && <Text style={s.error}>{error}</Text>}

      {/* Keypad */}
      <View style={s.pad}>
        {PAD.map((row, ri) => (
          <View key={ri} style={s.row}>
            {row.map(key => {
              const isBio = key === 'bio';
              const isDel = key === '⌫';
              if (isBio && !bioAvail) {
                return <View key={key} style={s.keyEmpty} />;
              }
              return (
                <TouchableOpacity key={key} style={[s.key, (isDel || isBio) && s.keySpec]} onPress={() => pressKey(key)} activeOpacity={0.6}>
                  <Text style={[s.keyTxt, (isDel || isBio) && s.keySpecTxt]}>
                    {isBio ? '🔐' : key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {bioAvail && (
        <TouchableOpacity style={s.bioRow} onPress={tryBiometric} activeOpacity={0.7}>
          <Text style={s.bioTxt}>Use fingerprint instead</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={s.signout} onPress={logout} activeOpacity={0.7}>
        <Text style={s.signoutTxt}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxxl, overflow: 'hidden' },
  circle1: { position: 'absolute', top: -120, right: -80, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(255,255,255,0.07)' },
  circle2: { position: 'absolute', bottom: -80, left: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.07)' },
  logo:    { width: 120, height: 44, marginBottom: spacing.xxl },
  title:   { fontSize: typography.xxl, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  sub:     { fontSize: typography.sm, color: 'rgba(255,255,255,0.6)', marginTop: 6, marginBottom: spacing.xxl },
  dots:    { flexDirection: 'row', gap: 18, marginBottom: spacing.sm },
  dot:     { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.45)' },
  dotOn:   { backgroundColor: '#FFD580', borderColor: '#FFD580' },
  error:   { color: '#FFD580', fontSize: typography.sm, fontWeight: '600', marginBottom: spacing.lg, height: 20 },
  pad:     { gap: spacing.md, marginTop: spacing.md, width: '100%', maxWidth: 280 },
  row:     { flexDirection: 'row', justifyContent: 'space-between' },
  key:     { width: 78, height: 78, borderRadius: 39, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' },
  keySpec: { backgroundColor: 'rgba(255,255,255,0.06)' },
  keyEmpty:{ width: 78, height: 78 },
  keyTxt:  { fontSize: typography.xxl, fontWeight: '600', color: '#fff' },
  keySpecTxt:{ fontSize: typography.xl, color: 'rgba(255,255,255,0.65)' },
  bioRow:  { marginTop: spacing.xxl, paddingVertical: spacing.md },
  bioTxt:  { color: 'rgba(255,255,255,0.65)', fontSize: typography.sm, fontWeight: '600' },
  signout: { marginTop: spacing.md, paddingVertical: spacing.md },
  signoutTxt:{ color: 'rgba(255,255,255,0.4)', fontSize: typography.xs, textDecorationLine: 'underline' },
});
