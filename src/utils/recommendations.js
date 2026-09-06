// Builds a short list of "recommended next steps" for the doctor
// report view. This is a rule-based prototype stand-in (same spirit as
// utils/summary.js and utils/redflags.js) — clinical judgment and any
// actual treatment decision remain entirely with the doctor. It exists
// so the report has something concrete under that heading; it is not
// a diagnostic or triage tool.

export function buildRecommendations({ priority, redFlags = [], symptomJourney = {}, ayush }) {
  const steps = []

  if (priority === 'urgent') {
    steps.push('Review this case ahead of routine queue — one or more urgent indicators were detected.')
  }

  if (redFlags.length > 0) {
    steps.push('Confirm the flagged symptoms directly with the patient before proceeding.')
  }

  if (Number(symptomJourney.severity) >= 8) {
    steps.push('Patient self-rated severity as 8/10 or higher — consider vitals check first.')
  }

  if (symptomJourney.trend === 'Worse') {
    steps.push('Condition reported as worsening since onset — consider trajectory in assessment.')
  }

  if (ayush?.enabled) {
    steps.push('AYUSH intake completed — consider Ayurvedic assessment fields alongside conventional history.')
  }

  if (steps.length === 0) {
    steps.push('No urgent indicators detected — proceed with standard consultation.')
  }

  return steps
}
