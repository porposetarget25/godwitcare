// src/screens/Documents.tsx — travel documents (passport / travel document) per traveller
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteDocument,
  downloadDocumentBlob,
  getLatestRegistrationByEmail,
  listDocuments,
  uploadDocument,
  type DocSummary,
  type DocumentType,
} from '../api'
import { useAuth } from '../state/auth'
import { usePatient, type PatientContextOption } from '../state/patient'
import PatientChips from '../components/portal/PatientChips'
import Modal from '../components/portal/Modal'

const DOC_TYPES: { type: DocumentType; label: string }[] = [
  { type: 'PASSPORT', label: 'Passport' },
  { type: 'TRAVEL_DOCUMENT', label: 'Boarding Pass' },
]

function formatSize(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

export default function Documents() {
  const { user } = useAuth()
  const { patients, loading: patientsLoading } = usePatient()
  const [regId, setRegId] = useState<number | null>(null)
  const [docsByPatient, setDocsByPatient] = useState<Record<string, DocSummary[]>>({})
  const [loading, setLoading] = useState(true)
  const [filterPatientId, setFilterPatientId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<DocSummary | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.email || patientsLoading || patients.length === 0) return
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const reg = await getLatestRegistrationByEmail(user.email)
        if (!alive) return
        if (!reg?.id) { setRegId(null); setDocsByPatient({}); return }
        setRegId(reg.id)
        const entries = await Promise.all(patients.map(async p => [p.patientId, await listDocuments(reg.id, p.patientId)] as const))
        if (alive) setDocsByPatient(Object.fromEntries(entries))
      } catch {
        if (alive) setError('Unable to load travel documents.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [user?.email, patients, patientsLoading])

  async function refreshDocs(patientId: string) {
    if (!regId) return
    const docs = await listDocuments(regId, patientId)
    setDocsByPatient(prev => ({ ...prev, [patientId]: docs }))
  }

  async function onUpload(patientId: string, type: DocumentType, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !regId) return
    setError('')
    setBusyKey(`${patientId}:${type}`)
    try {
      await uploadDocument(regId, patientId, type, file)
      await refreshDocs(patientId)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setBusyKey(null)
    }
  }

  async function onDownload(doc: DocSummary) {
    if (!regId) return
    setError('')
    setBusyKey(`download:${doc.id}`)
    try {
      const blob = await downloadDocumentBlob(regId, doc.patientId, doc.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('Unable to download document.')
    } finally {
      setBusyKey(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !regId) return
    setBusyKey(`delete:${deleteTarget.id}`)
    try {
      await deleteDocument(regId, deleteTarget.id)
      await refreshDocs(deleteTarget.patientId)
    } catch {
      setError('Unable to delete document.')
    } finally {
      setBusyKey(null)
      setDeleteTarget(null)
    }
  }

  const filterPatient: PatientContextOption | undefined = patients.find(p => p.patientId === filterPatientId)

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Documents</div>
          <div className="page-sub">Passports and boarding passes for everyone in your travel party.</div>
        </div>
        <Link to="/home" className="bs">‹ Home</Link>
      </div>

      <PatientChips patients={patients} activeId={filterPatientId} onSelect={setFilterPatientId} />

      {error && <div className="notice n-warn"><i className="ti ti-alert-triangle" aria-hidden="true" />{error}</div>}

      {loading || patientsLoading ? (
        <div className="card">Loading documents…</div>
      ) : !filterPatient ? (
        <div className="g2">
          {patients.map(p => {
            const docs = docsByPatient[p.patientId] || []
            return (
              <div key={p.patientId} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div className="ava">{p.name.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase()}</div>
                  <div className="ct" style={{ marginBottom: 0 }}>{p.name}</div>
                </div>
                <div className="history-list">
                  {DOC_TYPES.map(dt => {
                    const doc = docs.find(d => d.type === dt.type)
                    return (
                      <div key={dt.type} className="history-row" onClick={() => setFilterPatientId(p.patientId)}>
                        <div className="history-info">
                          <div className="history-name">{dt.label}</div>
                          <div className="history-detail">{doc ? doc.fileName : 'Not uploaded yet'}</div>
                        </div>
                        <span className={`tag ${doc ? 'tok' : 'tmute'}`}>{doc ? 'Uploaded' : 'Missing'}</span>
                        <i className="ti ti-chevron-right history-chevron" aria-hidden="true" />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="g2">
          {DOC_TYPES.map(dt => {
            const doc = (docsByPatient[filterPatient.patientId] || []).find(d => d.type === dt.type)
            const uploading = busyKey === `${filterPatient.patientId}:${dt.type}`
            return (
              <div key={dt.type} className="card">
                <div className="ct">{dt.label}</div>
                {!doc ? (
                  <div className="doc-empty">
                    <i className="ti ti-file-upload" aria-hidden="true" />
                    <div style={{ marginBottom: 10 }}>No {dt.label.toLowerCase()} uploaded yet</div>
                    <div className="file-input-btn bp">
                      {uploading ? 'Uploading…' : `Upload ${dt.label}`}
                      <input type="file" accept=".jpg,.jpeg,.png,.pdf" disabled={uploading} onChange={e => onUpload(filterPatient.patientId, dt.type, e)} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="doc-filled">
                      <div className="doc-file-icon"><i className="ti ti-file-text" aria-hidden="true" /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{doc.fileName}</div>
                        <div className="fi-hint">{formatSize(doc.sizeBytes)}{doc.createdAt ? ` · ${new Date(doc.createdAt).toLocaleDateString()}` : ''}</div>
                      </div>
                    </div>
                    <div className="doc-actions">
                      <button type="button" className="bs" onClick={() => onDownload(doc)} disabled={busyKey === `download:${doc.id}`}>
                        <i className="ti ti-download" aria-hidden="true" /> {busyKey === `download:${doc.id}` ? 'Downloading…' : 'Download'}
                      </button>
                      <div className="file-input-btn bs">
                        {uploading ? 'Uploading…' : 'Replace'}
                        <input type="file" accept=".jpg,.jpeg,.png,.pdf" disabled={uploading} onChange={e => onUpload(filterPatient.patientId, dt.type, e)} />
                      </div>
                      <button type="button" className="bg" aria-label={`Delete ${dt.label}`} onClick={() => setDeleteTarget(doc)}>
                        <i className="ti ti-trash" aria-hidden="true" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="fi-hint" style={{ marginTop: 8 }}>
        Accepted formats: JPG, PNG, PDF. Documents are stored securely and only used to support your consultations.
      </div>

      {deleteTarget && (
        <Modal
          title="Delete Document"
          onClose={() => setDeleteTarget(null)}
          footer={(
            <>
              <button type="button" className="bs" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className="bd" onClick={confirmDelete} disabled={busyKey === `delete:${deleteTarget.id}`}>
                {busyKey === `delete:${deleteTarget.id}` ? 'Deleting…' : 'Delete'}
              </button>
            </>
          )}
        >
          <p style={{ fontSize: 13 }}>Are you sure you want to delete <strong>{deleteTarget.fileName}</strong>? This cannot be undone.</p>
        </Modal>
      )}
    </>
  )
}
