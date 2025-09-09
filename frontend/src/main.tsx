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


function Shell({ children }: { children: React.ReactNode }) {
  // Use BASE_URL so assets work both locally and on GitHub Pages (with base=/godwitcare/)
  const logoSrc = `${import.meta.env.BASE_URL}assets/logo.png`

  return (
    <div className="container">
      <header>
        <div className="nav">
          <div className="row" style={{ alignItems: 'center', gap: 10 }}>
            <img className="logo" src={logoSrc} alt="GodwitCare" />
            <strong>GodwitCare</strong>
          </div>
          <div className="navlinks">
              <Link to="/dashboard#top">Home</Link>
              <Link to="/dashboard#how">How it Works</Link>
              <Link to="/dashboard#features">Features</Link>
              <Link to="/dashboard#testimonials">Testimonials</Link>
              <Link to="/consultation">Consultation</Link>
        </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RegProvider>
      <HashRouter>
        <ScrollToHash /> 
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Shell><Dashboard /></Shell>} />
          <Route path="/login" element={<Shell><Login /></Shell>} />
          <Route path="/register/1" element={<Shell><Step1 /></Shell>} />
          <Route path="/register/2" element={<Shell><Step2 /></Shell>} />
          <Route path="/register/3" element={<Shell><Step3 /></Shell>} />
          <Route path="/home" element={<Shell><Home /></Shell>} />
          <Route path="/consultation" element={<Shell><Consultation /></Shell>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </HashRouter>
    </RegProvider>
  </React.StrictMode>
)
