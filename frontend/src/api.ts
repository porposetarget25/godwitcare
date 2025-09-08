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

// ---- API base (dev uses Vite proxy, prod hits Render) ----
const API_BASE = (import.meta.env?.VITE_API_BASE || '/api').replace(/\/$/, '')

// Generic request helper that won’t crash on HTML error pages
async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, init)
  const contentType = res.headers.get('content-type') || ''
  const text = await res.text()

  if (!res.ok) {
    // surface first 200 chars to help debug
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  if (!text) return {} as T
  if (contentType.includes('application/json')) return JSON.parse(text) as T

  // Try JSON; if it isn’t, return as text (avoids "Unexpected token <")
  try { return JSON.parse(text) as T } catch { return text as unknown as T }
}

// ---- Public API functions ----
export async function saveRegistration(r: Registration) {
  return request('/registrations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toBackend(r)),
  })
}

export async function uploadDocument(id: number, file: File) {
  const fd = new FormData()
  fd.append('file', file) // field name must be "file" to match your controller
  return request(`/registrations/${id}/document`, { method: 'POST', body: fd })
}

export async function login(email: string, password: string) {
  // Controller expects @RequestParam -> form-encoded
  const params = new URLSearchParams({ email, password })
  const res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', body: params })
  if (!res.ok) throw new Error('Login failed')
  return true
}
