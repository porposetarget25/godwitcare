import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { API_BASE_URL, authFetch } from '../api'
import { isDoctorUser, useAuth } from './auth'

export type PatientContextOption = {
  id: string
  name: string
  patientId: string
}

type PatientState = {
  patients: PatientContextOption[]
  activePatient: PatientContextOption | null
  loading: boolean
  selectPatient: (patientId: string) => void
  queryString: string
}

const PatientCtx = createContext<PatientState>({
  patients: [], activePatient: null, loading: true, selectPatient: () => {}, queryString: '',
})

const PATIENT_ROUTES = ['/home', '/care-history', '/consultation']

export function usePatient() {
  return useContext(PatientCtx)
}

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [patients, setPatients] = useState<PatientContextOption[]>([])
  // Patient selection is deliberately keyed by the public, immutable patient ID.
  // A traveller's database/list ID is navigation metadata only and must never be
  // used to decide which patient's clinical records are active.
  const [activePatientId, setActivePatientId] = useState('')
  const [loading, setLoading] = useState(false)
  const storageKey = user?.email ? `gc_active_patient:${user.email.toLowerCase()}` : ''
  const patientRoute = PATIENT_ROUTES.some(path => location.pathname === path || location.pathname.startsWith(`${path}/`))

  useEffect(() => {
    if (!user || isDoctorUser(user)) {
      setPatients([])
      setActivePatientId('')
      return
    }
    let cancelled = false
    setLoading(true)
    authFetch(`${API_BASE_URL}/consultations/travelers`, { cache: 'no-store' })
      .then(async response => response.ok ? response.json() : Promise.reject(new Error('Unable to load patients')))
      .then(items => {
        if (cancelled) return
        const normalized = (Array.isArray(items) ? items : []).map(item => ({
          id: String(item.id), name: String(item.name || 'Patient'), patientId: String(item.patientId || ''),
        }))
        setPatients(normalized)

        const params = new URLSearchParams(location.search)
        const routeTraveler = params.get('travelerId') || 'PRIMARY'
        const routePatientId = params.get('patientId')
        const stored = storageKey ? localStorage.getItem(storageKey) : null
        const requested = routePatientId
          ? normalized.find(p => p.patientId === routePatientId)
          : normalized.find(p => p.id === routeTraveler)
        const selected = requested || normalized.find(p => p.patientId === stored)
          || normalized.find(p => p.id === 'PRIMARY') || normalized[0]
        if (selected) setActivePatientId(selected.patientId)
      })
      .catch(() => { if (!cancelled) setPatients([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // Patient choices belong to the signed-in account, not to individual pages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, storageKey])

  const activePatient = useMemo(
    () => patients.find(patient => patient.patientId === activePatientId) || null,
    [activePatientId, patients],
  )

  const queryString = useMemo(() => {
    if (!activePatient) return ''
    const params = new URLSearchParams()
    if (activePatient.id !== 'PRIMARY') params.set('travelerId', activePatient.id)
    params.set('patientId', activePatient.patientId)
    return params.toString()
  }, [activePatient])

  useEffect(() => {
    if (!activePatient) return
    if (storageKey) localStorage.setItem(storageKey, activePatient.patientId)
    if (!patientRoute) return
    const current = new URLSearchParams(location.search)
    const next = new URLSearchParams(current)
    next.delete('travelerId')
    next.set('patientId', activePatient.patientId)
    if (activePatient.id !== 'PRIMARY') next.set('travelerId', activePatient.id)
    if (next.toString() !== current.toString()) {
      navigate({ pathname: location.pathname, search: `?${next}`, hash: location.hash }, { replace: true })
    }
  }, [activePatient, location.hash, location.pathname, location.search, navigate, patientRoute, storageKey])

  const selectPatient = useCallback((patientId: string) => {
    if (patients.some(patient => patient.patientId === patientId)) setActivePatientId(patientId)
  }, [patients])

  const value = useMemo(() => ({ patients, activePatient, loading, selectPatient, queryString }),
    [patients, activePatient, loading, selectPatient, queryString])
  return <PatientCtx.Provider value={value}>{children}</PatientCtx.Provider>
}
