// src/screens/RegisterStep1.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, Modal, FlatList, TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useReg } from '../state/registration';
import { Btn, Field } from '../components/UI';
import { colors, spacing, radius, typography } from '../theme';
import { PageHeader } from '../components/PageHeader';
import { FormScrollView } from '../components/FormScrollView';

type Errors = Partial<Record<'firstName'|'lastName'|'dob'|'gender'|'primary'|'password'|'email', string>>;

const today    = new Date();
const cutoff18 = new Date(today);
cutoff18.setFullYear(today.getFullYear() - 18);

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function displayDate(v?: string) {
  if (!v) return '';
  const d = new Date(`${v}T00:00:00`);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' });
}
function validateDob(v?: string): string | null {
  if (!v) return 'Date of birth is required.';
  const d = new Date(`${v}T00:00:00`);
  if (isNaN(d.getTime())) return 'Invalid date.';
  if (d > new Date())     return 'Cannot be in the future.';
  if (d > cutoff18)       return 'Must be at least 18 years old.';
  return null;
}
function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

const COUNTRY_CODES = [
  { name: 'Australia',      flag: '🇦🇺', dial: '+61'  },
  { name: 'Canada',         flag: '🇨🇦', dial: '+1'   },
  { name: 'France',         flag: '🇫🇷', dial: '+33'  },
  { name: 'Germany',        flag: '🇩🇪', dial: '+49'  },
  { name: 'India',          flag: '🇮🇳', dial: '+91'  },
  { name: 'New Zealand',    flag: '🇳🇿', dial: '+64'  },
  { name: 'South Africa',   flag: '🇿🇦', dial: '+27'  },
  { name: 'UAE',            flag: '🇦🇪', dial: '+971' },
  { name: 'United Kingdom', flag: '🇬🇧', dial: '+44'  },
  { name: 'United States',  flag: '🇺🇸', dial: '+1'   },
].sort((a, b) => a.name.localeCompare(b.name));

