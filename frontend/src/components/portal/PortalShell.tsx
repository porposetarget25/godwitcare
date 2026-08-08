// src/components/portal/PortalShell.tsx
import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/auth'
import { logout, resolveApiUrl, API_BASE_URL } from '../../api'
import AuthedAvatar from '../AuthedAvatar'

export type PortalNavItem = {
  id: string
  label: string
  icon: string
  to: string
  badge?: number
}

export type PortalNavSection = {
  label: string
  items: PortalNavItem[]
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function PortalShell({
  navSections,
  activeId,
  roleLabel,
  profileHref = '/profile',
  wide = false,
  children,
}: {
  navSections: PortalNavSection[]
  activeId: string
  roleLabel: string
  profileHref?: string
  wide?: boolean
  children: React.ReactNode
}) {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // The drawer is only opened via its own hamburger button, but routes can change
  // underneath it (sidebar Link clicks close it themselves, but back/forward
  // navigation and programmatic redirects don't) — always close it on route change.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const fullName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : ''

  async function handleLogout() {
    await logout()
    await refresh()
    setDrawerOpen(false)
    navigate('/dashboard')
  }

  const sidebar = (
    <div className={`sb${drawerOpen ? ' open' : ''}`} id="portal-sidebar">
      <div className="sb-logo">
        <img className="sb-logo-img" src={`${import.meta.env.BASE_URL}assets/logo-header-color.png`} alt="GodwitCare" />
      </div>

      {navSections.map(section => (
        <React.Fragment key={section.label}>
          <div className="sb-sec">{section.label}</div>
          {section.items.map(item => (
            <Link
              key={item.id}
              to={item.to}
              className={`si${activeId === item.id ? ' on' : ''}`}
              onClick={() => setDrawerOpen(false)}
            >
              <i className={`ti ti-${item.icon} si-icon`} aria-hidden="true" />
              <span className="si-lbl">{item.label}</span>
              {!!item.badge && <span className="si-badge">{item.badge}</span>}
            </Link>
          ))}
        </React.Fragment>
      ))}

      <div className="sb-foot">
        <Link to={profileHref} className="sb-prof" onClick={() => setDrawerOpen(false)}>
          <div className="ava">
            <AuthedAvatar
              src={user?.photoUrl ? resolveApiUrl(API_BASE_URL, user.photoUrl) : null}
              fallback={initialsOf(fullName || user?.email || '?')}
            />
          </div>
          <div>
            <div className="sb-name">{fullName || user?.email || 'Account'}</div>
            <div className="sb-role">{roleLabel}</div>
          </div>
        </Link>
        <button
          type="button"
          className="bg"
          style={{ margin: '0 16px 12px', width: 'calc(100% - 32px)', justifyContent: 'center' }}
          onClick={handleLogout}
        >
          <i className="ti ti-logout-2" aria-hidden="true" /> Log out
        </button>
      </div>
    </div>
  )

  return (
    <div className="portal">
      <div className="portal-shell">
        {sidebar}
        <div className={`sb-overlay${drawerOpen ? ' open' : ''}`} onClick={() => setDrawerOpen(false)} />

        <div className="main">
          <div className="mobile-topbar">
            <button type="button" aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
              <i className="ti ti-menu-2" aria-hidden="true" />
            </button>
            <img className="mt-logo-img" src={`${import.meta.env.BASE_URL}assets/logo-header-color.png`} alt="GodwitCare" />
          </div>

          <div className={`body${wide ? ' wide' : ''}`}>{children}</div>
        </div>
      </div>
    </div>
  )
}
