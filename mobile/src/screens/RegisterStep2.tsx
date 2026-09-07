// src/screens/RegisterStep2.tsx — Travel Health Declaration
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useReg } from '../state/registration';
import { colors, spacing, radius, typography, shadow } from '../theme';
import { PageHeader } from '../components/PageHeader';

const QUESTIONS = [
  {
    key: 'Are you on any long-term/regular medication that we should be aware of?',
    label: 'Are you on any long-term/regular medication that we should be aware of?',
    icon: '💊',
  },
  {
    key: 'Do you have any health condition that can affect your trip?',
    label: 'Do you have any health condition that can affect your trip?',
    icon: '🩺',
  },
  {
    key: 'Do you have any allergies that can affect your trip?',
    label: 'Do you have any allergies that can affect your trip?',
    icon: '⚠️',
  },
  {
    key: 'Have you been advised to produce a fit-to-fly certificate?',
    label: 'Have you been advised to produce a fit-to-fly certificate?',
    icon: '✈️',
  },
];

function YesNoToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={s.toggleRow}>
      <TouchableOpacity
        style={[s.toggleBtn, value === true && s.toggleBtnYes]}
        onPress={() => onChange(true)}
        activeOpacity={0.75}
      >
        <Text style={[s.toggleBtnText, value === true && s.toggleBtnTextActive]}>Yes</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.toggleBtn, value === false && s.toggleBtnNo]}
        onPress={() => onChange(false)}
        activeOpacity={0.75}
      >
        <Text style={[s.toggleBtnText, value === false && s.toggleBtnTextWhite]}>No</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function Step2() {
  const { draft, setDraft } = useReg();
  const router = useRouter();

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Travel Health Declaration" subtitle="Step 2 of 3" showBack />
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

        {/* Header card */}
        <View style={s.heroCard}>
          <View style={s.heroDecor1} />
          <View style={s.heroDecor2} />
          <View style={s.stepBadge}><Text style={s.stepBadgeText}>Step 2 of 3</Text></View>
          <Text style={s.heroTitle}>Health Declaration</Text>
          <Text style={s.heroSub}>
            Please share any information about you or anyone travelling with you that may help us support your travel and well-being.
          </Text>
        </View>

        {/* Question cards */}
        {QUESTIONS.map((q, i) => {
          const val = draft[q.key];
          const answered = val === true || val === false;
          return (
            <View key={q.key} style={[s.card, answered && s.cardAnswered]}>
              <View style={s.cardHeader}>
                <View style={[s.qIconWrap, answered && s.qIconWrapAnswered]}>
                  <Text style={{ fontSize: 19 }}>{q.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.qNum}>Question {i + 1}</Text>
                  <Text style={s.qLabel}>{q.label}</Text>
                </View>
                {answered && (
                  <View style={[s.answerBadge, val ? s.answerYes : s.answerNo]}>
                    <Text style={[s.answerBadgeText, val ? s.answerYesText : s.answerNoText]}>
                      {val ? 'Yes' : 'No'}
                    </Text>
                  </View>
                )}
              </View>
              <YesNoToggle
                value={!!val}
                onChange={(v) => setDraft({ ...draft, [q.key]: v })}
              />
            </View>
          );
        })}

        {/* Save button */}
        <TouchableOpacity style={s.saveBtn} onPress={() => router.push('/(app)/register/step3')} activeOpacity={0.85}>
          <Text style={s.saveBtnText}>Save Information</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: 60, backgroundColor: colors.bgGray, gap: spacing.md },

  // Hero card
  heroCard: {
    backgroundColor: colors.brand, borderRadius: radius.xl,
    padding: spacing.xl, gap: spacing.sm,
    overflow: 'hidden', position: 'relative', ...shadow.md,
  },
  heroDecor1: { position: 'absolute', top: -40, right: -40, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroDecor2: { position: 'absolute', bottom: -25, left: -20, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.06)' },
  stepBadge:     { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.full, alignSelf: 'flex-start' },
  stepBadgeText: { fontSize: typography.xs, color: 'rgba(255,255,255,0.9)', fontWeight: '700', letterSpacing: 0.5 },
  heroTitle: { fontSize: typography.xl, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  heroSub:   { fontSize: typography.sm, color: 'rgba(255,255,255,0.75)', lineHeight: 20 },

  // Question card
  card: {
    backgroundColor: colors.white, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.line,
    padding: spacing.lg, gap: spacing.md, ...shadow.sm,
  },
  cardAnswered: { borderColor: colors.brand + '40' },
  cardHeader:   { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  qIconWrap:    { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.brandLight, alignItems: 'center', justifyContent: 'center' },
  qIconWrapAnswered: { backgroundColor: colors.brand + '20' },
  qNum:         { fontSize: typography.xs, color: colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  qLabel:       { fontSize: typography.base, fontWeight: '600', color: colors.text, lineHeight: 22 },

  // Answer badge
  answerBadge:     { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full, alignSelf: 'flex-start' },
  answerYes:       { backgroundColor: colors.warningBg },
  answerNo:        { backgroundColor: colors.successBg },
  answerBadgeText: { fontSize: typography.xs, fontWeight: '700' },
  answerYesText:   { color: colors.warning },
  answerNoText:    { color: colors.success },

  // Yes/No toggle — matches app button style
  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  toggleBtn: {
    flex: 1, paddingVertical: 11, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.bgGray,
  },
  toggleBtnYes:       { backgroundColor: colors.amber, borderColor: colors.amber },
  toggleBtnNo:        { backgroundColor: colors.brand, borderColor: colors.brand },
  toggleBtnText:      { fontSize: typography.base, fontWeight: '600', color: colors.muted },
  toggleBtnTextActive:{ color: colors.brandDark },
  toggleBtnTextWhite: { color: '#fff' },

  // Save button
  saveBtn: {
    backgroundColor: colors.amber, borderRadius: radius.full,
    paddingVertical: 15, alignItems: 'center', marginTop: spacing.sm,
    ...shadow.brand,
  },
  saveBtnText: { fontSize: typography.md, fontWeight: '800', color: colors.brandDark },
});
