import { createContext, useContext, useState, useCallback } from 'react'
import { translate, DEFAULT_LANGUAGE } from '../i18n/translations'

// For testing behavior: do not persist the language across full reloads.
// The language chooser will appear on every full page reload, but stays
// in-memory while the user navigates the flow.
const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE)
  const [hasStoredLanguage, setHasStoredLanguage] = useState(false)

  const setLanguage = useCallback((code) => {
    setLanguageState(code)
    setHasStoredLanguage(true)
  }, [])

  const t = useCallback((key) => translate(language, key), [language])

  // Maps our language codes to BCP-47 locale tags the Web Speech API
  // expects for SpeechRecognition.lang.
  const speechLang = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN' }[language] || 'en-IN'

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, speechLang, hasStoredLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>')
  return ctx
}

export function hasChosenLanguageBefore() {
  return !!readStoredLanguage()
}
