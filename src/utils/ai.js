import extractSymptomsProxy from './aiProxy'

export async function extractSymptomsWithAI(transcript, language = 'en') {
  const cleanText = (transcript || '').trim()
  if (!cleanText) throw new Error('No transcript provided')

  // Prefer backend proxy which keeps the API key server-side
  try {
    const r = await extractSymptomsProxy(cleanText, language)
    return r
  } catch (err) {
    return { mainComplaint: cleanText, structured: {} }
  }
}
