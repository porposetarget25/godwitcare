// ========================= api.ts =========================
const AUTH_TOKEN_KEY = 'gc_auth_token'
const AUTH_EXPIRES_AT_KEY = 'gc_auth_expires_at'

export type AuthLoginResponse = {
  user: UserDto
  token: string
  expiresInSeconds: number
}

export function getStoredToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  const expiresAt = Number(localStorage.getItem(AUTH_EXPIRES_AT_KEY) || '0')
  if (!token || !expiresAt || Date.now() >= expiresAt) {
    clearAuthToken()
    return null
  }
  return token
}

export function getTokenExpiresAt(): number | null {
  if (typeof localStorage === 'undefined') return null
  const expiresAt = Number(localStorage.getItem(AUTH_EXPIRES_AT_KEY) || '0')
  return expiresAt > 0 ? expiresAt : null
}

export function storeAuthToken(token: string, expiresInSeconds: number) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  localStorage.setItem(AUTH_EXPIRES_AT_KEY, String(Date.now() + expiresInSeconds * 1000))
}

export function clearAuthToken() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_EXPIRES_AT_KEY)
  localStorage.removeItem('gc_user')
}

function authHeaders(headers?: HeadersInit): Headers {
  const merged = new Headers(headers)
  const token = getStoredToken()
  if (token) merged.set('Authorization', `Bearer ${token}`)
  return merged
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(input, {
    ...init,
    cache: init.cache ?? 'no-store',
    headers: authHeaders(init.headers),
  })
  if (res.status === 401) {
    clearAuthToken()
    window.dispatchEvent(new Event('godwitcare:auth-expired'))
  }
  return res
}
// ---------- Types ----------
export type Traveler = {
  id?: number
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
  username?: string
  photoUrl?: string
  roles?: string[]
  otpVerified?: boolean
}

export type AdminListItem = {
  id: number
  firstName: string
  lastName: string
  email: string
  username: string
  role: 'USER' | 'DOCTOR' | 'ADMIN'
}

export type AdminUserInput = {
  firstName: string
  lastName: string
  email: string
  username: string
  password?: string
  dateOfBirth?: string
  travellingFrom?: string
  travellingTo?: string
  travelStartDate?: string
  travelEndDate?: string
  middleName?: string
  gender?: string
  carerSecondaryWhatsAppNumber?: string
  longTermMedication?: boolean
  healthCondition?: boolean
  allergies?: boolean
  fitToFlyCertificate?: boolean
  packageDays?: number
  travelers?: Traveler[]
  paymentMethod?: string
  paymentAmount?: number
  paymentCurrency?: string
  cardExpiry?: string
}

export type AuthAvailability = {
  emailRegistered: boolean
  whatsAppRegistered: boolean
}

export type DocSummary = {
  id: number
  fileName: string
  sizeBytes: number
  createdAt: string
}

