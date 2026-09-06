import { useState, useRef } from 'react'
import { IconMic } from './icons'

// Large tappable buttons for single-choice questions, instead of plain
// radio inputs — bigger touch targets, and the current answer is very
// easy to see at a glance.
export function ChoiceGroup({ options, value, onChange, columns = 1 }) {
  return (
    <div className={`choice-grid ${columns === 2 ? 'cols-2' : ''}`}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`choice ${value === opt ? 'selected' : ''}`}
          onClick={() => onChange(opt)}
        >
          <span className="choice__dot" />
          {opt}
        </button>
      ))}
    </div>
  )
}

// 1-10 severity picker for the Symptom Journey page.
export function SeverityScale({ value, onChange, lowLabel = 'Mild', highLabel = 'Very severe' }) {
  return (
    <div>
      <div className="severity-scale">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            className={`severity-cell ${value === n ? 'selected' : ''}`}
            onClick={() => onChange(n)}
            aria-label={`Severity ${n} of 10`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="severity-caption">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  )
}

// Multi-select checklist, e.g. previous diseases / allergies.
export function CheckList({ options, values, onChange }) {
  function toggle(opt) {
    if (values.includes(opt)) onChange(values.filter((v) => v !== opt))
    else onChange([...values, opt])
  }

  return (
    <div className="check-list">
      {options.map((opt) => {
        const checked = values.includes(opt)
        return (
          <label key={opt} className={`check-item ${checked ? 'checked' : ''}`}>
            <input type="checkbox" checked={checked} onChange={() => toggle(opt)} />
            {opt}
          </label>
        )
      })}
    </div>
  )
}

// Yes / No (or Yes / No / Partially) segmented control.
export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map((opt) => (
        <button key={opt} type="button" className={value === opt ? 'active' : ''} onClick={() => onChange(opt)}>
          {opt}
        </button>
      ))}
    </div>
  )
}

// Real voice input using the browser's built-in Web Speech API
// (SpeechRecognition). Falls back to the old mocked behaviour (fills in
// `mockText` after a short delay) on browsers that don't support it
// (e.g. Firefox desktop), so the flow never breaks.
export function MicButton({ onResult, mockText, lang = 'en-IN', label = 'Speak instead of typing', listeningLabel = 'Listening…' }) {
  const [recording, setRecording] = useState(false)
  const [supported] = useState(
    () => typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
  )
  const recognitionRef = useRef(null)

  function handleClick() {
    if (recording) return

    if (!supported) {
      // Fallback: simulate recording, same as before.
      setRecording(true)
      setTimeout(() => {
        setRecording(false)
        onResult(mockText)
      }, 1500)
      return
    }

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionCtor()
    recognition.lang = lang
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onstart = () => setRecording(true)
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript
      if (transcript) onResult(transcript)
    }
    recognition.onerror = () => {
      // Mic permission denied, no speech detected, etc. — fall back to
      // mock text so the demo/flow never gets stuck.
      onResult(mockText)
    }
    recognition.onend = () => setRecording(false)

    recognition.start()
  }

  return (
    <button type="button" className={`mic-btn ${recording ? 'recording' : ''}`} onClick={handleClick}>
      <IconMic />
      {recording ? listeningLabel : label}
    </button>
  )
}
