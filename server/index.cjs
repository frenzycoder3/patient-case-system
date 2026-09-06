const express = require('express')
const fetch = require('node-fetch')
const bodyParser = require('body-parser')
const app = express()
const PORT = process.env.PORT || 3001

app.use(bodyParser.json())

// Simple SSE client registry for voice-lock events
const sseClients = []

function sendSSE(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`
  sseClients.forEach((res) => {
    try { res.write(payload) } catch (e) { /* ignore */ }
  })
}

app.get('/api/voice-lock/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders && res.flushHeaders()

  // send an initial comment to establish the stream
  res.write(':ok\n\n')

  sseClients.push(res)

  req.on('close', () => {
    const idx = sseClients.indexOf(res)
    if (idx !== -1) sseClients.splice(idx, 1)
  })
})

app.post('/api/voice-lock', (req, res) => {
  const { locked } = req.body || {}
  sendSSE({ type: 'voice-lock', locked: !!locked })
  res.json({ ok: true })
})

app.post('/api/ai/respond', async (req, res) => {
  const { transcript, conversation = [], language = 'en' } = req.body || {}
  if (!transcript) return res.status(400).json({ error: 'No transcript provided' })

  const geminiKey = process.env.GEMINI_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  const systemPrompt = `You are an empathetic, clinical case-intake assistant for "My Health Story" (Ministry of AYUSH).
A patient is speaking their symptoms.
Your job is to:
1. Briefly acknowledge what the patient said (empathetic, concise).
2. Ask 1 relevant clinical follow-up question (e.g. onset, severity on scale 1-10, what makes it better/worse, or associated symptoms).
Keep your entire response short (1 to 2 sentences maximum) so it can be spoken aloud comfortably.
Do not provide a medical diagnosis or prescribe treatments.
Respond in the patient's language: ${language}.`

  // 1. Prefer Google Gemini if available
  if (geminiKey) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`
      const prompt = `${systemPrompt}\n\nPatient said: "${transcript}"\nPrevious context: ${JSON.stringify(conversation)}\n\nAssistant response:`
      const r = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 120 },
        }),
      })

      if (r.ok) {
        const data = await r.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (text) return res.json({ responseText: text, provider: 'gemini' })
      }
    } catch (e) {
      console.error('Gemini respond error:', e)
    }
  }

  // 2. Fallback to OpenAI if available
  if (openaiKey) {
    try {
      const r = await fetch(process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: 0.3,
          max_tokens: 120,
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversation.map((c) => ({ role: c.role || 'user', content: c.text })),
            { role: 'user', content: transcript },
          ],
        }),
      })

      if (r.ok) {
        const json = await r.json()
        const text = json?.choices?.[0]?.message?.content?.trim()
        if (text) return res.json({ responseText: text, provider: 'openai' })
      }
    } catch (e) {
      console.error('OpenAI respond error:', e)
    }
  }

  // Fallback if no API key is configured on the server
  res.json({ responseText: null, fallback: true })
})

app.post('/api/extract', async (req, res) => {
  const { transcript, language } = req.body || {}
  if (!transcript) return res.status(400).json({ error: 'No transcript' })

  const geminiKey = process.env.GEMINI_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  const extractPrompt = `You are a clinical intake assistant. Extract a structured symptom summary from the patient transcript.
Return valid JSON with keys: mainComplaint, onset, severity (number 1-10 or null), trend (Better/Worse/Same or null), triggers, relief, and note.
Medically neutral, no diagnosis.
Language: ${language}
Transcript: ${transcript}`

  // 1. Try Gemini
  if (geminiKey) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`
      const r = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: extractPrompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      })
      if (r.ok) {
        const data = await r.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
        const parsed = JSON.parse(text)
        return res.json({ mainComplaint: parsed.mainComplaint || transcript, structured: parsed })
      }
    } catch (e) {
      console.error('Gemini extract error:', e)
    }
  }

  // 2. Try OpenAI
  if (openaiKey) {
    try {
      const r = await fetch(process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: 0.2,
          messages: [
            { role: 'system', content: 'You are a clinical intake assistant. Return valid JSON with keys: mainComplaint, onset, severity, trend, triggers, relief, and note.' },
            { role: 'user', content: `Language: ${language}\nTranscript: ${transcript}` },
          ],
        }),
      })
      if (r.ok) {
        const json = await r.json()
        const content = json?.choices?.[0]?.message?.content || '{}'
        let parsed = {}
        try { parsed = JSON.parse(content) } catch (e) { parsed = { mainComplaint: content.trim() } }
        return res.json({ mainComplaint: parsed.mainComplaint || transcript, structured: parsed })
      }
    } catch (e) {
      console.error('OpenAI extract error:', e)
    }
  }

  return res.json({ mainComplaint: transcript, structured: {} })
})

app.listen(PORT, () => {
  console.log(`AI proxy listening on port ${PORT}`)
})
