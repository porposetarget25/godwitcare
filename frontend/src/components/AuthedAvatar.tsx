// src/components/AuthedAvatar.tsx — renders a photo served behind the Bearer-token API
// (a plain <img src> can't send the auth header, so we fetch it as a blob instead).
import React, { useEffect, useState } from 'react'
import { authFetch } from '../api'

export default function AuthedAvatar({
  src,
  alt = '',
  className,
  fallback,
}: {
  src?: string | null
  alt?: string
  className?: string
  fallback: React.ReactNode
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!src) { setObjectUrl(null); return }
    let revoked = false
    let currentUrl: string | null = null
    authFetch(src, {})
      .then(res => (res.ok ? res.blob() : Promise.reject()))
      .then(blob => {
        if (revoked) return
        currentUrl = URL.createObjectURL(blob)
        setObjectUrl(currentUrl)
      })
      .catch(() => { if (!revoked) setObjectUrl(null) })
    return () => {
      revoked = true
      if (currentUrl) URL.revokeObjectURL(currentUrl)
    }
  }, [src])

  if (!src || !objectUrl) return <>{fallback}</>
  return <img className={className} src={objectUrl} alt={alt} />
}
