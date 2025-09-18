import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { me, logout, type UserDto } from '../api'
import { API_BASE_URL } from '../api'

type Traveler = {
  id?: number
  fullName: string
  dateOfBirth?: string
}

type RegApi = {
  id: number
  travellingFrom?: string
  travellingTo?: string
  travelStartDate?: string
  travelEndDate?: string
  primaryWhatsAppNumber?: string
  travelers?: Traveler[]

  // legacy field names (from earlier steps)
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
  const travelers = Array.isArray(r.travelers) ? r.travelers : []
  return { id: r.id, from, to, start, end, phone, travelers }
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

      {/* Travel details card */}
      {reg && (
        <div className="package-card" style={{marginBottom:16}}>
          <div className="pc-body">
            <div className="pc-lines">
              <div><span className="muted strong">From:</span> <span className="strong">{reg.from || '—'}</span></div>
              <div><span className="muted strong">To:</span> <span className="strong">{reg.to || '—'}</span></div>
              <div className="muted"><span className="strong">Travel Dates:</span> {reg.start || '—'} → {reg.end || '—'}</div>
              <div className="muted"><span className="strong">Primary WhatsApp:</span> {reg.phone || '—'}</div>
            </div>

            {/* Travelers list */}
            {reg.travelers && reg.travelers.length > 0 && (
              <div style={{marginTop:12}}>
                <h3 className="h3">Travelers</h3>
                <ul style={{marginTop:6, paddingLeft:18}}>
                  {reg.travelers.map((t, i) => (
                    <li key={t.id ?? `${t.fullName}-${i}`} style={{marginBottom:4}}>
                      <span className="strong">{t.fullName}</span>{' '}
                      {t.dateOfBirth && (
                        <span className="muted small">
                          (DOB: {new Date(t.dateOfBirth).toLocaleDateString()})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Static support card */}
      <div className="package-card">
        <div className="pc-body">
          <div className="pc-lines">
            <div><span className="muted strong">Destination:</span> <span className="strong">Europe</span></div>
            <div className="muted">Daily Support: 9:00am - 9:00pm</div>
            <div className="muted">Time Difference: +6 hours from Origin (GMT+2)</div>
          </div>
          <div className="pc-actions">
            <a className="btn" href="https://wa.me/64211899955" target="_blank" rel="noreferrer">WhatsApp</a>
            <Link
              to="/consultation/tracker"
              className="btn"
              style={{
                backgroundColor: '#B94A48',
                color: 'white',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                fill="none"
                viewBox="0 0 24 24"
                stroke="white"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.6 10.8c1.2 2.4 3.2 4.4 5.6 5.6l2-2c.3-.3.7-.4 1.1-.3 1.2.4 2.6.6 4 .6.6 0 1 .4 1 1v3.5c0 .6-.4 1-1 1C11.3 20 4 12.7 4 4.5c0-.6.4-1 1-1H8.5c.6 0 1 .4 1 1 0 1.4.2 2.8.6 4 .1.4 0 .8-.3 1.1l-2.2 2.2Z"
                />
              </svg>
              Log a call with GodwitCare
            </Link>


          </div>
        </div>
      </div>

      {(loadingDocs || loadingReg) && (
        <div className="muted" style={{margin:'10px 0'}}>Loading your travel details…</div>
      )}

      {/* Travel documents */}
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
                    style={{width:'100%', height:200, marginTop:10, border:'1px solid var(--line)', borderRadius:12}}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Quick links */}
      <div className="ql-head">Quick Links</div>
      <div className="quick-grid">
        <Link to="/consultation" className="quick"><span>I Need a Consultation</span></Link>
        <Link to="/home#cases" className="quick"><span>Case Notes</span></Link>
        <Link to="/home#appts" className="quick"><span>Appointments</span></Link>
      </div>

      {/* Offers */}
      <div className="offers-head">Featured Offers</div>
      <div className="offers">
        <a className="offer-card" href="#"><img src="https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1600&auto=format&fit=crop" alt="" /><div className="offer-title">Food & Drink</div></a>
        <a className="offer-card" href="#"><img src="https://images.unsplash.com/photo-1593950315186-76a92975b60c?q=80&w=687&auto=format&fit=crop" alt="" /><div className="offer-title">Taxi & Transport</div></a>
        <a className="offer-card" href="#"><img src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1600&auto=format&fit=crop" alt="" /><div className="offer-title">Entertainment</div></a>
        <a className="offer-card" href="#"><img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?fm=jpg&q=60&w=3000&auto=format&fit=crop" alt="" /><div className="offer-title">Accommodation</div></a>
      </div>
    </section>
  )
}
