import { detectRedFlags } from './redflags'
import { buildClinicalNarrative } from './summary'
import { computePriority } from './priority'
import { buildRecommendations } from './recommendations'

// Assembles the full report object saved to patientStore when a
// patient taps "Submit to Doctor" on the Review screen, and read back
// on the doctor dashboard / report view. Keeping this in one place
// means the doctor-facing screens and the patient Review screen always
// agree on red flags / priority / narrative for the same data.
export function buildReportFromData(data, patientId) {
  const { patientDetails, symptomJourney, medicalHistoryMedicine, documents, ayush, assistedSections } = data

  const redFlags = detectRedFlags(symptomJourney.mainComplaint, symptomJourney.ownWords, symptomJourney.triggers)
  const narrative = buildClinicalNarrative({ patientDetails, symptomJourney, medicalHistoryMedicine, ayush })
  const priority = computePriority({ redFlags, severity: symptomJourney.severity })
  const recommendations = buildRecommendations({ priority, redFlags, symptomJourney, ayush })

  return {
    patientId,
    patientDetails,
    symptomJourney,
    medicalHistoryMedicine,
    documents,
    ayush,
    assistedSections,
    redFlags,
    narrative,
    priority,
    recommendations,
  }
}
