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
import Documents from './screens/Documents';
import PrescriptionView from './screens/PrescriptionView';
import ReferralView from './screens/ReferralView';
import PaymentHistory from './screens/PaymentHistory';
import DoctorLogin from './screens/DoctorLogin';
import DoctorConsultations from './screens/DoctorConsultations';
import DoctorConsultationDetails from './screens/DoctorConsultationDetails';
import DoctorDashboard from './screens/DoctorDashboard';
import DoctorCalendar from './screens/DoctorCalendar';
import DoctorAvailability from './screens/DoctorAvailability';
import DoctorAvailabilityForm from './screens/DoctorAvailabilityForm';
import DoctorLeave from './screens/DoctorLeave';
import DoctorLeaveForm from './screens/DoctorLeaveForm';
import DoctorSettings from './screens/DoctorSettings';
import DoctorPrescriptionView from './screens/DoctorPrescriptionView';
import DoctorGenerateLetter from './screens/DoctorGenerateLetter';
import { RequireRole, RequireAuth } from './screens/RequireRole';
import CareHistory from './screens/CareHistory';
import ReferralLetter from './screens/ReferralLetter';
import Profile from './screens/Profile';
import ForgotPassword from './screens/ForgotPassword';
import ResetPassword from './screens/ResetPassword';
import ChangePassword from './screens/ChangePassword';
import AdminDashboard from './screens/AdminDashboard';
import OtpVerification from './screens/OtpVerification';
import ActivationPayment from './screens/ActivationPayment';
import PatientShell, { type PatientNavId } from './components/portal/PatientShell';
import DoctorShell, { type DoctorNavId } from './components/portal/DoctorShell';
import './styles/portal.css';

// NEW: shared auth context
import { AuthProvider, isDoctorUser, useAuth } from './state/auth';
import { PatientProvider } from './state/patient';
import { logout, resolveApiUrl, API_BASE_URL } from './api';
import AuthedAvatar from './components/AuthedAvatar';

