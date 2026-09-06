import { useState } from 'react'
import ScreenShell from '../components/ScreenShell'
import { CheckList, Segmented, ChoiceGroup } from '../components/FormControls'
import { usePatient } from '../context/PatientContext'
import { useLanguage } from '../context/LanguageContext'

const DISEASE_OPTIONS = ['Diabetes', 'High blood pressure', 'Heart disease', 'Asthma', 'Thyroid disorder', 'None', 'Others']
const SURGERY_OPTIONS = ['Appendix', 'Gallbladder', 'C-section', 'Bone/joint surgery', 'None', 'Others']
const ALLERGY_OPTIONS = ['Medicine allergy', 'Food allergy', 'Dust/pollen allergy', 'None', 'Others']

// Plain-language options for the body-type question — the Sanskrit
// terms (shown in brackets) are kept only as a reference for the
// doctor reading the report, never as the main wording a first-time
// patient has to understand.
const BODY_TYPE_OPTIONS = [
  'Thin, quick-moving, restless (Vata)',
  'Medium build, sharp, easily warm (Pitta)',
  'Solid build, calm, steady (Kapha)',
  'Not sure / a mix',
]
const DIGESTION_OPTIONS = ['Poor', 'Variable', 'Strong', 'Irregular']
const BOWEL_OPTIONS = ['Regular', 'Constipated', 'Loose']

