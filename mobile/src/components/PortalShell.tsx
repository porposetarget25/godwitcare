// src/components/PortalShell.tsx — mobile equivalent of web's PatientShell/DoctorShell
// (PortalShell + off-canvas .sb drawer from portal.css, at the ≤860px breakpoint web always uses on a phone).
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Image, Easing, Alert, Dimensions,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth, isDoctorUser } from '../state/auth';
import { logout as apiLogout } from '../api';
import { wc } from '../webStyle';

const BRAND_LOGO = require('../../assets/logo-horizontal.png');
const BRAND_LOGO_ASPECT = 1159 / 248; // logo-horizontal.png intrinsic size (width/height)
const SCREEN_WIDTH = Dimensions.get('window').width;

function BrandMark({ height, maxWidth }: { height: number; maxWidth?: number }) {
  // aspectRatio (not a manually computed width) so the image can never be stretched.
  return (
    <Image
      source={BRAND_LOGO}
      style={{ height, aspectRatio: BRAND_LOGO_ASPECT, maxWidth }}
      resizeMode="contain"
    />
  );
}

// Lets a screen's <PageHeader showBack> merge into the persistent PortalShell
// topbar (single row: back + title + actions) instead of stacking a second
// bar below it. Root screens (showBack={false}) don't register here, so the
// topbar keeps showing the hamburger + brand logo as usual.
export type PortalHeaderState = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
} | null;

const PortalHeaderContext = createContext<{ setHeader: (h: PortalHeaderState) => void }>({
  setHeader: () => {},
});

export function usePortalHeader() {
  return useContext(PortalHeaderContext).setHeader;
}

type NavItem = { id: string; label: string; icon: string; to: string; badge?: number };
type NavSection = { label: string; items: NavItem[] };

const PATIENT_NAV_SECTIONS: NavSection[] = [
  {
    label: 'Main',
    items: [
      { id: 'home', label: 'Home', icon: '🏠', to: '/(app)/home' },
      { id: 'tracker', label: 'Consultations', icon: '🩺', to: '/(app)/consultation/tracker' },
      { id: 'carehistory', label: 'Care History', icon: '📜', to: '/(app)/care-history' },
      { id: 'documents', label: 'Documents', icon: '🗂️', to: '/(app)/documents' },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'profile', label: 'Profile', icon: '👤', to: '/(app)/account' },
      { id: 'paymenthistory', label: 'Payment History', icon: '🧾', to: '/(app)/payment-history' },
    ],
  },
];

const DOCTOR_NAV_SECTIONS: NavSection[] = [
  {
    label: 'Main',
    items: [
      { id: 'dashboard', label: "Today's Schedule", icon: '🌅', to: '/(app)/doctor/dashboard' },
      { id: 'calendar', label: 'My Calendar', icon: '🗓️', to: '/(app)/doctor/calendar' },
      { id: 'consultations', label: 'Consultations', icon: '📋', to: '/(app)/doctor/consultations' },
    ],
  },
  {
    label: 'Availability',
    items: [
      { id: 'availability', label: 'Availability Setup', icon: '✅', to: '/(app)/doctor/availability' },
      { id: 'leave', label: 'Leave & Exceptions', icon: '🚫', to: '/(app)/doctor/leave' },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'settings', label: 'Settings', icon: '⚙️', to: '/(app)/doctor/settings' },
    ],
  },
];

