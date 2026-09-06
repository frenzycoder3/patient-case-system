import { useEffect, useRef, useState } from 'react'
import { IconLeaf, IconMic } from '../components/icons'
import { useLanguage } from '../context/LanguageContext'
import { usePatient } from '../context/PatientContext'
import { extractSymptomsWithAI, generateAIClinicalResponse } from '../utils/ai'

// Text-to-speech helper that strictly awaits completion before resolving
function speakAsync(text, lang) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve()
      return
    }
    try {
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = lang
      utter.rate = 0.95
      let resolved = false
      const finish = () => {
        if (!resolved) {
          resolved = true
          resolve()
        }
      }
      utter.onend = finish
      utter.onerror = finish

      // Fallback timeout in case onend does not fire
      const maxMs = Math.max(3000, (text.length / 10) * 1000 + 2000)
      setTimeout(finish, maxMs)

      window.speechSynthesis.speak(utter)
    } catch {
      resolve()
    }
  })
}

// Single-turn speech listening helper with silence detection
function listenOnceAsync(lang, { maxSilenceMs = 2400, maxTotalMs = 15000, onRecognition } = {}) {
  return new Promise((resolve) => {
    const SpeechCtor =
      typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

    if (!SpeechCtor) {
      resolve('')
      return
    }

    try {
      const recognition = new SpeechCtor()
      if (typeof onRecognition === 'function') {
        onRecognition(recognition)
      }
      recognition.lang = lang
      recognition.interimResults = true
      recognition.continuous = true
      recognition.maxAlternatives = 1

      let accumulated = ''
      let silenceTimer = null
      let totalTimer = null
      let isDone = false

      const cleanup = () => {
        if (silenceTimer) clearTimeout(silenceTimer)
        if (totalTimer) clearTimeout(totalTimer)
      }

      const finish = () => {
        if (isDone) return
        isDone = true
        cleanup()
        try {
          recognition.stop()
        } catch {
          /* ignore */
        }
        resolve(accumulated.trim())
      }

      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            accumulated += `${chunk} `
          }
        }
        if (silenceTimer) clearTimeout(silenceTimer)
        silenceTimer = setTimeout(finish, maxSilenceMs)
      }

      recognition.onerror = () => {
        finish()
      }

      recognition.onend = () => {
        finish()
      }

      recognition.start()

      // Initial silence timeout
      silenceTimer = setTimeout(finish, 8500)
      // Safety total timeout
      totalTimer = setTimeout(finish, maxTotalMs)
    } catch {
      resolve('')
    }
  })
}

// Extract concise summary
function extractSymptomSummary(text) {
  if (!text) return ''
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  return cleaned.length > 220 ? `${cleaned.slice(0, 217).trim()}...` : cleaned
}

// Intelligent detection of already mentioned aspects in spoken words
function detectSpokenAspects(text) {
  const lower = (text || '').toLowerCase()

  const hasOnset =
    /(yesterday|days?|weeks?|months?|years?|since|ago|morning|evening|night|hours?|today|start|कल|दिन|हफ्ते|महीने|साल|सुबह|शाम|रात|நேற்று|நாள்|வாரம்|மாதம்|வருடம்|காலை|இரவு)/i.test(
      lower
    )

  const hasSeverity =
    /(mild|moderate|severe|unbearable|pain\s*(level|scale)?\s*[1-9]|out of 10|\b([1-9]|10)\b|कम|तेज|गंभीर|दर्द|அளவு|லேசான|கடுமையான|தாங்க)/i.test(
      lower
    )

  const hasTrend =
    /(better|worse|same|improving|increasing|worsening|relief|triggers?|pain increases|walking|rest|दवा|चलने|बैठने|आराम|बढ़|कम|அதிக|குறை|நிவாரணம்|மருந்து)/i.test(
      lower
    )

  const hasOther =
    /(fever|cough|cold|headache|vomit|nausea|weakness|fatigue|dizziness|बुखार|खांसी|कफ|कमजोरी|चक्कर|காய்ச்சல்|இருமல்|சோர்வு|தலைவலி)/i.test(
      lower
    )

  return { hasOnset, hasSeverity, hasTrend, hasOther }
}

