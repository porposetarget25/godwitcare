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
  roles?: string[] 
}

export type DocSummary = {
  id: number
  fileName: string
  sizeBytes: number
  createdAt: string
}

// --- Consultations (shared types) ---
export type ConsultationCreate = {
  currentLocation: string
  contactName: string
  contactPhone: string
  contactAddress: string
  answers: Record<string, 'Yes' | 'No'>
}

export type PatientContact = {
  fullName: string
  phone: string
  email?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  country?: string
  postalCode?: string
}

export type ConsultationSummary = {
  id: number
  createdAt: string
  status: 'LOGGED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  registrationId?: number
  patientName?: string
  patientPhone?: string
}

export type ConsultationDetails = ConsultationSummary & {
  patientContact?: PatientContact
  questionnaire?: Record<string, 'Yes' | 'No'>
  notes?: string
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
    longTermMedication:
      r['Are you on any long-term/regular medication that we should be aware of?'],
    healthCondition:
      r['Do you have any health condition that can affect your trip?'],
    allergies:
      r['Do you have any allergies that can affect your trip?'],
    fitToFlyCertificate:
      r['Have you been advised to produce a fit-to-fly certificate?'],
    travellingFrom: r['Travelling From'],
    travellingTo: r['Travelling To (UK & Europe)'],
    travelStartDate: r['Travel Start Date'],
    travelEndDate: r['Travel End Date'],
    packageDays: r['Package Days'],
    documentFileName: r['Document File Name'],
  }

  // Accept either draft['Travelers'] or draft.travelers
  const raw = (r['Travelers'] ?? r.travelers ?? []) as Array<{
    fullName?: string
    dateOfBirth?: string
  }>

  const travelers = Array.isArray(raw)
    ? raw
        .filter(t => t && t.fullName && t.dateOfBirth)
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
  try {
    return JSON.parse(text) as T
  } catch {
    return text as unknown as T
  }
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
    method: 'GET',
  })
}

export async function downloadDocumentBlob(
  registrationId: number,
  docId: number
): Promise<Blob> {
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
  const user = (await res.json()) as UserDto
  try {
    localStorage.setItem('gc_user', JSON.stringify(user))
  } catch {}
  return user
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } finally {
    try {
      localStorage.removeItem('gc_user')
    } catch {}
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

// api.ts
export async function registerAuthUser(
  firstName: string,
  lastName: string,
  email: string | null,   // email can be null/optional
  password: string,
  username: string        // REQUIRED: primary WhatsApp number (with +CC)
): Promise<UserDto> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      firstName,
      lastName,
      email,      // may be null
      password,
      username,   // <-- NEW
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<UserDto>
}


// ---------- Consultations (patient) ----------
export async function createConsultation(payload: ConsultationCreate) {
  return request('/consultations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
}

export async function myLatestConsultation() {
  const res = await fetch(`${API_BASE}/consultations/mine/latest`, {
    credentials: 'include',
  })
  if (res.status === 204) return null
  if (!res.ok) throw new Error('Failed to load')
  return res.json()
}

// ---------- Doctor-facing (requires DOCTOR role) ----------
export async function doctorListConsultations(): Promise<ConsultationSummary[]> {
  return request<ConsultationSummary[]>('/doctor/consultations', {
    method: 'GET',
    credentials: 'include',
  })
}

export async function doctorGetConsultation(id: number): Promise<ConsultationDetails> {
  return request<ConsultationDetails>(`/doctor/consultations/${id}`, {
    method: 'GET',
    credentials: 'include',
  })
}

// Optional: status/notes update for doctors
export async function doctorUpdateConsultation(
  id: number,
  body: Partial<{ status: ConsultationSummary['status']; notes: string }>
) {
  return request(`/doctor/consultations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
}

// Create a prescription for a consultation (DOCTOR role)
export async function doctorCreatePrescription(
  consultationId: number,
  payload: {
    complaint: string;               // history of presenting complaint
    diagnosis: string;
    medicines: string[];             // array of lines; backend can join/format
    recommendations?: string;
  }
) {
  return request(`/doctor/consultations/${consultationId}/prescriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
}


export async function doctorDownloadPrescriptionPdf(prescriptionId: number): Promise<Blob> {
  const r = await fetch(`${API_BASE_URL}/doctor/prescriptions/${prescriptionId}/pdf`, {
    credentials: 'include'
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.blob();
}

// ---- Doctor: latest prescription for a consultation (metadata)
export async function doctorLatestPrescriptionMeta(consultationId: number) {
  return request(`/doctor/consultations/${consultationId}/prescriptions/latest`, {
    method: 'GET',
    credentials: 'include',
  })
}

export async function patientDownloadLatestPrescription(): Promise<Blob | null> {
  const r = await fetch(`${API_BASE_URL}/prescriptions/latest/pdf`, { credentials: 'include' });
  if (r.status === 204) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.blob();
}

// ---- Patient: latest prescription metadata
export async function patientLatestPrescriptionMeta() {
  return request('/prescriptions/latest', {
    method: 'GET',
    credentials: 'include',
  })
}

// utils/url.ts
export function resolveApiUrl(base: string, path: string) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path; // already absolute

  // normalize
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');

  const baseEndsWithApi = /\/api$/i.test(cleanBase);
  const pathStartsWithApi = /^api\//i.test(cleanPath);

  // If both have "api", drop one from the path
  const effectivePath =
    baseEndsWithApi && pathStartsWithApi
      ? cleanPath.replace(/^api\//i, '')
      : cleanPath;

  return `${cleanBase}/${effectivePath}`;
}

