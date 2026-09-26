import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword, verifyForgotPasswordOtp } from '../api';
import { COUNTRY_OPTIONS } from '../lib/countries';
import { looksLikePhone, needsCountryPicker, resolveIdentifier } from '../lib/phone';

const DEFAULT_DIAL = '+44';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [primaryDial, setPrimaryDial] = useState(DEFAULT_DIAL);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();

  const phoneMode = looksLikePhone(identifier);
  const showCountryPicker = needsCountryPicker(identifier);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const res = await forgotPassword(resolveIdentifier(identifier, primaryDial));
      setMessage(res.message || 'Request submitted.');
    } catch (e: any) {
      setError(e?.message || 'Failed to send OTP. Please try again.');
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const res = await verifyForgotPasswordOtp(resolveIdentifier(identifier, primaryDial), otp);
    sessionStorage.setItem('passwordResetToken', res.resetToken);
    navigate('/reset-password');
  }

  return (
    <section className="section auth">
      <div className="auth-card">
        <h1 className="auth-title">Forgot Password</h1>
        <form className="auth-form" onSubmit={submit}>
          <div className="field">
            <label>WhatsApp Number / Email</label>
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
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder={phoneMode ? '1234567890 or +<code>1234567890' : 'e.g. +1234567890 or email'}
                required
              />
            </div>
            {showCountryPicker && (
              <div className="muted small" style={{ marginTop: 4 }}>
                Select the country you registered with, then enter your number without the leading 0.
              </div>
            )}
          </div>
          <button className="btn block" type="submit">Generate OTP</button>
        </form>
        {!!message && <p className="help">{message}</p>}
        {!!error && <p className="help" style={{ color: '#b91c1c' }}>{error}</p>}
        <form className="auth-form" onSubmit={verifyOtp}>
          <div className="field">
            <label>Enter OTP</label>
            <input value={otp} onChange={e => setOtp(e.target.value)} required />
          </div>
          <button className="btn block" type="submit">Verify OTP</button>
        </form>
        <Link className="muted small" to="/login">Back to login</Link>
      </div>
    </section>
  );
}