export type RegistrationApi = {
  id: number
  firstName?: string
  middleName?: string
  lastName?: string
  dateOfBirth?: string
  gender?: string
  primaryWhatsAppNumber?: string
  carerSecondaryWhatsAppNumber?: string
  emailAddress?: string
  longTermMedication?: boolean
  healthCondition?: boolean
  allergies?: boolean
  fitToFlyCertificate?: boolean
  travellingFrom?: string
  travellingTo?: string
  travelStartDate?: string
  travelEndDate?: string
  packageDays?: number
  documentFileName?: string
  travelers?: Traveler[]
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

export type PaymentMethod = 'CARD' | 'EFT' | 'BANK_TRANSFER' | 'DIGITAL_WALLET'

export type CreatePaymentPayload = {
  method: PaymentMethod
  amount: number
  currency?: string
  cardNumber?: string
  expiryDate?: string
  cvv?: string
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
    id?: number
    fullName?: string
    dateOfBirth?: string
  }>

  const travelers = Array.isArray(raw)
    ? raw
        .filter(t => t && t.fullName && t.dateOfBirth)
        .map(t => ({
          id: t.id,
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
// ---------- Generic request helper (resilient to HTML error pages) ----------
async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  const res = await authFetch(url, {
    ...init,
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache', ...(init.headers || {}) },
  })

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
    // note: registration creation is public; JWT not required
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

export async function deleteDocument(registrationId: number, docId: number): Promise<void> {
  await request<void>(`/registrations/${registrationId}/documents/${docId}`, {
    method: 'DELETE',
  })
}

export async function getLatestRegistrationByEmail(email: string): Promise<RegistrationApi | null> {
  const res = await authFetch(`${API_BASE}/registrations?email=${encodeURIComponent(email)}`, {
    method: 'GET',
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  })
  if (res.status === 204) return null
  if (!res.ok) throw new Error(`Failed to load registration (HTTP ${res.status})`)
  const data = await res.json()
  if (Array.isArray(data)) return data.length ? (data[data.length - 1] as RegistrationApi) : null
  return (data ?? null) as RegistrationApi | null
}

export async function updateRegistrationById(id: number, payload: RegistrationApi) {
  return request<RegistrationApi>(`/registrations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function downloadDocumentBlob(
  registrationId: number,
  docId: number
): Promise<Blob> {
  const url = `${API_BASE}/registrations/${registrationId}/documents/${docId}`
  const res = await authFetch(url, { method: 'GET' })
  if (!res.ok) throw new Error('Failed to download document')
  return res.blob()
}

// ---------- Auth (JWT-based) ----------
// Backend:
//   POST /api/auth/register   {firstName,lastName,email,password} -> 200 UserDto
//   POST /api/auth/login      {email,password}  -> 200 { user, token, expiresInSeconds }
//   POST /api/auth/logout     -> 200; client discards JWT
//   GET  /api/auth/me         -> 200 UserDto when Authorization bearer token is valid; 401 otherwise

export async function login(email: string, password: string): Promise<UserDto> {
  const response = await request<AuthLoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  storeAuthToken(response.token, response.expiresInSeconds)
  try { localStorage.setItem('gc_user', JSON.stringify(response.user)) } catch {}
  return response.user
}

export async function logout(): Promise<void> {
  try {
    await authFetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      });
  } catch {
    // network/other error -> ignore
  } finally {
    // client-side logout regardless of server result
    clearAuthToken()
  }
}

export async function me(): Promise<UserDto | null> {
  // use fetch to inspect 401 without throwing
  if (!getStoredToken()) return null
  const res = await authFetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' }
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
  const res = await authFetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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


export async function sendOtpToWhatsApp(): Promise<{message: string}> {
  return request('/auth/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
      });
}

export async function verifyOtp(code: string): Promise<UserDto> {
  return request<UserDto>('/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
      });
}

export async function checkAuthAvailability(email?: string, username?: string): Promise<AuthAvailability> {
  const params = new URLSearchParams()
  if (email?.trim()) params.set('email', email.trim())
  if (username?.trim()) params.set('username', username.trim())
  const qs = params.toString()
  const res = await authFetch(`${API_BASE}/auth/availability${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to validate registration fields')
  return res.json() as Promise<AuthAvailability>
}


// ---------- Consultations (patient) ----------
export async function createConsultation(payload: ConsultationCreate) {
  return request('/consultations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function myLatestConsultation() {
  const res = await authFetch(`${API_BASE}/consultations/mine/latest`, {
      })
  if (res.status === 204) return null
  if (!res.ok) throw new Error('Failed to load')
  return res.json()
}

// ---------- Doctor-facing (requires DOCTOR role) ----------
export async function doctorListConsultations(): Promise<ConsultationSummary[]> {
  return request<ConsultationSummary[]>('/doctor/consultations', {
    method: 'GET',
      })
}

export async function doctorGetConsultation(id: number): Promise<ConsultationDetails> {
  return request<ConsultationDetails>(`/doctor/consultations/${id}`, {
    method: 'GET',
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
    body: JSON.stringify(payload),
  })
}


export async function doctorDownloadPrescriptionPdf(prescriptionId: number): Promise<Blob> {
  const r = await authFetch(`${API_BASE_URL}/doctor/prescriptions/${prescriptionId}/pdf`, {
      });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.blob();
}

// ---- Doctor: latest prescription for a consultation (metadata)
export async function doctorLatestPrescriptionMeta(consultationId: number) {
  return request(`/doctor/consultations/${consultationId}/prescriptions/latest`, {
    method: 'GET',
      })
}

export async function patientDownloadLatestPrescription(): Promise<Blob | null> {
  const r = await authFetch(`${API_BASE_URL}/prescriptions/latest/pdf`, {});
  if (r.status === 204) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.blob();
}

// ---- Patient: latest prescription metadata
export async function patientLatestPrescriptionMeta() {
  return request('/prescriptions/latest', {
    method: 'GET',
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

// api.ts

export async function getMe(): Promise<UserDto | null> {
  if (!getStoredToken()) return null
  const res = await authFetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
      });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error('Failed to fetch current user');
  return res.json() as Promise<UserDto>;
}

export async function getMyProfile(): Promise<UserDto> {
  return request<UserDto>('/users/me', { method: 'GET',  });
}

export async function updateMyProfile(payload: {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
}) {
  return request('/users/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
      });
}

export async function uploadMyPhoto(file: File) {
  const fd = new FormData();
  fd.append('file', file);
  return request('/users/me/photo', {
    method: 'POST',
    body: fd,
      });
}

export async function deleteMyPhoto() {
  return request('/users/me/photo', { method: 'DELETE',  });
}

export async function deleteMyAccount() {
  return request('/users/me', { method: 'DELETE',  });
}

export async function forgotPassword(identifier: string): Promise<{message: string}> {
  return request('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier }),
      });
}

export async function verifyForgotPasswordOtp(
  identifier: string,
  code: string
): Promise<{message: string; resetToken: string}> {
  return request('/auth/forgot-password/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, code }),
      });
}

export async function resetPassword(token: string, newPassword: string): Promise<{message: string}> {
  return request('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
      });
}

export async function adminDashboard(): Promise<{ users: AdminListItem[]; doctors: AdminListItem[] }> {
  return request('/admin/dashboard', { method: 'GET',  });
}

export async function adminGetUserDetails(id: number): Promise<any> {
  return request(`/admin/users/${id}/details`, { method: 'GET',  });
}

export async function adminCreateUser(payload: AdminUserInput): Promise<AdminListItem> {
  return request('/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
      });
}

export async function adminUpdateUser(id: number, payload: AdminUserInput): Promise<AdminListItem> {
  return request(`/admin/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
      });
}

export async function adminDeleteUser(id: number): Promise<void> {
  await request(`/admin/users/${id}`, { method: 'DELETE',  });
}

export async function adminCreateDoctor(payload: AdminUserInput): Promise<AdminListItem> {
  return request('/admin/doctors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
      });
}

export async function adminUpdateDoctor(id: number, payload: AdminUserInput): Promise<AdminListItem> {
  return request(`/admin/doctors/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
      });
}

export async function adminDeleteDoctor(id: number): Promise<void> {
  await request(`/admin/doctors/${id}`, { method: 'DELETE',  });
}

export async function createPayment(payload: CreatePaymentPayload) {
  return request('/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
      });
}