const DRAWER_WIDTH = 264;

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [header, setHeader] = useState<PortalHeaderState>(null);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, { toValue: open ? 0 : -DRAWER_WIDTH, useNativeDriver: true, friction: 10, tension: 65 }),
      Animated.timing(overlayOpacity, { toValue: open ? 1 : 0, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [open]);

  // Drawer scale and per-item stagger are both derived from translateX so opening it
  // feels like one continuous motion (slide + pop + cascading items) instead of a flat slide.
  const drawerScale = translateX.interpolate({ inputRange: [-DRAWER_WIDTH, 0], outputRange: [0.94, 1] });

  // The screen behind the drawer hinges back in 3D from its left edge (perspective + rotateY
  // pivoted at x=0, via the shift-rotate-unshift trick since RN has no transform-origin) — it
  // reads as the page folding away into the distance on the left, not just a flat dim/scale.
  const contentRotateY = translateX.interpolate({ inputRange: [-DRAWER_WIDTH, 0], outputRange: ['0deg', '-10deg'] });
  const contentScale = translateX.interpolate({ inputRange: [-DRAWER_WIDTH, 0], outputRange: [1, 0.86] });
  const contentTransform = [
    { perspective: 1000 },
    { translateX: -SCREEN_WIDTH / 2 },
    { rotateY: contentRotateY },
    { translateX: SCREEN_WIDTH / 2 },
    { scale: contentScale },
  ];
  function itemEntrance(index: number) {
    const start = -DRAWER_WIDTH * (1 - Math.min(index * 0.12 + 0.001, 0.85));
    return {
      opacity: translateX.interpolate({ inputRange: [-DRAWER_WIDTH, start, 0], outputRange: [0, 0, 1], extrapolate: 'clamp' as const }),
      transform: [{
        translateY: translateX.interpolate({ inputRange: [-DRAWER_WIDTH, start, 0], outputRange: [10, 10, 0], extrapolate: 'clamp' as const }),
      }],
    };
  }

  // Close the drawer whenever the route changes (mirrors web's route-change effect).
  useEffect(() => { setOpen(false); }, [pathname]);

  if (loading || !user) return <>{children}</>;

  const doctor = isDoctorUser(user);
  const navSections = doctor ? DOCTOR_NAV_SECTIONS : PATIENT_NAV_SECTIONS;
  const roleLabel = doctor ? 'Doctor' : 'Primary Member';
  const profileHref = doctor ? '/(app)/doctor/settings' : '/(app)/account';
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Account';

  function isActive(item: NavItem) {
    const routePath = item.to.replace('/(app)', '');
    return pathname === routePath || pathname.startsWith(routePath + '/');
  }

  function navigate(to: string) {
    setOpen(false);
    router.push(to as any);
  }

  function confirmLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        setOpen(false);
        await apiLogout();
        await refresh();
        router.replace('/(app)/login' as any);
      }},
    ]);
  }

  function handleBack() {
    if (header?.onBack) header.onBack();
    else router.back();
  }

  return (
    <PortalHeaderContext.Provider value={{ setHeader }}>
      <View style={{ flex: 1, backgroundColor: wc.surface0 }}>
        {/* ── Persistent topbar: hamburger+logo on root screens, back+title+actions on screens with a PageHeader ── */}
        <View style={s.topbar}>
          <TouchableOpacity onPress={header ? handleBack : () => setOpen(true)} style={s.menuBtn} activeOpacity={0.7}>
            <Text style={s.menuBtnIcon}>{header ? '‹' : '☰'}</Text>
          </TouchableOpacity>
          {header ? (
            <View style={s.topbarTitleWrap}>
              <Text style={s.topbarTitle} numberOfLines={1}>{header.title}</Text>
              {header.subtitle ? <Text style={s.topbarSubtitle} numberOfLines={1}>{header.subtitle}</Text> : null}
            </View>
          ) : (
            <BrandMark height={32} maxWidth={180} />
          )}
          <View style={s.topbarRight}>{header?.right}</View>
        </View>

        <Animated.View style={{ flex: 1, transform: contentTransform }}>{children}</Animated.View>

        {/* ── Overlay + drawer ── */}
        {open && (
          <Animated.View style={[s.overlay, { opacity: overlayOpacity }]} pointerEvents={open ? 'auto' : 'none'}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setOpen(false)} />
          </Animated.View>
        )}
        <Animated.View style={[s.drawer, { transform: [{ translateX }, { scale: drawerScale }] }]} pointerEvents={open ? 'auto' : 'none'}>
          <View style={s.drawerLogo}>
            <BrandMark height={44} maxWidth={215} />
          </View>

          <View style={{ flex: 1 }}>
            {(() => { let flatIndex = 0; return navSections.map(section => (
              <React.Fragment key={section.label}>
                <Text style={s.sectionLabel}>{section.label}</Text>
                {section.items.map(item => {
                  const active = isActive(item);
                  const entrance = itemEntrance(flatIndex++);
                  return (
                    <Animated.View key={item.id} style={entrance}>
                      <TouchableOpacity
                        style={[s.item, active && s.itemOn]}
                        onPress={() => navigate(item.to)}
                        activeOpacity={0.7}
                      >
                        <Text style={s.itemIcon}>{item.icon}</Text>
                        <Text style={[s.itemLabel, active && s.itemLabelOn]}>{item.label}</Text>
                        {!!item.badge && (
                          <View style={s.badge}><Text style={s.badgeText}>{item.badge}</Text></View>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </React.Fragment>
            )); })()}
          </View>

          <View style={s.drawerFoot}>
            <TouchableOpacity style={s.profRow} onPress={() => navigate(profileHref)} activeOpacity={0.7}>
              <View style={s.ava}><Text style={s.avaText}>{initialsOf(fullName)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.profName} numberOfLines={1}>{fullName}</Text>
                <Text style={s.profRole}>{roleLabel}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={s.logoutBtn} onPress={confirmLogout} activeOpacity={0.75}>
              <Text style={s.logoutBtnText}>⏻ Log out</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </PortalHeaderContext.Provider>
  );
}

const s = StyleSheet.create({
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: wc.surface2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: wc.border,
  },
  menuBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  menuBtnIcon: { fontSize: 23, color: wc.textPrimary },
  topbarTitleWrap: { flex: 1, minWidth: 0, paddingHorizontal: 8 },
  topbarTitle: { fontSize: 16, fontWeight: '600', color: wc.textPrimary },
  topbarSubtitle: { fontSize: 12, color: wc.textMuted, marginTop: 1 },
  topbarRight: { minWidth: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 40 },

  drawer: {
    position: 'absolute', top: 0, bottom: 0, left: 0, width: DRAWER_WIDTH,
    backgroundColor: wc.surface2, zIndex: 50, flexDirection: 'column',
    shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.22, shadowRadius: 20, elevation: 24,
  },
  drawerLogo: {
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16,
    backgroundColor: wc.bgAccent, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: wc.border,
  },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: wc.textMuted, letterSpacing: 0.7, textTransform: 'uppercase', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 13, marginHorizontal: 10, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12 },
  itemOn: { backgroundColor: wc.bgAccent },
  itemIcon: { fontSize: 19, width: 24, textAlign: 'center' },
  itemLabel: { fontSize: 14, fontWeight: '500', color: wc.textSecondary, flex: 1 },
  itemLabelOn: { color: wc.textAccent, fontWeight: '700' },
  badge: { backgroundColor: wc.fillAccent, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },

  drawerFoot: { marginTop: 'auto', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: wc.border, paddingTop: 4 },
  profRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 18, paddingVertical: 14 },
  ava: { width: 40, height: 40, borderRadius: 20, backgroundColor: wc.bgAccent, alignItems: 'center', justifyContent: 'center' },
  avaText: { fontSize: 16, fontWeight: '700', color: wc.textAccent },
  profName: { fontSize: 15, fontWeight: '600', color: wc.textPrimary },
  profRole: { fontSize: 13, color: wc.textMuted, marginTop: 1 },
  logoutBtn: { marginHorizontal: 16, marginBottom: 14, paddingVertical: 10, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: wc.borderStrong, alignItems: 'center' },
  logoutBtnText: { fontSize: 14, color: wc.textSecondary, fontWeight: '600' },
});
