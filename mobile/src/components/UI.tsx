// src/components/UI.tsx — shared primitives, mirroring web's .portal button/card/field classes exactly.
import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, ScrollView, ViewStyle, TextStyle, StyleProp,
} from 'react-native';
import { ws, wc } from '../webStyle';

// ── Button (.bp / .bs / .bg / .bd) ──────────────────────────────────────────
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

const ghostBox: ViewStyle = { backgroundColor: 'transparent', paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 };
const ghostText: TextStyle = { color: wc.fillAccent, fontSize: 14, fontWeight: '500' };

const VARIANT_STYLE: Record<BtnVariant, { box: ViewStyle; text: TextStyle }> = {
  primary: { box: ws.bp, text: ws.bpText },
  secondary: { box: ws.bs, text: ws.bsText },
  outline: { box: ws.bg, text: ws.bgText },
  ghost: { box: ghostBox, text: ghostText },
  danger: { box: ws.bd, text: ws.bdText },
};

export function Btn({
  label, onPress, variant = 'primary', disabled, loading,
  style, textStyle, fullWidth, icon, size = 'md',
}: BtnProps) {
  const v = VARIANT_STYLE[variant];
  const padScale = size === 'sm' ? 0.75 : size === 'lg' ? 1.35 : 1;
  const fSize = size === 'sm' ? 12 : size === 'lg' ? 15 : 13;
  const tc = v.text.color as string;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        v.box,
        { paddingVertical: (v.box.paddingVertical as number) * padScale, paddingHorizontal: (v.box.paddingHorizontal as number) * padScale },
        fullWidth && ws.btnBlock,
        disabled && ws.btnDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tc} size="small" />
      ) : (
        <>
          {icon ? <Text style={{ fontSize: fSize }}>{icon}</Text> : null}
          <Text style={[v.text, { fontSize: fSize }, textStyle]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ── Card (.card) ─────────────────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[ws.card, style]}>{children}</View>;
}

// ── Field (.fi / .fl2) ────────────────────────────────────────────────────────
type FieldProps = {
  label?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
};
export function Field({ label, error, required, children, style }: FieldProps) {
  return (
    <View style={[ws.fi, style]}>
      {label && (
        <Text style={ws.fl2}>
          {label}
          {required && <Text style={{ color: wc.textDanger }}> *</Text>}
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
          placeholderTextColor={wc.textMuted}
          {...props}
        />
      </View>
    );
  }
  return (
    <TextInput
      style={[ws.input, error && styles.inputErr, style]}
      placeholderTextColor={wc.textMuted}
      {...props}
    />
  );
}

// ── Muted / Strong ────────────────────────────────────────────────────────────
export function Muted({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function Strong({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.strong, style]}>{children}</Text>;
}

// ── Error Banner (.notice .n-danger) ─────────────────────────────────────────
export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={[ws.notice, ws.nDanger]}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={[ws.noticeText, ws.nDangerText]}>{message}</Text>
    </View>
  );
}

// ── Loading View ──────────────────────────────────────────────────────────────
export function LoadingView() {
  return (
    <View style={styles.loadingView}>
      <ActivityIndicator color={wc.fillAccent} size="large" />
      <Text style={styles.loadingText}>Loading…</Text>
    </View>
  );
}

// ── Page Head (.page-head / .page-title) ─────────────────────────────────────
export function PageHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={ws.pageHead}>
      <Text style={ws.pageTitle}>{title}</Text>
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

// ── Row / Divider ─────────────────────────────────────────────────────────────
export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

// ── Badge / Tag (.tag) ────────────────────────────────────────────────────────
export function Badge({ label, color = wc.fillAccent }: { label: string; color?: string }) {
  return (
    <View style={[ws.tag, { backgroundColor: color + '15', borderWidth: StyleSheet.hairlineWidth, borderColor: color + '35' }]}>
      <Text style={[ws.tagText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
export function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={styles.sectionHeaderWrap}>
      <Text style={ws.ct}>{title}</Text>
      {sub ? <Text style={styles.sectionHeaderSub}>{sub}</Text> : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  fieldError: { color: wc.textDanger, fontSize: 12, marginTop: 3 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: wc.borderStrong, borderRadius: 8,
    backgroundColor: wc.surface2, paddingHorizontal: 12, gap: 8,
  },
  inputRowErr: { borderColor: wc.textDanger },
  inputIcon: { fontSize: 16, opacity: 0.6 },
  inputInline: { flex: 1, fontSize: 14, color: wc.textPrimary, paddingVertical: 9 },
  inputErr: { borderColor: wc.textDanger },

  muted: { color: wc.textMuted, fontSize: 14, lineHeight: 19 },
  strong: { fontWeight: '600', color: wc.textPrimary, fontSize: 14 },

  errorIcon: { fontSize: 14 },

  loadingView: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  loadingText: { color: wc.textMuted, fontSize: 14 },

  section: { padding: 20, paddingBottom: 40 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: wc.border, marginVertical: 10 },

  sectionHeaderWrap: { marginBottom: 14, gap: 2 },
  sectionHeaderSub: { fontSize: 13, color: wc.textMuted },
});
