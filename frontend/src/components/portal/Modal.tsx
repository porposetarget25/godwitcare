// src/components/portal/Modal.tsx
import React, { useEffect } from 'react'

export default function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="portal">
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <div className="modal-title">{title}</div>
            <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">{children}</div>
          {footer ? <div className="modal-foot">{footer}</div> : null}
        </div>
      </div>
    </div>
  )
}
