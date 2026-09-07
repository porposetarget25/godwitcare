// src/screens/DoctorSettings.tsx — mirrors web's .portal card/field styling.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../state/auth';
import { updateMe, logout } from '../api';
import { ws, wc } from '../webStyle';
import { PageHeader } from '../components/PageHeader';
import { FormScrollView } from '../components/FormScrollView';

const POLICIES: { label: string; value: string }[] = [
  { label: 'Consultation duration', value: '10 minutes' },
  { label: 'Documentation buffer', value: '5 minutes' },
  { label: 'Total slot length', value: '15 minutes' },
  { label: 'Cancellation / reschedule cutoff', value: 'Up to 48 hours after booking' },
  { label: 'Maximum advance booking', value: '2 days' },
  { label: 'Clinic hours', value: '09:00 – 17:00' },
  { label: 'Timezone', value: 'Europe/London' },
];

export default function DoctorSettings() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setEmail(user?.email || '');
  }, [user]);

  async function save() {
    if (!firstName.trim()) { Alert.alert('Validation', 'First name is required.'); return; }
    setSaving(true);
    try {
      await updateMe({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() || undefined });
      await refresh();
      Alert.alert('Saved', 'Profile updated.');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  }

  function confirmLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(app)/doctor/login' as any); } },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      <PageHeader
        title="Settings"
        showBack={false}
        right={
          <TouchableOpacity style={ws.bp} onPress={save} disabled={saving} activeOpacity={0.8}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={ws.bpText}>Save</Text>}
          </TouchableOpacity>
        }
      />
      <FormScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

        <View style={ws.card}>
          <Text style={ws.ct}>Profile</Text>
          <View style={ws.g2Row}>
            <View style={ws.g2Col}>
              <Text style={ws.fl2}>First Name</Text>
              <TextInput style={ws.input} value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
            </View>
            <View style={ws.g2Col}>
              <Text style={ws.fl2}>Last Name</Text>
              <TextInput style={ws.input} value={lastName} onChangeText={setLastName} autoCapitalize="words" />
            </View>
          </View>
          <Text style={ws.fl2}>Email</Text>
          <TextInput style={ws.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Text style={[ws.fl2, { marginTop: 10 }]}>WhatsApp Number</Text>
          <Text style={s.fieldValue}>{user?.username || '—'}</Text>
        </View>

        <View style={ws.card}>
          <Text style={ws.ct}>Account</Text>
          <TouchableOpacity style={s.menuRow} onPress={() => router.push('/(app)/change-password' as any)} activeOpacity={0.7}>
            <Text style={s.menuLabel}>Change Password</Text>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
          <View style={s.rowDivider} />
          <TouchableOpacity style={s.menuRow} onPress={confirmLogout} activeOpacity={0.7}>
            <Text style={[s.menuLabel, { color: wc.textDanger }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={ws.card}>
          <View style={s.policyHeader}>
            <Text style={ws.ct}>Clinic Booking Policies</Text>
            <View style={[ws.tag, ws.tmute]}><Text style={[ws.tagText, ws.tmuteText]}>🔒 Clinic admin managed</Text></View>
          </View>
          {POLICIES.map(p => (
            <View key={p.label} style={ws.dr}>
              <Text style={ws.dk}>{p.label}</Text>
              <Text style={ws.dv}>{p.value}</Text>
            </View>
          ))}
          <Text style={s.policyHint}>These settings are clinic-wide. Contact an admin to request a change.</Text>
        </View>
      </FormScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },

  fieldValue: { fontSize: 14, color: wc.textMuted, paddingVertical: 6 },

  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11 },
  menuLabel: { fontSize: 14, fontWeight: '500', color: wc.textPrimary },
  chevron: { fontSize: 19, color: wc.textMuted },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: wc.border },

  policyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  policyHint: { fontSize: 12, color: wc.textMuted, marginTop: 8, fontStyle: 'italic' },
});