// ── Reusable selector button ──────────────────────────────────────────────────
function SelectorBtn({
  value, placeholder, onPress, error, icon,
}: { value?: string; placeholder: string; onPress: () => void; error?: boolean; icon?: string }) {
  return (
    <TouchableOpacity
      style={[sh.selectorBtn, error && sh.selectorBtnErr]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {icon ? <Text style={sh.selectorIcon}>{icon}</Text> : null}
      <Text style={[sh.selectorText, !value && sh.selectorPlaceholder]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <Text style={sh.chevron}>›</Text>
    </TouchableOpacity>
  );
}

// ── Bottom-sheet modal list picker ───────────────────────────────────────────
type SheetItem = { label: string; value: string; sub?: string };
function BottomSheet({
  visible, title, items, selected, onSelect, onClose,
  searchable,
}: {
  visible: boolean; title: string; items: SheetItem[];
  selected?: string; onSelect: (v: string) => void; onClose: () => void;
  searchable?: boolean;
}) {
  const [q, setQ]           = useState('');
  const [pending, setPending] = useState(selected || '');

  // Sync pending with selected when sheet opens
  React.useEffect(() => { if (visible) setPending(selected || ''); }, [visible]);

  const filtered = searchable && q
    ? items.filter(i => i.label.toLowerCase().includes(q.toLowerCase()) ||
                        (i.sub || '').toLowerCase().includes(q.toLowerCase()))
    : items;

  function save() { if (pending) { onSelect(pending); } onClose(); setQ(''); }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sh.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={sh.sheet}>
          {/* Handle bar */}
          <View style={sh.handle} />

          {/* Header */}
          <View style={sh.sheetHeader}>
            <Text style={sh.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={sh.closeCircle} activeOpacity={0.7}>
              <Text style={sh.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search (for country picker) */}
          {searchable && (
            <View style={sh.searchWrap}>
              <Text style={sh.searchIcon}>🔍</Text>
              <TextInput
                style={sh.searchInput}
                value={q}
                onChangeText={setQ}
                placeholder="Search…"
                placeholderTextColor={colors.mutedLight}
                autoFocus
              />
              {q.length > 0 && (
                <TouchableOpacity onPress={() => setQ('')}>
                  <Text style={{ color: colors.muted, fontSize: 17, paddingHorizontal: 4 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Radio list */}
          <FlatList
            data={filtered}
            keyExtractor={i => i.value}
            style={{ maxHeight: 320 }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={sh.sep} />}
            renderItem={({ item }) => {
              const active = item.value === pending;
              return (
                <TouchableOpacity
                  style={sh.radioRow}
                  onPress={() => setPending(item.value)}
                  activeOpacity={0.65}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={sh.radioLabel}>{item.label}</Text>
                    {item.sub ? <Text style={sh.radioSub}>{item.sub}</Text> : null}
                  </View>
                  {/* Radio circle */}
                  <View style={[sh.radioOuter, active && sh.radioOuterActive]}>
                    {active && <View style={sh.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          {/* Cancel / Save buttons */}
          <View style={sh.btnRow}>
            <TouchableOpacity style={sh.cancelBtn} onPress={onClose} activeOpacity={0.75}>
              <Text style={sh.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[sh.saveBtn, !pending && sh.saveBtnDisabled]}
              onPress={save}
              activeOpacity={0.8}
            >
              <Text style={sh.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function Step1() {
  const { draft, setDraft } = useReg();
  const router = useRouter();

  const [errors,        setErrors       ] = useState<Errors>({});
  const [showDob,       setShowDob      ] = useState(false);
  const [showGender,    setShowGender   ] = useState(false);
  const [showCountry,   setShowCountry  ] = useState(false);
  const [showPassword,  setShowPassword ] = useState(false);

  const dobDate = draft['Date of Birth']
    ? new Date(`${draft['Date of Birth']}T00:00:00`)
    : cutoff18;

  // Selected country object
  const selectedCountry = COUNTRY_CODES.find(c => c.dial === (draft.primaryDial || '+64'));

  function onDateChange(_: any, selected?: Date) {
    setShowDob(Platform.OS === 'ios');
    if (selected) {
      setDraft({ ...draft, 'Date of Birth': ymd(selected) });
      setErrors(prev => ({ ...prev, dob: undefined }));
    }
  }

  function validate(): boolean {
    const next: Errors = {};
    if (!draft['First Name']?.trim())  next.firstName = 'Required';
    if (!draft['Last Name']?.trim())   next.lastName  = 'Required';
    const dobErr = validateDob(draft['Date of Birth']);
    if (dobErr) next.dob = dobErr;
    if (!draft['Gender'])              next.gender    = 'Required';
    if (!draft['Primary WhatsApp Number']?.trim()) next.primary  = 'Required';
    if (!draft['Account Password']?.trim())        next.password = 'Required';
    const email = (draft['Email Address'] || '').trim();
    if (email && !isValidEmail(email)) next.email = 'Please enter a valid email address.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function next() {
    if (!validate()) return;
    const primaryDial   = draft.primaryDial || '+64';
    const primaryDigits = (draft['Primary WhatsApp Number'] || '').replace(/\D/g, '');
    const primaryFull   = `${primaryDial}${primaryDigits}`;
    setDraft({ ...draft, primaryDial, 'Primary WhatsApp Number': primaryFull, Username: primaryFull });
    router.push('/(app)/register/step2');
  }

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Main Traveler Information" subtitle="Step 1 of 3" showBack />

      <FormScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>Step 1 of 3</Text></View>
        <Text style={styles.title}>Personal Information</Text>
        <Text style={styles.subtitle}>Please fill in your details as they appear on your passport.</Text>

        {/* Names row */}
        <View style={styles.row}>
          <Field label="First Name" required error={errors.firstName} style={{ flex: 1 }}>
            <View style={sh.inputRow}>
              <Text style={sh.inputIcon}>👤</Text>
              <TextInput
                style={sh.inputInner}
                value={draft['First Name'] || ''}
                onChangeText={v => setDraft({ ...draft, 'First Name': v })}
                placeholder="John"
                placeholderTextColor={colors.mutedLight}
                autoCapitalize="words"
              />
            </View>
          </Field>
          <Field label="Middle Name" style={{ flex: 1 }}>
            <View style={sh.inputRow}>
              <Text style={sh.inputIcon}>👤</Text>
              <TextInput
                style={sh.inputInner}
                value={draft['Middle Name'] || ''}
                onChangeText={v => setDraft({ ...draft, 'Middle Name': v })}
                placeholder="(optional)"
                placeholderTextColor={colors.mutedLight}
                autoCapitalize="words"
              />
            </View>
          </Field>
        </View>

        {/* Last name + DOB row */}
        <View style={styles.row}>
          <Field label="Last Name" required error={errors.lastName} style={{ flex: 1 }}>
            <View style={sh.inputRow}>
              <Text style={sh.inputIcon}>👤</Text>
              <TextInput
                style={sh.inputInner}
                value={draft['Last Name'] || ''}
                onChangeText={v => setDraft({ ...draft, 'Last Name': v })}
                placeholder="Doe"
                placeholderTextColor={colors.mutedLight}
                autoCapitalize="words"
              />
            </View>
          </Field>

          <Field label="Date of Birth" required error={errors.dob} style={{ flex: 1 }}>
            <SelectorBtn
              value={draft['Date of Birth'] ? displayDate(draft['Date of Birth']) : undefined}
              placeholder="Select date"
              icon="📅"
              error={!!errors.dob}
              onPress={() => setShowDob(true)}
            />
            {showDob && (
              <DateTimePicker
                value={isNaN(dobDate.getTime()) ? cutoff18 : dobDate}
                mode="date"
                display="default"
                maximumDate={cutoff18}
                minimumDate={new Date(1900, 0, 1)}
                onChange={onDateChange}
              />
            )}
          </Field>
        </View>

        {/* Gender */}
        <Field label="Gender" required error={errors.gender}>
          <SelectorBtn
            value={draft['Gender']}
            placeholder="Select Gender"
            icon="⚧"
            error={!!errors.gender}
            onPress={() => setShowGender(true)}
          />
        </Field>

        {/* WhatsApp Number */}
        <Field label="Primary WhatsApp Number" required error={errors.primary}>
          <View style={styles.row}>
            {/* Country code selector */}
            <TouchableOpacity
              style={sh.countryBtn}
              onPress={() => setShowCountry(true)}
              activeOpacity={0.75}
            >
              <Text style={sh.countryFlag}>{selectedCountry?.flag ?? '🌐'}</Text>
              <Text style={sh.countryDial}>{selectedCountry?.dial ?? '+64'}</Text>
              <Text style={sh.chevronSm}>›</Text>
            </TouchableOpacity>

            <View style={[sh.inputRow, { flex: 1 }]}>
              <Text style={sh.inputIcon}>📱</Text>
              <TextInput
                style={sh.inputInner}
                value={draft['Primary WhatsApp Number'] || ''}
                onChangeText={v => setDraft({ ...draft, 'Primary WhatsApp Number': v.replace(/^0+/, '') })}
                placeholder="1234567890"
                placeholderTextColor={colors.mutedLight}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </Field>

        {/* Email */}
        <Field label="Email Address" error={errors.email}>
          <View style={[sh.inputRow, errors.email ? sh.inputRowErr : null]}>
            <Text style={sh.inputIcon}>✉️</Text>
            <TextInput
              style={sh.inputInner}
              value={draft['Email Address'] || ''}
              onChangeText={v => setDraft({ ...draft, 'Email Address': v })}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedLight}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />
          </View>
        </Field>

        {/* Password */}
        <Field label="Create Password" required error={errors.password}>
          <View style={sh.inputRow}>
            <Text style={sh.inputIcon}>🔒</Text>
            <TextInput
              style={sh.inputInner}
              value={draft['Account Password'] || ''}
              onChangeText={v => setDraft({ ...draft, 'Account Password': v })}
              placeholder="Choose a secure password"
              placeholderTextColor={colors.mutedLight}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(p => !p)}
              style={sh.eyeBtn}
              activeOpacity={0.7}
            >
              <Text style={sh.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>
        </Field>

        <Btn label="Save Information" onPress={next} fullWidth style={{ marginTop: spacing.md }} />
      </FormScrollView>

      {/* Gender sheet */}
      <BottomSheet
        visible={showGender}
        title="Select Gender"
        items={GENDERS.map(g => ({ label: g, value: g }))}
        selected={draft['Gender']}
        onSelect={v => setDraft({ ...draft, 'Gender': v })}
        onClose={() => setShowGender(false)}
      />

      {/* Country code sheet */}
      <BottomSheet
        visible={showCountry}
        title="Select Country Code"
        searchable
        items={COUNTRY_CODES.map(c => ({
          label: `${c.flag}  ${c.name}`,
          value: c.dial,
          sub:   c.dial,
        }))}
        selected={draft.primaryDial || '+64'}
        onSelect={v => setDraft({ ...draft, primaryDial: v })}
        onClose={() => setShowCountry(false)}
      />
    </View>
  );
}

// ── Screen styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:     { padding: spacing.xl, paddingBottom: 60, backgroundColor: colors.bgGray },
  title:         { fontSize: typography.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.xs, letterSpacing: -0.3 },
  subtitle:      { fontSize: typography.sm, color: colors.muted, marginBottom: spacing.xl },
  stepBadge:     { backgroundColor: colors.brandLight, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, alignSelf: 'flex-start', marginBottom: spacing.md },
  stepBadgeText: { fontSize: typography.xs, color: colors.brand, fontWeight: '600' },
  row:           { flexDirection: 'row', gap: spacing.md },
});

// ── Shared component styles ───────────────────────────────────────────────────
const sh = StyleSheet.create({
  // Input row
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md,
    backgroundColor: colors.white, paddingHorizontal: spacing.md,
    minHeight: 48, gap: spacing.sm,
  },
  inputRowErr: { borderColor: colors.error },
  inputIcon:   { fontSize: 16, opacity: 0.5 },
  inputInner:  { flex: 1, fontSize: typography.base, color: colors.text, paddingVertical: 11 },
  eyeBtn:      { padding: 4 },
  eyeIcon:     { fontSize: 17 },

  // Selector button
  selectorBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md,
    backgroundColor: colors.white, paddingHorizontal: spacing.md,
    minHeight: 48, gap: spacing.sm,
  },
  selectorBtnErr:  { borderColor: colors.error },
  selectorIcon:    { fontSize: 16, opacity: 0.5 },
  selectorText:    { flex: 1, fontSize: typography.base, color: colors.text },
  selectorPlaceholder: { color: colors.mutedLight },
  chevron:         { fontSize: 21, color: colors.muted, marginTop: -2 },

  // Country button
  countryBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md,
    backgroundColor: colors.white, paddingHorizontal: spacing.sm,
    minHeight: 48, gap: 4, minWidth: 88,
  },
  countryFlag: { fontSize: 21 },
  countryDial: { fontSize: typography.sm, fontWeight: '600', color: colors.text },
  chevronSm:   { fontSize: 17, color: colors.muted },

  // Bottom sheet
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 28,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.lineStrong,
    alignSelf: 'center', marginTop: 12, marginBottom: 2,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg,
  },
  sheetTitle:   { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  closeCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  closeX:      { fontSize: 14, color: colors.textSec, fontWeight: '700' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.xl, marginBottom: spacing.sm,
    borderWidth: 1.5, borderColor: colors.line,
    borderRadius: radius.xl, paddingHorizontal: spacing.md,
    gap: spacing.sm, backgroundColor: colors.bgGray,
  },
  searchIcon:  { fontSize: 14, opacity: 0.45 },
  searchInput: { flex: 1, fontSize: typography.base, color: colors.text, paddingVertical: 10 },
  sep:         { height: 1, backgroundColor: colors.line, marginHorizontal: spacing.xl },

  // Radio row
  radioRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: 16,
  },
  radioLabel:  { fontSize: typography.md, color: colors.text, fontWeight: '400' },
  radioSub:    { fontSize: typography.xs, color: colors.muted, marginTop: 2 },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.lineStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: colors.brand },
  radioInner: {
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: colors.brand,
  },

  // Action buttons
  btnRow: {
    flexDirection: 'row', gap: spacing.md,
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg,
  },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: colors.lineMid,
    borderRadius: radius.full, paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText:  { fontSize: typography.base, fontWeight: '600', color: colors.textSec },
  saveBtn: {
    flex: 1, backgroundColor: colors.brand,
    borderRadius: radius.full, paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: colors.mutedLight },
  saveText:    { fontSize: typography.base, fontWeight: '700', color: '#fff' },
});
