// src/screens/Onboarding.tsx
import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  FlatList, Animated, Image, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, radius, typography } from '../theme';

const { width, height } = Dimensions.get('window');
const LOGO = require('../../assets/logo_white.png');

export const ONBOARDING_KEY = 'gc_onboarding_done';

const SLIDES = [
  {
    id: '1',
    icon: '🌍',
    title: 'Care Beyond\nBorders',
    subtitle: 'Your trusted medical advisor wherever your travels take you — available 24/7.',
    bg: '#006d6d',
    accent: '#FFD580',
  },
  {
    id: '2',
    icon: '💬',
    title: 'Consult via\nWhatsApp',
    subtitle: 'Connect instantly with certified doctors through WhatsApp — no app switching needed.',
    bg: '#007a7a',
    accent: '#a8f0e8',
  },
  {
    id: '3',
    icon: '💊',
    title: 'Digital\nPrescriptions',
    subtitle: 'Receive and download your prescription instantly after your consultation.',
    bg: '#005f6b',
    accent: '#FFD580',
  },
  // {
  //   id: '4',
  //   icon: '🛡️',
  //   title: 'Pre-Existing\nConditions Welcome',
  //   subtitle: 'Comprehensive travel health coverage designed for everyone, including pre-existing conditions.',
  //   bg: '#006d6d',
  //   accent: '#a8f0e8',
  // },
  {
    id: '4',
    icon: '📍',
    title: 'Find Nearby\nPharmacies',
    subtitle: 'Locate the nearest pharmacy to collect your prescribed medication, wherever you are.',
    bg: '#007a7a',
    accent: '#FFD580',
  },
];

export default function Onboarding() {
  const router   = useRouter();
  const flatRef  = useRef<FlatList>(null);
  const scrollX  = useRef(new Animated.Value(0)).current;
  const [current, setCurrent] = useState(0);

  async function finish() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(app)/login');
  }

  function next() {
    if (current < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: current + 1, animated: true });
    } else {
      finish();
    }
  }

  function skip() { finish(); }

  const slide = SLIDES[current];

  return (
    <View style={[styles.root, { backgroundColor: slide.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={slide.bg} />

      {/* Decorative circles */}
      <View style={[styles.circleTR, { backgroundColor: slide.accent + '20' }]} />
      <View style={[styles.circleBL, { backgroundColor: slide.accent + '15' }]} />

      {/* Logo top-left */}
      <View style={styles.topBar}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <TouchableOpacity onPress={skip} style={styles.skipBtn} activeOpacity={0.75}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <Animated.FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={i => i.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrent(idx);
        }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            {/* Big icon card */}
            <View style={[styles.iconCard, { borderColor: item.accent + '40' }]}>
              <Text style={styles.slideIcon}>{item.icon}</Text>
            </View>
            <Text style={[styles.slideTitle, { color: '#fff' }]}>{item.title}</Text>
            <Text style={[styles.slideSubtitle, { color: 'rgba(255,255,255,0.78)' }]}>
              {item.subtitle}
            </Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = scrollX.interpolate({
            inputRange, outputRange: [8, 24, 8], extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange, outputRange: [0.4, 1, 0.4], extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { width: dotWidth, opacity,
                backgroundColor: slide.accent }]}
            />
          );
        })}
      </View>

      {/* Bottom buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: slide.accent }]}
          onPress={next} activeOpacity={0.85}>
          <Text style={[styles.nextText, { color: slide.bg }]}>
            {current === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>

        <View style={styles.authRow}>
          <Text style={styles.authText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(app)/login')} activeOpacity={0.75}>
            <Text style={[styles.authLink, { color: slide.accent }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  circleTR:    { position: 'absolute', top: -80, right: -60, width: 260, height: 260, borderRadius: 130 },
  circleBL:    { position: 'absolute', bottom: -60, left: -80, width: 220, height: 220, borderRadius: 110 },
  topBar:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: 52, paddingBottom: spacing.md },
  logo:        { width: 52, height: 52 },
  skipBtn:     { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  skipText:    { color: 'rgba(255,255,255,0.8)', fontSize: typography.sm, fontWeight: '600' },
  slide:       { width, paddingHorizontal: spacing.xxxl, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl },
  iconCard:    { width: 160, height: 160, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xxxl, borderWidth: 1.5 },
  slideIcon:   { fontSize: 72 },
  slideTitle:  { fontSize: 34, fontWeight: '800', textAlign: 'center', letterSpacing: -0.8, lineHeight: 40, marginBottom: spacing.lg },
  slideSubtitle:{ fontSize: typography.md, textAlign: 'center', lineHeight: 26, paddingHorizontal: spacing.md },
  dotsRow:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: spacing.xl },
  dot:         { height: 8, borderRadius: 4 },
  bottomBar:   { paddingHorizontal: spacing.xl, paddingBottom: 48, gap: spacing.md },
  nextBtn:     { borderRadius: radius.full, paddingVertical: 16, alignItems: 'center' },
  nextText:    { fontSize: typography.md, fontWeight: '800', letterSpacing: 0.3 },
  authRow:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  authText:    { color: 'rgba(255,255,255,0.65)', fontSize: typography.sm },
  authLink:    { fontSize: typography.sm, fontWeight: '700' },
});
