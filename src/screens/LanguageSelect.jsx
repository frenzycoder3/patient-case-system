import { useState } from 'react'
import { LANGUAGES, DEFAULT_LANGUAGE } from '../i18n/translations'
import { useLanguage } from '../context/LanguageContext'
import { IconLeaf } from '../components/icons'

// Shown every time the site is freshly opened, before the patient
// reaches anything else. Fills the whole screen and sits centered so
// it reads as a deliberate first step, not just another form page.
// English is pre-selected as the default, and the choice can always be
// changed later from the small language switcher in the header.
export default function LanguageSelect({ onDone }) {
  const { setLanguage, t } = useLanguage()
  const [selected, setSelected] = useState(DEFAULT_LANGUAGE)

  function handleContinue() {
    setLanguage(selected)
    if (typeof onDone === 'function') {
      onDone()
    }
  }

  return (
    <div className="language-select-screen">
      <div className="language-select-card">
        <div className="welcome__mark">
          <IconLeaf />
        </div>
        <h1>{t('lang.title')}</h1>
        <p>{t('lang.subtitle')}</p>

        <div className="lang-option-list">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              className={`choice lang-option ${selected === l.code ? 'selected' : ''}`}
              onClick={() => setSelected(l.code)}
            >
              <span className="choice__dot" />
              <span className="lang-option__native">{l.native}</span>
              <span className="lang-option__label">{l.label}</span>
            </button>
          ))}
        </div>

        <button className="btn btn-primary" onClick={handleContinue} type="button" style={{ width: '100%' }}>
          {t('lang.continue')}
        </button>
      </div>
    </div>
  )
}
