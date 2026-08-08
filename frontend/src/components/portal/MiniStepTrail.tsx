// src/components/portal/MiniStepTrail.tsx
import React from 'react'

/**
 * A row of numbered circles connected by lines, each either "done" (filled +
 * check) or pending (outline + number). `activeStage` is the count of steps
 * already completed (0..steps.length).
 */
export default function MiniStepTrail({ steps, activeStage }: { steps: string[]; activeStage: number }) {
  return (
    <div className="mini-trail" aria-label="Consultation progress">
      {steps.map((label, idx) => {
        const done = idx < activeStage
        return (
          <React.Fragment key={label}>
            <div className={`mini-step${done ? ' done' : ''}`} title={label} aria-label={label}>
              {done ? <i className="ti ti-check" aria-hidden="true" /> : idx + 1}
            </div>
            {idx < steps.length - 1 && <div className={`mini-line${idx < activeStage - 1 ? ' done' : ''}`} />}
          </React.Fragment>
        )
      })}
    </div>
  )
}
