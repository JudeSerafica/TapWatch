export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { imageDataUrl } = req.body
  if (!imageDataUrl) return res.status(400).json({ error: 'imageDataUrl required' })

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
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageDataUrl, detail: 'low' },
              },
              {
                type: 'text',
                text: `Analyze this image from a Philippine barangay emergency app. Respond with ONLY valid JSON (no markdown):\n{"type":"Fire","confidence":0.95,"urgency":"critical","detected":["flames","smoke"],"hasVictims":false,"environmentalHazards":["fire"],"recommendedAction":"Dispatch fire department","reasoning":"Truck on fire on a road.","isIncidentRelated":true,"nonIncidentReason":"","isAuthentic":true,"authenticityConfidence":0.9,"manipulationDetected":false,"fakeness_indicators":[],"authenticity_reasoning":"Real photo","image_source":"real_photo"}\n\nType rules: Fire=flames/smoke/burning, Flood=water/flooded roads, Crime=robbery/violence, Accident=vehicle crash, Disturbance=fight/riot, Unknown=selfie/food/unrelated`,
              },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[AI/analyze-image] OpenAI error:', response.status, err.substring(0, 200))
      return res.status(response.status).json({ error: err })
    }

    const data = await response.json()
    return res.status(200).json({ content: data.choices[0].message.content })
  } catch (err) {
    console.error('[AI/analyze-image] error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
