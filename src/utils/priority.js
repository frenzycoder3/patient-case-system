// Classifies a report into the two priority tiers the doctor dashboard
// sorts by. Like redflags.js, this is a transparent rule-based
// prototype stand-in, not a clinically validated triage model — it
// should be reviewed by doctors before any real use.
//
// Rule: any detected red flag, or a self-reported severity of 8+,
// marks a case urgent. Everything else is routine.

export function computePriority({ redFlags = [], severity } = {}) {
  const isUrgent = redFlags.length > 0 || Number(severity) >= 8
  return isUrgent ? 'urgent' : 'routine'
}

export const PRIORITY_LABEL = {
  urgent: 'RED — High Priority',
  routine: 'Normal',
}
