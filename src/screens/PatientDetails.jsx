import { useState } from 'react'
import ScreenShell from '../components/ScreenShell'
import { ChoiceGroup } from '../components/FormControls'
import { usePatient } from '../context/PatientContext'
import { useLanguage } from '../context/LanguageContext'
import { upsertPatient } from '../utils/patientStore'

// India first (this is the default/primary audience), then other
// countries a patient here might realistically be calling from —
// covers NRIs, migrant workers, and international visitors.
const COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 India (+91)' },
  { code: '+971', label: '🇦🇪 UAE (+971)' },
  { code: '+966', label: '🇸🇦 Saudi Arabia (+966)' },
  { code: '+65', label: '🇸🇬 Singapore (+65)' },
  { code: '+60', label: '🇲🇾 Malaysia (+60)' },
  { code: '+94', label: '🇱🇰 Sri Lanka (+94)' },
  { code: '+977', label: '🇳🇵 Nepal (+977)' },
  { code: '+880', label: '🇧🇩 Bangladesh (+880)' },
  { code: '+92', label: '🇵🇰 Pakistan (+92)' },
  { code: '+44', label: '🇬🇧 United Kingdom (+44)' },
  { code: '+1', label: '🇺🇸 USA / Canada (+1)' },
  { code: '+61', label: '🇦🇺 Australia (+61)' },
  { code: '+974', label: '🇶🇦 Qatar (+974)' },
  { code: '+968', label: '🇴🇲 Oman (+968)' },
  { code: '+965', label: '🇰🇼 Kuwait (+965)' },
]

export default function PatientDetails() {
  const { data, updateSection, setPatientId } = usePatient()
  const { t } = useLanguage()
  const [form, setForm] = useState(data.patientDetails)
  const [errors, setErrors] = useState({})

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function validateAndSave() {
    const newErrors = {}
    if (!form.name.trim()) newErrors.name = t('patientDetails.nameError')
    if (!form.age || Number(form.age) <= 0) newErrors.age = t('patientDetails.ageError')
    if (!form.gender) newErrors.gender = t('patientDetails.genderError')
    const minLength = form.countryCode === '+91' ? 10 : 7
    if (!form.phone.trim() || form.phone.trim().length < minLength) newErrors.phone = t('patientDetails.phoneError')

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return false

    updateSection('patientDetails', form)

    // Resolve (or create) this patient's stable Patient ID, matched by
    // phone number so a repeat visit reuses the same ID instead of
    // creating a duplicate profile.
    const record = upsertPatient(form)
    setPatientId(record.patientId)

    return true
  }

  return (
    <ScreenShell
      path="/patient-details"
      sectionName="patientDetails"
      title={t('patientDetails.title')}
      intro={t('patientDetails.intro')}
      onNext={validateAndSave}
    >
      {data.patientId && (
        <div className="patient-id-badge">
          {t('patientDetails.patientIdNote')}: <strong>{data.patientId}</strong>
        </div>
      )}

      <div className="field">
        <label htmlFor="name">{t('patientDetails.name')}</label>
        <input
          id="name"
          type="text"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder={t('patientDetails.namePlaceholder')}
        />
        {errors.name && <div className="field-error">{errors.name}</div>}
      </div>

      <div className="field">
        <label htmlFor="age">{t('patientDetails.age')}</label>
        <input
          id="age"
          type="number"
          min="0"
          max="120"
          value={form.age}
          onChange={(e) => set('age', e.target.value)}
          placeholder={t('patientDetails.agePlaceholder')}
        />
        {errors.age && <div className="field-error">{errors.age}</div>}
      </div>

      <div className="field">
        <label>{t('patientDetails.gender')}</label>
        <ChoiceGroup options={['Male', 'Female', 'Other']} value={form.gender} onChange={(v) => set('gender', v)} columns={2} />
        {errors.gender && <div className="field-error">{errors.gender}</div>}
      </div>

      <div className="field">
        <label htmlFor="phone">{t('patientDetails.phone')}</label>
        <div className="phone-row">
          <select
            className="phone-row__code"
            value={form.countryCode || '+91'}
            onChange={(e) => set('countryCode', e.target.value)}
            aria-label={t('patientDetails.countryCode')}
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            id="phone"
            type="tel"
            className="phone-row__number"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value.replace(/[^\d]/g, '').slice(0, 15))}
            placeholder={form.countryCode === '+91' ? t('patientDetails.phonePlaceholder') : t('patientDetails.phonePlaceholderOther')}
          />
        </div>
        {errors.phone && <div className="field-error">{errors.phone}</div>}
      </div>
    </ScreenShell>
  )
}
