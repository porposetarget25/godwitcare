// src/screens/SplashScreen.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { colors, typography, spacing, shadow } from '../theme';

const LOGO = require('../../assets/nice-logo.png');   // white logo for teal background

export default function SplashScreen() {
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const scaleAnim  = useRef(new Animated.Value(0.82)).current;
  const slideFade  = useRef(new Animated.Value(0)).current;
  const slideY     = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(slideFade, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(slideY,    { toValue: 0, duration: 55, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Background decor */}
      <View style={styles.circleTopLeft} />
      <View style={styles.circleBottomRight} />
      <View style={styles.arcTop} />

      {/* Logo card */}
      <Animated.View style={ { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      </Animated.View>

      {/* Tagline below */}
      <Animated.View style={{ opacity: slideFade, transform: [{ translateY: slideY }], alignItems: 'center', gap: 6 }}>
        <Text style={styles.tagline}>Care Beyond Borders</Text>
      </Animated.View>

      {/* Bottom loader */}
      <Animated.View style={[styles.footer, { opacity: slideFade }]}>
        <PulseDots />
      </Animated.View>
    </View>
  );
}

function PulseDots() {
  const dots = [
    useRef(new Animated.Value(0.25)).current,
    useRef(new Animated.Value(0.25)).current,
    useRef(new Animated.Value(0.25)).current,
  ];

  useEffect(() => {
    const loop = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1,    duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.25, duration: 280, useNativeDriver: true }),
          Animated.delay(Math.max(0, 560 - delay)),
        ])
      );
    Animated.parallel(dots.map((d, i) => loop(d, i * 180))).start();
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={[
          styles.dot,
          { opacity: d, transform: [{ scale: d }] }
        ]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  circleTopLeft: {
    position: 'absolute', top: -120, left: -80,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  circleBottomRight: {
    position: 'absolute', bottom: -100, right: -70,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  arcTop: {
    position: 'absolute', top: -40, right: 60,
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'transparent',
  },
  card: {
    width: 220,
    height: 220,
    borderRadius: 40,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 14,
    padding: 16 // ensure shadow is visible on Android
  },
  logo: {
    width: 180,
    height: 180,
    borderRadius: 100,
    overflow: 'hidden',
  },
  tagline: {
    fontSize: typography.base,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 72,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
