// src/screens/DoctorLogin.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { login } from '../api';
import { useAuth } from '../state/auth';
import { Btn, Card, Field, Input, ErrorBanner } from '../components/UI';
import { colors, spacing, typography, radius, shadow } from '../theme';
import { PageHeader } from '../components/PageHeader';

export default function DoctorLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { refresh } = useAuth();

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      await refresh();
      router.replace('/(app)/doctor/dashboard' as any);
    } catch {
      setError('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
    <PageHeader title="Doctor Login" showBack={false} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Card>
        <Text style={styles.title}>Doctor Login</Text>
        {error && <ErrorBanner message={error} />}
        <Field label="Email">
          <Input value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        </Field>
        <Field label="Password">
          <Input value={password} onChangeText={setPassword} secureTextEntry />
        </Field>
        <Btn label={loading ? 'Logging in…' : 'Login'} onPress={submit} loading={loading} fullWidth />
      </Card>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingTop: 60, backgroundColor: colors.bgGray, flexGrow: 1 },
  title: { fontSize: typography.xxl, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
});
