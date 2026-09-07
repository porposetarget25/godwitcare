// src/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = 'https://godwitcare-1.onrender.com/api'; // ← set your LAN IP here

// ── Auth token storage ───────────────────────────────────────────────────────
// The backend is stateless (no session cookies — see SecurityConfig.STATELESS),
// so every protected request must carry an Authorization: Bearer token.
const AUTH_TOKEN_KEY = 'gc_auth_token';
const AUTH_EXPIRES_AT_KEY = 'gc_auth_expires_at';

export async function storeAuthToken(token: string, expiresInSeconds: number): Promise<void> {
  await AsyncStorage.multiSet([
    [AUTH_TOKEN_KEY, token],
    [AUTH_EXPIRES_AT_KEY, String(Date.now() + expiresInSeconds * 1000)],
  ]);
}

export async function getStoredToken(): Promise<string | null> {
  const pairs = await AsyncStorage.multiGet([AUTH_TOKEN_KEY, AUTH_EXPIRES_AT_KEY]);
  const token = pairs[0][1];
  const expiresAt = Number(pairs[1][1] || '0');
  if (!token || !expiresAt || Date.now() >= expiresAt) {
    await clearAuthToken();
    return null;
  }
  return token;
}

export async function clearAuthToken(): Promise<void> {
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_EXPIRES_AT_KEY, 'gc_user']);
}

/** fetch() wrapper that attaches the stored Bearer token. Use for every protected endpoint. */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getStoredToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export function resolveApiUrl(base: string, path: string): string {
  if (!path) return '';

  // Parse the configured base to get the real host/port
  // base is like "http://192.168.1.x:8080/api"
  const baseMatch = base.match(/^(https?:\/\/[^/]+)/);
  const configuredOrigin = baseMatch ? baseMatch[1] : '';

  // If already absolute, replace any localhost/127.0.0.1 with configured host
  if (/^https?:\/\//i.test(path)) {
    if (configuredOrigin) {
      return path.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, configuredOrigin);
    }
    return path;
  }

  // Relative path — prepend the configured origin
  if (!configuredOrigin) return path;
  const pathNormalized = path.startsWith('/') ? path : '/' + path;
  return `${configuredOrigin}${pathNormalized}`;
}

export type UserDto = {
  id?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  roles?: string[];
  otpVerified?: boolean;
  activated?: boolean;
};

export type Registration = {
  'First Name': string;
  'Middle Name': string;
  'Last Name': string;
  'Date of Birth': string;
  'Gender': string;
  'Primary WhatsApp Number': string;
  'Carer/Secondary WhatsApp Number': string;
  'Email Address': string;
  'Are you on any long-term/regular medication that we should be aware of?': boolean;
  'Do you have any health condition that can affect your trip?': boolean;
  'Do you have any allergies that can affect your trip?': boolean;
  'Have you been advised to produce a fit-to-fly certificate?': boolean;
  'Travelling From': string;
  'Travelling To (UK & Europe)': string;
  'Travel Start Date': string;
  'Travel End Date': string;
  'Package Days': number;
  primaryDial?: string;
  secondaryDial?: string;
  Username?: string;
  'Account Password'?: string;
  travelers?: Array<{ fullName: string; dateOfBirth: string }>;
  [key: string]: any;
};

export type Traveler = {
  id?: number;
  patientId?: string;
  fullName: string;
  dateOfBirth: string;
};

export type RegistrationApi = {
  id: number;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  primaryWhatsAppNumber?: string;
  carerSecondaryWhatsAppNumber?: string;
  emailAddress?: string;
  longTermMedication?: boolean;
  healthCondition?: boolean;
  allergies?: boolean;
  fitToFlyCertificate?: boolean;
  travellingFrom?: string;
  travellingTo?: string;
  travelStartDate?: string;
  travelEndDate?: string;
  packageDays?: number;
  travelers?: Traveler[];
  primaryPatientId?: string;
};

export type DocumentType = 'PASSPORT' | 'TRAVEL_DOCUMENT';
export type DocSummary = {
  id: number;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
  patientId: string;
  type: DocumentType;
};

/** RN file reference shape used by expo-image-picker/expo-document-picker results. */
export type RNFile = { uri: string; name: string; type: string };

export async function login(identifier: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: identifier, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  const data = await res.json();
  if (data?.token) await storeAuthToken(data.token, data.expiresInSeconds ?? 3600);
  return data;
}

export async function me(): Promise<UserDto> {
  const res = await authFetch(`${API_BASE_URL}/auth/me`);
  if (!res.ok) throw new Error('Not authenticated');
  return res.json();
}

export async function getMe(): Promise<UserDto> {
  return me();
}

export async function logout() {
  try {
    await authFetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
  } catch {}
  await clearAuthToken();
}

