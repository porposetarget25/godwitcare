// src/components/Header.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, shadow } from '../theme';

const LOGO = require('../../assets/logo.png');

const LINKS = [
  { label: 'Home', href: '/(app)/dashboard' },
  { label: 'How it Works', href: '/(app)/dashboard' },
  { label: 'Features', href: '/(app)/dashboard' },
];

export function Header() {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <View style={styles.nav}>
        <View style={styles.left}>
          <View style={styles.logoBadge}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          </View>
          <View style={styles.envBadge}>
            <Text style={styles.envText}>GodwitCare - Test Environment</Text>
          </View>
        </View>
        <View style={styles.navLinks}>
          {LINKS.map((l) => (
            <TouchableOpacity key={l.label} onPress={() => router.push(l.href as any)}>
              <Text style={styles.navLink}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.brand,
    paddingTop: 0,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoBadge: {
    backgroundColor: '#fff',
    borderRadius: 999,
    padding: 4,
  },
  logo: {
    width: 36,
    height: 36,
  },
  envBadge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  envText: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: '#0f172a',
  },
  navLinks: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  navLink: {
    color: '#eaf2ff',
    fontSize: typography.sm,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
