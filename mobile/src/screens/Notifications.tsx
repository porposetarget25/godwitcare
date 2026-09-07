// src/screens/Notifications.tsx — mirrors web's .portal card styling.
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ws, wc } from '../webStyle';
import { PageHeader } from '../components/PageHeader';

export default function Notifications() {
  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Notifications" subtitle="Recent alerts" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>Notifications</Text>
          <Text style={styles.emptyBody}>
            You're all caught up! Appointment reminders, consultation updates, and alerts will appear here.
          </Text>
        </View>

        <View style={[ws.card, styles.placeholder]}>
          <Text style={{ fontSize: 19 }}>✅</Text>
          <Text style={styles.placeholderText}>No new notifications</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14 },
  emptyWrap: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  emptyIcon: { fontSize: 45 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: wc.textPrimary },
  emptyBody: { fontSize: 14, color: wc.textMuted, textAlign: 'center', lineHeight: 19, paddingHorizontal: 12 },
  placeholder: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  placeholderText: { fontSize: 14, color: wc.textMuted, fontWeight: '500' },
});
