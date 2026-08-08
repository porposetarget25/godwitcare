import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword, resetPassword, verifyForgotPasswordOtp } from '../api';
import { useAuth } from '../state/auth';

export default function ChangePassword() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const identifier = useMemo(() => user?.username || user?.email || '', [user?.username, user?.email]);
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function sendOtp() {
    setError('');
    setMsg('');
    if (!identifier) return setError('Unable to identify your account. Please login again.');
    try {
      const res = await forgotPassword(identifier);
      setMsg(res.message || 'the otp has been sent to the registered whatsapp number');
    } catch (e: any) {
      setError(e?.message || 'Failed to send OTP. Please try again.');
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    if (!identifier) return setError('Unable to identify your account. Please login again.');
    const res = await verifyForgotPasswordOtp(identifier, otp);
    setToken(res.resetToken);
    setMsg('OTP verified successfully. You can now set a new password.');
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    if (!token) return setError('Please verify OTP before changing the password.');
    if (password !== confirmPassword) return setError('New password and confirm password do not match.');
    const res = await resetPassword(token, password);
    setMsg(res.message || 'Password updated successfully.');
    setTimeout(() => navigate('/home'), 1000);
  }

  return (
    <>
      <div className="page-head">
        <div className="page-title">Change Password</div>
        <Link to="/profile" className="bs">‹ Profile</Link>
      </div>

      {!!msg && <div className="notice n-info"><i className="ti ti-circle-check" aria-hidden="true" />{msg}</div>}
      {!!error && <div className="notice n-warn"><i className="ti ti-alert-triangle" aria-hidden="true" />{error}</div>}

      <div className="card">
        <div className="ct">Step 1 — Verify it&apos;s you</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>We will send an OTP to your registered WhatsApp number.</p>
        <button type="button" className="bp" onClick={sendOtp}>Send OTP to WhatsApp</button>

        <form onSubmit={verifyOtp} style={{ marginTop: 14 }}>
          <div className="fi">
            <label className="fl2">Enter OTP</label>
            <input className="otp-input" value={otp} onChange={e => setOtp(e.target.value)} required />
          </div>
          <button className="bs" type="submit">Verify OTP</button>
        </form>
      </div>

      <div className="card">
        <div className="ct">Step 2 — Set a new password</div>
        <form onSubmit={submitPassword}>
          <div className="g2">
            <div className="fi"><label className="fl2">New Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
            <div className="fi"><label className="fl2">Confirm Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></div>
          </div>
          <button className="bp btn-block" type="submit">Update Password</button>
        </form>
      </div>
    </>
  );
}
