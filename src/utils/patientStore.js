// A small localStorage-backed store standing in for a real patient
// database + backend API. This project had no backend at all before
// this feature — everything lived only in React state and vanished on
// refresh — so there was nothing existing to "preserve" here. This is
// built as the minimal extension needed to give every patient a
// stable, unique Patient ID and let doctors see submitted reports.
//
// LATER: replace the body of every function below with real API calls
// (e.g. fetch('/api/patients/...')) to a proper backend + database
// (Postgres, etc.), keeping the same function names/shapes so screens
// that call this module don't need to change.

const PATIENTS_KEY = 'mhs_patients_v1'
const REPORTS_KEY = 'mhs_reports_v1'
const COUNTER_KEY = 'mhs_patient_id_counter_v1'

function readJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable — the current session still works
    // via in-memory data, it just won't persist across reloads.
  }
}

function nextPatientNumber() {
  const current = Number(window.localStorage.getItem(COUNTER_KEY) || '0') + 1
  try {
    window.localStorage.setItem(COUNTER_KEY, String(current))
  } catch {
    /* ignore */
  }
  return current
}

function formatPatientId(n) {
  const year = new Date().getFullYear()
  return `PT-${year}-${String(n).padStart(6, '0')}`
}

// Normalizes a 10-digit phone number so lookups aren't thrown off by
// spaces, dashes, or a leading +91.
function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '').slice(-10)
}

export function getAllPatients() {
  return readJSON(PATIENTS_KEY, [])
}

export function findPatientByPhone(phone) {
  const key = normalizePhone(phone)
  if (!key) return null
  return getAllPatients().find((p) => normalizePhone(p.phone) === key) || null
}

export function findPatientById(patientId) {
  return getAllPatients().find((p) => p.patientId === patientId) || null
}

// Looks up an existing patient by phone number (the one stable
// identifier collected on Patient Details) to avoid duplicate
// profiles for repeat visits, or creates a new one with a fresh
// Patient ID. Returns the full patient record either way.
export function upsertPatient({ name, age, gender, phone }) {
  const patients = getAllPatients()
  const existing = findPatientByPhone(phone)

  if (existing) {
    const updated = { ...existing, name: name || existing.name, age: age || existing.age, gender: gender || existing.gender }
    writeJSON(
      PATIENTS_KEY,
      patients.map((p) => (p.patientId === existing.patientId ? updated : p))
    )
    return updated
  }

  const patientId = formatPatientId(nextPatientNumber())
  const record = { patientId, name, age, gender, phone, createdAt: new Date().toISOString() }
  writeJSON(PATIENTS_KEY, [...patients, record])
  return record
}

export function getAllReports() {
  return readJSON(REPORTS_KEY, [])
}

export function getReportById(reportId) {
  return getAllReports().find((r) => r.reportId === reportId) || null
}

export function getReportsForPatient(patientId) {
  return getAllReports().filter((r) => r.patientId === patientId)
}

// Saves one completed intake as a report tied to a Patient ID. `report`
// should already include patientId, priority, redFlags, narrative,
// recommendations, and a snapshot of the full form data — see
// buildReportFromData() in reportBuilder.js for the standard shape.
export function saveReport(report) {
  const reports = getAllReports()
  const reportId = report.reportId || `RPT-${Date.now()}-${Math.round(Math.random() * 9999)}`
  const withId = { ...report, reportId, submittedAt: report.submittedAt || new Date().toISOString() }
  writeJSON(REPORTS_KEY, [...reports, withId])
  return withId
}

// Simple contains-match search across Patient ID, name, and phone —
// used by the doctor dashboard's search box.
export function searchReports(reports, query) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return reports
  return reports.filter((r) => {
    const p = r.patientDetails || {}
    return (
      r.patientId?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q)
    )
  })
}