// ---------- Shell layout ----------
function Shell({ children }: { children: React.ReactNode }) {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
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
            <img className="logo" src={logoColorSrc} alt="GodwitCare" />
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
                    <AuthedAvatar
                      src={user.photoUrl ? resolveApiUrl(API_BASE_URL, user.photoUrl) : null}
                      className="menu-btn-avatar"
                      fallback={(
                        <span className="menu-btn-initials">
                          {`${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
                            || (user.email?.[0]?.toUpperCase() ?? '?')}
                        </span>
                      )}
                    />
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

// Profile and Change Password are shared between patients and doctors.
// Doctors get the DoctorShell (Settings is their equivalent nav item); patients get PatientShell.
function RoleAwareShell({ activeId, children }: { activeId: PatientNavId; children: React.ReactNode }) {
  const { user } = useAuth();
  if (isDoctorUser(user)) return <DoctorShell activeId="settings">{children}</DoctorShell>;
  return <PatientShell activeId={activeId}>{children}</PatientShell>;
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
          <PatientShell activeId="tracker">
            <RequireAuth user={user} loading={loading}>
              <Consultation />
            </RequireAuth>
          </PatientShell>
        }
      />
      <Route
        path="/consultation/tracker"
        element={
          <PatientShell activeId="tracker">
            <RequireAuth user={user} loading={loading}>
              <ConsultationTracker />
            </RequireAuth>
          </PatientShell>
        }
      />
      <Route
        path="/consultation/questionnaire"
        element={
          <PatientShell activeId="tracker">
            <RequireAuth user={user} loading={loading}>
              <PreConsultation />
            </RequireAuth>
          </PatientShell>
        }
      />
      <Route
        path="/documents"
        element={
          <PatientShell activeId="documents">
            <RequireAuth user={user} loading={loading}>
              <Documents />
            </RequireAuth>
          </PatientShell>
        }
      />
      <Route
        path="/prescription"
        element={
          <PatientShell activeId="carehistory">
            <RequireAuth user={user} loading={loading}>
              <PrescriptionView />
            </RequireAuth>
          </PatientShell>
        }
      />
      <Route
        path="/referral"
        element={
          <PatientShell activeId="carehistory">
            <RequireAuth user={user} loading={loading}>
              <ReferralView />
            </RequireAuth>
          </PatientShell>
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
      <Route path="/profile" element={<RoleAwareShell activeId="profile"><RequireAuth user={user} loading={loading}><Profile /></RequireAuth></RoleAwareShell>} />
      <Route path="/payment-history" element={<PatientShell activeId="paymenthistory"><RequireAuth user={user} loading={loading}><PaymentHistory /></RequireAuth></PatientShell>} />
      <Route path="/activate" element={<Shell>{user ? <ActivationPayment /> : <Navigate to="/login" replace />}</Shell>} />
      <Route path="/forgot-password" element={<Shell><ForgotPassword /></Shell>} />
      <Route path="/reset-password" element={<Shell><ResetPassword /></Shell>} />
      <Route path="/change-password" element={<RoleAwareShell activeId="profile">{user ? <ChangePassword /> : <Navigate to="/login" replace />}</RoleAwareShell>} />
      <Route
        path="/doctor/referral/:id"
        element={
          <DoctorShell activeId="consultations">
            <RequireRole user={user} role="DOCTOR" loading={loading}>
              <ReferralLetter />
            </RequireRole>
          </DoctorShell>
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
          loading ? null
            : !user ? <Navigate to="/login" replace />
            : !user.otpVerified ? <Navigate to="/verify-otp" replace />
            : !user.activated ? <Navigate to="/activate" replace />
            : isDoctorUser(user) ? <Navigate to="/doctor/dashboard" replace />
            : <PatientShell activeId="home"><Home /></PatientShell>
        }
      />
      <Route
        path="/care-history"
        element={
          <PatientShell activeId="carehistory">
            <RequireAuth user={user} loading={loading}>
              <CareHistory />
            </RequireAuth>
          </PatientShell>
        }
      />

      <Route
        path="/doctor/dashboard"
        element={
          <DoctorShell activeId="dashboard">
            <RequireRole user={user} role="DOCTOR" loading={loading}>
              <DoctorDashboard />
            </RequireRole>
          </DoctorShell>
        }
      />
      <Route
        path="/doctor/calendar"
        element={
          <DoctorShell activeId="calendar">
            <RequireRole user={user} role="DOCTOR" loading={loading}>
              <DoctorCalendar />
            </RequireRole>
          </DoctorShell>
        }
      />
      <Route
        path="/doctor/consultations"
        element={
          <DoctorShell activeId="consultations">
            <RequireRole user={user} role="DOCTOR" loading={loading}>
              <DoctorConsultations />
            </RequireRole>
          </DoctorShell>
        }
      />
      <Route
        path="/doctor/consultations/:id"
        element={
          <DoctorShell activeId="consultations">
            <RequireRole user={user} role="DOCTOR" loading={loading}>
              <DoctorConsultationDetails />
            </RequireRole>
          </DoctorShell>
        }
      />
      <Route
        path="/doctor/consultations/:id/care-history"
        element={
          <DoctorShell activeId="consultations">
            <RequireRole user={user} role="DOCTOR" loading={loading}>
              <CareHistory />
            </RequireRole>
          </DoctorShell>
        }
      />
      <Route
        path="/doctor/consultations/:id/prescription"
        element={
          <DoctorShell activeId="consultations">
            <RequireRole user={user} role="DOCTOR" loading={loading}>
              <DoctorPrescriptionView />
            </RequireRole>
          </DoctorShell>
        }
      />
      <Route
        path="/doctor/consultations/:id/letter"
        element={
          <DoctorShell activeId="consultations">
            <RequireRole user={user} role="DOCTOR" loading={loading}>
              <DoctorGenerateLetter />
            </RequireRole>
          </DoctorShell>
        }
      />
      <Route
        path="/doctor/availability"
        element={
          <DoctorShell activeId="availability">
            <RequireRole user={user} role="DOCTOR" loading={loading}>
              <DoctorAvailability />
            </RequireRole>
          </DoctorShell>
        }
      />
      <Route
        path="/doctor/availability/new"
        element={
          <DoctorShell activeId="availability">
            <RequireRole user={user} role="DOCTOR" loading={loading}>
              <DoctorAvailabilityForm />
            </RequireRole>
          </DoctorShell>
        }
      />
      <Route
        path="/doctor/leave"
        element={
          <DoctorShell activeId="leave">
            <RequireRole user={user} role="DOCTOR" loading={loading}>
              <DoctorLeave />
            </RequireRole>
          </DoctorShell>
        }
      />
      <Route
        path="/doctor/leave/new"
        element={
          <DoctorShell activeId="leave">
            <RequireRole user={user} role="DOCTOR" loading={loading}>
              <DoctorLeaveForm />
            </RequireRole>
          </DoctorShell>
        }
      />
      <Route
        path="/doctor/settings"
        element={
          <DoctorShell activeId="settings">
            <RequireRole user={user} role="DOCTOR" loading={loading}>
              <DoctorSettings />
            </RequireRole>
          </DoctorShell>
        }
      />
      <Route path="/doctor/appointments" element={<Navigate to="/doctor/dashboard" replace />} />

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
