// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';

import Dashboard from './screens/Dashboard';
import Login from './screens/Login';
import Step1 from './screens/RegisterStep1';
import Step2 from './screens/RegisterStep2';
import Step3 from './screens/RegisterStep3';
import Home from './screens/Home';
import Consultation from './screens/Consultation';
import { RegProvider } from './state/registration';
import ScrollToHash from './components/ScrollToHash';
import ConsultationTracker from './screens/ConsultationTracker';
import PreConsultation from './screens/PreConsultation';
import ConsultationDetails from './screens/ConsultationDetails';
import DoctorLogin from './screens/DoctorLogin';
import DoctorConsultations from './screens/DoctorConsultations';
import DoctorConsultationDetails from './screens/DoctorConsultationDetails';
import { RequireRole } from './screens/RequireRole';
import CareHistory from './screens/CareHistory';
import ReferralLetter from './screens/ReferralLetter';
import Profile from './screens/Profile';
import ForgotPassword from './screens/ForgotPassword';
import ResetPassword from './screens/ResetPassword';
import ChangePassword from './screens/ChangePassword';
import AdminDashboard from './screens/AdminDashboard';
import OtpVerification from './screens/OtpVerification';

// NEW: shared auth context
import { AuthProvider, useAuth } from './state/auth';
import { logout } from './api';

// ---------- Shell layout ----------
function Shell({ children }: { children: React.ReactNode }) {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const logoSrc = `${import.meta.env.BASE_URL}assets/logo.png`;
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);


  React.useEffect(() => {
    if (!menuOpen) return;

    function handleDocumentClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [menuOpen]);

  async function handleLogout() {
    await logout();
    await refresh();
    setMenuOpen(false);
    navigate('/dashboard');
  }

  async function handleTopNavClick(hash: '#top' | '#how' | '#features' | '#testimonials') {
    if (user) {
      await logout();
      await refresh();
      setMenuOpen(false);
      navigate('/login');
      return;
    }
    navigate(`/dashboard${hash}`);
  }

  return (
    <div className="container">
      <header>
        <div className="nav">
          <div className="nav-left">
            <div className="logoBadge">
              <img className="logo" src={logoSrc} alt="GodwitCare" />
            </div>
            <span className="envBadge">GodwitCare - Test Environment</span>
          </div>

          <div className="navlinks">
            <button type="button" className="top-nav-btn" onClick={() => void handleTopNavClick('#top')}>Home</button>
            <button type="button" className="top-nav-btn" onClick={() => void handleTopNavClick('#how')}>How it Works</button>
            <button type="button" className="top-nav-btn" onClick={() => void handleTopNavClick('#features')}>Features</button>
            <button type="button" className="top-nav-btn" onClick={() => void handleTopNavClick('#testimonials')}>Testimonials</button>
            {user ? (
              <div className="menu-wrap" ref={menuRef}>
                <button
                  type="button"
                  className="menu-btn"
                  aria-label="Open account menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen(prev => !prev)}
                >
                  ☰
                </button>
                {menuOpen ? (
                  <div className="menu-dropdown">
                    <Link to="/profile" onClick={() => setMenuOpen(false)}>Update Profile</Link>
                    <button type="button" className="dropdown-action-btn" onClick={() => { setMenuOpen(false); navigate(`/home?openPayments=${Date.now()}#payments`); }}>Payments</button>
                    <Link to="/change-password" onClick={() => setMenuOpen(false)}>Change Password</Link>
                    <button type="button" className="dropdown-action-btn" onClick={handleLogout}>Logout</button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

// ---------- Routes ----------
function AppRoutes() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      {/* PUBLIC routes - these should not wait on auth */}
      <Route
        path="/"
        element={<Navigate to="/dashboard" replace />}
      />
      <Route
        path="/dashboard"
        element={
          <Shell>
            <Dashboard />
          </Shell>
        }
      />
      <Route
        path="/login"
        element={
          <Shell>
            <Login />
          </Shell>
        }
      />
      <Route
        path="/register/1"
        element={
          <Shell>
            <Step1 />
          </Shell>
        }
      />
      <Route
        path="/register/2"
        element={
          <Shell>
            <Step2 />
          </Shell>
        }
      />
      <Route
        path="/register/3"
        element={
          <Shell>
            <Step3 />
          </Shell>
        }
      />
      <Route
        path="/verify-otp"
        element={
          <Shell>
            {user ? <OtpVerification /> : <Navigate to="/login" replace />}
          </Shell>
        }
      />
      <Route
        path="/consultation"
        element={
          <Shell>
            <Consultation />
          </Shell>
        }
      />
      <Route
        path="/consultation/tracker"
        element={
          <Shell>
            <ConsultationTracker />
          </Shell>
        }
      />
      <Route
        path="/consultation/questionnaire"
        element={
          <Shell>
            <PreConsultation />
          </Shell>
        }
      />
      <Route
        path="/consultation/details"
        element={
          <Shell>
            <ConsultationDetails />
          </Shell>
        }
      />
      <Route
        path="/doctor/login"
        element={
          <Shell>
            <DoctorLogin />
          </Shell>
        }
      />
      <Route path="/profile" element={<Shell><Profile /></Shell>} />
      <Route path="/forgot-password" element={<Shell><ForgotPassword /></Shell>} />
      <Route path="/reset-password" element={<Shell><ResetPassword /></Shell>} />
      <Route path="/change-password" element={<Shell>{user ? <ChangePassword /> : <Navigate to="/login" replace />}</Shell>} />
      <Route
        path="/doctor/referral/:id"
        element={
          <Shell>
            <ReferralLetter />
          </Shell>
        }
      />

      {/* ROUTES THAT NEED AUTH */}

      <Route
        path="/admin/dashboard"
        element={
          <Shell>
            <RequireRole user={user} role="ADMIN" loading={loading}>
              <AdminDashboard />
            </RequireRole>
          </Shell>
        }
      />
      <Route
        path="/home"
        element={
          <Shell>
            {user && !user.otpVerified ? <Navigate to="/verify-otp" replace /> : <Home />}
          </Shell>
        }
      />
      <Route
        path="/care-history"
        element={
          <Shell>
            <CareHistory />
          </Shell>
        }
      />

      <Route
        path="/doctor/consultations"
        element={
          <Shell>
            <RequireRole user={user} role="DOCTOR" loading={loading}>
              <DoctorConsultations />
            </RequireRole>
          </Shell>
        }
      />
      <Route
        path="/doctor/consultations/:id"
        element={
          <Shell>
            <RequireRole user={user} role="DOCTOR" loading={loading}>
              <DoctorConsultationDetails />
            </RequireRole>
          </Shell>
        }
      />

      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  );
}


// Kill any service worker (prevents stale shell/pages)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()));
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RegProvider>
      <HashRouter>
        <ScrollToHash />
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </HashRouter>
    </RegProvider>
  </React.StrictMode>,
);
