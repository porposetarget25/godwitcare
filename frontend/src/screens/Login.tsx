// src/screens/Login.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api';
import { useAuth } from '../state/auth';
import { COUNTRY_OPTIONS } from '../lib/countries';
import { looksLikePhone, needsCountryPicker, resolveIdentifier } from '../lib/phone';

const DEFAULT_DIAL = '+91';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [primaryDial, setPrimaryDial] = useState(DEFAULT_DIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const phoneMode = looksLikePhone(username);
  const showCountryPicker = needsCountryPicker(username);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const u = await login(resolveIdentifier(username, primaryDial), password);
      // Immediately refresh auth context (so useAuth() has the user)
      await refresh();
      const isAdmin = !!u?.roles?.some((r) => typeof r === 'string' && r.toUpperCase().includes('ADMIN'));
      if (!isAdmin && !u?.otpVerified) {
        navigate('/verify-otp');
      } else {
        navigate(isAdmin ? '/admin/dashboard' : (u?.activated === false ? '/activate' : '/home'));
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section auth">
      <div className="auth-card">
        <div className="auth-head">
          <div className="auth-logo">🔐</div>
          <div>
            <h1 className="auth-title">Login</h1>
            <p className="auth-sub">Welcome back. Please sign in to continue.</p>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: '#fee2e2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              borderRadius: 10,
              padding: '10px 12px',
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="username">WhatsApp Number/Email</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {showCountryPicker && (
                <select
                  aria-label="Country code"
                  value={primaryDial}
                  onChange={(e) => setPrimaryDial(e.target.value)}
                  style={{ minWidth: 140 }}
                >
                  {COUNTRY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
              <input
                id="username"
                type="text"
                placeholder={phoneMode ? '1234567890 or +<code>1234567890' : 'e.g. +1234567890 or email'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            {showCountryPicker && (
              <div className="muted small" style={{ marginTop: 4 }}>
                Select the country you registered with, then enter your number without the leading 0.
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div className="auth-row">
            <label className="chk">
              <input type="checkbox" /> Remember me
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link to="/forgot-password" className="muted small">Forgot password?</Link>
              <Link to="/register/1" className="muted small">New here? Register</Link>
            </div>
          </div>

          <button type="submit" className="btn block" disabled={loading}>
            {loading ? 'Signing in…' : 'Continue'}
          </button>
        </form>
      </div>
    </section>
  );
}
