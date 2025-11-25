// src/screens/DoctorLogin.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';
import { useAuth } from '../state/auth';

export default function DoctorLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { refresh } = useAuth();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(email, password); // must be a DOCTOR account
      await refresh();              // update global auth state
      nav('/doctor/consultations');
    } catch {
      alert('Login failed');
    }
  }

  return (
    <section className="section">
      <h1 className="page-title">Doctor Login</h1>
      <form className="form" onSubmit={submit}>
        <div className="field">
          <label>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="actions">
          <button className="btn">Login</button>
        </div>
      </form>
    </section>
  );
}
