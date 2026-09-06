// Builds a doctor-style clinical narrative paragraph from the patient's
// structured + free-text answers.
//
// NOTE FOR LATER: this is a rule-based stand-in for the real "Module C —
// Structured History Summary Generator" from the problem statement. A
// production version would send `data` to an LLM (via a backend proxy —
// never call an LLM API with a key embedded in frontend code) and have
// it write this paragraph in natural clinical language. Keeping the
// interface (buildClinicalNarrative(data) -> string) the same makes that
// swap a one-function change later.

import { buildHistoryList } from './historyList'

export function buildClinicalNarrative({ patientDetails, symptomJourney, medicalHistoryMedicine, ayush }) {
  const sentences = []

  if (patientDetails.name || patientDetails.age) {
    sentences.push(
      `${patientDetails.name || 'The patient'}${patientDetails.age ? `, ${patientDetails.age} years old,` : ''} presents with ${symptomJourney.mainComplaint || 'an unspecified complaint'}.`
    )
  } else {
    sentences.push(`Patient presents with ${symptomJourney.mainComplaint || 'an unspecified complaint'}.`)
  }

  if (symptomJourney.startDate || symptomJourney.onsetType) {
    sentences.push(
      `Onset was ${symptomJourney.onsetType ? symptomJourney.onsetType.toLowerCase() : 'not specified'}${symptomJourney.startDate ? `, starting on ${symptomJourney.startDate}` : ''}.`
    )
  }

  if (symptomJourney.trend) {
    sentences.push(
      `The condition has been ${symptomJourney.trend.toLowerCase()} since onset, currently rated ${symptomJourney.severity}/10 in severity.`
    )
  }

  if (symptomJourney.triggers || symptomJourney.reliefFactors) {
    sentences.push(
      `${symptomJourney.triggers ? `Aggravated by ${symptomJourney.triggers}.` : ''}${symptomJourney.reliefFactors ? ` Relieved by ${symptomJourney.reliefFactors}.` : ''}`.trim()
    )
  }

  if (medicalHistoryMedicine.takingMedicine === 'Yes') {
    sentences.push(
      `Currently taking ${medicalHistoryMedicine.medicineName || 'medicine'} for this problem, with ${
        medicalHistoryMedicine.medicineHelped === 'Yes'
          ? 'good relief'
          : medicalHistoryMedicine.medicineHelped === 'Partially'
          ? 'partial relief'
          : medicalHistoryMedicine.medicineHelped === 'No'
          ? 'no relief'
          : 'response not yet recorded'
      }.`
    )
  }

  const history = buildHistoryList(medicalHistoryMedicine)
  if (history.length) {
    sentences.push(`Relevant history includes: ${history.join(', ')}.`)
  }

  if (medicalHistoryMedicine.dailyLifeImpact?.sleepHours || medicalHistoryMedicine.dailyLifeImpact?.foodHabits) {
    const bits = []
    if (medicalHistoryMedicine.dailyLifeImpact.sleepHours) {
      bits.push(`sleeps approx. ${medicalHistoryMedicine.dailyLifeImpact.sleepHours} hrs/night`)
    }
    if (medicalHistoryMedicine.dailyLifeImpact.foodHabits) {
      bits.push(`usual diet: ${medicalHistoryMedicine.dailyLifeImpact.foodHabits}`)
    }
    sentences.push(`${bits.join('; ')}.`)
  }

  if (ayush?.enabled) {
    const ayushBits = []
    if (ayush.prakriti) ayushBits.push(`Prakriti: ${ayush.prakriti}`)
    if (ayush.agni) ayushBits.push(`Agni: ${ayush.agni}`)
    if (ayush.koshtha) ayushBits.push(`Koshtha: ${ayush.koshtha}`)
    if (ayushBits.length) {
      sentences.push(`Ayurvedic assessment — ${ayushBits.join(', ')}.`)
    }
    if (ayush.aharaVihara) sentences.push(`Ahara-Vihara (diet/lifestyle): ${ayush.aharaVihara}.`)
    if (ayush.nidana) sentences.push(`Suspected causative factors (Nidana): ${ayush.nidana}.`)
  }

  return sentences.filter(Boolean).join(' ')
}
