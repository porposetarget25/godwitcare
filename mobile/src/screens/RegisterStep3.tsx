// src/screens/RegisterStep3.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert,
  TouchableOpacity, Modal, FlatList, TextInput, Platform, Animated,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useReg } from '../state/registration';
import { saveRegistration, uploadDocument, registerAuthUser, login } from '../api'; // used in OtpVerification completion
import { Btn, Field } from '../components/UI';
import { colors, spacing, radius, typography } from '../theme';
import { PageHeader } from '../components/PageHeader';
import { FormScrollView } from '../components/FormScrollView';

type Person = { fullName: string; dateOfBirth: string };
type Errors = Partial<Record<'from'|'to'|'start'|'end'|'package'|'travelers', string>>;

const TODAY = new Date();
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function displayDate(v?: string) {
  if (!v) return '';
  const d = new Date(`${v}T00:00:00`);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' });
}

// ── Date helpers ─────────────────────────────────────────────────────────────
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function sameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function isBefore(a: Date, b: Date) { return a < b && !sameDay(a,b); }
function isAfter(a: Date, b: Date)  { return a > b && !sameDay(a,b); }
function isBetween(d: Date, s: Date, e: Date) { return isAfter(d,s) && isBefore(d,e); }
function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month+1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// ── Calendar widget ───────────────────────────────────────────────────────────
// Mode: 'range' for travel dates, 'single' for DOB
type CalendarProps = {
  visible: boolean;
  mode: 'range' | 'single';
  title: string;
  startDate?: string;      // for range: start; for single: selected
  endDate?: string;        // range only
  minDate?: Date;
  maxDate?: Date;
  onConfirmRange?: (start: string, end: string) => void;
  onConfirmSingle?: (date: string) => void;
  onClose: () => void;
};

