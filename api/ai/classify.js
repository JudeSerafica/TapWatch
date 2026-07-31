export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { description } = req.body
  if (!description) return res.status(400).json({ error: 'description required' })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an emergency incident classifier for a barangay in the Philippines. Classify into exactly one of: Crime, Fire, Flood, Accident, Disturbance. Respond with ONLY valid JSON, no markdown.',
          },
          {
            role: 'user',
            content: `Classify this incident: "${description}"\n\nRespond ONLY with this JSON:\n{"type":"Fire","confidence":0.9,"urgency":"critical","keywords":["fire"],"reasoning":"one sentence"}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[AI/classify] OpenAI error:', response.status, err.substring(0, 200))
      return res.status(response.status).json({ error: err })
    }

    const data = await response.json()
    return res.status(200).json({ content: data.choices[0].message.content })
  } catch (err) {
    console.error('[AI/classify] error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
