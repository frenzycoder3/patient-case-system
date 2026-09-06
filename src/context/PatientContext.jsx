import { createContext, useContext, useState } from 'react'

// This is the single "notebook" that every page reads from and writes
// to. When you build the FastAPI backend later, this whole `data`
// object is what you would send in one POST request.

const emptyData = {
  // Assigned once Patient Details is saved (see patientStore.upsertPatient).
  // Stable across the whole session and reused for repeat visits by the
  // same phone number, so every report/document ties back to one record.
  patientId: '',
  submitted: false,
  reportId: '',
  consent: {
    abhaId: '',
    consentGiven: false,
  },
  patientDetails: {
    name: '',
    age: '',
    gender: '',
    countryCode: '+91',      // dial code, kept separate from the local number
    phone: '',
  },
  symptomJourney: {
    mainComplaint: '',
    startDate: '',           // free-text date, e.g. "2026-08-28"
    approxStartTime: '',      // e.g. "Morning", "Night" — roughly when in the day it started
    onsetType: '',           // Sudden / Gradual
    trend: '',                // Better / Worse / Same
    severity: 5,               // 1-10, current severity
    triggers: '',
    reliefFactors: '',
    foodMorning: '',
    foodNoon: '',
    foodNight: '',
    ownWords: '',
  },
  medicalHistoryMedicine: {
    previousDiseases: [],
    previousDiseasesOther: '',
    previousSurgeries: [],
    previousSurgeriesOther: '',
    allergies: [],
    allergiesOther: '',
    currentMedications: '',
    takingMedicine: '',       // Yes / No
    medicineName: '',
    medicineHelped: '',       // Yes / No / Partially
    dailyLifeImpact: {
      sleepHours: '',          // approx hours of sleep per night, free text/number
      foodHabits: '',           // what they usually eat in a day, free text
    },
  },
  // AYUSH / Ayurveda-specific intake (Dashavidha Pariksha style),
  // only shown/used when the patient or staff turns on "Ayurveda mode".
  ayush: {
    enabled: false,
    prakriti: '',        // Vata / Pitta / Kapha / Mixed
    agni: '',             // Digestive capacity: Weak / Moderate / Strong / Irregular
    koshtha: '',          // Bowel nature: Regular / Constipated / Loose
    aharaVihara: '',      // Diet & lifestyle notes, free text
    nidana: '',            // Suspected causative factors, free text
  },
  documents: [], // { id, name, type, status, uploadedAt, ocrText }
  // Tracks which sections were filled with staff assistance, e.g.
  // { symptomJourney: true } — shown to the doctor in the summary so
  // they know which answers came directly from the patient.
  assistedSections: {},
}

const PatientContext = createContext(null)

export function PatientProvider({ children }) {
  const [data, setData] = useState(emptyData)

  // Shallow-merge a patch into one top-level section, e.g.
  // updateSection('patientDetails', { name: 'Asha' })
  function updateSection(section, patch) {
    setData((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...patch },
    }))
  }

  // Merge a patch into the nested dailyLifeImpact object.
  function updateDailyLifeImpact(patch) {
    setData((prev) => ({
      ...prev,
      medicalHistoryMedicine: {
        ...prev.medicalHistoryMedicine,
        dailyLifeImpact: { ...prev.medicalHistoryMedicine.dailyLifeImpact, ...patch },
      },
    }))
  }

  function setDocuments(docs) {
    setData((prev) => ({ ...prev, documents: docs }))
  }

  // Patches a single document by id (e.g. once OCR finishes for it),
  // safe to call from async code without racing stale closures.
  function updateDocument(id, patch) {
    setData((prev) => ({
      ...prev,
      documents: prev.documents.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }))
  }

  // Marks a given section (by name, e.g. 'symptomJourney') as having
  // been filled in with staff assistance via the Need Help flow.
  function markAssisted(sectionName) {
    setData((prev) => ({
      ...prev,
      assistedSections: { ...prev.assistedSections, [sectionName]: true },
    }))
  }

  function setPatientId(patientId) {
    setData((prev) => ({ ...prev, patientId }))
  }

  function markSubmitted(reportId) {
    setData((prev) => ({ ...prev, submitted: true, reportId }))
  }

  return (
    <PatientContext.Provider
      value={{
        data,
        updateSection,
        updateDailyLifeImpact,
        setDocuments,
        updateDocument,
        markAssisted,
        setPatientId,
        markSubmitted,
      }}
    >
      {children}
    </PatientContext.Provider>
  )
}

export function usePatient() {
  const ctx = useContext(PatientContext)
  if (!ctx) throw new Error('usePatient must be used inside <PatientProvider>')
  return ctx
}
