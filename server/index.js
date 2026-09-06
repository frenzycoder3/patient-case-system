const express = require('express')
const fetch = require('node-fetch')
const bodyParser = require('body-parser')
const app = express()
const PORT = process.env.PORT || 3001

app.use(bodyParser.json())

app.post('/api/extract', async (req, res) => {
  const { transcript, language } = req.body || {}
  if (!transcript) return res.status(400).json({ error: 'No transcript' })

  const apiKey = process.env.OPENAI_API_KEY
  const apiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions'
  if (!apiKey) {
    return res.json({ mainComplaint: transcript, structured: {} })
  }

  try {
    const payload = {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'You are a clinical intake assistant. Extract a concise symptom summary from the patient transcript. Return valid JSON with keys: mainComplaint, symptoms, onset, severity, triggers, relief, and note. Keep the output medically neutral and do not diagnose.' },
        { role: 'user', content: `Language: ${language}\nTranscript: ${transcript}` },
      ],
    }

    const r = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!r.ok) {
      const text = await r.text()
      return res.status(502).json({ error: 'Upstream error', detail: text })
    }

    const json = await r.json()
    const content = json?.choices?.[0]?.message?.content || '{}'
    let parsed = {}
    try {
      parsed = JSON.parse(content)
    } catch (e) {
      parsed = { mainComplaint: content.replace(/```/g, '').trim() }
    }

    return res.json({ mainComplaint: parsed.mainComplaint || transcript, structured: parsed })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.listen(PORT, () => {
  console.log(`AI proxy listening on port ${PORT}`)
})