export default function VoiceIntro({ onDone }) {
  const { t, speechLang } = useLanguage()
  const { updateSection } = usePatient()

  // High-level modes: 'ask' | 'active' | 'confirm'
  const [mode, setMode] = useState('ask')

  // Sub-phases during 'active' mode:
  // 'listening_initial' | 'speaking_question' | 'listening_answer' | 'processing'
  const [phase, setPhase] = useState('listening_initial')

  const [error, setError] = useState('')
  const [transcript, setTranscript] = useState('')
  const [structuredInfo, setStructuredInfo] = useState({
    mainComplaint: '',
    onset: '',
    severity: 5,
    trend: '',
    triggers: '',
    relief: '',
  })

  const isRunningRef = useRef(false)
  const activeRecognitionRef = useRef(null)

  // Lock the screen, apply body classes and global flag
  useEffect(() => {
    try {
      if (mode === 'active') {
        document.body.classList.add('voice-active')
        document.body.style.overflow = 'hidden'
        window.__VOICE_LOCK = true
      } else {
        document.body.classList.remove('voice-active')
        document.body.style.overflow = ''
        window.__VOICE_LOCK = false
      }
    } catch {
      /* ignore */
    }

    return () => {
      try {
        document.body.classList.remove('voice-active')
        document.body.style.overflow = ''
        window.__VOICE_LOCK = false
      } catch {
        /* ignore */
      }
    }
  }, [mode])

  // Cleanup speech synthesis and mic on unmount
  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis?.cancel()
      } catch {
        /* ignore */
      }
      if (activeRecognitionRef.current) {
        try {
          activeRecognitionRef.current.abort()
        } catch {
          /* ignore */
        }
      }
    }
  }, [])

  function abortToTyping() {
    isRunningRef.current = false
    if (activeRecognitionRef.current) {
      try {
        activeRecognitionRef.current.onresult = null
        activeRecognitionRef.current.onerror = null
        activeRecognitionRef.current.onend = null
        activeRecognitionRef.current.abort()
        activeRecognitionRef.current.stop()
      } catch {
        /* ignore */
      }
      activeRecognitionRef.current = null
    }
    try {
      window.speechSynthesis?.cancel()
    } catch {
      /* ignore */
    }
    try {
      document.body.classList.remove('voice-active')
      document.body.style.overflow = ''
      window.__VOICE_LOCK = false
    } catch {
      /* ignore */
    }

    if (typeof onDone === 'function') onDone('typed')
  }

  function chooseType() {
    abortToTyping()
  }

  function chooseSpeak() {
    setError('')
    const SpeechCtor =
      typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

    if (!SpeechCtor) {
      setError(t('voiceIntro.unsupported'))
      return
    }

    // Enter LOCKED active voice mode
    setMode('active')
    runVoiceWorkflow()
  }

  // Orchestrates the multi-turn AI listening and conversational response workflow
  async function runVoiceWorkflow() {
    if (isRunningRef.current) return
    isRunningRef.current = true

    try {
      // PHASE 1: Listen to initial complaint
      setPhase('listening_initial')
      const initialText = await listenOnceAsync(speechLang, {
        maxSilenceMs: 2500,
        maxTotalMs: 16000,
        onRecognition: (r) => {
          activeRecognitionRef.current = r
        },
      })

      if (!isRunningRef.current) return

      if (!initialText) {
        setPhase('processing')
        setError(t('voiceIntro.emptyTranscript'))
        setMode('ask')
        isRunningRef.current = false
        return
      }

      let combinedTranscript = initialText.trim()
      setTranscript(combinedTranscript)
      const conversation = [{ role: 'user', text: initialText }]

      // PHASE 2: AI Listening & Contextual Response (Powered by Gemini / OpenAI / Clinical Engine)
      setPhase('processing')
      const aiResponse = await generateAIClinicalResponse({
        userSpeech: combinedTranscript,
        conversation,
        language: speechLang,
      })

      if (!isRunningRef.current) return

      if (aiResponse) {
        // AI speaks its contextual clinical question (NO on-screen subtitle captions)
        setPhase('speaking_question')
        await speakAsync(aiResponse, speechLang)

        if (!isRunningRef.current) return

        // Listen to the patient's answer (NO on-screen captions)
        setPhase('listening_answer')
        const patientAnswer = await listenOnceAsync(speechLang, {
          maxSilenceMs: 2400,
          maxTotalMs: 14000,
          onRecognition: (r) => {
            activeRecognitionRef.current = r
          },
        })

        if (!isRunningRef.current) return

        if (patientAnswer) {
          combinedTranscript = `${combinedTranscript}. ${patientAnswer}`
          setTranscript(combinedTranscript)
          conversation.push({ role: 'assistant', text: aiResponse })
          conversation.push({ role: 'user', text: patientAnswer })

          // Optional 2nd turn if severity or onset are still missing
          const aspects = detectSpokenAspects(combinedTranscript)
          if (!aspects.hasSeverity || !aspects.hasOnset) {
            setPhase('processing')
            const secondResponse = await generateAIClinicalResponse({
              userSpeech: combinedTranscript,
              conversation,
              language: speechLang,
            })

            if (!isRunningRef.current) return

            if (secondResponse && secondResponse !== aiResponse) {
              setPhase('speaking_question')
              await speakAsync(secondResponse, speechLang)

              if (!isRunningRef.current) return

              setPhase('listening_answer')
              const secondAnswer = await listenOnceAsync(speechLang, {
                maxSilenceMs: 2400,
                maxTotalMs: 12000,
                onRecognition: (r) => {
                  activeRecognitionRef.current = r
                },
              })

              if (!isRunningRef.current) return

              if (secondAnswer) {
                combinedTranscript = `${combinedTranscript}. ${secondAnswer}`
                setTranscript(combinedTranscript)
              }
            }
          }
        }
      }

      // PHASE 3: AI Synthesis & Structured Case Extraction
      setPhase('processing')

      let aiResult = { mainComplaint: '', structured: {} }
      try {
        aiResult = await extractSymptomsWithAI(combinedTranscript, speechLang)
      } catch {
        aiResult = { mainComplaint: extractSymptomSummary(combinedTranscript), structured: {} }
      }

      if (!isRunningRef.current) return

      const mainComplaint =
        aiResult.structured?.mainComplaint ||
        aiResult.mainComplaint ||
        extractSymptomSummary(combinedTranscript) ||
        combinedTranscript

      // Determine structured severity
      let detectedSeverity = aiResult.structured?.severity || 5
      if (!aiResult.structured?.severity) {
        const sevMatches = combinedTranscript.match(/\b([1-9]|10)\b/)
        if (sevMatches) {
          detectedSeverity = Math.min(10, Math.max(1, parseInt(sevMatches[1], 10)))
        } else if (/severe|unbearable|तेज|கடுமையான/i.test(combinedTranscript)) {
          detectedSeverity = 8
        } else if (/mild|कम|லேசான/i.test(combinedTranscript)) {
          detectedSeverity = 3
        }
      }

      // Determine trend
      let detectedTrend = aiResult.structured?.trend || ''
      if (!detectedTrend) {
        if (/worse|बढ़|அதிக/i.test(combinedTranscript)) detectedTrend = 'Worse'
        else if (/better|कम|குறை/i.test(combinedTranscript)) detectedTrend = 'Better'
        else if (/same|वैसा|அப்படியே/i.test(combinedTranscript)) detectedTrend = 'Same'
      }

      // Determine onset date if mentioned
      let detectedStartDate = aiResult.structured?.onset || ''
      if (!detectedStartDate || detectedStartDate.length > 15) {
        const now = new Date()
        if (/yesterday|कल|நேற்று/i.test(combinedTranscript)) {
          const d = new Date(now)
          d.setDate(d.getDate() - 1)
          detectedStartDate = d.toISOString().split('T')[0]
        } else {
          const daysMatch = combinedTranscript.match(/(\d+)\s*(days?|दिन|நாட்கள்)/i)
          if (daysMatch) {
            const count = parseInt(daysMatch[1], 10)
            if (!isNaN(count) && count > 0 && count < 365) {
              const d = new Date(now)
              d.setDate(d.getDate() - count)
              detectedStartDate = d.toISOString().split('T')[0]
            }
          }
        }
      }

      // Determine onset type
      let detectedOnsetType = ''
      if (/sudden|suddenly|achanak|अचानक|திடீரென/i.test(combinedTranscript)) {
        detectedOnsetType = 'Sudden'
      } else if (/gradual|slowly|dhire|धीरे|படிப்படியாக/i.test(combinedTranscript)) {
        detectedOnsetType = 'Gradual'
      }

      const extractedInfo = {
        mainComplaint,
        onset: detectedStartDate || 'Mentioned in audio',
        severity: detectedSeverity,
        trend: detectedTrend,
        triggers: aiResult.structured?.triggers || '',
        relief: aiResult.structured?.relief || '',
      }

      setStructuredInfo(extractedInfo)

      // Save to global PatientContext
      const journeyUpdate = {
        mainComplaint,
        severity: detectedSeverity,
        trend: detectedTrend,
        ownWords: combinedTranscript,
      }
      if (detectedStartDate && detectedStartDate.length <= 12) journeyUpdate.startDate = detectedStartDate
      if (detectedOnsetType) journeyUpdate.onsetType = detectedOnsetType
      updateSection('symptomJourney', journeyUpdate)

      // Speak polite closing acknowledgment
      await speakAsync(t('voiceIntro.closingMessage'), speechLang)

      if (!isRunningRef.current) return
      // Switch to confirmation mode
      setMode('confirm')
    } catch (e) {
      if (!isRunningRef.current) return
      const summary = extractSymptomSummary(transcript)
      updateSection('symptomJourney', {
        mainComplaint: summary,
        ownWords: transcript,
      })
      setMode('confirm')
    } finally {
      isRunningRef.current = false
      activeRecognitionRef.current = null
    }
  }

  function handleConfirmContinue() {
    try {
      window.speechSynthesis?.cancel()
    } catch {
      /* ignore */
    }
    if (typeof onDone === 'function') onDone('confirmed')
  }

  function handleRecordAgain() {
    try {
      window.speechSynthesis?.cancel()
    } catch {
      /* ignore */
    }
    isRunningRef.current = false
    setTranscript('')
    setError('')
    chooseSpeak()
  }

  // 1. ACTIVE MODE: FULLSCREEN VOICE DIALOG (HELD FOCUSED WITHOUT LOCK BADGE)
  if (mode === 'active') {
    return (
      <div className="voice-fullscreen" role="dialog" aria-modal="true">
        <div className="voice-fullscreen__inner">
          {/* NOTICE: Lock badge removed per user request: "dont display like session is locked" */}

          {/* Dynamic Voice Orb: pulsing mic when listening, wave bars when speaking */}
          {phase === 'speaking_question' ? (
            <div className="voice-fullscreen__orb voice-fullscreen__orb--speaking">
              <div className="voice-speaking-wave" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : phase === 'processing' ? (
            <div className="voice-fullscreen__orb">
              <div className="spinner" />
            </div>
          ) : (
            <div className="voice-fullscreen__orb voice-fullscreen__orb--live">
              <IconMic width={36} height={36} />
            </div>
          )}

          {/* Titles & Hints WITHOUT displaying speech subtitle text */}
          {phase === 'speaking_question' && (
            <>
              <h1>{t('voiceIntro.assistantSpeaking')}</h1>
              <p className="voice-fullscreen__hint">
                Please listen to the AI question…
              </p>
            </>
          )}

          {(phase === 'listening_initial' || phase === 'listening_answer') && (
            <>
              <h1>{t('voiceIntro.listeningTitle')}</h1>
              <p className="voice-fullscreen__hint">{t('voiceIntro.listeningHint')}</p>
            </>
          )}

          {phase === 'processing' && (
            <>
              <h1>{t('voiceIntro.processing')}</h1>
              <p className="voice-fullscreen__hint">AI is analyzing your symptoms…</p>
            </>
          )}

          {/* Prominent, working Switch to Typing button */}
          <div style={{ marginTop: 28 }}>
            <button
              type="button"
              className="voice-switch-btn"
              onClick={abortToTyping}
            >
              <span>⌨️</span>
              <span>{t('voiceIntro.switchToTyping')}</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 2. CONFIRM MODE: INTAKE COMPLETED, REVIEW DETAILS
  if (mode === 'confirm') {
    return (
      <div className="voice-fullscreen" role="dialog" aria-modal="true">
        <div className="voice-fullscreen__inner">
          <div className="welcome__mark" style={{ margin: '0 auto 16px' }}>
            <IconLeaf />
          </div>

          <h1>{t('voiceIntro.confirmTitle')}</h1>
          <p className="voice-fullscreen__hint">{t('voiceIntro.confirmHint')}</p>

          <div className="voice-confirm-card">
            <div className="voice-confirm-item">
              <div className="voice-confirm-item__label">Main Complaint</div>
              <div className="voice-confirm-item__value">
                {structuredInfo.mainComplaint || transcript || 'Recorded via speech'}
              </div>
            </div>

            {structuredInfo.severity && (
              <div className="voice-confirm-item">
                <div className="voice-confirm-item__label">Severity Rating</div>
                <div className="voice-confirm-item__value">{structuredInfo.severity} / 10</div>
              </div>
            )}

            {structuredInfo.trend && (
              <div className="voice-confirm-item">
                <div className="voice-confirm-item__label">Trend</div>
                <div className="voice-confirm-item__value">{structuredInfo.trend}</div>
              </div>
            )}
          </div>

          <div className="voice-fullscreen__actions">
            <button type="button" className="btn btn-secondary" onClick={handleRecordAgain}>
              {t('voiceIntro.tryAgain')}
            </button>
            <button type="button" className="btn btn-primary" onClick={handleConfirmContinue}>
              {t('voiceIntro.confirmContinue')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 3. ASK MODE: INITIAL CHOICE SCREEN
  return (
    <div className="voice-intro-screen">
      <div className="voice-intro-card">
        <div className="welcome__mark">
          <IconLeaf />
        </div>

        {error && <div className="field-error" style={{ marginBottom: 14 }}>{error}</div>}

        <div className="voice-intro-actions">
          <button type="button" className="voice-intro-choice" onClick={chooseSpeak}>
            <span className="voice-intro-choice__icon">
              <IconMic width={22} height={22} />
            </span>
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
