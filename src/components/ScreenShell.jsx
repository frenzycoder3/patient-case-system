import { useNavigate } from 'react-router-dom'
import ProgressBar from './ProgressBar'
import HelpButton from './HelpButton'
import ChatbotButton from './ChatbotButton'
import { stepIndexForPath, nextPath, prevPath } from '../utils/steps'
import { usePatient } from '../context/PatientContext'
import { useLanguage } from '../context/LanguageContext'

/**
 * Wraps each of the data-collection pages with:
 *  - the "Step X of Y" progress bar
 *  - a title + short intro
 *  - the page content (children)
 *  - Back / Next buttons
 *  - a persistent "Need help?" button that can connect to staff
 *
 * Props:
 *  - path: this page's route (used to compute the step number)
 *  - onNext: runs before moving forward. Return `false` to block
 *            navigation (e.g. a required field is empty).
 *  - sectionName: key into PatientContext's data object for this page,
 *    used to flag the section as staff-assisted if Need Help is used.
 */
export default function ScreenShell({ path, title, intro, children, onNext, nextLabel, sectionName }) {
  const navigate = useNavigate()
  const index = stepIndexForPath(path)
  const { data } = usePatient()
  const { t } = useLanguage()
  const isAssisted = sectionName && data.assistedSections[sectionName]
  const resolvedNextLabel = nextLabel || t('common.next')

  function handleNext() {
    if (onNext) {
      const result = onNext()
      if (result === false) return
    }
    navigate(nextPath(path))
  }

  function handleBack() {
    navigate(prevPath(path))
  }

  return (
    <div className="screen">
      {index >= 0 && <ProgressBar currentIndex={index} />}
      <div className="card">
        {isAssisted && (
          <div className="assisted-banner">This section is being filled in with staff assistance.</div>
        )}
        <h2 className="eyebrow-free-heading">{title}</h2>
        {intro && <p className="screen-intro">{intro}</p>}
        {children}
        <div className="nav-row">
          <button className="btn btn-secondary" onClick={handleBack} type="button">
            {t('common.back')}
          </button>
          <button className="btn btn-primary" onClick={handleNext} type="button">
            {resolvedNextLabel}
          </button>
        </div>
      </div>
      <ChatbotButton />
      <HelpButton sectionName={sectionName} />
    </div>
  )
}
