// src/components/UI.tsx — Polished typography + button styles
import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, ScrollView, ViewStyle, TextStyle, StyleProp,
} from 'react-native';
import { colors, spacing, radius, typography, shadow } from '../theme';

// ── Button ────────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';

type BtnProps = {
  label: string;
  onPress: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  icon?: string;
  size?: 'sm' | 'md' | 'lg';
};

export function Btn({
  label, onPress, variant = 'primary', disabled, loading,
  style, textStyle, fullWidth, icon, size = 'md',
}: BtnProps) {

  const bg =
    disabled    ? colors.surface
    : variant === 'primary'   ? colors.brand
    : variant === 'secondary' ? colors.surface
    : variant === 'danger'    ? colors.errorBg
    : 'transparent';

  const tc =
    disabled    ? colors.mutedLight
    : variant === 'primary'   ? '#fff'
    : variant === 'secondary' ? colors.text
    : variant === 'danger'    ? colors.error
    : variant === 'outline'   ? colors.brand
    : colors.brand;

  const borderColor  =
    disabled    ? colors.lineMid
    : variant === 'outline'   ? colors.brand
    : variant === 'secondary' ? colors.lineMid
    : variant === 'danger'    ? colors.errorBorder
    : 'transparent';
  const borderWidth  = variant === 'ghost' || variant === 'primary' ? 0 : 1;

  const padV  = size === 'sm' ? 7  : size === 'lg' ? 14 : 11;
  const padH  = size === 'sm' ? 14 : size === 'lg' ? 26 : 18;
  const fSize = size === 'sm' ? typography.sm : size === 'lg' ? typography.md : typography.base;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor, borderWidth, paddingVertical: padV, paddingHorizontal: padH },
        fullWidth && { width: '100%', alignSelf: 'stretch' },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tc} size="small" />
      ) : (
        <View style={styles.btnInner}>
          {icon ? <Text style={{ fontSize: fSize }}>{icon}</Text> : null}
          <Text style={[styles.btnText, { color: tc, fontSize: fSize }, textStyle]}>
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ── Field ────────────────────────────────────────────────────────────────────
type FieldProps = {
  label?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
};
export function Field({ label, error, required, children, style }: FieldProps) {
  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      {label && (
        <Text style={styles.fieldLabel}>
          {label}
          {required && <Text style={styles.fieldRequired}> *</Text>}
        </Text>
      )}
      {children}
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

// ── Input ────────────────────────────────────────────────────────────────────
type InputProps = React.ComponentProps<typeof TextInput> & { error?: boolean; icon?: string };
export function Input({ error, style, icon, ...props }: InputProps) {
  if (icon) {
    return (
      <View style={[styles.inputRow, error && styles.inputRowErr]}>
        <Text style={styles.inputIcon}>{icon}</Text>
        <TextInput
          style={[styles.inputInline, style]}
          placeholderTextColor={colors.mutedLight}
          {...props}
        />
      </View>
    );
  }
  return (
    <TextInput
      style={[styles.input, error && styles.inputErr, style]}
      placeholderTextColor={colors.mutedLight}
      {...props}
    />
  );
}

// ── Muted ─────────────────────────────────────────────────────────────────────
export function Muted({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

// ── Strong ────────────────────────────────────────────────────────────────────
export function Strong({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.strong, style]}>{children}</Text>;
}

// ── Error Banner ──────────────────────────────────────────────────────────────
export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

// ── Loading View ──────────────────────────────────────────────────────────────
export function LoadingView() {
  return (
    <View style={styles.loadingView}>
      <ActivityIndicator color={colors.brand} size="large" />
      <Text style={styles.loadingText}>Loading…</Text>
    </View>
  );
}

// ── Page Head ─────────────────────────────────────────────────────────────────
export function PageHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.pageHead}>
      <Text style={styles.pageTitle}>{title}</Text>
      {right}
    </View>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
export function Section({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <ScrollView contentContainerStyle={[styles.section, style]} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────
export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ label, color = colors.brand }: { label: string; color?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '15', borderColor: color + '35' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
export function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={styles.sectionHeaderWrap}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      {sub ? <Text style={styles.sectionHeaderSub}>{sub}</Text> : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Button
  btn: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    minWidth: 80,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  btnText: {
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  // Card
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineMid,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.sm,
  },

  // Field
  fieldLabel: {
    fontWeight: '500',
    fontSize: typography.sm,
    color: colors.textSec,
    marginBottom: spacing.xs,
    letterSpacing: 0.1,
  },
  fieldRequired: { color: colors.error, fontSize: typography.sm },
  fieldError: {
    color: colors.error,
    fontSize: typography.xs,
    marginTop: spacing.xs,
  },

  // Input
  input: {
    borderWidth: 1,
    borderColor: colors.lineMid,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: typography.base,
    color: colors.text,
    backgroundColor: colors.surface,
    minHeight: 46,
  },
  inputErr: { borderColor: colors.error },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.lineMid,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    minHeight: 46,
    gap: spacing.sm,
  },
  inputRowErr: { borderColor: colors.error },
  inputIcon: { fontSize: 16, opacity: 0.55 },
  inputInline: {
    flex: 1,
    fontSize: typography.base,
    color: colors.text,
    paddingVertical: 12,
  },

  // Text
  muted: { color: colors.muted, fontSize: typography.base, lineHeight: typography.base * 1.55 },
  strong: { fontWeight: '600', color: colors.text, fontSize: typography.base },

  // Error Banner
  errorBanner: {
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  errorIcon: { fontSize: 14 },
  errorText: { color: colors.error, fontSize: typography.sm, flex: 1, lineHeight: 18 },

  // Loading
  loadingView: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, gap: spacing.md,
  },
  loadingText: { color: colors.muted, fontSize: typography.sm },

  // PageHead
  pageHead: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.lg,
  },
  pageTitle: {
    fontSize: typography.xl, fontWeight: '500',
    color: colors.text, flex: 1, letterSpacing: -0.2,
  },

  // Section
  section: { padding: spacing.xl, paddingBottom: spacing.xxxl },

  // Divider
  divider: { height: 1, backgroundColor: colors.line, marginVertical: spacing.md },

  // Badge
  badge: {
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.full, borderWidth: 1, alignSelf: 'flex-start',
  },
  badgeText: { fontSize: typography.xs, fontWeight: '500', letterSpacing: 0.2 },

  // Section Header
  sectionHeaderWrap: { marginBottom: spacing.lg, gap: 3 },
  sectionHeaderTitle: {
    fontSize: typography.lg, fontWeight: '500', color: colors.text, letterSpacing: -0.2,
  },
  sectionHeaderSub: { fontSize: typography.sm, color: colors.muted },
});
