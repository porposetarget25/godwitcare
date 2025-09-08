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

function toBackend(r: Registration){
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

export async function saveRegistration(r: Registration){
  const res = await fetch('/api/registrations', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(toBackend(r)) })
  return await res.json()
}
export async function uploadDocument(id:number, file: File){
  const fd = new FormData(); fd.append('file', file)
  const res = await fetch(`/api/registrations/${id}/document`, { method:'POST', body: fd })
  return await res.json()
}
export async function login(email: string, password: string){
  const params = new URLSearchParams({ email, password })
  const res = await fetch(`/api/auth/login`, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: params })
  if(!res.ok) throw new Error('Login failed')
  return true
}
