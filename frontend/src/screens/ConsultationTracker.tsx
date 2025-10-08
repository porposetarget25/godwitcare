// src/screens/ConsultationTracker.tsx
import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { API_BASE_URL, resolveApiUrl } from '../api'

export default function ConsultationTracker() {
  const [params] = useSearchParams()
  const isLogged = params.get('logged') === '1'
  const [showToast, setShowToast] = useState(isLogged)

  // Latest consultation id (to know if Step 1 is done) + status
  const [latestCid, setLatestCid] = useState<number | null>(null)
  const [latestStatus, setLatestStatus] =
    useState<'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | null>(null)

  useEffect(() => {
    if (!isLogged) return
    setShowToast(true)
    const timer = setTimeout(() => setShowToast(false), 60000)
    return () => clearTimeout(timer)
  }, [isLogged])

  // Load latest consultation (if any)
  useEffect(() => {
    ; (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/consultations/mine/latest`, {
          credentials: 'include',
        })
        if (res.status === 204 || !res.ok) {
          setLatestCid(null)
          setLatestStatus(null)
          return
        }
        const j = await res.json()
        setLatestCid(typeof j?.id === 'number' ? j.id : null)
        setLatestStatus(typeof j?.status === 'string' ? j.status : null)
      } catch {
        setLatestCid(null)
        setLatestStatus(null)
      }
    })()
  }, [])

  // WhatsApp deep-link (digits only)
  const WA_NUMBER = '640211899955'
  const waHref = `https://wa.me/${WA_NUMBER}`

  // Latest prescription URL (if exists)
  const [rxUrl, setRxUrl] = useState<string | null>(null)
  useEffect(() => {
    let ignore = false
      ; (async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/prescriptions/latest`, {
            credentials: 'include',
          })
          if (ignore) return
          if (res.status === 204 || !res.ok) {
            setRxUrl(null)
            return
          }
          const j = await res.json().catch(() => null)
          if (j && j.pdfUrl) {
            setRxUrl(resolveApiUrl(API_BASE_URL, j.pdfUrl))
          } else {
            setRxUrl(null)
          }
        } catch {
          if (!ignore) setRxUrl(null)
        }
      })()
    return () => {
      ignore = true
    }
  }, [])

  const isStep1Done = !!latestCid
  const hasRxOrCompleted = !!rxUrl || latestStatus === 'COMPLETED'

  // Shared styles
  const cardStyle: React.CSSProperties = {
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    background:
      'linear-gradient(135deg, rgba(219,234,254,1) 0%, rgba(236,253,245,1) 100%)',
    border: '1px solid #dbeafe',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  }
  const step1CardStyle: React.CSSProperties = {
    ...cardStyle,
    opacity: isStep1Done ? 0.7 : 1,
    filter: isStep1Done ? 'grayscale(15%)' : 'none',
  }
  const titleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 6,
  }
  const textStyle: React.CSSProperties = {
    marginTop: 4,
    maxWidth: 900,
    color: '#374151',
    fontSize: 14,
    lineHeight: 1.4,
  }

  // Locate Pharmacy
  const [findingPharmacy, setFindingPharmacy] = useState(false)

  function openNearbyPharmacies() {
    setFindingPharmacy(true)

    const open = (url: string) =>
      window.open(url, '_blank', 'noopener,noreferrer')

    const fallback = 'https://www.google.com/maps/search/pharmacy'

    // Geolocation works on HTTPS or http://localhost
    if (!('geolocation' in navigator)) {
      open(fallback)
      setFindingPharmacy(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const url = `https://www.google.com/maps/search/pharmacy/@${latitude},${longitude},14z`
        open(url)
        setFindingPharmacy(false)
      },
      () => {
        open(fallback)
        setFindingPharmacy(false)
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
  }

  return (
    <section className="section">
      {/* Header */}
      <div
        className="page-head"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          Your Consultation Journey
        </h1>
        <Link to="/home" className="btn secondary">
          Back to Home
        </Link>
      </div>

      {/* Toast */}
      {showToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            background: 'linear-gradient(135deg, rgba(34,197,94,1) 0%, rgba(16,185,129,1) 100%)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: 10,
            boxShadow: '0 8px 20px rgba(16,185,129,.35)',
            zIndex: 1000,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <span>✅ Your call has been logged. A doctor will contact you shortly.</span>
          <button
            onClick={() => setShowToast(false)}
            aria-label="Dismiss notification"
            style={{
              background: 'transparent',
              color: 'white',
              border: 'none',
              fontSize: 18,
              lineHeight: 1,
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>
      )}


      {/* Step 1 */}
      <div style={step1CardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <div style={titleStyle}>Step 1: Complete Pre-Consultation Checklist</div>
            <div style={textStyle}>
              Fill out the necessary health questionnaire and consent forms before your session. This ensures a smooth and
              efficient experience.
            </div>
          </div>

          {isStep1Done ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn secondary" type="button" disabled>
                Submitted
              </button>
              <Link
                to={`/consultation/questionnaire?cid=${latestCid}`}
                className="btn"
                style={{ padding: '8px 12px', fontSize: 13 }}
              >
                Edit Details
              </Link>
            </div>
          ) : (
            <Link to="/consultation/questionnaire" className="btn">
              Submit Details
            </Link>
          )}
        </div>
      </div>

      {/* Step 2 */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={titleStyle}>Step 2: Notify GodwitCare</div>
            <div style={textStyle}>
              Initiate your consultation by notifying our team so a clinician can connect with you. This opens a WhatsApp
              chat with our helpline.
            </div>
          </div>
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.77.58 2.61a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.47-1.09a2 2 0 0 1 2.11-.45c.84.26 1.71.46 2.61.58A2 2 0 0 1 22 16.92z" />
            </svg>
            Notify Clinician
          </a>
        </div>
      </div>

      {/* Step 3 */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={titleStyle}>Step 3: Receive a call from Clinician</div>
            <div style={textStyle}>
              A clinician will contact you shortly via WhatsApp call to discuss your health concerns and provide expert
              medical advice.
            </div>
          </div>
          <Link to="/consultation/details" className="btn secondary">
            Upcoming
          </Link>
        </div>
      </div>

      {/* Step 4 — dynamic based on rxUrl */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={titleStyle}>Step 4: Prescription Issued</div>
            <div style={textStyle}>
              Receive your digital prescription in the app with dosage instructions and medication details.
            </div>
          </div>
          {rxUrl ? (
            <a className="btn" href={rxUrl} target="_blank" rel="noreferrer">
              View Prescription
            </a>
          ) : (
            <button className="btn secondary" type="button" disabled>
              Upcoming
            </button>
          )}
        </div>
      </div>

      {/* Step 5 */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={titleStyle}>Step 5: Locate Pharmacy</div>
            <div style={textStyle}>
              Find the nearest pharmacy to pick up your prescribed medication.
            </div>
          </div>

          {hasRxOrCompleted ? (
            <button
              className="btn"
              type="button"
              onClick={openNearbyPharmacies}
              disabled={findingPharmacy}
            >
              {findingPharmacy ? 'Finding…' : 'Find Nearby Pharmacies'}
            </button>
          ) : (
            <button className="btn secondary" type="button" disabled>
              Upcoming
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
