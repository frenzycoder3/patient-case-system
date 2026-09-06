// Turns the Symptom Journey + Medicine answers into a short list of
// plain-English events, e.g. "Symptom started", "Medicine taken",
// "Current condition". This is the main novelty feature: instead of a
// flat form, the patient's story becomes a story-shaped picture that
// updates live as they answer.

export function buildTimelineEvents({ symptomJourney, medicalHistoryMedicine, documents = [] }) {
  const events = []

  events.push({
    day: symptomJourney.startDate || 'Start',
    title: 'Symptom started',
    desc: symptomJourney.onsetType
      ? `Started ${symptomJourney.onsetType.toLowerCase()}`
      : 'Onset not specified yet',
  })

  if (symptomJourney.trend === 'Worse') {
    events.push({ day: 'Since then', title: 'Symptoms became worse', desc: `Now at ${symptomJourney.severity}/10` })
  } else if (symptomJourney.trend === 'Better') {
    events.push({ day: 'Since then', title: 'Symptoms improved', desc: `Now at ${symptomJourney.severity}/10` })
  } else if (symptomJourney.trend === 'Same') {
    events.push({ day: 'Since then', title: 'Symptoms stayed the same', desc: `Steady at ${symptomJourney.severity}/10` })
  }

  if (medicalHistoryMedicine?.takingMedicine === 'Yes') {
    events.push({
      day: 'Later',
      title: `Medicine taken${medicalHistoryMedicine.medicineName ? `: ${medicalHistoryMedicine.medicineName}` : ''}`,
      desc:
        medicalHistoryMedicine.medicineHelped === 'Yes'
          ? 'Gave relief'
          : medicalHistoryMedicine.medicineHelped === 'Partially'
          ? 'Gave partial relief'
          : medicalHistoryMedicine.medicineHelped === 'No'
          ? 'Did not help'
          : 'Response not yet recorded',
    })
  }

  // Slot in any uploaded documents as their own timeline events, e.g.
  // an old prescription or lab report the patient brought with them.
  documents.forEach((doc) => {
    events.push({
      day: doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Uploaded',
      title: `Document uploaded: ${doc.name}`,
      desc: doc.status || 'Uploaded',
    })
  })

  events.push({
    day: 'Today',
    title: 'Current condition',
    desc: `Severity ${symptomJourney.severity}/10`,
    current: true,
  })

  return events
}

export default function Timeline({ events }) {
  return (
    <div className="timeline-wrap">
      <div className="timeline">
        {events.map((ev, i) => (
          <div className="timeline__node" key={i}>
            <div className="timeline__rail">
              <div className={`timeline__dot ${ev.current ? 'current' : ''}`} />
              {i < events.length - 1 && <div className="timeline__line" />}
            </div>
            <div className="timeline__content">
              <div className="timeline__day">{ev.day}</div>
              <div className="timeline__title">{ev.title}</div>
              {ev.desc && <div className="timeline__desc">{ev.desc}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
