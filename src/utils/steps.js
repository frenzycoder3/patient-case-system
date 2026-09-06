// The 4 data-collection pages, in order. Welcome + Consent come before
// these, and Review + Doctor Summary comes after — those aren't counted
// in "Step X of Y" since they aren't new data-entry pages.

export const STEPS = [
  { path: '/patient-details', label: 'Patient Details' },
  { path: '/symptom-journey', label: 'Symptom Journey' },
  { path: '/medical-history', label: 'Medical History & Medicine' },
  { path: '/documents', label: 'Document Upload' },
]

export function stepIndexForPath(path) {
  return STEPS.findIndex((s) => s.path === path)
}

export function nextPath(path) {
  const i = stepIndexForPath(path)
  if (i === -1) return '/patient-details'
  if (i === STEPS.length - 1) return '/review'
  return STEPS[i + 1].path
}

export function prevPath(path) {
  const i = stepIndexForPath(path)
  if (i <= 0) return '/consent'
  return STEPS[i - 1].path
}
