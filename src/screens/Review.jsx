import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePatient } from '../context/PatientContext'
import { useLanguage } from '../context/LanguageContext'
import Timeline, { buildTimelineEvents } from '../components/Timeline'
import { detectRedFlags } from '../utils/redflags'
import { buildClinicalNarrative } from '../utils/summary'
import { buildReportFromData } from '../utils/reportBuilder'
import { buildHistoryList } from '../utils/historyList'
import { saveReport, upsertPatient } from '../utils/patientStore'

function ReviewCard({ title, editPath, rows }) {
  const navigate = useNavigate()
  return (
    <div className="review-card">
      <div className="review-card__head">
        <h3>{title}</h3>
        <button className="edit-link" onClick={() => navigate(editPath)} type="button">
          Edit
        </button>
      </div>
      <dl>
        {rows.map(([label, value]) => (
          <div style={{ display: 'contents' }} key={label}>
            <dt>{label}</dt>
            <dd>{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export default function Review() {
  const { data, setPatientId, markSubmitted } = usePatient()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { patientDetails, symptomJourney, medicalHistoryMedicine, documents, ayush, assistedSections } = data
  const { dailyLifeImpact } = medicalHistoryMedicine
  const [submitting, setSubmitting] = useState(false)

  const events = buildTimelineEvents({ symptomJourney, medicalHistoryMedicine, documents })

  const historyList = buildHistoryList(medicalHistoryMedicine)

  const redFlags = detectRedFlags(symptomJourney.mainComplaint, symptomJourney.ownWords, symptomJourney.triggers)
  const narrative = buildClinicalNarrative({ patientDetails, symptomJourney, medicalHistoryMedicine, ayush })
  const assistedList = Object.keys(assistedSections || {}).filter((k) => assistedSections[k])
  const foodByTime = [
    symptomJourney.foodMorning && `Morning: ${symptomJourney.foodMorning}`,
    symptomJourney.foodNoon && `Noon: ${symptomJourney.foodNoon}`,
    symptomJourney.foodNight && `Night: ${symptomJourney.foodNight}`,
  ]
    .filter(Boolean)
    .join(' · ')

  function handlePrint() {
    window.print()
  }

  function handleSubmit() {
    setSubmitting(true)
    // Ensure a Patient ID exists even if this patient somehow reached
    // Review without it being assigned on Patient Details (e.g. they
    // edited details right before submitting).
    let patientId = data.patientId
    if (!patientId) {
      const record = upsertPatient(patientDetails)
      patientId = record.patientId
      setPatientId(patientId)
    }

    const report = buildReportFromData(data, patientId)
    const saved = saveReport(report)
    markSubmitted(saved.reportId)
    setSubmitting(false)
  }

  return (
    <div className="screen">
      {/* ---------- PART 1: Review your answers ---------- */}
      <div className="card print-hide">
        <h2 className="eyebrow-free-heading">{t('review.eyebrow')}</h2>
        <p className="screen-intro">{t('review.intro')}</p>

        {data.patientId && (
          <div className="patient-id-badge">
            {t('review.yourPatientId')}: <strong>{data.patientId}</strong>
          </div>
        )}

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

        {assistedList.length > 0 && (
          <div className="assisted-banner">
            Filled with staff assistance: {assistedList.join(', ')}
          </div>
        )}

        <ReviewCard
          title="Patient details"
          editPath="/patient-details"
          rows={[
            ['Name', patientDetails.name],
            ['Age', patientDetails.age],
            ['Gender', patientDetails.gender],
            ['Phone', patientDetails.phone ? `${patientDetails.countryCode || '+91'} ${patientDetails.phone}` : ''],
          ]}
        />

        <ReviewCard
          title="Symptom journey"
          editPath="/symptom-journey"
          rows={[
            ['Main complaint', symptomJourney.mainComplaint],
            ['Started', symptomJourney.startDate],
            ['Approx. time it started', symptomJourney.approxStartTime],
            ['Onset', symptomJourney.onsetType],
            ['Trend', symptomJourney.trend],
            ['Severity now', `${symptomJourney.severity}/10`],
            ['Triggers', symptomJourney.triggers],
            ['Relief factors', symptomJourney.reliefFactors],
            ['What they ate', foodByTime],
            ['Anything else', symptomJourney.ownWords],
          ]}
        />

        <ReviewCard
          title="Medical history & medicine"
          editPath="/medical-history"
          rows={[
            ['Medical history', historyList.join(', ')],
            ['Current medications', medicalHistoryMedicine.currentMedications],
            ['Taking medicine now', medicalHistoryMedicine.takingMedicine],
            ['Medicine name', medicalHistoryMedicine.medicineName],
            ['Did it help', medicalHistoryMedicine.medicineHelped],
            ['Sleep (approx. hours)', dailyLifeImpact.sleepHours],
            ['Usual food/diet', dailyLifeImpact.foodHabits],
          ]}
        />

        {ayush?.enabled && (
          <ReviewCard
            title="Ayurvedic assessment"
            editPath="/medical-history"
            rows={[
              ['Body type', ayush.prakriti],
              ['Digestion', ayush.agni],
              ['Bowel movement', ayush.koshtha],
              ['Diet & routine', ayush.aharaVihara],
              ['Possible trigger', ayush.nidana],
            ]}
          />
        )}

        <ReviewCard
          title="Uploaded documents"
          editPath="/documents"
          rows={[['Files', documents.map((d) => d.name).join(', ') || 'None uploaded']]}
        />
      </div>

      {/* ---------- PART 2: Doctor-ready summary ---------- */}
      <div className="doctor-preview">
        <div className="doctor-preview__band">
          <h2>Patient Symptom Journey — Doctor Summary</h2>
          <p>Prepared by the patient before consultation</p>
        </div>

        {redFlags.length > 0 && (
          <div className="dp-section dp-highlight">
            <h4>⚠ Priority flags</h4>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {redFlags.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="dp-section">
          <h4>Patient overview</h4>
          <p>
            {patientDetails.name || 'Not provided'} · {patientDetails.age || '—'} years · {patientDetails.gender || '—'} ·{' '}
            {patientDetails.phone ? `${patientDetails.countryCode || '+91'} ${patientDetails.phone}` : '—'}
          </p>
        </div>

        <div className="dp-section">
          <h4>Clinical summary (AI-generated draft)</h4>
          <p>{narrative}</p>
          <p style={{ color: 'var(--ink-soft)', fontSize: 12.5, marginTop: 8 }}>
            Draft summary generated from the patient's answers — please review and edit as needed.
          </p>
        </div>

        <div className="dp-section">
          <h4>Main complaint</h4>
          <p>{symptomJourney.mainComplaint || 'Not provided'}</p>
          <p style={{ color: 'var(--ink-soft)', fontSize: 13.5 }}>
            Started: {symptomJourney.startDate || '—'}{symptomJourney.approxStartTime ? ` (${symptomJourney.approxStartTime})` : ''}
          </p>
        </div>

        <div className="dp-section">
          <h4>Symptom journey</h4>
          <Timeline events={events} />
        </div>

        <div className="dp-section">
          <h4>Triggers &amp; relief</h4>
          <p><strong>Worsening factors:</strong> {symptomJourney.triggers || '—'}</p>
          <p><strong>Relieving factors:</strong> {symptomJourney.reliefFactors || '—'}</p>
        </div>

        {foodByTime && (
          <div className="dp-section">
            <h4>Food intake around this time</h4>
            <p>{foodByTime}</p>
          </div>
        )}

        <div className="dp-section">
          <h4>Anything else, in the patient's own words</h4>
          <p style={{ fontStyle: 'italic' }}>"{symptomJourney.ownWords || 'Not provided'}"</p>
        </div>

        <div className="dp-section">
          <h4>Medication response</h4>
          {medicalHistoryMedicine.takingMedicine === 'Yes' ? (
            <p>
              {medicalHistoryMedicine.medicineName || 'Medicine'} — response:{' '}
              {medicalHistoryMedicine.medicineHelped || 'not specified'}.
            </p>
          ) : (
            <p>Not currently taking any medicine for this problem.</p>
          )}
        </div>

        <div className="dp-section">
          <h4>Medical history</h4>
          {historyList.length ? (
            <div className="doc-chip-row">
              {historyList.map((item) => (
                <span className="doc-chip" key={item}>{item}</span>
              ))}
            </div>
          ) : (
            <p>No significant history reported.</p>
          )}
          {medicalHistoryMedicine.currentMedications && (
            <p style={{ marginTop: 8 }}>
              <strong>Current medications:</strong> {medicalHistoryMedicine.currentMedications}
            </p>
          )}
        </div>

        <div className="dp-section">
          <h4>Daily-life impact</h4>
          <p>
            Sleep: {dailyLifeImpact.sleepHours ? `${dailyLifeImpact.sleepHours} hrs/night` : '—'} · Usual diet:{' '}
            {dailyLifeImpact.foodHabits || '—'}
          </p>
        </div>

        {ayush?.enabled && (
          <div className="dp-section">
            <h4>Ayurvedic assessment (AYUSH)</h4>
            <p>
              Body type: {ayush.prakriti || '—'} · Digestion: {ayush.agni || '—'} · Bowel movement: {ayush.koshtha || '—'}
            </p>
            {ayush.aharaVihara && <p><strong>Diet &amp; routine:</strong> {ayush.aharaVihara}</p>}
            {ayush.nidana && <p><strong>Possible trigger:</strong> {ayush.nidana}</p>}
          </div>
        )}

        {assistedList.length > 0 && (
          <div className="dp-section">
            <h4>Staff-assisted sections</h4>
            <p>{assistedList.join(', ')}</p>
          </div>
        )}

        <div className="dp-section">
          <h4>Documents</h4>
          {documents.length ? (
            <div className="doc-chip-row">
              {documents.map((d) => (
                <span className="doc-chip" key={d.id}>{d.name}</span>
              ))}
            </div>
          ) : (
            <p>No documents uploaded.</p>
          )}
        </div>
      </div>

      <div className="safety-note">
        This summary organizes the patient's own answers. It does not diagnose any
        condition or recommend treatment — clinical judgment remains with the doctor.
      </div>

      <div className="nav-row print-hide" style={{ flexWrap: 'wrap' }}>
        <NavBackButton />
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          type="button"
          disabled={data.submitted || submitting}
          style={{ flex: 1 }}
        >
          {data.submitted ? t('review.submitted') : t('review.submit')}
        </button>
        <button className="btn btn-secondary" onClick={handlePrint} type="button">
          {t('review.print')}
        </button>
      </div>
    </div>
  )
}

function NavBackButton() {
  const navigate = useNavigate()
  return (
    <button className="btn btn-secondary" onClick={() => navigate('/documents')} type="button">
      Back
    </button>
  )
}
