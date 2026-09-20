// src/lib/phone.ts — shared dial-code list and normalization logic for any screen that
// collects a WhatsApp number (registration, login, account settings), so they all construct
// the exact same canonical "+<dial><digits>" format the backend stores as the username.
import type { PickerOption } from '../components/SearchPickerModal';

export const COUNTRY_CODES = [
  { name: 'Australia',      flag: '🇦🇺', dial: '+61'  },
  { name: 'Canada',         flag: '🇨🇦', dial: '+1'   },
  { name: 'France',         flag: '🇫🇷', dial: '+33'  },
  { name: 'Germany',        flag: '🇩🇪', dial: '+49'  },
  { name: 'India',          flag: '🇮🇳', dial: '+91'  },
  { name: 'New Zealand',    flag: '🇳🇿', dial: '+64'  },
  { name: 'South Africa',   flag: '🇿🇦', dial: '+27'  },
  { name: 'UAE',            flag: '🇦🇪', dial: '+971' },
  { name: 'United Kingdom', flag: '🇬🇧', dial: '+44'  },
  { name: 'United States',  flag: '🇺🇸', dial: '+1'   },
].sort((a, b) => a.name.localeCompare(b.name));

// Picker value is the country name (unique — several countries share a dial code, e.g. +1
// for both Canada and the US, so the dial code alone can't identify a row).
export const COUNTRY_CODE_OPTIONS: PickerOption[] = COUNTRY_CODES.map(c => ({
  value: c.name, label: c.name, sub: c.dial, flag: c.flag,
}));
export const POPULAR_COUNTRY_CODES = ['New Zealand', 'Australia', 'India', 'United Kingdom', 'United States'];

export const DEFAULT_COUNTRY_DIAL = '+64';

/** Strips a leading zero (or zeros) only — used live, on every keystroke, in a phone input so
 *  what's on screen already matches what will be stored (no separate "trimmed at submit"
 *  surprise). Leaves other characters (spaces, dashes) alone while the user is still typing. */
export function stripLeadingZero(raw: string): string {
  return raw.replace(/^0+/, '');
}

/** Strips everything but digits, then any leading zero(s) — the bare local-number portion,
 *  e.g. "021 123 4567" or "0021123-4567" -> "211234567". Safe to call on every keystroke. */
export function normalizePhoneDigits(raw: string): string {
  return stripLeadingZero(raw.replace(/\D/g, ''));
}

/** Builds the canonical "+<dial><digits>" string the backend stores as username/WhatsApp
 *  number, from a selected dial code and whatever the user typed. If they already typed a
 *  full international number (starts with "+"), it's trusted as-is rather than having the
 *  selected dial code prepended on top of it. */
export function buildCanonicalPhone(dial: string, raw: string): string {
  const t = raw.trim();
  if (t.startsWith('+')) return t.replace(/\s+/g, '');
  return `${dial}${normalizePhoneDigits(t)}`;
}
