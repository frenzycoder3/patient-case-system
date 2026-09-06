import { useState } from 'react'
import ScreenShell from '../components/ScreenShell'
import { ChoiceGroup, SeverityScale, MicButton } from '../components/FormControls'
import Timeline, { buildTimelineEvents } from '../components/Timeline'
import { usePatient } from '../context/PatientContext'
import { useLanguage } from '../context/LanguageContext'
import { detectRedFlags } from '../utils/redflags'

const START_TIME_OPTIONS = ['Early morning', 'Morning', 'Afternoon', 'Evening', 'Night', 'Not sure']

export default function SymptomJourney() {
  const { data, updateSection } = usePatient()
  const { t, speechLang } = useLanguage()
  const [form, setForm] = useState(data.symptomJourney)
  const [errors, setErrors] = useState({})

  // Live red-flag check across the free-text fields as the patient types.
  const redFlags = detectRedFlags(form.mainComplaint, form.ownWords, form.triggers)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function validateAndSave() {
    const newErrors = {}
    if (!form.mainComplaint.trim()) newErrors.mainComplaint = t('symptom.mainComplaintError')
    if (!form.startDate) newErrors.startDate = t('symptom.startDateError')
    if (!form.onsetType) newErrors.onsetType = t('symptom.onsetError')
    if (!form.trend) newErrors.trend = t('symptom.trendError')
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return false

    updateSection('symptomJourney', form)
    return true
  }

  // Live preview: the timeline rebuilds itself as the patient answers.
  const previewEvents = buildTimelineEvents({
    symptomJourney: form,
    medicalHistoryMedicine: data.medicalHistoryMedicine,
  })

  return (
    <ScreenShell
      path="/symptom-journey"
      sectionName="symptomJourney"
      title={t('symptom.title')}
      intro={t('symptom.intro')}
      onNext={validateAndSave}
    >
      <div className="field">
        <label htmlFor="mainComplaint">{t('symptom.mainComplaint')}</label>
        <textarea
          id="mainComplaint"
          value={form.mainComplaint}
          onChange={(e) => set('mainComplaint', e.target.value)}
          placeholder={t('symptom.mainComplaintPlaceholder')}
        />
        <div style={{ marginTop: 8 }}>
          <MicButton
            mockText="Pain in my lower back that spreads to my leg"
            onResult={(text) => set('mainComplaint', text)}
            lang={speechLang}
            label={t('symptom.speak')}
            listeningLabel={t('symptom.listening')}
          />
        </div>
        {errors.mainComplaint && <div className="field-error">{errors.mainComplaint}</div>}
      </div>

      {redFlags.length > 0 && (
        <div className="redflag-banner" role="alert">
          <strong>{t('symptom.redflag')}</strong>
          <ul>
            {redFlags.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="field">
        <label htmlFor="startDate">{t('symptom.startDate')}</label>
        <input id="startDate" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
        {errors.startDate && <div className="field-error">{errors.startDate}</div>}
      </div>

      <div className="field">
        <label>{t('symptom.approxStartTime')}</label>
        <ChoiceGroup
          options={START_TIME_OPTIONS}
          value={form.approxStartTime}
          onChange={(v) => set('approxStartTime', v)}
          columns={2}
        />
        <div className="field-hint">{t('symptom.approxStartTimeHint')}</div>
      </div>

      <div className="field">
        <label>{t('symptom.onsetQuestion')}</label>
        <ChoiceGroup options={['Sudden', 'Gradual']} value={form.onsetType} onChange={(v) => set('onsetType', v)} columns={2} />
        {errors.onsetType && <div className="field-error">{errors.onsetType}</div>}
      </div>

      <div className="field">
        <label>{t('symptom.trendQuestion')}</label>
        <ChoiceGroup options={['Better', 'Worse', 'Same']} value={form.trend} onChange={(v) => set('trend', v)} columns={2} />
        {errors.trend && <div className="field-error">{errors.trend}</div>}
      </div>

      <div className="field">
        <label>{t('symptom.severityQuestion')}</label>
        <SeverityScale
          value={form.severity}
          onChange={(v) => set('severity', v)}
          lowLabel={t('symptom.severityLow')}
          highLabel={t('symptom.severityHigh')}
        />
      </div>

      <div className="field">
        <label htmlFor="triggers">{t('symptom.triggers')}</label>
        <input
          id="triggers"
          type="text"
          value={form.triggers}
          onChange={(e) => set('triggers', e.target.value)}
          placeholder={t('symptom.triggersPlaceholder')}
        />
      </div>

      <div className="field">
        <label htmlFor="reliefFactors">{t('symptom.relief')}</label>
        <input
          id="reliefFactors"
          type="text"
          value={form.reliefFactors}
          onChange={(e) => set('reliefFactors', e.target.value)}
          placeholder={t('symptom.reliefPlaceholder')}
        />
      </div>

      <div className="field">
        <label>{t('symptom.foodQuestion')}</label>
        <div className="field-hint" style={{ marginTop: -4, marginBottom: 10 }}>{t('symptom.foodHint')}</div>
        <div className="food-time-grid">
          <div>
            <label htmlFor="foodMorning" className="food-time-grid__label">{t('symptom.foodMorning')}</label>
            <input
              id="foodMorning"
              type="text"
              value={form.foodMorning}
              onChange={(e) => set('foodMorning', e.target.value)}
              placeholder={t('symptom.foodPlaceholder')}
            />
          </div>
          <div>
            <label htmlFor="foodNoon" className="food-time-grid__label">{t('symptom.foodNoon')}</label>
            <input
              id="foodNoon"
              type="text"
              value={form.foodNoon}
              onChange={(e) => set('foodNoon', e.target.value)}
              placeholder={t('symptom.foodPlaceholder')}
            />
          </div>
          <div>
            <label htmlFor="foodNight" className="food-time-grid__label">{t('symptom.foodNight')}</label>
            <input
              id="foodNight"
              type="text"
              value={form.foodNight}
              onChange={(e) => set('foodNight', e.target.value)}
              placeholder={t('symptom.foodPlaceholder')}
            />
          </div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="ownWords">{t('symptom.ownWords')}</label>
        <textarea
          id="ownWords"
          rows={4}
          value={form.ownWords}
          onChange={(e) => set('ownWords', e.target.value)}
          placeholder={t('symptom.ownWordsPlaceholder')}
        />
        <div style={{ marginTop: 8 }}>
          <MicButton
            mockText="It started as a dull ache but now it is sharper, especially when I bend down."
            onResult={(text) => set('ownWords', text)}
            lang={speechLang}
            label={t('symptom.speak')}
            listeningLabel={t('symptom.listening')}
          />
        </div>
      </div>

      <div className="field">
        <label>{t('symptom.journeySoFar')}</label>
        <Timeline events={previewEvents} />
        <div className="field-hint">{t('symptom.journeyHint')}</div>
      </div>
    </ScreenShell>
  )
}
