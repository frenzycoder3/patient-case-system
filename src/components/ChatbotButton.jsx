import { useState, useRef } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { detectRedFlags } from '../utils/redflags'
import { IconMic } from './icons'

// A lightweight, rule-based FAQ chatbot for the patient-facing intake
// flow. This is a prototype stand-in for the "AI assistant/chatbot"
// requested in the feature spec — matching the keyword-based approach
// already used by utils/redflags.js and utils/summary.js elsewhere in
// this project, not a real LLM integration.
//
// LATER: replace handleSend()'s local matching with a call to a real
// LLM via a backend proxy (never call an LLM API directly from the
// frontend with an embedded key), keeping the same message list shape
// so the UI doesn't need to change.

const FAQ = [
  { keywords: ['abha'], answer: 'ABHA is your Ayushman Bharat Health Account ID. It is optional here — you can continue as a guest.' },
  { keywords: ['safe', 'privacy', 'share', 'data'], answer: 'Your answers are only shared with your treating doctor and the hospital records system, with your consent.' },
  { keywords: ['voice', 'speak', 'mic', 'microphone'], answer: 'Tap the microphone button next to a text box to speak your answer instead of typing.' },
  { keywords: ['severity', 'scale'], answer: 'The severity scale goes from 1 (mild) to 10 (very severe) — pick whatever best matches how it feels right now.' },
  { keywords: ['document', 'upload', 'prescription', 'report'], answer: 'You can upload old prescriptions or lab reports on the Document Upload step — this is optional.' },
  { keywords: ['ayush', 'ayurved'], answer: 'The AYUSH section is an optional Ayurvedic intake — turn it on in Medical History if you are consulting an AYUSH physician.' },
  { keywords: ['help', 'staff', 'stuck'], answer: 'Tap the green "Need help?" button at the bottom of the screen to have a staff member assist you with this page.' },
  { keywords: ['patient id', 'id number'], answer: 'Your Patient ID is generated automatically once you submit your Patient Details, and shown again at Review.' },
]

function findAnswer(text) {
  const lower = text.toLowerCase()
  const match = FAQ.find((f) => f.keywords.some((kw) => lower.includes(kw)))
  return match?.answer || null
}

export default function ChatbotButton() {
  const { t, speechLang } = useLanguage()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{ from: 'bot', text: t('chatbot.greeting') }])
  const [input, setInput] = useState('')
  const [recording, setRecording] = useState(false)

  function handleSend(text) {
    const trimmed = (text ?? input).trim()
    if (!trimmed) return

    const userMsg = { from: 'user', text: trimmed }

    const urgent = detectRedFlags(trimmed)
    let botText
    if (urgent.length > 0) {
      botText = t('chatbot.urgent')
    } else {
      botText = findAnswer(trimmed) || t('chatbot.fallback')
    }

    setMessages((prev) => [...prev, userMsg, { from: 'bot', text: botText }])
    setInput('')
  }

  function handleMic() {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) return
    const recognition = new SpeechRecognitionCtor()
    recognition.lang = speechLang
    recognition.interimResults = false
    recognition.onstart = () => setRecording(true)
    recognition.onend = () => setRecording(false)
    recognition.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript
      if (transcript) handleSend(transcript)
    }
    recognition.start()
  }

  return (
    <>
      <button
        type="button"
        className="chatbot-fab print-hide"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('chatbot.title')}
      >
        <span className="chatbot-fab__icon">✦</span>
        <span className="chatbot-fab__label">{t('chatbot.title')}</span>
      </button>

      {open && (
        <div className="chatbot-panel print-hide" role="dialog" aria-label={t('chatbot.title')}>
          <div className="chatbot-panel__head">
            <span>{t('chatbot.title')}</span>
            <button type="button" className="chatbot-panel__close" onClick={() => setOpen(false)} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="chatbot-panel__body">
            {messages.map((m, i) => (
              <div key={i} className={`chatbot-bubble chatbot-bubble--${m.from}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="chatbot-panel__input-row">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t('chatbot.placeholder')}
            />
            <button type="button" className={`chatbot-mic ${recording ? 'recording' : ''}`} onClick={handleMic} aria-label="Speak">
              <IconMic width={15} height={15} />
            </button>
            <button type="button" className="btn btn-primary chatbot-send" onClick={() => handleSend()}>
              {t('chatbot.send')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
