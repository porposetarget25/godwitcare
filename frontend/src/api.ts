// ---------- Types ----------
export type Registration = {
  id?: number
  'First Name': string
  'Middle Name': string
  'Last Name': string
  'Date of Birth': string
  'Gender': string
  'Primary WhatsApp Number': string
  'Carer/Secondary WhatsApp Number': string
  'Email Address': string
  'Are you on any long-term/regular medication that we should be aware of?': boolean
  'Do you have any health condition that can affect your trip?': boolean
  'Do you have any allergies that can affect your trip?': boolean
  'Have you been advised to produce a fit-to-fly certificate?': boolean
  'Travelling From': string
  'Travelling To (UK & Europe)': string
  'Travel Start Date': string
  'Travel End Date': string
  'Package Days': number
  'Document File Name'?: string
}

// ---------- Model -> Backend payload mapper ----------
function toBackend(r: Registration) {
  return {
    id: r.id,
    firstName: r['First Name'],
    middleName: r['Middle Name'],
    lastName: r['Last Name'],
    dateOfBirth: r['Date of Birth'],
    gender: r['Gender'],
    primaryWhatsAppNumber: r['Primary WhatsApp Number'],
    carerSecondaryWhatsAppNumber: r['Carer/Secondary WhatsApp Number'],
    emailAddress: r['Email Address'],
    longTermMedication: r['Are you on any long-term/regular medication that we should be aware of?'],
    healthCondition: r['Do you have any health condition that can affect your trip?'],
    allergies: r['Do you have any allergies that can affect your trip?'],
    fitToFlyCertificate: r['Have you been advised to produce a fit-to-fly certificate?'],
    travellingFrom: r['Travelling From'],
    travellingTo: r['Travelling To (UK & Europe)'],
    travelStartDate: r['Travel Start Date'],
    travelEndDate: r['Travel End Date'],
    packageDays: r['Package Days'],
    documentFileName: r['Document File Name'],
  }
}

// ---------- API base (auto-detect) ----------
// On GitHub Pages (github.io) => force Render URL
// Else (local dev) => Vite proxy (/api) or env override
const isGithubPages =
  typeof window !== 'undefined' &&
  (window.location.hostname.endsWith('github.io') ||
   window.location.hostname.endsWith('githubusercontent.com'))

const DEFAULT_DEV_BASE = '/api'
const RENDER_BASE = 'https://godwitcare-1.onrender.com/api' // change if your Render URL changes

const API_BASE_RAW = isGithubPages
  ? RENDER_BASE
  : (import.meta.env?.VITE_API_BASE ?? DEFAULT_DEV_BASE)

const API_BASE = API_BASE_RAW.replace(/\/$/, '') // trim trailing slash
export const API_BASE_URL = API_BASE // handy for debugging

// ---------- Generic request helper (resilient to HTML error pages) ----------
async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, init)
  const contentType = res.headers.get('content-type') || ''
  const text = await res.text()

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  if (!text) return {} as T
  if (contentType.includes('application/json')) return JSON.parse(text) as T
  try { return JSON.parse(text) as T } catch { return text as unknown as T }
}

// ---------- Public API ----------
export async function saveRegistration(r: Registration) {
  return request('/registrations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toBackend(r)),
  })
}

export async function uploadDocument(id: number, file: File) {
  const fd = new FormData()
  fd.append('file', file) // field name must be "file" (matches your controller)
  return request(`/registrations/${id}/document`, { method: 'POST', body: fd })
}

export async function login(email: string, password: string) {
  // Controller uses @RequestParam -> form-encoded
  const params = new URLSearchParams({ email, password })
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
  if (!res.ok) throw new Error('Login failed')
  return true
}
