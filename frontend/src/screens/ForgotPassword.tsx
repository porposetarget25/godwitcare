import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword, verifyForgotPasswordOtp } from '../api';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await forgotPassword(identifier);
    setMessage(res.message || 'Request submitted.');
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const res = await verifyForgotPasswordOtp(identifier, otp);
    navigate(`/reset-password?token=${encodeURIComponent(res.resetToken)}`);
  }

  return (
    <section className="section auth">
      <div className="auth-card">
        <h1 className="auth-title">Forgot Password</h1>
        <form className="auth-form" onSubmit={submit}>
          <div className="field">
            <label>WhatsApp Number or Email</label>
            <input value={identifier} onChange={e => setIdentifier(e.target.value)} required />
          </div>
          <button className="btn block" type="submit">Generate OTP</button>
        </form>
        {!!message && <p className="help">{message}</p>}
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
