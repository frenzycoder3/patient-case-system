import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllReports, searchReports } from '../utils/patientStore'

function timeAgo(iso) {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function ReportCard({ report, onOpen }) {
  const p = report.patientDetails || {}
  const sj = report.symptomJourney || {}
  const isUrgent = report.priority === 'urgent'

  return (
    <button type="button" className={`report-card ${isUrgent ? 'report-card--urgent' : ''}`} onClick={() => onOpen(report.reportId)}>
      <div className="report-card__top">
        <span className={`priority-badge ${isUrgent ? 'priority-badge--urgent' : 'priority-badge--routine'}`}>
          {isUrgent ? '● RED' : 'Normal'}
        </span>
        <span className="report-card__id">{report.patientId}</span>
      </div>
      <div className="report-card__name-row">
        <div className="report-card__name">{p.name || 'Unnamed patient'}</div>
        {report.ayush?.enabled && <span className="ayush-badge ayush-badge--sm">Ayurvedic</span>}
      </div>
      <div className="report-card__meta">
        {p.age ? `${p.age} yrs` : '—'} · {p.gender || '—'} · Severity {sj.severity ?? '—'}/10
      </div>
      <div className="report-card__complaint">{sj.mainComplaint || 'No main complaint recorded'}</div>
      {report.redFlags?.length > 0 && (
        <div className="report-card__flags">
          {report.redFlags.slice(0, 2).map((f) => (
            <span className="doc-chip doc-chip--danger" key={f}>
              {f.replace(' — flagged for urgent review.', '').replace(' — flagged for immediate staff attention.', '')}
            </span>
          ))}
        </div>
      )}
      <div className="report-card__time">Submitted {timeAgo(report.submittedAt)}</div>
    </button>
  )
}

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const allReports = useMemo(() => getAllReports(), [])
  const filtered = useMemo(() => searchReports(allReports, query), [allReports, query])

  const urgent = filtered.filter((r) => r.priority === 'urgent').sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
  const routine = filtered.filter((r) => r.priority !== 'urgent').sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))

  function openReport(reportId) {
    navigate(`/doctor/report/${reportId}`)
  }

  return (
    <div className="doctor-dashboard">
      <div className="doctor-toolbar">
        <input
          type="text"
          className="doctor-search"
          placeholder="Search by Patient ID, name, or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="doctor-stats">
          <span className="doctor-stat doctor-stat--urgent">{urgent.length} urgent</span>
          <span className="doctor-stat">{routine.length} routine</span>
        </div>
      </div>

      <section className="dashboard-section">
        <h3 className="dashboard-section__title dashboard-section__title--urgent">
          RED / High Priority / Emergency ({urgent.length})
        </h3>
        {urgent.length === 0 ? (
          <div className="dashboard-empty">No urgent cases right now.</div>
        ) : (
          <div className="report-grid">
            {urgent.map((r) => (
              <ReportCard key={r.reportId} report={r} onOpen={openReport} />
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <h3 className="dashboard-section__title">Normal / Secondary ({routine.length})</h3>
        {routine.length === 0 ? (
          <div className="dashboard-empty">No routine cases submitted yet.</div>
        ) : (
          <div className="report-grid">
            {routine.map((r) => (
              <ReportCard key={r.reportId} report={r} onOpen={openReport} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
