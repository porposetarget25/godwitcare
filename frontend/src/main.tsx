import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import Dashboard from './screens/Dashboard'
import Login from './screens/Login'
import Step1 from './screens/RegisterStep1'
import Step2 from './screens/RegisterStep2'
import Step3 from './screens/RegisterStep3'
import Home from './screens/Home'
import Consultation from './screens/Consultation'
import { RegProvider } from './state/registration'

function Shell({ children }: { children: React.ReactNode }){
  return (
    <div className="container">
      <header>
        <div className="nav">
          <div className="row" style={{alignItems:'center', gap:10}}>
            <img className="logo" src="/assets/logo.png" alt="GodwitCare"/>
            <strong>GodwitCare</strong>
          </div>
          <div className="navlinks">
            <Link to="/dashboard">Home</Link>
            <a href="#how">How it Works</a>
            <a href="#features">Features</a>
            <Link to="/consultation">Consultation</Link>
            <a href="#testimonials">Testimonials</a>
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
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace/>} />
          <Route path="/dashboard" element={<Shell><Dashboard/></Shell>} />
          <Route path="/login" element={<Shell><Login/></Shell>} />
          <Route path="/register/1" element={<Shell><Step1/></Shell>} />
          <Route path="/register/2" element={<Shell><Step2/></Shell>} />
          <Route path="/register/3" element={<Shell><Step3/></Shell>} />
          <Route path="/home" element={<Shell><Home/></Shell>} />
          <Route path="/consultation" element={<Shell><Consultation/></Shell>} />
          <Route path="*" element={<Navigate to="/dashboard" replace/>} />
        </Routes>
      </BrowserRouter>
    </RegProvider>
  </React.StrictMode>
)
