import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getReportById } from '../utils/patientStore'
import Timeline, { buildTimelineEvents } from '../components/Timeline'
import { buildHistoryList } from '../utils/historyList'
import { PRIORITY_LABEL } from '../utils/priority'

export default function DoctorReportView() {
  const { reportId } = useParams()
  const navigate = useNavigate()
  const report = useMemo(() => getReportById(reportId), [reportId])

  if (!report) {
    return (
      <div className="doctor-dashboard">
        <div className="card">
          <h2 className="eyebrow-free-heading">Report not found</h2>
          <p>This report may have been removed, or the link is incorrect.</p>
          <button className="btn btn-secondary" onClick={() => navigate('/doctor/dashboard')} type="button">
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  const { patientDetails, symptomJourney, medicalHistoryMedicine, documents, ayush, assistedSections, redFlags, narrative, priority, recommendations } = report
  const { dailyLifeImpact } = medicalHistoryMedicine
  const isUrgent = priority === 'urgent'
  const historyList = buildHistoryList(medicalHistoryMedicine)
  const assistedList = Object.keys(assistedSections || {}).filter((k) => assistedSections[k])
  const events = buildTimelineEvents({ symptomJourney, medicalHistoryMedicine, documents })
  const foodByTime = [
    symptomJourney.foodMorning && `Morning: ${symptomJourney.foodMorning}`,
    symptomJourney.foodNoon && `Noon: ${symptomJourney.foodNoon}`,
    symptomJourney.foodNight && `Night: ${symptomJourney.foodNight}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="doctor-dashboard">
      <button className="btn btn-secondary" onClick={() => navigate('/doctor/dashboard')} type="button" style={{ marginBottom: 16 }}>
        ← Back to dashboard
      </button>

      <div className="doctor-report">
        <div className={`doctor-report__head ${isUrgent ? 'doctor-report__head--urgent' : ''}`}>
          <div>
            <div className="doctor-report__id">{report.patientId}</div>
            <div className="doctor-report__name">{patientDetails.name || 'Unnamed patient'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {ayush?.enabled && <span className="ayush-badge">AYURVEDIC CASE</span>}
            <span className={`priority-badge ${isUrgent ? 'priority-badge--urgent' : 'priority-badge--routine'}`}>
              {PRIORITY_LABEL[priority]}
            </span>
          </div>
        </div>

        <div className="dp-section">
          <h4>Patient information</h4>
          <p>
            {patientDetails.age || '—'} years · {patientDetails.gender || '—'} ·{' '}
            {patientDetails.phone ? `${patientDetails.countryCode || '+91'} ${patientDetails.phone}` : '—'}
          </p>
        </div>

        {redFlags.length > 0 && (
          <div className="dp-section dp-highlight">
            <h4>⚠ Red-flag symptoms</h4>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {redFlags.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="dp-section">
          <h4>Symptoms &amp; duration</h4>
          <p><strong>Main complaint:</strong> {symptomJourney.mainComplaint || 'Not provided'}</p>
          <p style={{ color: 'var(--ink-soft)', fontSize: 13.5 }}>
            Started {symptomJourney.startDate || '—'}{symptomJourney.approxStartTime ? ` (${symptomJourney.approxStartTime})` : ''} · Onset: {symptomJourney.onsetType || '—'} · Trend: {symptomJourney.trend || '—'} · Severity: {symptomJourney.severity}/10
          </p>
        </div>

        <div className="dp-section">
          <h4>Symptom journey</h4>
          <Timeline events={events} />
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
          <h4>Relevant medical history</h4>
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
            <p style={{ marginTop: 8 }}><strong>Current medications:</strong> {medicalHistoryMedicine.currentMedications}</p>
          )}
          {medicalHistoryMedicine.takingMedicine === 'Yes' && (
            <p style={{ marginTop: 8 }}>
              <strong>Medicine for this problem:</strong> {medicalHistoryMedicine.medicineName || '—'} — response: {medicalHistoryMedicine.medicineHelped || 'not specified'}
            </p>
          )}
          <p style={{ marginTop: 8 }}>
            Sleep: {dailyLifeImpact.sleepHours ? `${dailyLifeImpact.sleepHours} hrs/night` : '—'} · Usual diet: {dailyLifeImpact.foodHabits || '—'}
          </p>
        </div>

        {ayush?.enabled && (
          <div className="dp-section">
            <h4>Ayurvedic assessment</h4>
            <p>Body type: {ayush.prakriti || '—'} · Digestion: {ayush.agni || '—'} · Bowel movement: {ayush.koshtha || '—'}</p>
            {ayush.aharaVihara && <p><strong>Diet &amp; routine:</strong> {ayush.aharaVihara}</p>}
            {ayush.nidana && <p><strong>Possible trigger:</strong> {ayush.nidana}</p>}
          </div>
        )}

        <div className="dp-section">
          <h4>AI-generated assessment (draft)</h4>
          <p>{narrative}</p>
          <p style={{ color: 'var(--ink-soft)', fontSize: 12.5, marginTop: 8 }}>
            Rule-based draft generated from the patient's answers — clinical judgment remains with you.
          </p>
        </div>

        <div className="dp-section">
          <h4>Recommended next steps</h4>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {recommendations.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>

        {documents.length > 0 && (
          <div className="dp-section">
            <h4>Uploaded documents</h4>
            {documents.map((d) => (
              <div key={d.id} style={{ marginBottom: 8 }}>
                <span className="doc-chip">{d.name}</span>
                {d.ocrText && <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>{d.ocrText.slice(0, 200)}{d.ocrText.length > 200 ? '…' : ''}</p>}
              </div>
            ))}
          </div>
        )}

        {assistedList.length > 0 && (
          <div className="dp-section">
            <h4>Staff-assisted sections</h4>
            <p>{assistedList.join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
