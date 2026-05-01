import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api';

export default function ResetPassword() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  React.useEffect(() => {
    const tokenFromStorage = sessionStorage.getItem('passwordResetToken');
    if (tokenFromStorage) setToken(tokenFromStorage);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setMsg('Reset session is missing or expired. Please request a new OTP.');
      return;
    }
    if (password !== confirmPassword) {
      setMsg('New password and confirm password do not match.');
      return;
    }
    const r = await resetPassword(token, password);
    setMsg(r.message || 'Password reset successful');
    sessionStorage.removeItem('passwordResetToken');
    // Password reset does not establish an authenticated session.
    // Send the user to login so auth context/session gets initialized correctly.
    setTimeout(() => navigate('/login'), 1000);
  }

  return (
    <section className="section auth">
      <div className="auth-card">
        <h1 className="auth-title">Reset Password</h1>
        <form className="auth-form" onSubmit={submit}>
          <div className="field"><label>New Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          <div className="field"><label>Confirm Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></div>
          <button className="btn block" type="submit">Reset Password</button>
        </form>
        {!!msg && <p className="help">{msg}</p>}
        <Link className="muted small" to="/login">Back to login</Link>
      </div>
    </section>
  );
}
