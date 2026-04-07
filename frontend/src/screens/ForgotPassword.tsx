import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await forgotPassword(identifier);
    setMessage(res.message || 'Request submitted.');
    setToken(res.resetToken || '');
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
          <button className="btn block" type="submit">Generate Reset Token</button>
        </form>
        {!!message && <p className="help">{message}</p>}
        {!!token && <p className="help"><strong>Temporary reset token:</strong> {token}</p>}
        <Link className="muted small" to="/reset-password">Already have token? Reset now</Link>
      </div>
    </section>
  );
}
