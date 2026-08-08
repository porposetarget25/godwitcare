// src/screens/DoctorSettings.tsx
import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getMyProfile, logout, updateMyProfile } from '../api'
import { useAuth } from '../state/auth'

export default function DoctorSettings() {
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    getMyProfile().then(p => {
      if (!alive) return
      setFirstName(p.firstName || '')
      setLastName(p.lastName || '')
      setEmail(p.email || '')
      setUsername(p.username || '')
    }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr('')
    setMsg('')
    try {
      await updateMyProfile({ firstName, lastName, email, username })
      setMsg('Profile updated.')
    } catch (e: any) {
      setErr(e?.message || 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  async function onSignOut() {
    await logout()
    await refresh()
    navigate('/dashboard')
  }

  if (loading) return <div className="card">Loading…</div>

  return (
    <>
      <div className="page-head">
        <div className="page-title">Settings</div>
        <button type="button" className="bp" form="doctor-settings-form" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
      </div>

      {!!err && <div className="notice n-warn"><i className="ti ti-alert-triangle" aria-hidden="true" />{err}</div>}
      {!!msg && <div className="notice n-info"><i className="ti ti-circle-check" aria-hidden="true" />{msg}</div>}

      <div className="g2">
        <div>
          <form id="doctor-settings-form" className="card" onSubmit={save}>
            <div className="ct">Profile</div>
            <div className="g2">
              <div className="fi"><label className="fl2">First Name</label><input value={firstName} onChange={e => setFirstName(e.target.value)} required /></div>
              <div className="fi"><label className="fl2">Last Name</label><input value={lastName} onChange={e => setLastName(e.target.value)} /></div>
            </div>
            <div className="fi"><label className="fl2">Email</label><input value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div className="fi"><label className="fl2">WhatsApp Number</label><input value={username} onChange={e => setUsername(e.target.value)} required /></div>
          </form>

          <div className="card">
            <div className="ct">Account</div>
            <div className="fi"><label className="fl2">Password</label><Link to="/change-password" className="bs">Change Password</Link></div>
            <div className="fi"><label className="fl2">Session</label><button type="button" className="bd" onClick={onSignOut}>Sign Out</button></div>
          </div>
        </div>

        <div>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
              <div className="ct" style={{ marginBottom: 0 }}>Clinic Booking Policies</div>
              <span className="tag tmute"><i className="ti ti-lock" aria-hidden="true" /> Managed by clinic admin</span>
            </div>
            <div className="dr"><div className="dk">Consultation duration</div><div className="dv">10 minutes</div></div>
            <div className="dr"><div className="dk">Documentation buffer</div><div className="dv">5 minutes</div></div>
            <div className="dr"><div className="dk">Total slot length</div><div className="dv">15 minutes</div></div>
            <div className="dr"><div className="dk">Cancellation / reschedule cutoff</div><div className="dv">Up to 48 hours after booking</div></div>
            <div className="dr"><div className="dk">Maximum advance booking</div><div className="dv">2 days</div></div>
            <div className="dr"><div className="dk">Clinic hours</div><div className="dv">09:00 – 17:00</div></div>
            <div className="dr"><div className="dk">Timezone</div><div className="dv">Europe/London</div></div>
            <div className="fi-hint" style={{ marginTop: 8 }}>These settings are clinic-wide. Contact an admin to request a change.</div>
          </div>
        </div>
      </div>
    </>
  )
}