export default function MedicalHistory() {
  const { data, updateSection, updateDailyLifeImpact } = usePatient()
  const { t } = useLanguage()
  const [form, setForm] = useState(data.medicalHistoryMedicine)
  const [ayush, setAyush] = useState(data.ayush)
  const [errors, setErrors] = useState({})

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function setImpact(field, value) {
    setForm((f) => ({ ...f, dailyLifeImpact: { ...f.dailyLifeImpact, [field]: value } }))
  }

  function setAyushField(field, value) {
    setAyush((a) => ({ ...a, [field]: value }))
  }

  function validateAndSave() {
    const newErrors = {}
    if (!form.takingMedicine) newErrors.takingMedicine = t('history.takingMedicineError')
    if (form.takingMedicine === 'Yes' && !form.medicineName.trim()) {
      newErrors.medicineName = t('history.medNameError')
    }
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return false

    updateSection('medicalHistoryMedicine', form)
    updateDailyLifeImpact(form.dailyLifeImpact)
    updateSection('ayush', ayush)
    return true
  }

  return (
    <ScreenShell
      path="/medical-history"
      sectionName="medicalHistoryMedicine"
      title={t('history.title')}
      intro={t('history.intro')}
      onNext={validateAndSave}
    >
      <h3 className="section-heading">{t('history.sectionHistory')}</h3>

      <div className="field">
        <label>{t('history.previousDiseases')}</label>
        <CheckList options={DISEASE_OPTIONS} values={form.previousDiseases} onChange={(v) => set('previousDiseases', v)} />
        {form.previousDiseases.includes('Others') && (
          <input
            type="text"
            className="others-specify"
            value={form.previousDiseasesOther}
            onChange={(e) => set('previousDiseasesOther', e.target.value)}
            placeholder={t('history.othersPlaceholder')}
          />
        )}
      </div>

      <div className="field">
        <label>{t('history.previousSurgeries')}</label>
        <CheckList options={SURGERY_OPTIONS} values={form.previousSurgeries} onChange={(v) => set('previousSurgeries', v)} />
        {form.previousSurgeries.includes('Others') && (
          <input
            type="text"
            className="others-specify"
            value={form.previousSurgeriesOther}
            onChange={(e) => set('previousSurgeriesOther', e.target.value)}
            placeholder={t('history.othersPlaceholder')}
          />
        )}
      </div>

      <div className="field">
        <label>{t('history.allergies')}</label>
        <CheckList options={ALLERGY_OPTIONS} values={form.allergies} onChange={(v) => set('allergies', v)} />
        {form.allergies.includes('Others') && (
          <input
            type="text"
            className="others-specify"
            value={form.allergiesOther}
            onChange={(e) => set('allergiesOther', e.target.value)}
            placeholder={t('history.othersPlaceholder')}
          />
        )}
      </div>

      <div className="field">
        <label htmlFor="currentMeds">{t('history.currentMeds')}</label>
        <input
          id="currentMeds"
          type="text"
          value={form.currentMedications}
          onChange={(e) => set('currentMedications', e.target.value)}
          placeholder={t('history.currentMedsPlaceholder')}
        />
      </div>

      <hr className="section-divider" />
      <h3 className="section-heading">{t('history.sectionMedResponse')}</h3>

      <div className="field">
        <label>{t('history.takingMedicine')}</label>
        <Segmented options={['Yes', 'No']} value={form.takingMedicine} onChange={(v) => set('takingMedicine', v)} />
        {errors.takingMedicine && <div className="field-error">{errors.takingMedicine}</div>}
      </div>

      {form.takingMedicine === 'Yes' && (
        <>
          <div className="field">
            <label htmlFor="medName">{t('history.medName')}</label>
            <input
              id="medName"
              type="text"
              value={form.medicineName}
              onChange={(e) => set('medicineName', e.target.value)}
              placeholder={t('history.medNamePlaceholder')}
            />
            {errors.medicineName && <div className="field-error">{errors.medicineName}</div>}
          </div>

          <div className="field">
            <label>{t('history.helped')}</label>
            <Segmented options={['Yes', 'No', 'Partially']} value={form.medicineHelped} onChange={(v) => set('medicineHelped', v)} />
          </div>
        </>
      )}

      <hr className="section-divider" />
      <h3 className="section-heading">{t('history.sectionDailyLife')}</h3>

      <div className="field">
        <label htmlFor="sleepHours">{t('history.sleep')}</label>
        <input
          id="sleepHours"
          type="text"
          inputMode="decimal"
          value={form.dailyLifeImpact.sleepHours}
          onChange={(e) => setImpact('sleepHours', e.target.value)}
          placeholder={t('history.sleepPlaceholder')}
        />
      </div>

      <div className="field">
        <label htmlFor="foodHabits">{t('history.appetite')}</label>
        <textarea
          id="foodHabits"
          value={form.dailyLifeImpact.foodHabits}
          onChange={(e) => setImpact('foodHabits', e.target.value)}
          placeholder={t('history.foodHabitsPlaceholder')}
        />
      </div>

      <hr className="section-divider" />

      <div className="field ayush-toggle-row">
        <label htmlFor="ayushToggle" style={{ marginBottom: 0 }}>
          {t('history.ayushToggle')}
        </label>
        <input
          id="ayushToggle"
          type="checkbox"
          checked={ayush.enabled}
          onChange={(e) => setAyushField('enabled', e.target.checked)}
        />
      </div>

      {ayush.enabled && (
        <div className="ayush-section">
          <h3 className="section-heading">{t('history.ayushSectionTitle')}</h3>
          <p className="field-hint" style={{ marginTop: -6, marginBottom: 16 }}>{t('history.ayushSectionHint')}</p>

          <div className="field">
            <label>{t('history.bodyType')}</label>
            <ChoiceGroup options={BODY_TYPE_OPTIONS} value={ayush.prakriti} onChange={(v) => setAyushField('prakriti', v)} columns={1} />
          </div>

          <div className="field">
            <label>{t('history.digestion')}</label>
            <Segmented options={DIGESTION_OPTIONS} value={ayush.agni} onChange={(v) => setAyushField('agni', v)} />
          </div>

          <div className="field">
            <label>{t('history.bowel')}</label>
            <Segmented options={BOWEL_OPTIONS} value={ayush.koshtha} onChange={(v) => setAyushField('koshtha', v)} />
          </div>

          <div className="field">
            <label htmlFor="aharaVihara">{t('history.dietRoutine')}</label>
            <textarea
              id="aharaVihara"
              value={ayush.aharaVihara}
              onChange={(e) => setAyushField('aharaVihara', e.target.value)}
              placeholder={t('history.dietRoutinePlaceholder')}
            />
          </div>

          <div className="field">
            <label htmlFor="nidana">{t('history.trigger')}</label>
            <input
              id="nidana"
              type="text"
              value={ayush.nidana}
              onChange={(e) => setAyushField('nidana', e.target.value)}
              placeholder={t('history.triggerPlaceholder')}
            />
          </div>
        </div>
      )}
    </ScreenShell>
  )
}
