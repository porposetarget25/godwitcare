// src/api.ts
export const API_BASE_URL = 'https://godwitcare-1.onrender.com/api'; // ← set your LAN IP here

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

export async function login(identifier: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username: identifier, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
}

export async function me(): Promise<UserDto> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });
  if (!res.ok) throw new Error('Not authenticated');
  return res.json();
}

export async function getMe(): Promise<UserDto> {
  return me();
}

export async function logout() {
  await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
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

export async function saveRegistration(draft: Registration): Promise<{ id?: number }> {
  const res = await fetch(`${API_BASE_URL}/registrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
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

export async function uploadDocument(registrationId: number, file: { uri: string; name: string; type: string }) {
  const formData = new FormData();
  formData.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
  const res = await fetch(`${API_BASE_URL}/registrations/${registrationId}/documents`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function doctorGetConsultation(id: number) {
  const res = await fetch(`${API_BASE_URL}/doctor/consultations/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load consultation');
  return res.json();
}

export async function doctorLatestPrescriptionMeta(consultationId: number) {
  const res = await fetch(`${API_BASE_URL}/doctor/consultations/${consultationId}/prescriptions/latest`, {
    credentials: 'include',
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error('No prescription');
  return res.json();
}

export async function doctorDownloadPrescriptionPdf(prescriptionId: number): Promise<string> {
  return `${API_BASE_URL}/doctor/prescriptions/${prescriptionId}/pdf`;
}

export async function doctorCreatePrescription(consultationId: number, body: object) {
  const res = await fetch(`${API_BASE_URL}/doctor/consultations/${consultationId}/prescriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create prescription');
  return res.json();
}

// ── Profile API ───────────────────────────────────────────────────────────────
export async function updateMe(data: Partial<UserDto>): Promise<UserDto> {
  const res = await fetch(`${API_BASE_URL}/users/me`, {
    method: 'PUT',
    credentials: 'include',
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
  const res = await fetch(`${API_BASE_URL}/users/me`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to delete account');
}

export async function uploadProfilePhoto(uri: string, mimeType = 'image/jpeg'): Promise<string> {
  const filename = `photo_${Date.now()}.jpg`;
  const formData = new FormData();
  // React Native requires this exact object shape for multipart upload
  formData.append('file', { uri, name: filename, type: mimeType } as any);
  // Do NOT set Content-Type — fetch sets it automatically with the multipart boundary
  const res = await fetch(`${API_BASE_URL}/users/me/photo`, {
    method: 'POST',
    credentials: 'include',
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
  const res = await fetch(`${API_BASE_URL}/users/me/photo`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to delete photo');
}

// ── OTP & Password Reset ──────────────────────────────────────────────────────
export async function sendOtpToWhatsApp(): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/otp/send`, {
    method: 'POST', credentials: 'include',
  });
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(t || `Failed (${res.status})`); }
  return res.json();
}

export async function verifyOtp(code: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/otp/verify`, {
    method: 'POST', credentials: 'include',
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
  const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(t || `Failed (${res.status})`); }
  return res.json();
}