function CalendarModal({
  visible, mode, title,
  startDate, endDate, minDate, maxDate,
  onConfirmRange, onConfirmSingle, onClose,
}: CalendarProps) {
  const today = startOfDay(new Date());
  const initDate = startDate ? startOfDay(new Date(`${startDate}T00:00:00`)) : today;
  const [viewYear,  setViewYear ] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [selStart,  setSelStart ] = useState<Date|null>(startDate ? startOfDay(new Date(`${startDate}T00:00:00`)) : null);
  const [selEnd,    setSelEnd   ] = useState<Date|null>(endDate   ? startOfDay(new Date(`${endDate}T00:00:00`))   : null);
  const [phase,     setPhase    ] = useState<'start'|'end'>(selStart ? 'end' : 'start');

  React.useEffect(() => {
    if (visible) {
      const d = startDate ? startOfDay(new Date(`${startDate}T00:00:00`)) : today;
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setSelStart(startDate ? startOfDay(new Date(`${startDate}T00:00:00`)) : null);
      setSelEnd(endDate     ? startOfDay(new Date(`${endDate}T00:00:00`))   : null);
      setPhase(startDate ? 'end' : 'start');
    }
  }, [visible]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); }
    else setViewMonth(m => m-1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); }
    else setViewMonth(m => m+1);
  }

  function isDisabled(d: Date) {
    if (minDate && isBefore(d, startOfDay(minDate))) return true;
    if (maxDate && isAfter(d, startOfDay(maxDate)))  return true;
    return false;
  }

  function onPressDay(d: Date) {
    if (isDisabled(d)) return;
    if (mode === 'single') {
      setSelStart(d);
      return;
    }
    // Range mode
    if (phase === 'start' || (selStart && isBefore(d, selStart))) {
      setSelStart(d); setSelEnd(null); setPhase('end');
    } else {
      if (selStart && sameDay(d, selStart)) { setSelEnd(null); setPhase('start'); return; }
      setSelEnd(d); setPhase('start');
    }
  }

  function confirm() {
    if (mode === 'single') {
      if (selStart) { onConfirmSingle?.(ymd(selStart)); onClose(); }
    } else {
      if (selStart && selEnd) { onConfirmRange?.(ymd(selStart), ymd(selEnd)); onClose(); }
    }
  }

  // Build calendar grid
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const daysInM  = getDaysInMonth(viewYear, viewMonth);
  const cells: (Date|null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInM; i++) cells.push(new Date(viewYear, viewMonth, i));
  while (cells.length % 7 !== 0) cells.push(null);

  const canConfirm = mode === 'single' ? !!selStart : !!(selStart && selEnd);

  // Range display label
  let rangeLabel = '';
  if (mode === 'range') {
    if (selStart && selEnd) {
      const nights = Math.round((selEnd.getTime()-selStart.getTime())/(1000*60*60*24));
      rangeLabel = `${displayDate(ymd(selStart))}  →  ${displayDate(ymd(selEnd))}  (${nights} night${nights!==1?'s':''})`;
    } else if (selStart) {
      rangeLabel = `${displayDate(ymd(selStart))}  →  Select return`;
    } else {
      rangeLabel = 'Select departure date';
    }
  } else {
    rangeLabel = selStart ? displayDate(ymd(selStart)) : 'Select date';
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={cal.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={cal.sheet}>
          <View style={cal.handle} />

          {/* Header */}
          <View style={cal.header}>
            <Text style={cal.headerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={cal.closeCircle} activeOpacity={0.7}>
              <Text style={cal.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Selected range pill */}
          <View style={cal.rangePill}>
            <Text style={cal.rangePillText}>{rangeLabel}</Text>
          </View>

          {/* Month navigator */}
          <View style={cal.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={cal.navBtn} activeOpacity={0.7}>
              <Text style={cal.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={cal.monthLabel}>{MONTHS_FULL[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={cal.navBtn} activeOpacity={0.7}>
              <Text style={cal.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers */}
          <View style={cal.weekRow}>
            {DAYS_SHORT.map(d => (
              <View key={d} style={cal.weekCell}>
                <Text style={cal.weekLabel}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={cal.grid}>
            {cells.map((d, idx) => {
              if (!d) return <View key={`e-${idx}`} style={cal.cell} />;
              const disabled  = isDisabled(d);
              const isStart   = selStart && sameDay(d, selStart);
              const isEnd     = selEnd   && sameDay(d, selEnd);
              const inRange   = selStart && selEnd && isBetween(d, selStart, selEnd);
              const isToday   = sameDay(d, today);
              return (
                <TouchableOpacity
                  key={d.toISOString()}
                  style={[
                    cal.cell,
                    inRange  && cal.cellInRange,
                    isStart  && cal.cellStart,
                    isEnd    && cal.cellEnd,
                  ]}
                  onPress={() => onPressDay(d)}
                  activeOpacity={disabled ? 1 : 0.7}
                  disabled={disabled}
                >
                  <View style={[
                    cal.dayCircle,
                    (isStart || isEnd) && cal.dayCircleSelected,
                  ]}>
                    <Text style={[
                      cal.dayText,
                      disabled && cal.dayDisabled,
                      isToday  && !isStart && !isEnd && cal.dayToday,
                      (isStart || isEnd) && cal.daySelectedText,
                    ]}>
                      {d.getDate()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Buttons */}
          <View style={cal.btnRow}>
            <TouchableOpacity style={cal.clearBtn} onPress={() => { setSelStart(null); setSelEnd(null); setPhase('start'); }} activeOpacity={0.75}>
              <Text style={cal.clearText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[cal.confirmBtn, !canConfirm && cal.confirmBtnDisabled]}
              onPress={confirm}
              activeOpacity={0.8}
            >
              <Text style={cal.confirmText}>{mode === 'range' ? 'Select Dates' : 'Confirm'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────
const COUNTRIES = [
  { name: 'Afghanistan', flag: '🇦🇫' }, { name: 'Albania', flag: '🇦🇱' },
  { name: 'Algeria', flag: '🇩🇿' }, { name: 'Argentina', flag: '🇦🇷' },
  { name: 'Australia', flag: '🇦🇺' }, { name: 'Austria', flag: '🇦🇹' },
  { name: 'Bangladesh', flag: '🇧🇩' }, { name: 'Belgium', flag: '🇧🇪' },
  { name: 'Brazil', flag: '🇧🇷' }, { name: 'Canada', flag: '🇨🇦' },
  { name: 'Chile', flag: '🇨🇱' }, { name: 'China', flag: '🇨🇳' },
  { name: 'Colombia', flag: '🇨🇴' }, { name: 'Croatia', flag: '🇭🇷' },
  { name: 'Czech Republic', flag: '🇨🇿' }, { name: 'Denmark', flag: '🇩🇰' },
  { name: 'Egypt', flag: '🇪🇬' }, { name: 'Ethiopia', flag: '🇪🇹' },
  { name: 'Finland', flag: '🇫🇮' }, { name: 'France', flag: '🇫🇷' },
  { name: 'Germany', flag: '🇩🇪' }, { name: 'Ghana', flag: '🇬🇭' },
  { name: 'Greece', flag: '🇬🇷' }, { name: 'Hungary', flag: '🇭🇺' },
  { name: 'India', flag: '🇮🇳' }, { name: 'Indonesia', flag: '🇮🇩' },
  { name: 'Ireland', flag: '🇮🇪' }, { name: 'Israel', flag: '🇮🇱' },
  { name: 'Italy', flag: '🇮🇹' }, { name: 'Japan', flag: '🇯🇵' },
  { name: 'Jordan', flag: '🇯🇴' }, { name: 'Kenya', flag: '🇰🇪' },
  { name: 'Malaysia', flag: '🇲🇾' }, { name: 'Mexico', flag: '🇲🇽' },
  { name: 'Morocco', flag: '🇲🇦' }, { name: 'Netherlands', flag: '🇳🇱' },
  { name: 'New Zealand', flag: '🇳🇿' }, { name: 'Nigeria', flag: '🇳🇬' },
  { name: 'Norway', flag: '🇳🇴' }, { name: 'Pakistan', flag: '🇵🇰' },
  { name: 'Philippines', flag: '🇵🇭' }, { name: 'Poland', flag: '🇵🇱' },
  { name: 'Portugal', flag: '🇵🇹' }, { name: 'Romania', flag: '🇷🇴' },
  { name: 'Russia', flag: '🇷🇺' }, { name: 'Saudi Arabia', flag: '🇸🇦' },
  { name: 'Singapore', flag: '🇸🇬' }, { name: 'South Africa', flag: '🇿🇦' },
  { name: 'South Korea', flag: '🇰🇷' }, { name: 'Spain', flag: '🇪🇸' },
  { name: 'Sri Lanka', flag: '🇱🇰' }, { name: 'Sweden', flag: '🇸🇪' },
  { name: 'Switzerland', flag: '🇨🇭' }, { name: 'Thailand', flag: '🇹🇭' },
  { name: 'Turkey', flag: '🇹🇷' }, { name: 'UAE', flag: '🇦🇪' },
  { name: 'Uganda', flag: '🇺🇬' }, { name: 'Ukraine', flag: '🇺🇦' },
  { name: 'United Kingdom', flag: '🇬🇧' }, { name: 'United States', flag: '🇺🇸' },
  { name: 'Vietnam', flag: '🇻🇳' }, { name: 'Zimbabwe', flag: '🇿🇼' },
].sort((a, b) => a.name.localeCompare(b.name));

const EU_DESTINATIONS = [
  { name: 'London, UK', flag: '🇬🇧' }, { name: 'Manchester, UK', flag: '🇬🇧' },
  { name: 'Birmingham, UK', flag: '🇬🇧' }, { name: 'Edinburgh, UK', flag: '🇬🇧' },
  { name: 'Glasgow, UK', flag: '🇬🇧' }, { name: 'Dublin, Ireland', flag: '🇮🇪' },
  { name: 'Paris, France', flag: '🇫🇷' }, { name: 'Lyon, France', flag: '🇫🇷' },
  { name: 'Marseille, France', flag: '🇫🇷' }, { name: 'Berlin, Germany', flag: '🇩🇪' },
  { name: 'Munich, Germany', flag: '🇩🇪' }, { name: 'Frankfurt, Germany', flag: '🇩🇪' },
  { name: 'Hamburg, Germany', flag: '🇩🇪' }, { name: 'Amsterdam, Netherlands', flag: '🇳🇱' },
  { name: 'Brussels, Belgium', flag: '🇧🇪' }, { name: 'Rome, Italy', flag: '🇮🇹' },
  { name: 'Milan, Italy', flag: '🇮🇹' }, { name: 'Venice, Italy', flag: '🇮🇹' },
  { name: 'Madrid, Spain', flag: '🇪🇸' }, { name: 'Barcelona, Spain', flag: '🇪🇸' },
  { name: 'Lisbon, Portugal', flag: '🇵🇹' }, { name: 'Porto, Portugal', flag: '🇵🇹' },
  { name: 'Zurich, Switzerland', flag: '🇨🇭' }, { name: 'Geneva, Switzerland', flag: '🇨🇭' },
  { name: 'Vienna, Austria', flag: '🇦🇹' }, { name: 'Prague, Czech Republic', flag: '🇨🇿' },
  { name: 'Warsaw, Poland', flag: '🇵🇱' }, { name: 'Budapest, Hungary', flag: '🇭🇺' },
  { name: 'Stockholm, Sweden', flag: '🇸🇪' }, { name: 'Oslo, Norway', flag: '🇳🇴' },
  { name: 'Copenhagen, Denmark', flag: '🇩🇰' }, { name: 'Helsinki, Finland', flag: '🇫🇮' },
  { name: 'Athens, Greece', flag: '🇬🇷' }, { name: 'Zurich, Switzerland', flag: '🇨🇭' },
  { name: 'Bucharest, Romania', flag: '🇷🇴' }, { name: 'Zagreb, Croatia', flag: '🇭🇷' },
].sort((a, b) => a.name.localeCompare(b.name));

// ── Selector button ───────────────────────────────────────────────────────────
function SelectorBtn({ value, placeholder, onPress, error, icon }: {
  value?: string; placeholder: string; onPress: () => void; error?: boolean; icon?: string;
}) {
  return (
    <TouchableOpacity style={[sh.selectorBtn, error && sh.selectorBtnErr]} onPress={onPress} activeOpacity={0.75}>
      {icon ? <Text style={sh.selectorIcon}>{icon}</Text> : null}
      <Text style={[sh.selectorText, !value && sh.placeholder]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <Text style={sh.chevron}>›</Text>
    </TouchableOpacity>
  );
}

// ── Search picker sheet ───────────────────────────────────────────────────────
function SearchSheet({ visible, title, items, selected, onSelect, onClose }: {
  visible: boolean; title: string;
  items: { name: string; flag: string }[];
  selected?: string; onSelect: (v: string) => void; onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const filtered = q
    ? items.filter(i => i.name.toLowerCase().includes(q.toLowerCase()))
    : items;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sh.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={sh.sheet}>
          <View style={sh.handle} />
          <View style={sh.sheetHeader}>
            <Text style={sh.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={sh.closeCircle} activeOpacity={0.7}>
              <Text style={sh.closeX}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={sh.searchWrap}>
            <Text style={{ fontSize: 14, opacity: 0.45 }}>🔍</Text>
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
          <FlatList
            data={filtered}
            keyExtractor={i => i.name}
            style={{ maxHeight: 340 }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={sh.sep} />}
            renderItem={({ item }) => {
              const active = item.name === selected;
              return (
                <TouchableOpacity
                  style={[sh.radioRow, active && { backgroundColor: colors.brandLight }]}
                  onPress={() => { onSelect(item.name); onClose(); setQ(''); }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 21, marginRight: spacing.md }}>{item.flag}</Text>
                  <Text style={[sh.radioLabel, active && { color: colors.brand, fontWeight: '700' }]}>{item.name}</Text>
                  {active && <Text style={{ color: colors.brand, fontWeight: '700', marginLeft: 'auto' }}>✓</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ── DOB field — native DateTimePicker with min/max validation ────────────────
function DateField({ label, value, onChange, minDate, maxDate, required, error }: {
  label: string; value: string; onChange: (v: string) => void;
  minDate?: Date; maxDate?: Date; required?: boolean; error?: string;
}) {
  const [show, setShow] = useState(false);
  const parsed = value ? new Date(`${value}T00:00:00`) : (maxDate ?? TODAY);

  return (
    <Field label={label} required={required} error={error}>
      <SelectorBtn
        value={value ? displayDate(value) : undefined}
        placeholder="Select date"
        icon="📅"
        error={!!error}
        onPress={() => setShow(true)}
      />
      {show && (
        <DateTimePicker
          value={isNaN(parsed.getTime()) ? (maxDate ?? TODAY) : parsed}
          mode="date"
          display="default"
          minimumDate={minDate}
          maximumDate={maxDate}
          onChange={(_, d) => {
            setShow(Platform.OS === 'ios');
            if (d) onChange(ymd(d));
          }}
        />
      )}
    </Field>
  );
}

// ── Traveler card with date picker ────────────────────────────────────────────
const adultMaxDob  = (() => { const d = new Date(); d.setFullYear(d.getFullYear()-18); return d; })();
const childMaxDob  = new Date();          // children: DOB cannot be in future
const childMinDob  = (() => { const d = new Date(); d.setFullYear(d.getFullYear()-17); d.setDate(d.getDate()-364); return d; })(); // up to 17y 364d

function TravelerCard({ person, idx, type, onUpdate, onRemove }: {
  person: Person; idx: number; type: 'Adult' | 'Child';
  onUpdate: (p: Person) => void; onRemove: () => void;
}) {
  const isAdult = type === 'Adult';
  // Adult: max DOB = 18 years ago (must be ≥18), no min
  // Child: DOB between (today - 18 years) and today (0–17 years)
  const minDob = isAdult ? undefined   : childMinDob;
  const maxDob = isAdult ? adultMaxDob : childMaxDob;
  const dobHint = isAdult ? 'Must be 18 or older' : 'Age 0 – 17 years';

  return (
    <View style={styles.travCard}>
      <View style={styles.travCardHeader}>
        <View>
          <Text style={styles.travCardTitle}>{type} {idx + 1}</Text>
          <Text style={styles.travCardHint}>{dobHint}</Text>
        </View>
        <TouchableOpacity onPress={onRemove} style={sh.removeBtn} activeOpacity={0.7}>
          <Text style={sh.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
      <Field label="Full Name">
        <View style={sh.inputRow}>
          <Text style={sh.inputIcon}>👤</Text>
          <TextInput
            style={sh.inputInner}
            value={person.fullName}
            onChangeText={v => onUpdate({ ...person, fullName: v })}
            placeholder="Enter full name"
            placeholderTextColor={colors.mutedLight}
            autoCapitalize="words"
          />
        </View>
      </Field>
      <DateField
        label="Date of Birth"
        value={person.dateOfBirth}
        onChange={v => onUpdate({ ...person, dateOfBirth: v })}
        minDate={minDob}
        maxDate={maxDob}
        required={false}
      />
    </View>
  );
}

// ── Document picker sheet ─────────────────────────────────────────────────────
function DocPickerSheet({ visible, onClose, onPick }: {
  visible: boolean; onClose: () => void;
  onPick: (f: { uri: string; name: string; type: string }) => void;
}) {
  async function fromCamera() {
    onClose();
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission required', 'Camera access is needed.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      onPick({ uri: a.uri, name: `photo_${Date.now()}.jpg`, type: 'image/jpeg' });
    }
  }

  async function fromGallery() {
    onClose();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission required', 'Gallery access is needed.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      onPick({ uri: a.uri, name: `photo_${Date.now()}.jpg`, type: 'image/jpeg' });
    }
  }

  async function fromFiles() {
    onClose();
    const result = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png', 'application/pdf'] });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      onPick({ uri: a.uri, name: a.name, type: a.mimeType || 'application/octet-stream' });
    }
  }

  const OPTIONS = [
    { icon: '📷', label: 'Take a Photo',        sub: 'Use your camera',          onPress: fromCamera  },
    { icon: '🖼️', label: 'Choose from Gallery',  sub: 'Pick an existing image',   onPress: fromGallery },
    { icon: '📄', label: 'Browse Files',          sub: 'JPG, PNG or PDF',          onPress: fromFiles   },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sh.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={sh.sheet}>
          <View style={sh.handle} />
          <View style={sh.sheetHeader}>
            <Text style={sh.sheetTitle}>Upload Document</Text>
            <TouchableOpacity onPress={onClose} style={sh.closeCircle} activeOpacity={0.7}>
              <Text style={sh.closeX}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={sh.sheetSub}>Select your boarding pass or e-ticket</Text>

          {OPTIONS.map(opt => (
            <TouchableOpacity key={opt.label} style={sh.docOption} onPress={opt.onPress} activeOpacity={0.7}>
              <View style={sh.docIconWrap}>
                <Text style={{ fontSize: 23 }}>{opt.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sh.docLabel}>{opt.label}</Text>
                <Text style={sh.docSub}>{opt.sub}</Text>
              </View>
              <Text style={{ color: colors.muted, fontSize: 19 }}>›</Text>
            </TouchableOpacity>
          ))}
          <View style={{ height: spacing.lg }} />
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function Step3() {
  const { draft, setDraft, clearDraft } = useReg();
  const router = useRouter();

  const [adults,      setAdults    ] = useState<Person[]>([]);
  const [children,    setChildren  ] = useState<Person[]>([]);
  const [file,        setFile      ] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [errors,      setErrors    ] = useState<Errors>({});
  const [submitting,  setSubmitting ] = useState(false);
  const [showFrom,    setShowFrom  ] = useState(false);
  const [showTo,      setShowTo    ] = useState(false);
  const [showDocPick, setShowDocPick] = useState(false);
  const [showDateRange, setShowDateRange] = useState(false);

  const from  = (draft['Travelling From'] ?? '').trim();
  const to    = (draft['Travelling To (UK & Europe)'] ?? '').trim();
  const start = draft['Travel Start Date'] ?? '';
  const end   = draft['Travel End Date'] ?? '';
  const pkg   = draft['Package Days'];

  function validate(): boolean {
    const next: Errors = {};
    if (!from)  next.from    = 'Required';
    if (!to)    next.to      = 'Required';
    if (!start) next.start   = 'Required';
    if (!end)   next.end     = 'Required';
    if (!pkg)   next.package = 'Please select a package';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit() {
    if (!validate()) return;
    // Save traveler data into draft before navigating to OTP
    const travelers = [...adults, ...children].filter(t => t.fullName.trim() && t.dateOfBirth);
    setDraft({ ...draft, travelers, _pendingFile: file ? JSON.stringify({ uri: file.uri, name: file.name, type: file.type }) : null } as any);
    // OTP verification happens FIRST — registration completes after OTP confirmed
    router.push('/otp-verification' as any);
  }

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Trip Details" subtitle="Step 3 of 3" showBack />
      <FormScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <View style={styles.heroCard}>
          <View style={styles.heroDecor1} />
          <View style={styles.heroDecor2} />
          <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>Step 3 of 3</Text></View>
          <Text style={styles.title}>Trip Details</Text>
          <Text style={styles.subtitle}>Tell us about your trip so we can be ready to help.</Text>
        </View>

        {/* From / To */}
        <View style={styles.row}>
          <Field label="Travelling From" required error={errors.from} style={{ flex: 1 }}>
            <SelectorBtn value={from} placeholder="Select country" icon="🌍" error={!!errors.from} onPress={() => setShowFrom(true)} />
          </Field>
          <Field label="Destination (UK & Europe)" required error={errors.to} style={{ flex: 1 }}>
            <SelectorBtn value={to} placeholder="Select city" icon="📍" error={!!errors.to} onPress={() => setShowTo(true)} />
          </Field>
        </View>

        {/* Travel Date Range — airline-style calendar */}
        <Field label="Travel Dates" required error={errors.start || errors.end}>
          <TouchableOpacity
            style={[sh.selectorBtn, (errors.start || errors.end) ? sh.selectorBtnErr : null]}
            onPress={() => setShowDateRange(true)}
            activeOpacity={0.75}
          >
            <Text style={sh.selectorIcon}>✈️</Text>
            {start && end ? (
              <View style={{ flex: 1 }}>
                <Text style={sh.selectorText}>
                  {displayDate(start)}  →  {displayDate(end)}
                </Text>
                <Text style={{ fontSize: typography.xs, color: colors.muted, marginTop: 1 }}>
                  {Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000)} nights
                </Text>
              </View>
            ) : (
              <Text style={[sh.selectorText, sh.placeholder]}>Select travel period</Text>
            )}
            <Text style={sh.chevron}>›</Text>
          </TouchableOpacity>
        </Field>

        {/* Adults */}
        <View style={styles.travHeader}>
          <Text style={styles.subhead}>Adults</Text>
          <TouchableOpacity
            style={[styles.addBtn, adults.length + children.length >= 6 && styles.addBtnDisabled]}
            onPress={() => { if (adults.length + children.length < 6) setAdults(a => [...a, { fullName: '', dateOfBirth: '' }]); }}
            activeOpacity={0.75}
          >
            <Text style={styles.addBtnText}>+ Add Adult</Text>
          </TouchableOpacity>
        </View>
        {adults.map((a, i) => (
          <TravelerCard key={`a-${i}`} person={a} idx={i} type="Adult"
            onUpdate={p => setAdults(list => list.map((r, idx) => idx === i ? p : r))}
            onRemove={() => setAdults(list => list.filter((_, idx) => idx !== i))} />
        ))}

        {/* Children */}
        <View style={styles.travHeader}>
          <Text style={styles.subhead}>Children</Text>
          <TouchableOpacity
            style={[styles.addBtn, adults.length + children.length >= 6 && styles.addBtnDisabled]}
            onPress={() => { if (adults.length + children.length < 6) setChildren(c => [...c, { fullName: '', dateOfBirth: '' }]); }}
            activeOpacity={0.75}
          >
            <Text style={styles.addBtnText}>+ Add Child</Text>
          </TouchableOpacity>
        </View>
        {children.map((c, i) => (
          <TravelerCard key={`c-${i}`} person={c} idx={i} type="Child"
            onUpdate={p => setChildren(list => list.map((r, idx) => idx === i ? p : r))}
            onRemove={() => setChildren(list => list.filter((_, idx) => idx !== i))} />
        ))}

        <Text style={styles.travCount}>Total Travelers: {adults.length + children.length} / 6</Text>

        {/* Document */}
        <Field label="Boarding Pass / E-Ticket (optional)">
          <TouchableOpacity style={sh.docBtn} onPress={() => setShowDocPick(true)} activeOpacity={0.75}>
            <View style={sh.docBtnIcon}>
              <Text style={{ fontSize: 21 }}>☁️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={sh.docBtnLabel}>{file ? file.name : 'Upload Document'}</Text>
              <Text style={sh.docBtnSub}>{file ? 'Tap to replace' : 'Tap to upload or take a picture'}</Text>
            </View>
            {file && <Text style={{ color: colors.brand, fontSize: 14, fontWeight: '600' }}>✓</Text>}
          </TouchableOpacity>
          <Text style={styles.formatNote}>JPG, PNG, PDF formats supported</Text>
        </Field>

        {/* Package */}
        <Field label="Select a Package" required error={errors.package}>
          <View style={styles.packageRow}>
            {[7, 14, 30].map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.pkgBtn, pkg === p && styles.pkgBtnActive]}
                onPress={() => setDraft({ ...draft, 'Package Days': p })}
                activeOpacity={0.75}
              >
                <Text style={[styles.pkgBtnText, pkg === p && styles.pkgBtnTextActive]}>{p}</Text>
                <Text style={[styles.pkgBtnSub, pkg === p && styles.pkgBtnSubActive]}>Days</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <TouchableOpacity
          style={[styles.saveBtn, submitting && { opacity: 0.7 }]}
          onPress={submit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>Verify & Complete</Text>
        </TouchableOpacity>
      </FormScrollView>

      {/* Sheets */}
      <SearchSheet visible={showFrom} title="Travelling From" items={COUNTRIES}
        selected={from} onSelect={v => setDraft({ ...draft, 'Travelling From': v })} onClose={() => setShowFrom(false)} />

      <SearchSheet visible={showTo} title="Destination (UK & Europe)" items={EU_DESTINATIONS}
        selected={to} onSelect={v => setDraft({ ...draft, 'Travelling To (UK & Europe)': v })} onClose={() => setShowTo(false)} />

      <DocPickerSheet visible={showDocPick} onClose={() => setShowDocPick(false)} onPick={f => setFile(f)} />

      <CalendarModal
        visible={showDateRange}
        mode="range"
        title="Select Travel Dates"
        startDate={start}
        endDate={end}
        minDate={TODAY}
        onConfirmRange={(s, e) => setDraft({ ...draft, 'Travel Start Date': s, 'Travel End Date': e })}
        onClose={() => setShowDateRange(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:       { padding: spacing.xl, paddingBottom: 60, backgroundColor: colors.bgGray, gap: spacing.md },
  // Hero card matching Step2
  heroCard:        { backgroundColor: colors.brand, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.sm, overflow: 'hidden', position: 'relative', elevation: 4, shadowColor: colors.brand, shadowOffset: { width:0, height:3 }, shadowOpacity: 0.25, shadowRadius: 8 },
  heroDecor1:      { position: 'absolute', top: -40, right: -40, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroDecor2:      { position: 'absolute', bottom: -25, left: -20, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.06)' },
  stepBadge:       { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.full, alignSelf: 'flex-start' },
  stepBadgeText:   { fontSize: typography.xs, color: 'rgba(255,255,255,0.9)', fontWeight: '700', letterSpacing: 0.5 },
  title:           { fontSize: typography.xl, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  subtitle:        { fontSize: typography.sm, color: 'rgba(255,255,255,0.75)', lineHeight: 20 },
  row:             { flexDirection: 'row', gap: spacing.md },
  travHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm },
  subhead:         { fontSize: typography.md, fontWeight: '700', color: colors.text },
  addBtn:          { backgroundColor: colors.brandLight, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full },
  addBtnDisabled:  { backgroundColor: colors.line },
  addBtnText:      { fontSize: typography.sm, color: colors.brand, fontWeight: '600' },
  travCard:        { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, marginBottom: spacing.md },
  travCardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  travCardTitle:   { fontSize: typography.base, fontWeight: '700', color: colors.text },
  travCardHint:    { fontSize: typography.xs, color: colors.muted, marginTop: 1 },
  travCount:       { color: colors.muted, fontSize: typography.sm, marginBottom: spacing.md },
  formatNote:      { color: colors.muted, fontSize: typography.xs, marginTop: spacing.xs },
  saveBtn: { backgroundColor: colors.amber, borderRadius: radius.full, paddingVertical: 15, alignItems: 'center', elevation: 4, shadowColor: colors.brand, shadowOffset: { width:0, height:3 }, shadowOpacity: 0.25, shadowRadius: 8 },
  saveBtnText: { fontSize: typography.md, fontWeight: '800', color: colors.brandDark },
  packageRow:      { flexDirection: 'row', gap: spacing.md },
  pkgBtn:          { flex: 1, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center', backgroundColor: colors.white },
  pkgBtnActive:    { borderColor: colors.brand, backgroundColor: colors.brand },
  pkgBtnText:      { fontSize: typography.lg, fontWeight: '700', color: colors.textSec },
  pkgBtnTextActive:{ color: colors.white },
  pkgBtnSub:       { fontSize: typography.xs, color: colors.muted },
  pkgBtnSubActive: { color: 'rgba(255,255,255,0.8)' },
});

const sh = StyleSheet.create({
  selectorBtn:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.white, paddingHorizontal: spacing.md, minHeight: 48, gap: spacing.sm },
  selectorBtnErr:  { borderColor: colors.error },
  selectorIcon:    { fontSize: 16, opacity: 0.5 },
  selectorText:    { flex: 1, fontSize: typography.base, color: colors.text },
  placeholder:     { color: colors.mutedLight },
  chevron:         { fontSize: 21, color: colors.muted, marginTop: -2 },
  inputRow:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.white, paddingHorizontal: spacing.md, minHeight: 48, gap: spacing.sm },
  inputIcon:       { fontSize: 16, opacity: 0.5 },
  inputInner:      { flex: 1, fontSize: typography.base, color: colors.text, paddingVertical: 11 },
  removeBtn:       { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1, borderColor: colors.errorBorder, backgroundColor: colors.errorBg },
  removeText:      { fontSize: typography.xs, color: colors.error, fontWeight: '600' },
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:           { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 28 },
  handle:          { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, alignSelf: 'center', marginTop: 12, marginBottom: 2 },
  sheetHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg },
  sheetTitle:      { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  sheetSub:        { fontSize: typography.sm, color: colors.muted, paddingHorizontal: spacing.xl, marginBottom: spacing.md, marginTop: -spacing.sm },
  closeCircle:     { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  closeX:          { fontSize: 14, color: colors.textSec, fontWeight: '700' },
  searchWrap:      { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.xl, marginBottom: spacing.sm, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.xl, paddingHorizontal: spacing.md, gap: spacing.sm, backgroundColor: colors.bgGray },
  searchInput:     { flex: 1, fontSize: typography.base, color: colors.text, paddingVertical: 10 },
  sep:             { height: 1, backgroundColor: colors.line, marginHorizontal: spacing.xl },
  radioRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: 14 },
  radioLabel:      { fontSize: typography.base, color: colors.text, fontWeight: '400', flex: 1 },
  docBtn:          { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.white, padding: spacing.md, gap: spacing.md },
  docBtnIcon:      { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.brandLight, alignItems: 'center', justifyContent: 'center' },
  docBtnLabel:     { fontSize: typography.base, fontWeight: '600', color: colors.text },
  docBtnSub:       { fontSize: typography.xs, color: colors.muted, marginTop: 2 },
  docOption:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: 14, gap: spacing.md },
  docIconWrap:     { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.brandLight, alignItems: 'center', justifyContent: 'center' },
  docLabel:        { fontSize: typography.base, fontWeight: '600', color: colors.text },
  docSub:          { fontSize: typography.xs, color: colors.muted, marginTop: 2 },
});

// ── Calendar styles ───────────────────────────────────────────────────────────
const cal = StyleSheet.create({
  overlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:            { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 28 },
  handle:           { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, alignSelf: 'center', marginTop: 12, marginBottom: 2 },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerTitle:      { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  closeCircle:      { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  closeX:           { fontSize: 14, color: colors.textSec, fontWeight: '700' },
  rangePill:        { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.brandLight, borderRadius: radius.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  rangePillText:    { fontSize: typography.sm, color: colors.brand, fontWeight: '600', textAlign: 'center' },
  monthNav:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  navBtn:           { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgGray, alignItems: 'center', justifyContent: 'center' },
  navArrow:         { fontSize: 23, color: colors.text, lineHeight: 26 },
  monthLabel:       { fontSize: typography.md, fontWeight: '700', color: colors.text },
  weekRow:          { flexDirection: 'row', paddingHorizontal: spacing.md, marginBottom: spacing.xs },
  weekCell:         { flex: 1, alignItems: 'center', paddingVertical: 4 },
  weekLabel:        { fontSize: typography.xs, fontWeight: '600', color: colors.muted },
  grid:             { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md },
  cell:             { width: `${100/7}%`, alignItems: 'center', paddingVertical: 2 },
  cellInRange:      { backgroundColor: colors.brandLight },
  cellStart:        { backgroundColor: colors.brand, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
  cellEnd:          { backgroundColor: colors.brand, borderTopRightRadius: 20, borderBottomRightRadius: 20 },
  dayCircle:        { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayCircleSelected:{ backgroundColor: colors.brand },
  dayText:          { fontSize: typography.sm, color: colors.text, fontWeight: '500' },
  dayDisabled:      { color: colors.lineMid },
  dayToday:         { color: colors.brand, fontWeight: '700' },
  daySelectedText:  { color: colors.white, fontWeight: '700' },
  btnRow:           { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  clearBtn:         { flex: 1, borderWidth: 1.5, borderColor: colors.lineMid, borderRadius: radius.full, paddingVertical: 14, alignItems: 'center' },
  clearText:        { fontSize: typography.base, fontWeight: '600', color: colors.textSec },
  confirmBtn:       { flex: 2, backgroundColor: colors.brand, borderRadius: radius.full, paddingVertical: 14, alignItems: 'center' },
  confirmBtnDisabled:{ backgroundColor: colors.mutedLight },
  confirmText:      { fontSize: typography.base, fontWeight: '700', color: '#fff' },
});
