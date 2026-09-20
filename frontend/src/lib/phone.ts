// src/lib/phone.ts — shared normalization logic for any screen that collects a WhatsApp number
// (registration, login), so they all construct the exact same canonical "+<dial><digits>"
// format the backend stores as the username. Mirrors mobile/src/lib/phone.ts; the dial-code
// list itself already lives in ./countries and is reused as-is rather than duplicated.

/** Strips a leading zero (or zeros) only — used live, on every keystroke, in a phone input so
 *  what's on screen already matches what will be stored (no separate "trimmed at submit"
 *  surprise). Leaves other characters (spaces, dashes) alone while the user is still typing. */
export function stripLeadingZero(raw: string): string {
  return raw.replace(/^0+/, '')
}

/** Strips everything but digits, then any leading zero(s) — the bare local-number portion,
 *  e.g. "021 123 4567" or "0021123-4567" -> "211234567". Safe to call on every keystroke. */
export function normalizePhoneDigits(raw: string): string {
  return stripLeadingZero(raw.replace(/\D/g, ''))
}

/** Builds the canonical "+<dial><digits>" string the backend stores as username/WhatsApp
 *  number, from a selected dial code and whatever the user typed. If they already typed a
 *  full international number (starts with "+"), it's trusted as-is rather than having the
 *  selected dial code prepended on top of it. */
export function buildCanonicalPhone(dial: string, raw: string): string {
  const t = raw.trim()
  if (t.startsWith('+')) return t.replace(/\s+/g, '')
  return `${dial}${normalizePhoneDigits(t)}`
}
