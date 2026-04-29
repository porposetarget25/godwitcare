import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  React.useEffect(() => {
    const tokenFromQuery = searchParams.get('token');
    if (tokenFromQuery) setToken(tokenFromQuery);
  }, [searchParams]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await resetPassword(token, password);
    setMsg(r.message || 'Password reset successful');
    setTimeout(() => navigate('/home'), 1000);
  }

  return (
    <section className="section auth">
      <div className="auth-card">
        <h1 className="auth-title">Reset Password</h1>
        <form className="auth-form" onSubmit={submit}>
          <div className="field"><label>Reset Token</label><input value={token} onChange={e => setToken(e.target.value)} required /></div>
          <div className="field"><label>New Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          <button className="btn block" type="submit">Reset Password</button>
        </form>
        {!!msg && <p className="help">{msg}</p>}
        <Link className="muted small" to="/login">Back to login</Link>
      </div>
    </section>
  );
}
