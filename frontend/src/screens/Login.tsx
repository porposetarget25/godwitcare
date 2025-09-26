// src/screens/Login.tsx
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api'   // session login

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // Use WhatsApp number as username
      await login(username, password)
      navigate('/home')
    } catch (err: any) {
      setError(err?.message || 'Login failed')
    } finally {
      setLoading(false)
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
              background:'#fee2e2',
              border:'1px solid #fecaca',
              color:'#991b1b',
              borderRadius:10,
              padding:'10px 12px',
              marginBottom:12,
              fontSize:14
            }}
          >
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="username">WhatsApp Number</label>
            <input
              id="username"
              type="text"
              placeholder="+91XXXXXXXXXX"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
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
            <Link to="/register/1" className="muted small">
              New here? Register
            </Link>
          </div>

          <button type="submit" className="btn block" disabled={loading}>
            {loading ? 'Signing in…' : 'Continue'}
          </button>
        </form>
      </div>
    </section>
  )
}
