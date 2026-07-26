// src/components/PageHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '../theme';

const LOGO_DARK = require('../../assets/logo_dark.png');

type Props = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  showLogo?: boolean;
};

export function PageHeader({ title, subtitle, showBack = true, onBack, right, showLogo = false }: Props) {
  const router = useRouter();
  const handleBack = () => { if (onBack) onBack(); else router.back(); };

  return (
    <View style={styles.header}>
      {/* Left */}
      <View style={styles.sideLeft}>
        {showBack ? (
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.75}>
            <View style={styles.chevronWrap}>
              <View style={[styles.chevronBar, { transform: [{ rotate: '-45deg' }, { translateY: -3.5 }] }]} />
              <View style={[styles.chevronBar, { transform: [{ rotate: '45deg'  }, { translateY:  3.5 }] }]} />
            </View>
          </TouchableOpacity>
        ) : showLogo ? (
          <Image source={LOGO_DARK} style={styles.logoMark} resizeMode="contain" />
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {/* Center */}
      <View style={styles.centerWrap}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      {/* Right */}
      <View style={styles.sideRight}>
        {right ?? null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    minHeight: 58,
    elevation: 2,
    shadowColor: colors.brandDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  sideLeft: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    width: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.white,
    fontSize: typography.md,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: typography.xs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronWrap: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  chevronBar: {
    width: 10, height: 2.5,
    backgroundColor: colors.white, borderRadius: 2,
    position: 'absolute',
  },
  logoMark: { width: 44, height: 44 },
});
