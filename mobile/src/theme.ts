// src/theme.ts — Aligned with the GodwitCare doctor-portal web design system
export const colors = {
  // Core brand — teal derived from the GodwitCare logo
  brand:       '#0C6E7E',
  brandDark:   '#074450',
  brandLight:  '#E4F1F2',
  brandMid:    '#C7E4E7',

  // Amber accent (secondary brand color, used sparingly for highlights)
  amber:       '#EBA545',
  amberDark:   '#C17F1F',

  // Backgrounds / surfaces
  bg:          '#ffffff',
  bgGray:      '#F6F8F8',
  bgCard:      '#ffffff',
  surface:     '#EEF2F2',

  // Text
  text:        '#132326',
  textSec:     '#48595D',
  muted:       '#829296',
  mutedLight:  '#AAB6B9',

  // UI / borders
  white:       '#ffffff',
  line:        '#E3E8E9',
  lineMid:     '#D3DADC',
  lineStrong:  '#B5C1C4',
  shadow:      'rgba(12,110,126,0.10)',

  // Semantic — accent (info)
  accentBg:    '#E4F1F2',
  accentBorder:'#8FC7CE',
  accentText:  '#0A5A67',

  // Semantic — success
  success:       '#1C7A3F',
  successBg:     '#E8F6EC',
  successBorder: '#8FD6A6',

  // Semantic — warning
  warning:       '#B3730C',
  warningBg:     '#FDF1DE',
  warningBorder: '#F0C987',

  // Semantic — error / danger
  error:       '#C43D2C',
  errorBg:     '#FCEAE8',
  errorBorder: '#EFACA1',

  // Emergency red (alias of danger, kept for existing call sites)
  emergency:   '#C43D2C',
  emergencyBg: '#FCEAE8',
};

export const spacing = {
  xxs: 2,
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl:32,
  huge:48,
};

export const radius = {
  xs:   4,
  sm:   6,
  md:   8,
  lg:   10,
  xl:   12,
  xxl:  16,
  full: 999,
};

export const typography = {
  xxs:  10,
  xs:   11,
  sm:   13,
  base: 14,
  md:   16,
  lg:   18,
  xl:   22,
  xxl:  26,
  xxxl: 32,
};

export const shadow = {
  sm: {
    elevation: 1,
    shadowColor: '#0e2a2f',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  md: {
    elevation: 2,
    shadowColor: '#0e2a2f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  brand: {
    elevation: 2,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
};
