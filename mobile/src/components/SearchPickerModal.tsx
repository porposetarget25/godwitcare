// src/components/SearchPickerModal.tsx — full-screen searchable list picker.
//
// Replaces the old bottom-sheet pickers: a sheet anchored to the bottom of the screen is
// completely covered by the iOS keyboard the moment the search field focuses, which made the
// list unreachable. Here the search bar sits at the TOP and the list fills the remaining
// height, so the keyboard only ever eats space the list can give up.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, SectionList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography } from '../theme';

export type PickerOption = {
  value: string;      // canonical value stored on the draft
  label: string;      // primary line (e.g. "London")
  sub?: string;       // secondary line (e.g. "United Kingdom")
  flag?: string;      // leading emoji
  keywords?: string;  // extra search terms
};

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: PickerOption[];
  selected?: string;
  searchPlaceholder?: string;
  /** Values surfaced as one-tap chips above the list while the search box is empty. */
  popular?: string[];
  onSelect: (value: string) => void;
  onClose: () => void;
};

type Section = { title: string; data: PickerOption[] };

function haystack(o: PickerOption) {
  return `${o.label} ${o.sub ?? ''} ${o.keywords ?? ''}`.toLowerCase();
}

// Prefix matches on the label rank above matches buried mid-string.
function rank(o: PickerOption, needle: string) {
  const label = o.label.toLowerCase();
  if (label.startsWith(needle)) return 0;
  if (label.includes(needle)) return 1;
  return 2;
}

export function SearchPickerModal({
  visible, title, subtitle, options, selected,
  searchPlaceholder = 'Search…', popular = [], onSelect, onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Reset the query each time the picker opens so it never reopens pre-filtered.
  useEffect(() => { if (!visible) setQ(''); }, [visible]);

  const sections: Section[] = useMemo(() => {
    const needle = q.trim().toLowerCase();

    if (needle) {
      const hits = options
        .filter(o => haystack(o).includes(needle))
        .sort((a, b) => rank(a, needle) - rank(b, needle) || a.label.localeCompare(b.label));
      if (!hits.length) return [];
      return [{ title: `${hits.length} result${hits.length === 1 ? '' : 's'}`, data: hits }];
    }

    // No query — group alphabetically so a long list stays scannable.
    const buckets = new Map<string, PickerOption[]>();
    for (const o of options) {
      const key = (o.label[0] || '#').toUpperCase();
      const list = buckets.get(key);
      if (list) list.push(o);
      else buckets.set(key, [o]);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([letter, data]) => ({ title: letter, data }));
  }, [options, q]);

  const popularOptions = useMemo(
    () => popular
      .map(v => options.find(o => o.value === v))
      .filter((o): o is PickerOption => !!o),
    [popular, options],
  );

  function choose(value: string) {
    onSelect(value);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[s.screen, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.title} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeCircle} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.closeX}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Search — top-anchored, never autofocused: the list is usable straight away and the
            keyboard only appears once the user actually wants to type. */}
        <TouchableOpacity
          style={s.searchWrap}
          activeOpacity={1}
          onPress={() => inputRef.current?.focus()}
        >
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={s.searchInput}
            value={q}
            onChangeText={setQ}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.mutedLight}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="never"
          />
          {q.length > 0 && (
            <TouchableOpacity onPress={() => setQ('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <View style={s.clearCircle}><Text style={s.clearX}>✕</Text></View>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <SectionList
            sections={sections}
            keyExtractor={item => item.value}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled
            initialNumToRender={20}
            ListHeaderComponent={
              !q && popularOptions.length ? (
                <View style={s.popularWrap}>
                  <Text style={s.popularTitle}>Popular</Text>
                  <View style={s.chipRow}>
                    {popularOptions.map(o => {
                      const active = o.value === selected;
                      return (
                        <TouchableOpacity
                          key={o.value}
                          style={[s.chip, active && s.chipActive]}
                          onPress={() => choose(o.value)}
                          activeOpacity={0.75}
                        >
                          {o.flag ? <Text style={s.chipFlag}>{o.flag}</Text> : null}
                          <Text style={[s.chipText, active && s.chipTextActive]}>{o.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyIcon}>🔎</Text>
                <Text style={s.emptyTitle}>No matches</Text>
                <Text style={s.emptySub}>Nothing found for “{q.trim()}”. Try a different spelling.</Text>
              </View>
            }
            renderSectionHeader={({ section }) => (
              <View style={s.sectionHeader}>
                <Text style={s.sectionHeaderText}>{section.title}</Text>
              </View>
            )}
            renderItem={({ item }) => {
              const active = item.value === selected;
              return (
                <TouchableOpacity
                  style={[s.row, active && s.rowActive]}
                  onPress={() => choose(item.value)}
                  activeOpacity={0.7}
                >
                  {item.flag ? <Text style={s.rowFlag}>{item.flag}</Text> : null}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.rowLabel, active && s.rowLabelActive]} numberOfLines={1}>{item.label}</Text>
                    {item.sub ? <Text style={s.rowSub} numberOfLines={1}>{item.sub}</Text> : null}
                  </View>
                  <View style={[s.check, active && s.checkActive]}>
                    {active && <Text style={s.checkMark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  title:    { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: typography.xs, color: colors.muted, marginTop: 2 },
  closeCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  closeX: { fontSize: 14, color: colors.textSec, fontWeight: '700' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.xl, marginBottom: spacing.md,
    borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.full,
    paddingHorizontal: spacing.lg, backgroundColor: colors.bgGray,
  },
  searchIcon:  { fontSize: 14, opacity: 0.45 },
  searchInput: { flex: 1, fontSize: typography.md, color: colors.text, paddingVertical: 12 },
  clearCircle: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: colors.lineStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  clearX: { fontSize: 10, color: colors.white, fontWeight: '700' },

  // Popular quick-picks
  popularWrap:  { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  popularTitle: {
    fontSize: typography.xs, fontWeight: '700', color: colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.line,
    backgroundColor: colors.bgGray,
  },
  chipActive:     { borderColor: colors.brand, backgroundColor: colors.brandLight },
  chipFlag:       { fontSize: 15 },
  chipText:       { fontSize: typography.sm, fontWeight: '600', color: colors.textSec },
  chipTextActive: { color: colors.brand },

  // Alphabet / result-count headers
  sectionHeader: {
    backgroundColor: colors.bgGray,
    paddingHorizontal: spacing.xl, paddingVertical: 6,
  },
  sectionHeaderText: {
    fontSize: typography.xs, fontWeight: '700', color: colors.muted, letterSpacing: 0.6,
  },

  // Result rows — 56pt tall, comfortably tappable
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.xl, paddingVertical: 14, minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line,
  },
  rowActive:      { backgroundColor: colors.brandLight },
  rowFlag:        { fontSize: 24 },
  rowLabel:       { fontSize: typography.md, color: colors.text, fontWeight: '500' },
  rowLabelActive: { color: colors.brand, fontWeight: '700' },
  rowSub:         { fontSize: typography.xs, color: colors.muted, marginTop: 2 },
  check: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  checkActive: { borderColor: colors.brand, backgroundColor: colors.brand },
  checkMark:   { fontSize: 12, color: colors.white, fontWeight: '800' },

  // Empty state
  empty:      { alignItems: 'center', paddingHorizontal: spacing.xxxl, paddingTop: spacing.huge, gap: spacing.xs },
  emptyIcon:  { fontSize: 34, marginBottom: spacing.sm },
  emptyTitle: { fontSize: typography.md, fontWeight: '700', color: colors.text },
  emptySub:   { fontSize: typography.sm, color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
