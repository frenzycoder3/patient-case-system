// Builds the flat list of medical-history chips shown on Review and the
// doctor report — filters out "None", and expands "Others" into
// whatever the patient typed in the follow-up box (or drops it if they
// left that blank).
export function buildHistoryList(medicalHistoryMedicine) {
  const {
    previousDiseases = [],
    previousDiseasesOther = '',
    previousSurgeries = [],
    previousSurgeriesOther = '',
    allergies = [],
    allergiesOther = '',
  } = medicalHistoryMedicine || {}

  function expand(list, otherText) {
    return list
      .filter((v) => v !== 'None')
      .map((v) => (v === 'Others' ? (otherText.trim() ? `Others: ${otherText.trim()}` : null) : v))
      .filter(Boolean)
  }

  return [
    ...expand(previousDiseases, previousDiseasesOther),
    ...expand(previousSurgeries, previousSurgeriesOther),
    ...expand(allergies, allergiesOther),
  ]
}
