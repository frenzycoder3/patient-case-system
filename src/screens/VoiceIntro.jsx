import { useEffect, useRef, useState } from 'react'
import { IconLeaf, IconMic } from '../components/icons'
import { useLanguage } from '../context/LanguageContext'
import { usePatient } from '../context/PatientContext'
import { extractSymptomsWithAI } from '../utils/ai'

// Shown once per visit, right after the language is chosen. Speaks (and
// shows) a simple question — would you like to tell us your problem out
// loud, or type it yourself? Typing dismisses this screen immediately.
// Speaking opens a full-screen listening view in the patient's chosen
// language, then shows back what it heard so the patient can confirm or
// fix it before it's carried into the rest of the form.
export default function VoiceIntro({ onDone }) {
  const { t, speechLang } = useLanguage()
  const { updateSection } = usePatient()
  const [mode, setMode] = useState('ask') // ask | listening | confirm
  const [transcript, setTranscript] = useState('')
  const transcriptRef = useRef('')
  const [messages, setMessages] = useState([])
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState('')
  const [readyToContinue, setReadyToContinue] = useState(false)
  const recognitionRef = useRef(null)
  const spokenRef = useRef(false)
  const [backendLock, setBackendLock] = useState(false)
  // helper to call onDone with debug logging
  function callOnDone(reason) {
    try {
      // eslint-disable-next-line no-console
      console.warn('[VoiceIntro] onDone called with reason:', reason)
      // eslint-disable-next-line no-console
      console.warn(new Error().stack)
    } catch {}
    if (typeof onDone === 'function') onDone(reason)
  }

  function extractSymptomSummary(text) {
    if (!text) return ''

    const cleaned = text.replace(/\s+/g, ' ').trim()
    if (!cleaned) return ''

    return cleaned.length > 220 ? `${cleaned.slice(0, 217).trim()}...` : cleaned
  }

  // Toggle global UI state when voice UI is active (non-ask modes)
  useEffect(() => {
    try {
      if (mode !== 'ask') document.body.classList.add('voice-active')
      else document.body.classList.remove('voice-active')
    } catch {
      /* ignore */
    }
    try {
      // set a global lock so the app shell won't navigate away unexpectedly
      // while the voice UI is active. Cleared when we return to 'ask'.
      // Also respect a backend-sent lock (SSE). Other code reads window.__VOICE_LOCK.
      // eslint-disable-next-line no-undef
      window.__VOICE_LOCK = mode !== 'ask' || backendLock
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // Subscribe to backend SSE voice-lock stream and update backendLock
  useEffect(() => {
    if (typeof window === 'undefined' || !window.EventSource) return
    try {
      const es = new EventSource('/api/voice-lock/stream')
      es.onmessage = (ev) => {
        if (!ev.data) return
        try {
          const payload = JSON.parse(ev.data)
          if (payload && payload.type === 'voice-lock') {
            setBackendLock(!!payload.locked)
          }
        } catch (e) {
          // ignore non-JSON comments
        }
      }
      es.onerror = () => {
        es.close()
      }
      return () => es.close()
    } catch {
      /* ignore */
    }
  }, [])

  function chooseType() {
    try {
      window.speechSynthesis?.cancel()
    } catch {
      /* ignore */
    }
    callOnDone('confirmed')
  }

  function updateTranscript(text) {
    transcriptRef.current = text
    setTranscript(text)
  }

  function chooseSpeak() {
    setError('')
    setMode('listening')
    // clear any visible messages; do not show the initial prompt text
    setMessages([])
    startListening()
  }

  function startListening() {
    const SpeechRecognitionCtor =
      typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

    if (!SpeechRecognitionCtor) {
      setRecording(false)
      setError(t('voiceIntro.unsupported'))
      setMode('ask')
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = speechLang
    recognition.interimResults = true
    // Use non-continuous mode so recognition stops automatically on silence
    recognition.continuous = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    let finalText = ''

    recognition.onstart = () => setRecording(true)
    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += `${chunk} `
        else interim += chunk
      }
      updateTranscript((finalText + interim).trim())
    }
    recognition.onerror = () => {
      setRecording(false)
      setError(t('voiceIntro.unsupported'))
      setMode('ask')
    }
    recognition.onend = async () => {
      setRecording(false)
      // Prefer the locally-accumulated finalText; fall back to the last
      // known transcript snapshot. Avoid switching back to the 'ask'
      // screen on empty results — stay on the listening UI.
      const spokenText = (finalText || transcriptRef.current || '').replace(/\s+/g, ' ').trim()
      if (spokenText) {
        updateTranscript(spokenText)
        // Automatically process the transcript with AI and run follow-up
        await processTranscript(spokenText)
      } else {
        // No speech detected — remain on listening mode so user can try again
        setError(t('voiceIntro.emptyTranscript'))
        setMode('listening')
      }
    }

    recognition.start()
  }

  // Removed manual stop: recognition now stops automatically on silence

  async function confirmTranscript() {
    const cleanedTranscript = transcript.trim()
    if (!cleanedTranscript) {
      setError(t('voiceIntro.emptyTranscript'))
      return
    }

    try {
      const aiResult = await extractSymptomsWithAI(cleanedTranscript, speechLang)
      const extractedSummary = aiResult.mainComplaint || extractSymptomSummary(cleanedTranscript)

      updateSection('symptomJourney', {
        mainComplaint: extractedSummary,
        ownWords: cleanedTranscript,
      })
      callOnDone('confirmed')
    } catch {
      const extractedSummary = extractSymptomSummary(cleanedTranscript)
      updateSection('symptomJourney', {
        mainComplaint: extractedSummary,
        ownWords: cleanedTranscript,
      })
      callOnDone('confirmed')
    }
  }

  function backToAsk() {
    try {
      recognitionRef.current?.stop()
    } catch {
      /* ignore */
    }
    updateTranscript('')
    setError('')
    setMode('ask')
  }

  function speakText(text) {
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utter = new SpeechSynthesisUtterance(text)
        utter.lang = speechLang
        window.speechSynthesis.speak(utter)
      }
    } catch {
      /* ignore */
    }
  }

  function listenOnce(timeout = 10000) {
    return new Promise((resolve) => {
      const SpeechRecognitionCtor =
        typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
      if (!SpeechRecognitionCtor) {
        resolve('')
        return
      }

      const r = new SpeechRecognitionCtor()
      r.lang = speechLang
      r.interimResults = false
      r.continuous = false
      let resultText = ''
      r.onstart = () => setRecording(true)
      r.onresult = (ev) => {
        resultText = Array.from(ev.results).map((rs) => rs[0].transcript).join(' ')
      }
      r.onerror = () => {
        setRecording(false)
        resolve('')
      }
      r.onend = () => {
        setRecording(false)
        resolve((resultText || '').trim())
      }
      try {
        r.start()
      } catch {
        resolve('')
      }
      // safety timeout
      setTimeout(() => {
        try {
          r.stop()
        } catch {
          /* ignore */
        }
      }, timeout)
    })
  }

  async function processTranscript(initialText) {
    setError('')
    setMode('processing')
    setMessages((m) => [...m, { role: 'assistant', text: t('voiceIntro.processing') }])
    const maxFollowUps = 3
    let combined = (initialText || '').trim()
    if (!combined) {
      setError(t('voiceIntro.emptyTranscript'))
      setMode('ask')
      return
    }

    try {
      let aiResult = await extractSymptomsWithAI(combined, speechLang)
      let structured = aiResult.structured || {}
      let followUps = []
      if (!structured.onset) followUps.push('onset')
      if (!structured.severity) followUps.push('severity')

      let attempts = 0
      while (followUps.length && attempts < maxFollowUps) {
        const field = followUps.shift()
        const question = field === 'onset' ? t('voiceIntro.followUpOnset') : t('voiceIntro.followUpSeverity')
        // speak the follow-up question but do not display the literal text
        speakText(question)
        const answer = await listenOnce(8000)
        if (answer) {
            // do not display user's spoken answer in the chat UI
          combined = `${combined} ${answer}`
          aiResult = await extractSymptomsWithAI(combined, speechLang)
          structured = aiResult.structured || {}
          // recompute missing
          followUps = []
          if (!structured.onset) followUps.push('onset')
          if (!structured.severity) followUps.push('severity')
        }
        attempts++
      }

      const mainComplaint = aiResult.mainComplaint || extractSymptomSummary(combined)
      updateSection('symptomJourney', { mainComplaint, ownWords: combined })
      setMessages((m) => [...m, { role: 'assistant', text: aiResult.mainComplaint || mainComplaint }])
      // keep voice UI visible; let user continue when ready
      setReadyToContinue(true)
      setMode('listening')
    } catch (err) {
      // fallback: use transcript directly
      const extractedSummary = extractSymptomSummary(combined)
      updateSection('symptomJourney', { mainComplaint: extractedSummary, ownWords: combined })
      setMessages((m) => [...m, { role: 'assistant', text: extractedSummary }])
      setReadyToContinue(true)
      setMode('listening')
    }
  }

  if (mode === 'listening' || mode === 'confirm') {
    return (
      <div className="voice-fullscreen">
        <div className="voice-fullscreen__inner">
          <div className={`voice-fullscreen__orb ${recording ? 'voice-fullscreen__orb--live' : ''}`}>
            <IconMic width={32} height={32} />
          </div>

          {mode === 'listening' && (
            <>
              <h1>{recording ? t('voiceIntro.listeningTitle') : t('voiceIntro.startingTitle')}</h1>
              <p className="voice-fullscreen__hint">{t('voiceIntro.listeningHint')}</p>

              <div className="voice-chat" aria-live="polite">
                <div className="voice-chat__messages">
                  {messages.map((m, idx) => (
                    <div key={idx} className={`voice-chat__message ${m.role === 'user' ? 'voice-chat__message--user' : 'voice-chat__message--assistant'}`}>
                      <div className="voice-chat__bubble">{m.text}</div>
                    </div>
                  ))}
                </div>
              </div>
              {error && <div className="field-error">{error}</div>}
              {readyToContinue && (
                <div className="voice-fullscreen__actions-bottom">
                  <button type="button" className="btn btn-secondary" onClick={() => { setMode('confirm'); setReadyToContinue(false) }}>
                    {t('voiceIntro.tryAgain')}
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => { callOnDone('confirmed') }}>
                    {t('common.continue')}
                  </button>
                </div>
              )}
            </>
          )}

          {mode === 'processing' && (
            <div className="voice-status">
              <div className="spinner" />
              <div>{t('voiceIntro.processing')}</div>
            </div>
          )}

          {mode === 'confirm' && (
            <>
              <h1>{t('voiceIntro.confirmTitle')}</h1>
              <p className="voice-fullscreen__hint">{t('voiceIntro.confirmHint')}</p>
              <textarea
                className="voice-fullscreen__edit"
                value={transcript}
                onChange={(e) => {
                  updateTranscript(e.target.value)
                  setError('')
                }}
                rows={5}
              />
              {error && <div className="field-error">{error}</div>}
              <div className="voice-fullscreen__actions">
                <button type="button" className="btn btn-secondary" onClick={backToAsk}>
                  {t('voiceIntro.tryAgain')}
                </button>
                <button type="button" className="btn btn-primary" onClick={confirmTranscript}>
                  {t('voiceIntro.confirmContinue')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="voice-intro-screen">
      <div className="voice-intro-card">
        <div className="welcome__mark">
          <IconLeaf />
        </div>
        {/* choice UI: buttons only — remove header and subtitle per user request */}
        {error && <div className="field-error">{error}</div>}
        <div className="voice-intro-actions">
          <button type="button" className="voice-intro-choice" onClick={chooseSpeak}>
            <span className="voice-intro-choice__icon"><IconMic width={22} height={22} /></span>
            <span>
              <strong>{t('voiceIntro.speakOption')}</strong>
              <small>{t('voiceIntro.speakOptionHint')}</small>
            </span>
          </button>
          <button type="button" className="voice-intro-choice" onClick={chooseType}>
            <span className="voice-intro-choice__icon">⌨️</span>
            <span>
              <strong>{t('voiceIntro.typeOption')}</strong>
              <small>{t('voiceIntro.typeOptionHint')}</small>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
