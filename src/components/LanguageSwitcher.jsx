import { LANGUAGES } from '../i18n/translations'
import { useLanguage } from '../context/LanguageContext'

// Small, always-available language dropdown for the patient-facing
// header, so the choice from LanguageSelect can be changed anytime
// without restarting the flow.
export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <select
      className="lang-switcher print-hide"
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
      aria-label="Choose language"
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.native}
        </option>
      ))}
    </select>
  )
}
