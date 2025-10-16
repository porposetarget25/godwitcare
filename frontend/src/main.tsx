// src/main.tsx
import React from 'react'
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
import type { UserDto } from './api'
import CareHistory from './screens/CareHistory'

// read the user placed in localStorage by your login()
function useCurrentUser(): UserDto | null {
  try {
    const raw = localStorage.getItem('gc_user')
    return raw ? (JSON.parse(raw) as UserDto) : null
  } catch {
    return null
  }
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
  const user = useCurrentUser()

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RegProvider>
      <HashRouter>
        <ScrollToHash />
        <AppRoutes />
      </HashRouter>
    </RegProvider>
  </React.StrictMode>
)
