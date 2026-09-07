// src/webStyle.ts — RN style objects that mirror frontend/src/styles/portal.css class-for-class.
// Goal: mobile screens should look identical to the web .portal design system, not a "native reinterpretation" of it.
import { StyleSheet } from 'react-native';

export const wc = {
  brandTeal: '#0C6E7E',
  brandTealDark: '#074450',
  brandAmber: '#EBA545',
  brandAmberDark: '#C17F1F',

  surface0: '#F6F8F8',
  surface1: '#EEF2F2',
  surface2: '#ffffff',

  border: '#E3E8E9',
  borderStrong: '#D3DADC',
  borderStronger: '#B5C1C4',

  textPrimary: '#132326',
  textSecondary: '#48595D',
  textMuted: '#829296',

  fillAccent: '#0C6E7E',
  bgAccent: '#E4F1F2',
  borderAccent: '#8FC7CE',
  textAccent: '#0A5A67',

  bgSuccess: '#E8F6EC',
  borderSuccess: '#8FD6A6',
  textSuccess: '#1C7A3F',

  bgWarning: '#fdf1de',
  borderWarning: '#f0c987',
  textWarning: '#b3730c',

  bgDanger: '#FCEAE8',
  borderDanger: '#EFACA1',
  textDanger: '#C43D2C',
  fillDanger: '#C43D2C',
};

export const ws = StyleSheet.create({
  // ── Page head (.page-head / .page-title / .page-sub) ──────────────────────
  pageHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 2, flexWrap: 'wrap' },
  pageHeadActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pageTitle: { fontSize: 20, fontWeight: '600', color: wc.textPrimary, marginBottom: 2 },
  pageSub: { fontSize: 14, color: wc.textMuted, marginBottom: 16 },

  // ── Card (.card / .ct) ──────────────────────────────────────────────────────
  card: { backgroundColor: wc.surface2, borderWidth: StyleSheet.hairlineWidth, borderColor: wc.borderStrong, borderRadius: 8, padding: 14, marginBottom: 11 },
  ct: { fontSize: 14, fontWeight: '500', color: wc.textPrimary, marginBottom: 9 },

  // ── Buttons (.bp / .bs / .bg / .bd) ─────────────────────────────────────────
  bp: { backgroundColor: wc.fillAccent, borderRadius: 6, paddingHorizontal: 15, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  bpText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  bs: { backgroundColor: wc.surface1, borderWidth: StyleSheet.hairlineWidth, borderColor: wc.borderStrong, borderRadius: 6, paddingHorizontal: 15, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  bsText: { color: wc.textPrimary, fontSize: 14, fontWeight: '500' },
  bg: { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: wc.borderStrong, borderRadius: 5, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  bgText: { color: wc.textSecondary, fontSize: 13, fontWeight: '500' },
  bd: { backgroundColor: wc.bgDanger, borderWidth: StyleSheet.hairlineWidth, borderColor: wc.borderDanger, borderRadius: 6, paddingHorizontal: 15, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  bdText: { color: wc.textDanger, fontSize: 14, fontWeight: '500' },
  btnDisabled: { opacity: 0.45 },
  btnBlock: { width: '100%' },

  // ── Tags (.tag .tok/.twarn/.tinfo/.tmute/.tdanger) ──────────────────────────
  tag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 12, fontWeight: '500' },
  tok: { backgroundColor: wc.bgSuccess },
  tokText: { color: wc.textSuccess },
  twarn: { backgroundColor: wc.bgWarning },
  twarnText: { color: wc.textWarning },
  tinfo: { backgroundColor: wc.bgAccent },
  tinfoText: { color: wc.textAccent },
  tmute: { backgroundColor: wc.surface1, borderWidth: StyleSheet.hairlineWidth, borderColor: wc.borderStrong },
  tmuteText: { color: wc.textMuted },
  tdanger: { backgroundColor: wc.bgDanger },
  tdangerText: { color: wc.textDanger },

  // ── Notices (.notice .n-info/.n-warn/.n-danger) ─────────────────────────────
  notice: { borderRadius: 8, padding: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  noticeText: { fontSize: 14, flex: 1, lineHeight: 18 },
  nInfo: { backgroundColor: wc.bgAccent, borderWidth: StyleSheet.hairlineWidth, borderColor: wc.borderAccent },
  nInfoText: { color: wc.textAccent },
  nWarn: { backgroundColor: wc.bgWarning, borderWidth: StyleSheet.hairlineWidth, borderColor: wc.borderWarning },
  nWarnText: { color: wc.textWarning },
  nDanger: { backgroundColor: wc.fillDanger },
  nDangerText: { color: '#fff' },

  // ── Fields (.fi / .fl2 / input) ──────────────────────────────────────────────
  fi: { flexDirection: 'column', gap: 4, marginBottom: 10 },
  fl2: { fontSize: 12, fontWeight: '500', color: wc.textSecondary },
  input: { backgroundColor: wc.surface2, borderWidth: 1, borderColor: wc.borderStrong, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: wc.textPrimary },
  inputFocused: { borderColor: wc.fillAccent },
  inputDisabled: { backgroundColor: wc.surface1, color: wc.textMuted, borderColor: wc.border },
  fiHint: { fontSize: 12, color: wc.textMuted },

  // ── Grids (.g2 / .g3) ─────────────────────────────────────────────────────
  g2Row: { flexDirection: 'row', gap: 14 },
  g2Col: { flex: 1 },

  // ── Detail rows (.dr / .dk / .dv) ────────────────────────────────────────
  dr: { flexDirection: 'row', paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: wc.border, gap: 8 },
  dk: { fontSize: 13, color: wc.textMuted, minWidth: 130, flexShrink: 0 },
  dv: { fontSize: 13, fontWeight: '500', color: wc.textPrimary, flex: 1 },

  // ── Modal (.modal-box / .modal-head / .modal-body / .modal-foot) ───────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: wc.surface2, borderRadius: 14, width: '100%', maxWidth: 460 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: wc.border },
  modalTitle: { fontSize: 16, fontWeight: '600', color: wc.textPrimary },
  modalClose: { fontSize: 21, color: wc.textMuted },
  modalBody: { paddingHorizontal: 20, paddingVertical: 18 },
  modalFoot: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: wc.border, backgroundColor: wc.surface1 },

  // ── Avatar (.ava) ─────────────────────────────────────────────────────────
  ava: { width: 30, height: 30, borderRadius: 15, backgroundColor: wc.bgAccent, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avaText: { fontSize: 13, fontWeight: '600', color: wc.textAccent },
});

// ── Screen container matching .portal .body (max-width 960, 20px padding) ────
export const bodyPadding = 20;