function toBackend(draft: Registration) {
  return {
    firstName: draft['First Name'],
    middleName: draft['Middle Name'],
    lastName: draft['Last Name'],
    dateOfBirth: draft['Date of Birth'],
    gender: draft['Gender'],
    primaryWhatsAppNumber: draft['Primary WhatsApp Number'],
    carerSecondaryWhatsAppNumber: draft['Carer/Secondary WhatsApp Number'],
    emailAddress: draft['Email Address'],
    longTermMedication: draft['Are you on any long-term/regular medication that we should be aware of?'],
    healthConditionAffectingTrip: draft['Do you have any health condition that can affect your trip?'],
    allergies: draft['Do you have any allergies that can affect your trip?'],
    fitToFlyCertificate: draft['Have you been advised to produce a fit-to-fly certificate?'],
    travellingFrom: draft['Travelling From'],
    travellingTo: draft['Travelling To (UK & Europe)'],
    travelStartDate: draft['Travel Start Date'],
    travelEndDate: draft['Travel End Date'],
    packageDays: draft['Package Days'],
    travelers: draft.travelers || [],
  };
}

export async function saveRegistration(draft: Registration): Promise<RegistrationApi> {
  const res = await authFetch(`${API_BASE_URL}/registrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toBackend(draft)),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Registration failed (${res.status}): ${t || res.statusText}`);
  }
  return res.json();
}

export async function registerAuthUser(
  firstName: string,
  lastName: string,
  email: string | null,
  password: string,
  username: string,
) {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName, lastName, email, password, username }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`User registration failed (${res.status}): ${t || res.statusText}`);
  }
  return res.json();
}

export async function uploadDocument(registrationId: number, patientId: string, type: DocumentType, file: RNFile) {
  const formData = new FormData();
  formData.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
  const res = await authFetch(
    `${API_BASE_URL}/registrations/${registrationId}/patients/${encodeURIComponent(patientId)}/documents/${type}`,
    { method: 'POST', body: formData },
  );
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function addTravelerWithDocuments(
  registrationId: number,
  traveler: { fullName: string; dateOfBirth: string },
  passport: RNFile,
  travelDocument: RNFile,
): Promise<Traveler> {
  const formData = new FormData();
  formData.append('fullName', traveler.fullName);
  formData.append('dateOfBirth', traveler.dateOfBirth);
  formData.append('passport', { uri: passport.uri, name: passport.name, type: passport.type } as any);
  formData.append('travelDocument', { uri: travelDocument.uri, name: travelDocument.name, type: travelDocument.type } as any);
  const res = await authFetch(`${API_BASE_URL}/registrations/${registrationId}/travelers`, {
    method: 'POST', body: formData,
  });
  if (!res.ok) throw new Error('Failed to add traveller');
  return res.json();
}

export async function listDocuments(registrationId: number, patientId: string): Promise<DocSummary[]> {
  const res = await authFetch(`${API_BASE_URL}/registrations/${registrationId}/patients/${encodeURIComponent(patientId)}/documents`);
  if (!res.ok) throw new Error('Failed to load documents');
  return res.json();
}

export async function getLatestRegistrationByEmail(email: string): Promise<RegistrationApi | null> {
  const res = await authFetch(`${API_BASE_URL}/registrations?email=${encodeURIComponent(email)}`);
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`Failed to load registration (HTTP ${res.status})`);
  const data = await res.json();
  if (Array.isArray(data)) return data.length ? (data[data.length - 1] as RegistrationApi) : null;
  return (data ?? null) as RegistrationApi | null;
}

export async function updateRegistrationById(id: number, payload: RegistrationApi): Promise<RegistrationApi> {
  const res = await authFetch(`${API_BASE_URL}/registrations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update registration');
  return res.json();
}

export async function doctorGetConsultation(id: number) {
  const res = await authFetch(`${API_BASE_URL}/doctor/consultations/${id}`);
  if (!res.ok) throw new Error('Failed to load consultation');
  return res.json();
}

export async function doctorLatestPrescriptionMeta(consultationId: number) {
  const res = await authFetch(`${API_BASE_URL}/doctor/consultations/${consultationId}/prescriptions/latest`);
  if (res.status === 204) return null;
  if (!res.ok) throw new Error('No prescription');
  return res.json();
}

export async function doctorDownloadPrescriptionPdf(prescriptionId: number): Promise<string> {
  return `${API_BASE_URL}/doctor/prescriptions/${prescriptionId}/pdf`;
}

export async function doctorCreatePrescription(consultationId: number, body: object) {
  const res = await authFetch(`${API_BASE_URL}/doctor/consultations/${consultationId}/prescriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create prescription');
  return res.json();
}

// ── Profile API ───────────────────────────────────────────────────────────────
export async function updateMe(data: Partial<UserDto>): Promise<UserDto> {
  const res = await authFetch(`${API_BASE_URL}/users/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Profile update failed (${res.status}): ${errText}`);
  }
  return res.json();
}

export async function deleteMe(): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/users/me`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete account');
}

export async function uploadProfilePhoto(uri: string, mimeType = 'image/jpeg'): Promise<string> {
  const filename = `photo_${Date.now()}.jpg`;
  const formData = new FormData();
  // React Native requires this exact object shape for multipart upload
  formData.append('file', { uri, name: filename, type: mimeType } as any);
  // Do NOT set Content-Type — fetch sets it automatically with the multipart boundary
  const res = await authFetch(`${API_BASE_URL}/users/me/photo`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Photo upload failed (${res.status}): ${errText}`);
  }
  const j = await res.json().catch(() => ({}));
  return j.photoUrl ?? j.url ?? '';
}

