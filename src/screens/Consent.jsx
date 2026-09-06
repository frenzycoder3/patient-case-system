import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePatient } from '../context/PatientContext'
import { useLanguage } from '../context/LanguageContext'

// A consent + (mock) ABHA ID entry screen, shown right after Welcome.
// First asks whether the patient already has an ABHA health account or
// is a new patient, and only shows the ABHA field once "I have one" is
// chosen — new patients aren't asked to fill in something they don't
// have. This is a UI-only stand-in for the real ABDM consent framework
// and ABHA authentication — no real verification happens here.
//
// LATER: replace the ABHA field with real ABDM authentication (OTP/QR
// based), and record consent with a timestamp + version of the consent
// text shown, per the Digital Personal Data Protection Act 2023.
export default function Consent() {
  const navigate = useNavigate()
  const { data, updateSection } = usePatient()
  const { t } = useLanguage()
  const [patientType, setPatientType] = useState(data.consent.abhaId ? 'abha' : '')
  const [abhaId, setAbhaId] = useState(data.consent.abhaId)
  const [consentGiven, setConsentGiven] = useState(data.consent.consentGiven)
  const [error, setError] = useState('')

  function handleContinue() {
    if (!patientType) {
      setError(t('consent.patientTypeError'))
      return
    }

    if (!consentGiven) {
      setError(t('consent.error'))
      return
    }

    updateSection('consent', { abhaId: patientType === 'abha' ? abhaId : '', consentGiven })
    navigate('/patient-details')
  }

  return (
    <div className="screen">
      <div className="card">
        <h2 className="eyebrow-free-heading">{t('consent.eyebrow')}</h2>
        <p className="screen-intro">{t('consent.intro')}</p>

        <div className="field">
          <label>{t('consent.patientTypeQuestion')}</label>
          <div className="choice-grid cols-2">
            <button
              type="button"
              className={`choice ${patientType === 'abha' ? 'selected' : ''}`}
              onClick={() => {
                setPatientType('abha')
                setError('')
              }}
            >
              <span className="choice__dot" />
              {t('consent.haveAbha')}
            </button>
            <button
              type="button"
              className={`choice ${patientType === 'new' ? 'selected' : ''}`}
              onClick={() => {
                setPatientType('new')
                setError('')
              }}
            >
              <span className="choice__dot" />
              {t('consent.newPatient')}
            </button>
          </div>
        </div>

        {patientType === 'abha' && (
          <div className="field">
            <label htmlFor="abhaId">{t('consent.abhaLabel')}</label>
            <input
              id="abhaId"
              type="text"
              value={abhaId}
              onChange={(e) => setAbhaId(e.target.value)}
              placeholder={t('consent.abhaPlaceholder')}
            />
            <div className="field-hint">{t('consent.abhaHint')}</div>
          </div>
        )}

        {patientType === 'new' && (
          <div className="field-hint" style={{ marginBottom: 20 }}>{t('consent.newPatientHint')}</div>
        )}

        <hr className="section-divider" />

        <label className={`check-item ${consentGiven ? 'checked' : ''}`} style={{ alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={(e) => {
              setConsentGiven(e.target.checked)
              if (e.target.checked) setError('')
            }}
          />
          <span>{t('consent.checkbox')}</span>
        </label>
        {error && <div className="field-error">{error}</div>}

        <div className="nav-row">
          <button className="btn btn-secondary" onClick={() => navigate('/')} type="button">
            {t('common.back')}
          </button>
          <button className="btn btn-primary" onClick={handleContinue} type="button">
            {t('common.continue')}
          </button>
        </div>
      </div>
    </div>
  )
}
