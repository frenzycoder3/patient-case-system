import extractSymptomsProxy from './aiProxy'

// Helper to query direct browser Google Gemini if configured
async function callDirectGemini(prompt, systemInstruction = '') {
  const apiKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
    (typeof window !== 'undefined' && window.localStorage?.getItem('gemini_api_key'))

  if (!apiKey) return null

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 120 },
    }
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const data = await res.json()
      return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
    }
  } catch (e) {
    console.error('Direct Gemini error:', e)
  }
  return null
}

// Generate an intelligent, empathetic conversational medical response to the patient
export async function generateAIClinicalResponse({ userSpeech, conversation = [], language = 'en' }) {
  const cleanSpeech = (userSpeech || '').trim()
  if (!cleanSpeech) return ''

  // 1. Try backend AI proxy (which uses Gemini / OpenAI if server keys are present)
  try {
    const proxyRes = await fetch('/api/ai/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: cleanSpeech, conversation, language }),
    })
    if (proxyRes.ok) {
      const data = await proxyRes.json()
      if (data && data.responseText) return data.responseText
    }
  } catch {
    /* backend offline or non-proxied */
  }

  // 2. Try direct Google Gemini if client key is configured
  const systemPrompt = `You are an empathetic, clinical case intake assistant for "My Health Story" (Ministry of AYUSH).
A patient spoke their symptoms.
Briefly acknowledge what they said with care, then ask ONE concise clinical follow-up question (such as severity 1-10, onset, triggers/relief, or associated symptoms).
Keep your entire response under 2 sentences so it can be spoken out loud comfortably.
Language code: ${language}.`

  const directGemini = await callDirectGemini(
    `Patient said: "${cleanSpeech}"\nContext so far: ${JSON.stringify(conversation)}`,
    systemPrompt
  )
  if (directGemini) return directGemini

  // 3. Clinical Intelligent Fallback Engine
  const lower = cleanSpeech.toLowerCase()
  const isTa = language.startsWith('ta')
  const isHi = language.startsWith('hi')

  const hasOnset =
    /(yesterday|days?|weeks?|months?|years?|since|ago|morning|evening|night|hours?|today|start|कल|दिन|हफ्ते|महीने|साल|सुबह|शाम|रात|நேற்று|நாள்|வாரம்|மாதம்|வருடம்|காலை|இரவு)/i.test(
      lower
    )
  const hasSeverity =
    /(mild|moderate|severe|unbearable|pain\s*(level|scale)?\s*[1-9]|out of 10|\b([1-9]|10)\b|कम|तेज|गंभीर|दर्द|அளவு|லேசான|கடுமையான|தாங்க)/i.test(
      lower
    )
  const hasTrend =
    /(better|worse|same|improving|increasing|worsening|relief|triggers?|pain increases|walking|rest|दवा|चलने|बैठने|आराम|बढ़|कम|அதிக|குறை|நிவாரணம்|மருந்து)/i.test(
      lower
    )

  if (isTa) {
    if (!hasOnset) {
      return 'உங்கள் அறிகுறிகளைப் புரிந்துகொள்கிறேன். இந்த பிரச்சனை எப்போது தொடங்கியது அல்லது எவ்வளவு நாட்களாக இருக்கிறது?'
    }
    if (!hasSeverity) {
      return 'நன்றி. 1 முதல் 10 வரையிலான அளவில், உங்கள் சிரமம் இப்போது எவ்வளவு தீவிரமாக உள்ளது?'
    }
    if (!hasTrend) {
      return 'இது குணமாகிறதா, அதிகமாகிறதா அல்லது அப்படியே உள்ளதா? எதனால் நிவாரணம் கிடைக்கிறது?'
    }
    return 'காய்ச்சல், தலைச்சுற்றல் அல்லது சோர்வு போன்ற வேறு ஏதேனும் அறிகுறிகள் உங்களிடம் உள்ளதா?'
  }

  if (isHi) {
    if (!hasOnset) {
      return 'मैं आपकी समस्या समझ सकता हूँ। यह परेशानी कब शुरू हुई, या आपको कितने समय से है?'
    }
    if (!hasSeverity) {
      return '1 से 10 के पैमाने पर, अभी आपकी तकलीफ कितनी गंभीर है? कोई संख्या बताएं।'
    }
    if (!hasTrend) {
      return 'क्या यह बढ़ रहा है, कम हो रहा है, या वैसा ही है? किस चीज़ से आराम मिलता है?'
    }
    return 'क्या आपको बुखार, कमजोरी या चक्कर जैसा कोई अन्य लक्षण भी महसूस हो रहा है?'
  }

  // English default
  if (!hasOnset) {
    return 'I understand what you are going through. When did this problem start, or how long have you had it?'
  }
  if (!hasSeverity) {
    return 'Thank you. On a scale of 1 to 10, how severe is your discomfort right now?'
  }
  if (!hasTrend) {
    return 'Is this condition getting better, worse, or staying the same? Does anything bring relief or make it worse?'
  }
  return 'Are you experiencing any other symptoms, such as fever, weakness, or nausea?'
}

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
