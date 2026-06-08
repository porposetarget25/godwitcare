// src/screens/Account.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Image, ActivityIndicator, Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '../state/auth';
import { updateMe, uploadProfilePhoto, deleteProfilePhoto, API_BASE_URL } from '../api';
import { PageHeader } from '../components/PageHeader';
import { colors, spacing, radius, typography, shadow } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PIN_ENABLED_KEY = 'gc_pin_enabled';
const BIO_ENABLED_KEY = 'gc_bio_enabled';

// ── Photo action sheet ────────────────────────────────────────────────────────
function PhotoSheet({ visible, onClose, onCamera, onGallery, onRemove }: {
  visible: boolean; onClose: () => void;
  onCamera: () => void; onGallery: () => void; onRemove: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={ps.overlay} activeOpacity={1} onPress={onClose} />
      <View style={ps.sheet}>
        <View style={ps.handle} />
        <Text style={ps.title}>Profile Photo</Text>
        {[
          { icon: '📷', label: 'Take Photo',           onPress: onCamera,  danger: false },
          { icon: '🖼️', label: 'Choose from Gallery',  onPress: onGallery, danger: false },
          { icon: '🗑️', label: 'Remove Photo',         onPress: onRemove,  danger: true  },
        ].map((o, i) => (
          <React.Fragment key={o.label}>
            {i > 0 && <View style={ps.sep} />}
            <TouchableOpacity style={ps.option} onPress={() => { onClose(); setTimeout(o.onPress, 300); }} activeOpacity={0.7}>
              <Text style={{ fontSize: 20, width: 32 }}>{o.icon}</Text>
              <Text style={[ps.optLabel, o.danger && ps.optDanger]}>{o.label}</Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
        <TouchableOpacity style={ps.cancelRow} onPress={onClose} activeOpacity={0.7}>
          <Text style={ps.cancelTxt}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Menu row — same style as Home's consultation card rows ────────────────────
function MenuRow({ icon, label, sub, onPress, danger }: {
  icon: string; label: string; sub?: string; onPress?: () => void; danger?: boolean;
}) {
  return (
    <TouchableOpacity style={s.menuRow} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={[s.menuIconWrap, danger && s.menuIconDanger]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.menuLabel, danger && { color: colors.error }]}>{label}</Text>
        {sub ? <Text style={s.menuSub}>{sub}</Text> : null}
      </View>
      {onPress && <Text style={s.menuChevron}>›</Text>}
    </TouchableOpacity>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Account() {
  const { user, logout, refresh } = useAuth();
  const router = useRouter();

  const [editing,    setEditing   ] = useState(false);
  const [firstName,  setFirstName ] = useState('');
  const [lastName,   setLastName  ] = useState('');
  const [email,      setEmail     ] = useState('');
  const [saving,     setSaving    ] = useState(false);

  const [photoB64,      setPhotoB64     ] = useState<string | null>(null);
  const [photoLoading,  setPhotoLoading ] = useState(false);
  const [showPhotoSheet,setShowPhotoSheet] = useState(false);

  const [pinEnabled, setPinEnabled] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);

  useEffect(() => {
    if (!user) { router.replace('/(app)/login'); return; }
    resetFields();
    loadPhoto();
  }, [user]);

  useEffect(() => {
    AsyncStorage.multiGet([PIN_ENABLED_KEY, BIO_ENABLED_KEY]).then(pairs => {
      const m = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
      setPinEnabled(m[PIN_ENABLED_KEY] === 'true');
      setBioEnabled(m[BIO_ENABLED_KEY] === 'true');
    });
  }, []);

  function resetFields() {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName   || '');
    setEmail(user?.email          || '');
  }

  async function loadPhoto() {
    setPhotoLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/me/photo`, { credentials: 'include' });
      if (!res.ok) { setPhotoB64(null); return; }
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => setPhotoB64(reader.result as string);
      reader.onerror   = () => setPhotoB64(null);
      reader.readAsDataURL(blob);
    } catch { setPhotoB64(null); }
    finally  { setPhotoLoading(false); }
  }

  async function save() {
    if (!firstName.trim()) { Alert.alert('Validation', 'First name is required.'); return; }
    setSaving(true);
    try {
      await updateMe({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() || undefined });
      await refresh();
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not update profile.');
    } finally { setSaving(false); }
  }

  function cancelEdit() { resetFields(); setEditing(false); }

  async function pickImage(src: 'camera' | 'gallery') {
    const perm = src === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', `Please allow ${src} access.`); return; }
    const result = src === 'camera'
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1,1], quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      setPhotoLoading(true);
      try {
        await uploadProfilePhoto(result.assets[0].uri, result.assets[0].mimeType || 'image/jpeg');
        await loadPhoto();
      } catch (e: any) {
        Alert.alert('Upload failed', e?.message || 'Could not upload photo.');
        setPhotoLoading(false);
      }
    }
  }

  function confirmRemovePhoto() {
    Alert.alert('Remove Photo', 'Remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await deleteProfilePhoto(); setPhotoB64(null); }
        catch (e: any) { Alert.alert('Error', e?.message); }
      }},
    ]);
  }

  function confirmLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  const initials   = `${(user?.firstName||'?')[0]}${(user?.lastName||'')[0]||''}`.toUpperCase();
  const pinSubtext = pinEnabled ? (bioEnabled ? 'PIN + Fingerprint enabled' : 'PIN enabled') : 'Set up app lock';

  return (
    <View style={{ flex: 1 }}>
      <PageHeader
        title={editing ? 'Edit Profile' : 'My Profile'}
        subtitle={editing ? 'Tap ✓ to save' : 'Account & settings'}
        showBack={editing}
        onBack={cancelEdit}
        right={
          editing ? (
            <TouchableOpacity style={s.iconBtn} onPress={save} disabled={saving} activeOpacity={0.8}>
              {saving ? <ActivityIndicator size="small" color={colors.brandDark} /> : <Text style={s.iconBtnTick}>✓</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.iconBtnOutline} onPress={() => setEditing(true)} activeOpacity={0.7}>
              <Text style={s.iconBtnPencil}>✏️</Text>
            </TouchableOpacity>
          )
        }
      />

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Profile hero — teal card matching Home's travel card header ── */}
        <View style={s.heroCard}>
          <View style={s.heroDecor1} />
          <View style={s.heroDecor2} />

          {/* Avatar */}
          <TouchableOpacity onPress={() => setShowPhotoSheet(true)} activeOpacity={0.85} style={s.avatarWrap}>
            <View style={s.avatarCircle}>
              {photoLoading ? (
                <View style={[StyleSheet.absoluteFill, s.avatarFallback]}>
                  <ActivityIndicator color="#fff" size="large" />
                </View>
              ) : photoB64 ? (
                <Image source={{ uri: photoB64 }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <View style={[StyleSheet.absoluteFill, s.avatarFallback]}>
                  <Text style={s.initials}>{initials}</Text>
                </View>
              )}
            </View>
            <View style={s.cameraBadge}><Text style={{ fontSize: 12 }}>📷</Text></View>
          </TouchableOpacity>

          <Text style={s.heroName}>{user?.firstName} {user?.lastName}</Text>
          <Text style={s.heroSub}>{user?.email || user?.username}</Text>

          {/* Stats pills */}
          <View style={s.heroPills}>
            <View style={s.heroPill}>
              <Text style={s.heroPillIcon}>🌍</Text>
              <Text style={s.heroPillText}>Traveller</Text>
            </View>
            <View style={s.heroPill}>
              <Text style={s.heroPillIcon}>✅</Text>
              <Text style={s.heroPillText}>Verified</Text>
            </View>
          </View>
        </View>

        {/* ── Personal Info ── */}
        <View style={s.card}>
          <Text style={s.sectionHeader}>Personal Information</Text>

          <View style={s.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>First Name *</Text>
              {editing
                ? <TextInput style={s.input} value={firstName} onChangeText={setFirstName}
                    placeholder="First name" placeholderTextColor={colors.mutedLight} autoCapitalize="words" />
                : <Text style={s.fieldValue}>{firstName || '—'}</Text>
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Last Name</Text>
              {editing
                ? <TextInput style={s.input} value={lastName} onChangeText={setLastName}
                    placeholder="Last name" placeholderTextColor={colors.mutedLight} autoCapitalize="words" />
                : <Text style={s.fieldValue}>{lastName || '—'}</Text>
              }
            </View>
          </View>

          <View style={s.fieldFull}>
            <Text style={s.fieldLabel}>Email Address</Text>
            {editing
              ? <TextInput style={s.input} value={email} onChangeText={setEmail}
                  placeholder="you@email.com" placeholderTextColor={colors.mutedLight}
                  keyboardType="email-address" autoCapitalize="none" textContentType="emailAddress" />
              : <Text style={s.fieldValue}>{email || '—'}</Text>
            }
          </View>

          <View style={s.fieldFull}>
            <Text style={s.fieldLabel}>Username / WhatsApp</Text>
            <Text style={[s.fieldValue, { color: colors.muted }]}>{user?.username || '—'}</Text>
          </View>
        </View>

        {/* ── Security ── */}
        <View style={s.card}>
          <Text style={s.sectionHeader}>Security</Text>
          <MenuRow icon="🔒" label="PIN & Biometrics" sub={pinSubtext}
            onPress={() => router.push('/(app)/pin-setup' as any)} />
          <View style={s.rowDivider} />
          <MenuRow icon="🔑" label="Change Password" sub="Update your account password"
            onPress={() => router.push('/(app)/change-password' as any)} />
        </View>

        {/* ── App ── */}
        <View style={s.card}>
          <Text style={s.sectionHeader}>App</Text>
          <MenuRow icon="📋" label="Terms of Use" sub="Our terms and conditions"
            onPress={() => router.push('/(app)/more/terms' as any)} />
          <View style={s.rowDivider} />
          <MenuRow icon="🔐" label="Privacy Policy" sub="How we handle your data"
            onPress={() => router.push('/(app)/more/privacy' as any)} />
          <View style={s.rowDivider} />
          <MenuRow icon="🔔" label="Notifications" sub="Manage notification settings"
            onPress={() => router.push('/(app)/more/notifications' as any)} />
          <View style={s.rowDivider} />
          <MenuRow icon="❓" label="FAQs" sub="Common questions answered"
            onPress={() => router.push('/(app)/more/faqs' as any)} />
        </View>

        {/* ── Danger ── */}
        <View style={s.card}>
          <Text style={s.sectionHeader}>Account</Text>
          <MenuRow icon="🚪" label="Sign Out" sub="Log out of your account" onPress={confirmLogout} danger />
        </View>

        <Text style={s.version}>GodwitCare · v1.0.0</Text>
      </ScrollView>

      <PhotoSheet
        visible={showPhotoSheet}
        onClose={() => setShowPhotoSheet(false)}
        onCamera={() => pickImage('camera')}
        onGallery={() => pickImage('gallery')}
        onRemove={() => { setShowPhotoSheet(false); setTimeout(confirmRemovePhoto, 300); }}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll:  { flex: 1, backgroundColor: colors.bgGray },
  content: { padding: spacing.xl, paddingBottom: 60, gap: spacing.md },

  // Header icon buttons
  iconBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFD580', alignItems: 'center', justifyContent: 'center' },
  iconBtnTick:   { fontSize: 18, fontWeight: '900', color: colors.brandDark },
  iconBtnOutline:{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  iconBtnPencil: { fontSize: 16 },

  // Hero card — matches Home travel card header style
  heroCard: {
    backgroundColor: colors.brand, borderRadius: radius.xl,
    padding: spacing.xl, alignItems: 'center', gap: spacing.sm,
    overflow: 'hidden', position: 'relative', ...shadow.md,
  },
  heroDecor1: { position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroDecor2: { position: 'absolute', bottom: -30, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.06)' },

  // Avatar
  avatarWrap:   { position: 'relative', marginBottom: spacing.xs },
  avatarCircle: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)', overflow: 'hidden', backgroundColor: colors.brandDark },
  avatarFallback:{ alignItems: 'center', justifyContent: 'center' },
  initials:     { fontSize: typography.xxl, fontWeight: '800', color: '#fff' },
  cameraBadge:  { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },

  heroName: { fontSize: typography.xl, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  heroSub:  { fontSize: typography.sm, color: 'rgba(255,255,255,0.7)' },

  // Pills matching Home pill style
  heroPills: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  heroPill:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6 },
  heroPillIcon: { fontSize: 13 },
  heroPillText: { fontSize: typography.xs, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  // Cards
  card: { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...shadow.sm },
  sectionHeader: { fontSize: typography.xs, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.9, paddingTop: spacing.xs, paddingBottom: spacing.md },

  // Fields
  fieldRow:   { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  fieldFull:  { marginBottom: spacing.md },
  fieldLabel: { fontSize: typography.xs, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  fieldValue: { fontSize: typography.base, color: colors.text, paddingVertical: 6 },
  input:      { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: typography.base, color: colors.text, backgroundColor: colors.bgGray },

  // Menu rows
  menuRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  menuIconWrap:  { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.brandLight, alignItems: 'center', justifyContent: 'center' },
  menuIconDanger:{ backgroundColor: colors.errorBg },
  menuLabel:     { fontSize: typography.base, fontWeight: '600', color: colors.text },
  menuSub:       { fontSize: typography.xs, color: colors.muted, marginTop: 2 },
  menuChevron:   { fontSize: 22, color: colors.muted },
  rowDivider:    { height: 1, backgroundColor: colors.line, marginHorizontal: -spacing.lg },

  version: { textAlign: 'center', color: colors.mutedLight, fontSize: typography.xs, marginTop: spacing.sm },
});

// Photo sheet styles
const ps = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:     { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 },
  handle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  title:     { fontSize: typography.md, fontWeight: '700', color: colors.text, textAlign: 'center', paddingVertical: spacing.lg },
  sep:       { height: 1, backgroundColor: colors.line, marginHorizontal: spacing.xl },
  option:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: 16, gap: spacing.md },
  optLabel:  { fontSize: typography.md, color: colors.text, fontWeight: '500' },
  optDanger: { color: colors.error },
  cancelRow: { marginTop: spacing.md, marginHorizontal: spacing.xl, paddingVertical: 14, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center' },
  cancelTxt: { fontSize: typography.base, fontWeight: '600', color: colors.muted },
});
