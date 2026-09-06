// A simple, transparent keyword-based emergency detector. This is a
// prototype stand-in for the "red-flag detection" the problem statement
// asks for — in a real system this would be a clinically validated rule
// set (or a proper triage model), reviewed by doctors, not a keyword list.

const RED_FLAG_RULES = [
  {
    keywords: ['chest pain', 'chest pressure', 'chest tightness'],
    message: 'Chest pain reported — flagged for urgent review.',
  },
  {
    keywords: ['difficulty breathing', 'shortness of breath', 'cant breathe', "can't breathe", 'breathless'],
    message: 'Breathing difficulty reported — flagged for urgent review.',
  },
  {
    keywords: ['severe bleeding', 'heavy bleeding', 'blood loss'],
    message: 'Severe bleeding reported — flagged for urgent review.',
  },
  {
    keywords: ['unconscious', 'fainted', 'passed out', 'loss of consciousness'],
    message: 'Loss of consciousness reported — flagged for urgent review.',
  },
  {
    keywords: ['stroke', 'face drooping', 'slurred speech', 'one side weakness', 'sudden weakness'],
    message: 'Possible stroke symptoms reported — flagged for urgent review.',
  },
  {
    keywords: ['suicidal', 'want to die', 'end my life', 'harm myself'],
    message: 'Mention of self-harm — flagged for immediate staff attention.',
  },
  {
    keywords: ['severe allergic', 'anaphylaxis', 'throat closing', 'swelling of face'],
    message: 'Possible severe allergic reaction — flagged for urgent review.',
  },
]

// Scans one or more free-text strings for red-flag keywords. Returns an
// array of matched warning messages (empty array = nothing detected).
export function detectRedFlags(...texts) {
  const combined = texts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (!combined.trim()) return []

  const matches = []
  for (const rule of RED_FLAG_RULES) {
    if (rule.keywords.some((kw) => combined.includes(kw))) {
      matches.push(rule.message)
    }
  }
  return matches
}
