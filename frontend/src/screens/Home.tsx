import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { me, logout, type UserDto } from '../api'
import { API_BASE_URL } from '../api'

type RegApi = {
  id: number
  travellingFrom?: string
  travellingTo?: string
  travelStartDate?: string
  travelEndDate?: string
  primaryWhatsAppNumber?: string

  ['Travelling From']?: string
  ['Travelling To (UK & Europe)']?: string
  ['Travel Start Date']?: string
  ['Travel End Date']?: string
  ['Primary WhatsApp Number']?: string
}

type DocInfo = {
  id: number
  fileName: string
  sizeBytes: number
  createdAt?: string
}

function normalizeReg(r: RegApi | null | undefined) {
  if (!r) return null
  const from = r['Travelling From'] ?? r.travellingFrom ?? ''
  const to = r['Travelling To (UK & Europe)'] ?? r.travellingTo ?? ''
  const start = r['Travel Start Date'] ?? r.travelStartDate ?? ''
  const end = r['Travel End Date'] ?? r.travelEndDate ?? ''
  const phone = r['Primary WhatsApp Number'] ?? r.primaryWhatsAppNumber ?? ''
  return { id: r.id, from, to, start, end, phone }
}

export default function Home() {
  const [user, setUser] = useState<UserDto | null>(null)
  const [checking, setChecking] = useState(true)

  const [reg, setReg] = useState<ReturnType<typeof normalizeReg> | null>(null)
  const [docs, setDocs] = useState<DocInfo[]>([])
  const [loadingReg, setLoadingReg] = useState(false)
  const [loadingDocs, setLoadingDocs] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const u = await me()
        if (!alive) return
        setUser(u)

        if (!u?.email) return

        setLoadingReg(true)
        const res = await fetch(
          `${API_BASE_URL}/registrations?email=${encodeURIComponent(u.email)}`,
          { credentials: 'include' }
        )

        let latest: RegApi | null = null
        if (res.status === 200) {
          const data = await res.json()
          if (Array.isArray(data)) {
            latest = data.length ? data[data.length - 1] : null
          } else if (data && typeof data === 'object') {
            latest = data as RegApi
          }
        } else if (res.status !== 204) {
          console.warn('GET /registrations unexpected status:', res.status)
        }

        const normalized = normalizeReg(latest || undefined)
        setReg(normalized)
        setLoadingReg(false)

        if (normalized?.id) {
          setLoadingDocs(true)
          const dres = await fetch(
            `${API_BASE_URL}/registrations/${normalized.id}/documents`,
            { credentials: 'include' }
          )
          if (dres.status === 200) {
            const arr = (await dres.json()) as DocInfo[]
            setDocs(Array.isArray(arr) ? arr : [])
          } else if (dres.status !== 204) {
            console.warn('GET /documents unexpected status:', dres.status)
          }
          setLoadingDocs(false)
        } else {
          setDocs([])
        }
      } finally {
        if (alive) setChecking(false)
      }
    })()
    return () => { alive = false }
  }, [])

  async function onLogout() {
    await logout()
    navigate('/dashboard#top')
  }

  const fullName = useMemo(() => {
    if (!user) return ''
    return [user.firstName, user.lastName].filter(Boolean).join(' ')
  }, [user])

  return (
    <section className="section home">
      {/* Header with user + logout */}
      <div className="page-head" style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
        <h1 className="page-title">My Travel Package</h1>
        <div style={{display:'flex', alignItems:'center', gap:16}}>
          {!checking && user && (
            <div style={{textAlign:'right', lineHeight:1.2}}>
              {fullName && <div style={{fontWeight:700}}>{fullName}</div>}
              <div className="muted" style={{fontSize:14}}>
                Signed in as <strong>{user.email}</strong>
              </div>
            </div>
          )}
          <button className="btn secondary" onClick={onLogout}>Logout</button>
        </div>
      </div>

      {/* Travel details card (from registration) */}
      {reg && (
        <div className="package-card" style={{marginBottom:16}}>
          <div className="pc-body">
            <div className="pc-lines">
              <div><span className="muted strong">From:</span> <span className="strong">{reg.from || '—'}</span></div>
              <div><span className="muted strong">To:</span> <span className="strong">{reg.to || '—'}</span></div>
              <div className="muted"><span className="strong">Travel Dates:</span> {reg.start || '—'} → {reg.end || '—'}</div>
              <div className="muted"><span className="strong">Primary WhatsApp:</span> {reg.phone || '—'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Your existing static package card */}
      <div className="package-card">
        <div className="pc-body">
          <div className="pc-lines">
            <div><span className="muted strong">Destination:</span> <span className="strong">Europe</span></div>
            <div className="muted">Daily Support: 9:00am - 9:00pm</div>
            <div className="muted">Time Difference: +6 hours from Origin (GMT+2)</div>
          </div>

          <div className="pc-actions">
            <a className="btn" href="https://wa.me/64211899955" target="_blank" rel="noreferrer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M20.5 11.5a8.5 8.5 0 1 1-15.5 5L3 21l4.5-2a8.5 8.5 0 1 1 13-7.5Z" stroke="white" strokeWidth="1.6"/>
                <path d="M16.2 14.5c-.2.6-1.1 1.1-1.7 1.1-.5 0-1.1-.1-1.9-.5a8.6 8.6 0 0 1-3.4-3.2c-.6-1-.9-1.8-.9-2.4 0-.6.4-1.5 1-1.7.2-.1.4-.1.7 0 .2.1.5.9.6 1.2.1.3.1.5 0 .7-.1.2-.2.4-.4.6-.2.1-.2.3-.1.6.1.3.5 1.1 1.2 1.7.8.9 1.6 1.2 1.8 1.3.3.1.5.1.7 0 .2-.1.4-.3.6-.5.2-.3.5-.4.8-.3.3.1 1.3.6 1.4.8.1.2 0 .5-.2.6Z" fill="white"/>
              </svg>
              <span>WhatsApp</span>
            </a>

            <button className="btn outline">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M6 3h4l1 4-2 1a11 11 0 0 0 5 5l1.1-2H19l2 4-2 2c-1.2.5-3.5.5-6.8-1.6C8.8 13.8 6.7 11.2 6 9c-.5-1.3-.5-2.3 0-3.1L6 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Call</span>
            </button>
          </div>
        </div>
      </div>

      {(loadingDocs || loadingReg) && (
        <div className="muted" style={{margin:'10px 0'}}>Loading your travel details…</div>
      )}

      {/* Travel document(s) */}
      {reg && docs.length > 0 && (
        <div style={{marginTop:24}}>
          <h2 className="h2" style={{textAlign:'left'}}>Your Travel Document</h2>
          {docs.map(d => {
            const viewUrl = `${API_BASE_URL}/registrations/${reg.id}/documents/${d.id}/view`
            const dlUrl = `${API_BASE_URL}/registrations/${reg.id}/documents/${d.id}/download`
            const isPreviewable = /\.(pdf|png|jpe?g|gif|webp)$/i.test(d.fileName || '')
            return (
              <div key={d.id} className="card" style={{marginTop:12}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
                  <div>
                    <div className="strong">{d.fileName}</div>
                    <div className="muted small">
                      {(d.sizeBytes/1024).toFixed(1)} KB
                      {d.createdAt ? ` • ${new Date(d.createdAt).toLocaleString()}` : ''}
                    </div>
                  </div>
                  <a className="btn" href={dlUrl} target="_blank" rel="noreferrer">Download</a>
                </div>
                {isPreviewable && (
                  <iframe
                    title={d.fileName}
                    src={viewUrl}
                    style={{width:'100%', height:400, marginTop:10, border:'1px solid var(--line)', borderRadius:12}}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Quick links (unchanged) */}
      <div className="ql-head">Quick Links</div>
      <div className="quick-grid">
        <Link to="/consultation" className="quick">
          <span>I Need a Consultation</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
        <Link to="/home#cases" className="quick">
          <span>Case Notes</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" /></svg>
        </Link>
        <Link to="/home#appts" className="quick">
          <span>Appointments</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" /></svg>
        </Link>
      </div>

      {/* Featured offers (unchanged) */}
      <div className="offers-head">Featured Offers</div>
      <div className="offers">
        <a className="offer-card" href="#" aria-label="Food & Drink Offers">
          <img src="https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1600&auto=format&fit=crop" alt="" />
          <div className="offer-title">Food & Drink Offers</div>
        </a>
        <a className="offer-card" href="#" aria-label="Taxi & Transport Offers">
          <img src="https://images.unsplash.com/photo-1593950315186-76a92975b60c?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="" />
          <div className="offer-title">Taxi & Transport Offers</div>
        </a>
        <a className="offer-card" href="#" aria-label="Entertainment Offers">
          <img src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1600&auto=format&fit=crop" alt="" />
          <div className="offer-title">Entertainment Offers</div>
        </a>
        <a className="offer-card" href="#" aria-label="Accommodation Offers">
          <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8aG90ZWxzfGVufDB8fDB8fHww" alt="" />
          <div className="offer-title">Accommodation Offers</div>
        </a>
      </div>
    </section>
  )
}