export async function getProfilePhotoUrl(): Promise<string> {
  return `${API_BASE_URL}/users/me/photo`;
}

export async function deleteProfilePhoto(): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/users/me/photo`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete photo');
}

// ── OTP & Password Reset ──────────────────────────────────────────────────────
export async function sendOtpToWhatsApp(): Promise<{ message: string }> {
  const res = await authFetch(`${API_BASE_URL}/auth/otp/send`, { method: 'POST' });
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(t || `Failed (${res.status})`); }
  return res.json();
}

export async function verifyOtp(code: string): Promise<{ message: string }> {
  const res = await authFetch(`${API_BASE_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(t || `Invalid OTP (${res.status})`); }
  return res.json();
}

export async function forgotPassword(identifier: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier }),
  });
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(t || `Failed (${res.status})`); }
  return res.json();
}

export async function verifyForgotPasswordOtp(
  identifier: string, code: string
): Promise<{ message: string; resetToken: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/forgot-password/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, code }),
  });
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(t || `Invalid OTP (${res.status})`); }
  return res.json();
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(t || `Failed (${res.status})`); }
  return res.json();
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  const res = await authFetch(`${API_BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(t || `Failed (${res.status})`); }
  return res.json();
}

// ── Coverage / activation ────────────────────────────────────────────────────
export type ActivationPaymentSummary = {
  activated: boolean;
  packageDays: number;
  packageLabel: string;
  registrationFee: number;
  tripCoverageFee: number;
  totalAmount: number;
  currency: string;
};

export async function getActivationPaymentSummary(): Promise<ActivationPaymentSummary> {
  const res = await authFetch(`${API_BASE_URL}/payments/activation-summary`);
  if (!res.ok) throw new Error(`Failed to load activation summary (${res.status})`);
  return res.json();
}

export type PaymentHistoryResponse = {
  id: number;
  method: 'CARD' | 'EFT' | 'BANK_TRANSFER' | 'DIGITAL_WALLET';
  amount: number;
  currency: string;
  status: string;
  failureMessage?: string;
  createdAt: string;
  updatedAt: string;
  cardLast4?: string;
  cardBrand?: string;
  packageLabel?: string;
  registrationFee?: number;
  tripCoverageFee?: number;
};

export async function getLatestPayment(): Promise<PaymentHistoryResponse | null> {
  const res = await authFetch(`${API_BASE_URL}/payments/latest`);
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load latest payment (${res.status})`);
  return res.json();
}

export async function getPaymentHistory(): Promise<PaymentHistoryResponse[]> {
  const res = await authFetch(`${API_BASE_URL}/payments/history`);
  if (!res.ok) throw new Error(`Failed to load payment history (${res.status})`);
  return res.json();
}

// ── Stripe activation checkout ───────────────────────────────────────────────
export type PaymentMethodKind = 'CARD' | 'EFT' | 'BANK_TRANSFER' | 'DIGITAL_WALLET';

export type StripePaymentConfig = {
  publishableKey: string;
  environment: string;
  frontendConfigured: boolean;
  backendConfigured?: boolean;
};

export type ActivationPaymentIntentResponse = PaymentHistoryResponse & {
  clientSecret: string;
  stripePaymentIntentId: string;
  packageDays: number;
  totalAmount: number;
};

async function readJsonOrThrow<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (res.ok) return res.json();
  const body = await res.json().catch(() => null);
  throw new Error(body?.message || `${fallbackMessage} (HTTP ${res.status})`);
}

export async function getStripePaymentConfig(): Promise<StripePaymentConfig> {
  const res = await authFetch(`${API_BASE_URL}/payments/config`);
  return readJsonOrThrow(res, 'Failed to load payment configuration');
}

export async function createActivationPaymentIntent(payload: { method: PaymentMethodKind; currency: string }): Promise<ActivationPaymentIntentResponse> {
  const res = await authFetch(`${API_BASE_URL}/payments/activation-intents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readJsonOrThrow(res, 'Unable to start checkout');
}

export async function confirmPaymentIntent(paymentIntentId: string): Promise<PaymentHistoryResponse> {
  const res = await authFetch(`${API_BASE_URL}/payments/payment-intents/${encodeURIComponent(paymentIntentId)}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return readJsonOrThrow(res, 'Unable to confirm payment');
}

// ── Document management (Documents screen) ──────────────────────────────────
export async function deleteDocument(registrationId: number, docId: number): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/registrations/${registrationId}/documents/${docId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete document');
}

/** Fetches a document's bytes as a base64 data URI (for saving/sharing on-device). */
export async function downloadDocumentAsDataUri(registrationId: number, patientId: string, docId: number): Promise<string> {
  const res = await authFetch(`${API_BASE_URL}/registrations/${registrationId}/patients/${encodeURIComponent(patientId)}/documents/${docId}/download`);
  if (!res.ok) throw new Error('Failed to download document');
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read document bytes'));
    reader.readAsDataURL(blob);
  });
}
