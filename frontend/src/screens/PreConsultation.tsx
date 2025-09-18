import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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

/** All sections & questions (from the mock) */
const FORM: Section[] = [
  {
    title: 'Emergency Symptoms',
    questions: [
      { id: 'em_pain', label: 'Experiencing severe pain?' },
      { id: 'em_breath', label: 'Difficulty breathing or shortness of breath?' },
      { id: 'em_unconscious', label: 'Unconsciousness or altered mental state?' },
      { id: 'em_bleeding', label: 'Recent injury with heavy bleeding?' },
    ],
  },
  {
    title: 'Signs of a Stroke (FAST)',
    questions: [
      { id: 'st_face', label: 'Facial droop?' },
      { id: 'st_weak', label: 'Weakness on one side?' },
      { id: 'st_slur', label: 'Slurred speech?' },
    ],
  },
  {
    title: 'Indications of Sepsis',
    questions: [
      { id: 'sp_confusion', label: 'Slurred speech or confusion?' },
      { id: 'sp_shiver', label: 'Shivering or muscle pain?' },
      { id: 'sp_skin', label: 'Skin discoloration or rash?' },
    ],
  },
  {
    title: 'Signs of Heart Attack',
    questions: [
      { id: 'ha_chest', label: 'Severe chest pain, pressure, or heavy weight on chest?' },
    ],
  },
  {
    title: 'General Symptoms',
    questions: [
      { id: 'gs_fever', label: 'Experiencing persistent fever?' },
      { id: 'gs_fatigue', label: 'Feeling extreme fatigue or weakness?' },
      { id: 'gs_weight', label: 'Unexplained weight loss?' },
    ],
  },
  {
    title: 'Respiratory & ENT Issues',
    questions: [
      { id: 're_cough', label: 'Persistent cough?' },
      { id: 're_taste', label: 'Sudden loss of taste or smell?' },
      { id: 're_throat', label: 'Severe sore throat?' },
    ],
  },
  {
    title: 'Digestive Issues',
    questions: [
      { id: 'dg_abd', label: 'Severe abdominal pain?' },
      { id: 'dg_gi', label: 'Persistent nausea, vomiting, or diarrhea?' },
    ],
  },
  {
    title: 'Neurological Symptoms',
    questions: [
      { id: 'ne_head', label: 'New or worsening severe headaches?' },
      { id: 'ne_vision', label: 'Sudden onset of vision changes?' },
      { id: 'ne_balance', label: 'Difficulty with balance or coordination?' },
    ],
  },
  {
    title: 'Mental Well-being',
    questions: [
      { id: 'mw_anxiety', label: 'Experiencing severe anxiety or panic attacks?' },
      { id: 'mw_sadness', label: 'Persistent feelings of sadness or self-harm thoughts?' },
    ],
  },
]

export default function PreConsultation() {
  const nav = useNavigate()

  // location field
  const [location, setLocation] = useState('')

  // a single state object for all toggles; default all to 'No'
  const defaultAnswers = useMemo(() => {
    const all: Record<string, YesNo> = {}
    for (const s of FORM) for (const q of s.questions) all[q.id] = 'No'
    return all
  }, [])
  const [answers, setAnswers] = useState<Record<string, YesNo>>(defaultAnswers)

  function setAnswer(id: string, v: YesNo) {
    setAnswers(prev => (prev[id] === v ? prev : { ...prev, [id]: v }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    // keep client-side for now; you can POST {location, answers} later if needed
    nav('/consultation/details')
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
            If you answer “Yes” to any of these emergency questions, please Dial 999 immediately.
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
          <button className="btn">Submit & Continue</button>
        </div>
      </form>
    </section>
  )
}
