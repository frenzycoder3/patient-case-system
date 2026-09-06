export async function extractSymptomsProxy(transcript, language = 'en') {
  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, language }),
  })

  if (!res.ok) {
    throw new Error('Proxy error')
  }

  return res.json()
}

export default extractSymptomsProxy
