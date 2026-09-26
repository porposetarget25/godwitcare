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

/** True once the identifier clearly isn't an email — i.e. it's being typed as a phone number,
 *  so the country-code selector (needed to reconstruct the same "+<dial><digits>" username
 *  Registration stores) should show. Decided by the first character typed, not by scanning for
 *  "@" (which only appears once the user is partway through an email): a letter first means
 *  email, a digit or "+" first means phone. */
export function looksLikePhone(v: string): boolean {
  const t = v.trim()
  return t.length > 0 && !/^[a-zA-Z]/.test(t)
}

/** Resolves whatever a login/forgot-password identifier field holds into what the backend
 *  expects: the canonical phone string when it looks like a phone number, or the raw trimmed
 *  value (untouched) when it looks like an email. Shared by every screen that accepts either. */
export function resolveIdentifier(raw: string, dial: string): string {
  return looksLikePhone(raw) ? buildCanonicalPhone(dial, raw) : raw.trim()
}

/** True only when the country-code selector is actually needed — i.e. it's a phone number that
 *  doesn't already start with "+". Once the user has typed a full international number
 *  themselves, showing a separate dial-code picker next to it is a redundant duplicate of what's
 *  already in the field, so the selector hides itself. */
export function needsCountryPicker(raw: string): boolean {
  return looksLikePhone(raw) && !raw.trim().startsWith('+')
}
