// src/theme.ts — Updated to match Visily design system
export const colors = {
  // Core brand — teal from Visily
  brand:       '#008080',
  brandDark:   '#006666',
  brandLight:  '#e6f4f4',
  brandMid:    '#CCE8E8',

  // Backgrounds
  bg:          '#ffffff',
  bgGray:      '#f8f9fa',
  bgCard:      '#ffffff',
  surface:     '#f0f8f8',

  // Text
  text:        '#1a1a2e',
  textSec:     '#4a5568',
  muted:       '#718096',
  mutedLight:  '#a0aec0',

  // UI
  white:       '#ffffff',
  line:        '#e2e8f0',
  lineMid:     '#cbd5e0',
  shadow:      'rgba(0,128,128,0.12)',

  // Semantic
  error:       '#c53030',
  errorBg:     '#fff5f5',
  errorBorder: '#feb2b2',
  success:     '#276749',
  successBg:   '#f0fff4',
  successBorder:'#9ae6b4',
  warning:     '#c05621',
  warningBg:   '#fffaf0',

  // Emergency red (from design)
  emergency:   '#c53030',
  emergencyBg: '#fff5f5',
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
  sm:   8,
  md:   10,
  lg:   14,
  xl:   18,
  xxl:  24,
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  md: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
  },
  brand: {
    elevation: 4,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
};
