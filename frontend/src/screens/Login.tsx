import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    // fake success -> go to dashboard Home section
    navigate('/dashboard#top')
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

        <form className="auth-form" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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

          <button type="submit" className="btn block">Continue</button>
        </form>
      </div>
    </section>
  )
}
