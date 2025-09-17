// ========================= api.ts =========================

// ---------- Types ----------
export type Traveler = {
  fullName: string
  dateOfBirth: string
}
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
  'Account Password'?: string

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

  // NEW
  'Travelers'?: Traveler[]
}


export type UserDto = {
  id: number
  firstName: string
  lastName: string
  email: string
}

export type DocSummary = {
  id: number
  fileName: string
  sizeBytes: number
  createdAt: string
}

// ---------- Model -> Backend payload mapper ----------
function toBackend(r: Registration | any) {
  const base = {
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

  // Accept either draft['Travelers'] or draft.travelers
  const raw = (r['Travelers'] ?? r.travelers ?? []) as Array<{ fullName?: string; dateOfBirth?: string }>

  const travelers = Array.isArray(raw)
    ? raw
        .filter(t => t && t.fullName && t.dateOfBirth) // keep only valid rows
        .map(t => ({
          fullName: String(t.fullName).trim(),
          dateOfBirth: String(t.dateOfBirth), // yyyy-MM-dd
        }))
    : []

  return { ...base, travelers }
}


// ---------- API base (auto-detect) ----------
const isGithubPages =
  typeof window !== 'undefined' &&
  (window.location.hostname.endsWith('github.io') ||
   window.location.hostname.endsWith('githubusercontent.com'))

const DEFAULT_DEV_BASE = '/api'
const RENDER_BASE = 'https://godwitcare-1.onrender.com/api' // update if Render URL changes

const API_BASE_RAW = isGithubPages
  ? RENDER_BASE
  : (import.meta.env?.VITE_API_BASE ?? DEFAULT_DEV_BASE)

const API_BASE = API_BASE_RAW.replace(/\/$/, '')
export const API_BASE_URL = API_BASE

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

// ===================================================================
// Public API
// ===================================================================

// ---------- Registrations ----------
export async function saveRegistration(r: Registration) {
  return request('/registrations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toBackend(r)),
    // note: registration creation is public; session not required
  })
}

export async function uploadDocument(id: number, file: File) {
  const fd = new FormData()
  fd.append('file', file) // must be "file" (controller expects it)
  return request(`/registrations/${id}/document`, { method: 'POST', body: fd })
}

// Optional helpers if you want to show/download stored docs later
export async function listDocuments(registrationId: number): Promise<DocSummary[]> {
  return request<DocSummary[]>(`/registrations/${registrationId}/documents`, {
    method: 'GET'
  })
}

export async function downloadDocumentBlob(registrationId: number, docId: number): Promise<Blob> {
  const url = `${API_BASE}/registrations/${registrationId}/documents/${docId}`
  const res = await fetch(url, { method: 'GET' })
  if (!res.ok) throw new Error('Failed to download document')
  return res.blob()
}

// ---------- Auth (session-based) ----------
// Backend:
//   POST /api/auth/register   {firstName,lastName,email,password} -> 200 UserDto
//   POST /api/auth/login      {email,password}  -> 200 UserDto + sets JSESSIONID
//   POST /api/auth/logout     -> 200 + invalidates session
//   GET  /api/auth/me         -> 200 UserDto if logged-in; 401 otherwise

export async function login(email: string, password: string): Promise<UserDto> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // keep session cookie
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error('Login failed')
  const user = await res.json() as UserDto
  try { localStorage.setItem('gc_user', JSON.stringify(user)) } catch {}
  return user
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } finally {
    try { localStorage.removeItem('gc_user') } catch {}
  }
}

export async function me(): Promise<UserDto | null> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    credentials: 'include',
  })
  if (res.status === 401) return null
  if (!res.ok) throw new Error('Failed to fetch current user')
  return res.json() as Promise<UserDto>
}

export async function registerAuthUser(
  firstName: string,
  lastName: string,
  email: string,
  password: string
): Promise<UserDto> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // harmless; session not needed here
    body: JSON.stringify({ firstName, lastName, email, password }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<UserDto>
}
