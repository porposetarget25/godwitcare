import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOtpToWhatsApp, verifyOtp } from '../api';
import { useAuth } from '../state/auth';

export default function OtpVerification() {
  const nav = useNavigate();
  const { user, refresh } = useAuth();
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSendOtp() {
    setError(null);
    setMessage(null);
    setSending(true);
    try {
      await sendOtpToWhatsApp();
      setMessage('OTP sent successfully to your WhatsApp number.');
    } catch (e: any) {
      setError(e?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setVerifying(true);
    try {
      await verifyOtp(otp.trim());
      await refresh();
      nav('/home');
    } catch (e: any) {
      setError(e?.message || 'Invalid or expired OTP.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <section className="section auth">
      <div className="auth-card">
        <div className="auth-head">
          <div className="auth-logo">📲</div>
          <div>
            <h1 className="auth-title">OTP Verification</h1>
            <p className="auth-sub">Verify your account before continuing.</p>
          </div>
        </div>

        <p className="muted small" style={{ marginBottom: 12 }}>
          Number: <strong>{user?.username || 'Not available'}</strong>
        </p>

        <button type="button" className="btn block" onClick={onSendOtp} disabled={sending}>
          {sending ? 'Sending OTP…' : 'Send OTP to WhatsApp'}
        </button>

        <form className="auth-form" onSubmit={onVerify} style={{ marginTop: 12 }}>
          <div className="field">
            <label htmlFor="otp">Enter OTP</label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit OTP"
              maxLength={6}
              required
            />
          </div>

          {message && <div className="small" style={{ color: '#166534' }}>{message}</div>}
          {error && <div className="small" style={{ color: '#b91c1c' }}>{error}</div>}

          <button type="submit" className="btn block" disabled={verifying}>
            {verifying ? 'Verifying…' : 'Verify OTP'}
          </button>
        </form>
      </div>
    </section>
  );
}
