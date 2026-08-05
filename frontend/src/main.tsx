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
import DoctorAppointments from './screens/DoctorAppointments';
import { RequireRole } from './screens/RequireRole';
import CareHistory from './screens/CareHistory';
import ReferralLetter from './screens/ReferralLetter';
import Profile from './screens/Profile';
import ForgotPassword from './screens/ForgotPassword';
import ResetPassword from './screens/ResetPassword';
import ChangePassword from './screens/ChangePassword';
import AdminDashboard from './screens/AdminDashboard';
import OtpVerification from './screens/OtpVerification';
import ActivationPayment from './screens/ActivationPayment';

// NEW: shared auth context
import { AuthProvider, useAuth } from './state/auth';
import { PatientProvider } from './state/patient';
import { logout } from './api';

// ---------- Shell layout ----------
function Shell({ children }: { children: React.ReactNode }) {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const logoSrc = `${import.meta.env.BASE_URL}assets/logo-header.png`;
  const logoColorSrc = `${import.meta.env.BASE_URL}assets/logo-header-color.png`;
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);


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

  React.useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  async function handleLogout() {
    await logout();
    await refresh();
    setMenuOpen(false);
    navigate('/dashboard');
  }

  function handleTopNavClick(hash: '#top' | '#how' | '#features' | '#testimonials') {
    setMobileMenuOpen(false);
    navigate(`/dashboard${hash}`);
  }

  return (
    <>
      <header>
        <div className="nav">
          <div className="nav-left">
            <img className="logo" src={logoSrc} alt="GodwitCare" />
            <span className="envBadge">Test Environment</span>
          </div>

          {!user ? (
            <nav className="navlinks">
              <button type="button" className="nav-link-btn" onClick={() => handleTopNavClick('#top')}>Home</button>
              <button type="button" className="nav-link-btn" onClick={() => handleTopNavClick('#how')}>How It Works</button>
              <button type="button" className="nav-link-btn" onClick={() => handleTopNavClick('#features')}>Features</button>
              <button type="button" className="nav-link-btn" onClick={() => handleTopNavClick('#testimonials')}>Testimonials</button>
            </nav>
          ) : null}

          <div className="nav-right">
            {user ? (
              <div className="menu-wrap" ref={menuRef}>
                <button
                  type="button"
                  className="menu-btn"
                  aria-label="Open account menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen(prev => !prev)}
                >
                  <span className="menu-btn-avatar-wrap">
                    {user.photoUrl ? (
                      <img className="menu-btn-avatar" src={user.photoUrl} alt="" />
                    ) : (
                      <span className="menu-btn-initials">
                        {`${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
                          || (user.email?.[0]?.toUpperCase() ?? '?')}
                      </span>
                    )}
                  </span>
                  <span className="menu-btn-name">{user.firstName}</span>
                  <span className="menu-btn-chevron" aria-hidden="true">▾</span>
                </button>
                {menuOpen ? (
                  <div className="menu-dropdown">
                    <div className="menu-dropdown-header">
                      <span className="menu-dropdown-name">{user.firstName} {user.lastName}</span>
                      <span className="menu-dropdown-email">{user.email}</span>
                    </div>
                    <div className="menu-dropdown-divider" />
                    <Link to="/profile" onClick={() => setMenuOpen(false)}>Update Profile</Link>
                    <button type="button" className="dropdown-action-btn" onClick={() => { setMenuOpen(false); navigate('/payment-history'); }}>Payment History</button>
                    <Link to="/change-password" onClick={() => setMenuOpen(false)}>Change Password</Link>
                    <button type="button" className="dropdown-action-btn" onClick={handleLogout}>Logout</button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="nav-auth-desktop">
                <Link to="/login" className="nav-login-link">Login</Link>
                <Link to="/register/1" className="nav-signup-btn">Register</Link>
              </div>
            )}
            {!user ? (
              <Link to="/login" className="nav-mobile-login-btn" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
            ) : null}
            {!user ? (
              <button
                type="button"
                className="mobile-menu-toggle"
                aria-label="Open menu"
                onClick={() => setMobileMenuOpen(true)}
              >
                <span className="hamburger-icon">
                  <span /><span /><span />
                </span>
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {!user && mobileMenuOpen ? (
        <div className="mobile-menu-overlay">
          <div className="mobile-menu-topbar">
            <img className="mobile-menu-logo" src={logoColorSrc} alt="GodwitCare" />
            <div className="mobile-menu-topbar-actions">
              {!user ? (
                <Link to="/login" className="nav-mobile-login-btn" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
              ) : null}
              <button
                type="button"
                className="mobile-menu-close"
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
              >
                ✕
              </button>
            </div>
          </div>

          <nav className="mobile-menu-list">
            <button type="button" onClick={() => handleTopNavClick('#top')}>Home</button>
            <button type="button" onClick={() => handleTopNavClick('#how')}>How It Works</button>
            <button type="button" onClick={() => handleTopNavClick('#features')}>Features</button>
            <button type="button" onClick={() => handleTopNavClick('#testimonials')}>Testimonials</button>
          </nav>

          <div className="mobile-menu-cta">
            <Link to="/register/1" className="mobile-menu-cta-btn" onClick={() => setMobileMenuOpen(false)}>Register</Link>
          </div>
        </div>
      ) : null}

      <div className="container">
        <main>{children}</main>
      </div>
    </>
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
      <Route path="/payment-history" element={<Shell><Home /></Shell>} />
      <Route path="/activate" element={<Shell>{user ? <ActivationPayment /> : <Navigate to="/login" replace />}</Shell>} />
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
            {user && !user.otpVerified ? <Navigate to="/verify-otp" replace /> : user && !user.activated ? <Navigate to="/activate" replace /> : <Home />}
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
        path="/doctor/consultations/:id/care-history"
        element={
          <Shell>
            <RequireRole user={user} role="DOCTOR" loading={loading}>
              <CareHistory />
            </RequireRole>
          </Shell>
        }
      />
      <Route
        path="/doctor/appointments"
        element={
          <Shell>
            <RequireRole user={user} role="DOCTOR" loading={loading}>
              <DoctorAppointments />
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
          <PatientProvider>
            <AppRoutes />
          </PatientProvider>
        </AuthProvider>
      </HashRouter>
    </RegProvider>
  </React.StrictMode>,
);
