// src/main.tsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom'


import Dashboard from './screens/Dashboard'
import Login from './screens/Login'
import Step1 from './screens/RegisterStep1'
import Step2 from './screens/RegisterStep2'
import Step3 from './screens/RegisterStep3'
import Home from './screens/Home'
import Consultation from './screens/Consultation'
import { RegProvider } from './state/registration'
import ScrollToHash from './components/ScrollToHash'
import ConsultationTracker from './screens/ConsultationTracker'
import PreConsultation from './screens/PreConsultation'
import ConsultationDetails from './screens/ConsultationDetails'
import DoctorLogin from './screens/DoctorLogin'
import DoctorConsultations from './screens/DoctorConsultations'
import DoctorConsultationDetails from './screens/DoctorConsultationDetails'
import { RequireRole } from './screens/RequireRole'
import { getMe as fetchMe, type UserDto } from './api'

import CareHistory from './screens/CareHistory'
import ReferralLetter from './screens/ReferralLetter'

import { useNavigate } from 'react-router-dom'
import { logout as apiLogout } from './api'


// -------- Auth context (server is source of truth) --------
type AuthState = {
  user: UserDto | null
  loading: boolean
  refresh: () => Promise<void>
}
const AuthCtx = createContext<AuthState>({ user: null, loading: true, refresh: async () => {} })
export function useAuth() { return useContext(AuthCtx) }

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      setLoading(true)
      const u = await fetchMe()
      setUser(u)
      // optional: keep a copy for non-critical UI, but DO NOT trust for routing
      try { localStorage.setItem('gc_user', JSON.stringify(u ?? null)) } catch {}
    } catch {
      setUser(null)
      try { localStorage.removeItem('gc_user') } catch {}
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <AuthCtx.Provider value={{ user, loading, refresh: load }}>
      {children}
    </AuthCtx.Provider>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  const logoSrc = `${import.meta.env.BASE_URL}assets/logo.png`
  return (
    <div className="container">
      <header>
        <div className="nav">
          <div className="row" style={{ alignItems: 'center', gap: 10 }}>
            <img className="logo" src={logoSrc} alt="GodwitCare" />
            <strong
              style={{
                backgroundColor: 'green',
                color: 'white',
                padding: '2px 8px',
                borderRadius: 6,
                display: 'inline-block',
              }}
            >
              GodwitCare - Test Environment
            </strong>
          </div>
          <div className="navlinks">
            <Link to="/dashboard#top">Home</Link>
            <Link to="/dashboard#how">How it Works</Link>
            <Link to="/dashboard#features">Features</Link>
            <Link to="/dashboard#testimonials">Testimonials</Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div className="muted">Loading…</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Shell><Dashboard /></Shell>} />
      <Route path="/login" element={<Shell><Login /></Shell>} />
      <Route path="/register/1" element={<Shell><Step1 /></Shell>} />
      <Route path="/register/2" element={<Shell><Step2 /></Shell>} />
      <Route path="/register/3" element={<Shell><Step3 /></Shell>} />
      <Route path="/home" element={<Shell><Home /></Shell>} />
      <Route path="/consultation" element={<Shell><Consultation /></Shell>} />

      {/* Consultation flow */}
      <Route path="/consultation/tracker" element={<Shell><ConsultationTracker /></Shell>} />
      <Route path="/consultation/questionnaire" element={<Shell><PreConsultation /></Shell>} />
      <Route path="/consultation/details" element={<Shell><ConsultationDetails /></Shell>} />
      <Route path="/doctor/referral/:id" element={<Shell><ReferralLetter /></Shell>} />

      {/* Doctor login (public) */}
      <Route path="/doctor/login" element={<Shell><DoctorLogin /></Shell>} />

      {/* Care History - patient */}
      <Route path="/care-history" element={<Shell><CareHistory /></Shell>} />

      {/* Doctor-only routes */}
      <Route
        path="/doctor/consultations"
        element={
          <Shell>
            <RequireRole user={user} role="DOCTOR">
              <DoctorConsultations />
            </RequireRole>
          </Shell>
        }
      />
      <Route
        path="/doctor/consultations/:id"
        element={
          <Shell>
            <RequireRole user={user} role="DOCTOR">
              <DoctorConsultationDetails />
            </RequireRole>
          </Shell>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

// Kill any service worker (prevents stale shell/pages)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()))
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RegProvider>
      <HashRouter>
        <ScrollToHash />
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </HashRouter>
    </RegProvider>
  </React.StrictMode>
)
