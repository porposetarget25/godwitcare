// src/screens/PreConsultation.tsx
import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../api'

type YesNo = 'Yes' | 'No'

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: YesNo
  onChange: (v: YesNo) => void
}) {
  return (
    <div className="field" style={{ marginBottom: 12 }}>
      <label className="strong">{label}</label>
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button
          type="button"
          className={'btn ' + (value === 'No' ? '' : 'secondary')}
          onClick={() => onChange('No')}
          aria-pressed={value === 'No'}
        >
          No
        </button>
        <button
          type="button"
          className={'btn ' + (value === 'Yes' ? '' : 'secondary')}
          onClick={() => onChange('Yes')}
          aria-pressed={value === 'Yes'}
        >
          Yes
        </button>
      </div>
    </div>
  )
}

type Q = { id: string; label: string }
type Section = { title: string; questions: Q[] }

/** All sections & questions with descriptive IDs */
const FORM: Section[] = [
  {
    title: 'Emergency Symptoms',
    questions: [
      { id: 'emergency_pain', label: 'Experiencing severe pain?' },
      { id: 'emergency_breath', label: 'Difficulty breathing or shortness of breath?' },
      { id: 'emergency_unconscious', label: 'Unconsciousness or altered mental state?' },
      { id: 'emergency_bleeding', label: 'Recent injury with heavy bleeding?' },
    ],
  },
  {
    title: 'Signs of a Stroke (FAST)',
    questions: [
      { id: 'stroke_face', label: 'Facial droop?' },
      { id: 'stroke_weakness', label: 'Weakness on one side?' },
      { id: 'stroke_speech', label: 'Slurred speech?' },
    ],
  },
  {
    title: 'Indications of Sepsis',
    questions: [
      { id: 'sepsis_confusion', label: 'Slurred speech or confusion?' },
      { id: 'sepsis_shiver', label: 'Shivering or muscle pain?' },
      { id: 'sepsis_skin', label: 'Skin discoloration or rash?' },
    ],
  },
  {
    title: 'Signs of Heart Attack',
    questions: [
      { id: 'heartattack_chest', label: 'Severe chest pain, pressure, or heavy weight on chest?' },
    ],
  },
  {
    title: 'General Symptoms',
    questions: [
      { id: 'general_symptoms_fever', label: 'Experiencing persistent fever?' },
      { id: 'general_symptoms_fatigue', label: 'Feeling extreme fatigue or weakness?' },
      { id: 'general_symptoms_weightloss', label: 'Unexplained weight loss?' },
    ],
  },
  {
    title: 'Respiratory & ENT Issues',
    questions: [
      { id: 'respiratory_ent_cough', label: 'Persistent cough?' },
      { id: 'respiratory_ent_taste', label: 'Sudden loss of taste or smell?' },
      { id: 'respiratory_ent_throat', label: 'Severe sore throat?' },
    ],
  },
  {
    title: 'Digestive Issues',
    questions: [
      { id: 'digestive_abdominal_pain', label: 'Severe abdominal pain?' },
      { id: 'digestive_gi', label: 'Persistent nausea, vomiting, or diarrhea?' },
    ],
  },
  {
    title: 'Neurological Symptoms',
    questions: [
      { id: 'neuro_headache', label: 'New or worsening severe headaches?' },
      { id: 'neuro_vision', label: 'Sudden onset of vision changes?' },
      { id: 'neuro_balance', label: 'Difficulty with balance or coordination?' },
    ],
  },
  {
    title: 'Mental Well-being',
    questions: [
      { id: 'mental_anxiety', label: 'Experiencing severe anxiety or panic attacks?' },
      { id: 'mental_sadness', label: 'Persistent feelings of sadness or self-harm thoughts?' },
    ],
  },
]

export default function PreConsultation() {
  const nav = useNavigate()

  const [location, setLocation] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactAddress, setContactAddress] = useState('')

  const defaultAnswers = useMemo(() => {
    const all: Record<string, YesNo> = {}
    for (const s of FORM) for (const q of s.questions) all[q.id] = 'No'
    return all
  }, [])
  const [answers, setAnswers] = useState<Record<string, YesNo>>(defaultAnswers)
  const [submitting, setSubmitting] = useState(false)

  function setAnswer(id: string, v: YesNo) {
    setAnswers(prev => (prev[id] === v ? prev : { ...prev, [id]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)

    try {
      const payload = {
        currentLocation: location,
        contactName,
        contactPhone,
        contactAddress,
        answers,
      }

      const res = await fetch(`${API_BASE_URL}/consultations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(`Failed to save consultation: ${res.status} ${t}`)
      }

      nav('/consultation/tracker?logged=1')
    } catch (err) {
      console.error(err)
      alert('Sorry, we could not log your request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="section">
      <div
        className="page-head"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <h1 className="page-title">Pre-Consultation Questionnaire</h1>
        <Link to="/consultation/tracker" className="btn secondary">
          Back
        </Link>
      </div>

      <form className="form" onSubmit={submit}>
        {/* Current location */}
        <div className="field">
          <label>Current Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="123 Main St, Anytown"
          />
        </div>

        {/* Patient Contact & Address */}
        <div className="card" style={{ marginTop: 12 }}>
          <div className="strong" style={{ marginBottom: 8 }}>Patient Contact &amp; Address</div>
          <div className="grid two">
            <div className="field">
              <label>Contact Name</label>
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="field">
              <label>Phone / WhatsApp</label>
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+44 7xxx xxx xxx"
              />
            </div>
          </div>
          <div className="field">
            <label>Address</label>
            <textarea
              value={contactAddress}
              onChange={(e) => setContactAddress(e.target.value)}
              placeholder="Street, City, Postal Code, Country"
              rows={3}
            />
          </div>
        </div>

        {/* Emergency banner */}
        <div
          className="card"
          style={{
            background: '#B94A48',
            color: 'white',
            borderColor: 'transparent',
            marginTop: 8,
          }}
        >
          <div className="strong" style={{ marginBottom: 4 }}>
            If you answer “Yes” to any of these emergency questions, please dial 999 immediately.
          </div>
        </div>

        {/* Sections */}
        {FORM.map((section) => (
          <div key={section.title} className="card" style={{ marginTop: 12 }}>
            <div className="strong" style={{ marginBottom: 8 }}>
              {section.title}
            </div>
            {section.questions.map((q) => (
              <Toggle
                key={q.id}
                label={q.label}
                value={answers[q.id]}
                onChange={(v) => setAnswer(q.id, v)}
              />
            ))}
          </div>
        ))}

        <div className="actions" style={{ marginTop: 16 }}>
          <button className="btn" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit & Continue'}
          </button>
        </div>
      </form>
    </section>
  )
}
