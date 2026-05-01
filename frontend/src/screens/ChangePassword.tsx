import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const res = await forgotPassword(identifier);
    setMsg(res.message || 'OTP sent to your registered WhatsApp number.');
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
    <section className="section auth">
      <div className="auth-card">
        <h1 className="auth-title">Change Password</h1>
        <p className="help">We will send an OTP to your registered WhatsApp number.</p>
        <button type="button" className="btn block" onClick={sendOtp}>Send OTP to WhatsApp</button>

        <form className="auth-form" onSubmit={verifyOtp}>
          <div className="field">
            <label>Enter OTP</label>
            <input value={otp} onChange={e => setOtp(e.target.value)} required />
          </div>
          <button className="btn block" type="submit">Verify OTP</button>
        </form>

        <form className="auth-form" onSubmit={submitPassword}>
          <div className="field"><label>New Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          <div className="field"><label>Confirm Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></div>
          <button className="btn block" type="submit">Update Password</button>
        </form>
        {!!msg && <p className="help">{msg}</p>}
        {!!error && <p className="help" style={{ color: '#b91c1c' }}>{error}</p>}
      </div>
    </section>
  );
}
