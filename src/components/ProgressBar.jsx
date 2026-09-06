import { STEPS } from '../utils/steps'

export default function ProgressBar({ currentIndex }) {
  const total = STEPS.length
  const stepNumber = currentIndex + 1
  const percent = Math.round((stepNumber / total) * 100)
  const label = STEPS[currentIndex]?.label ?? ''

  return (
    <div className="progress">
      <div className="progress__label">
        <span>Step {stepNumber} of {total} · {label}</span>
        <span>{percent}%</span>
      </div>
      <div className="progress__track">
        <div className="progress__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
