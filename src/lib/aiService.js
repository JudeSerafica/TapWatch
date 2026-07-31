/**
 * 🤖 AI Service for TapWatch
 *
 * Calls local Express server (/api/ai/*) which proxies to OpenAI.
 * This avoids CORS — browser → local server → OpenAI API.
 *
 * Text:     gpt-4o-mini
 * Vision:   gpt-4o
 * Fallback: Keyword-based rule matching
 */

// Empty string = relative URLs → works via Vite proxy locally and Vercel serverless in production
const SERVER_BASE = ''

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Key lives on the server — frontend just calls the proxy
function getKey() { return true }


function extractJSON(text) {
  const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const m = stripped.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('No JSON found in response')
  return JSON.parse(m[0])
}

// ─── Text Classification ──────────────────────────────────────────────────────

export const classifyTextWithOpenAI = async (description) => {
  const key = getKey()
  if (!key) {
    console.warn('⚠️ VITE_NVIDIA_API_KEY not set — using keyword fallback')
    return fallbackTextClassification(description)
  }

  try {
    const res = await fetch(`${SERVER_BASE}/api/ai/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description })
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('AI classify proxy error:', res.status, err.substring(0, 200))
      throw new Error(`classify ${res.status}`)
    }

    const data   = await res.json()
    const result = extractJSON(data.content)
    console.log('✅ OpenAI text classification:', result)
    return result

  } catch (e) {
    console.error('❌ OpenAI text error:', e.message)
    return fallbackTextClassification(description)
  }
}

// ─── Image Analysis ───────────────────────────────────────────────────────────

export const analyzeImageWithOpenAI = async (imageDataUrl) => {
  const key = getKey()
  if (!key) {
    console.warn('⚠️ VITE_NVIDIA_API_KEY not set — image analysis skipped')
    return fallbackImageAnalysis()
  }

  if (!imageDataUrl || !imageDataUrl.startsWith('data:')) {
    console.warn('⚠️ analyzeImageWithNvidia expects a base64 data URL')
    return fallbackImageAnalysis()
  }

  try {
    const res = await fetch(`${SERVER_BASE}/api/ai/analyze-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageDataUrl })
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('AI analyze-image proxy error:', res.status, err.substring(0, 200))
      throw new Error(`analyze-image ${res.status}`)
    }

    const data   = await res.json()
    const result = extractJSON(data.content)
    console.log('✅ OpenAI image analysis:', result)
    return result

  } catch (e) {
    console.error('❌ OpenAI vision error:', e.message)
    return fallbackImageAnalysis()
  }
}

// ─── Fallbacks ────────────────────────────────────────────────────────────────

function fallbackTextClassification(description) {
  const text = (description || '').toLowerCase()

  const patterns = {
    Fire:        { kw: ['sunog','fire','apoy','usok','smoke','nasusunog','burning','flames','nagliliyab'], urgency: 'critical', conf: 0.7 },
    Flood:       { kw: ['baha','flood','tubig','water','umaapaw','lumalaki','rising','inundation'],        urgency: 'high',     conf: 0.75 },
    Crime:       { kw: ['nakaw','theft','robbery','holdap','snatcher','crime','suspicious','kawatan'],     urgency: 'high',     conf: 0.7 },
    Accident:    { kw: ['bangga','aksidente','accident','motor','sasakyan','crash','nabangga','injury'],   urgency: 'high',     conf: 0.75 },
    Disturbance: { kw: ['ingay','away','disturbance','gulo','riot','fight','noise','maingay'],             urgency: 'medium',   conf: 0.7 }
  }

  let best = { type: 'Accident', confidence: 0.5, urgency: 'medium', keywords: [], reasoning: 'Default classification' }

  for (const [type, cfg] of Object.entries(patterns)) {
    const hits = cfg.kw.filter(k => text.includes(k))
    if (hits.length > 0) {
      const conf = Math.min(0.9, 0.6 + hits.length * 0.1)
      if (conf > best.confidence) {
        best = { type, confidence: conf, urgency: cfg.urgency, keywords: hits, reasoning: `Keywords: ${hits.join(', ')}` }
      }
    }
  }

  console.log('🔄 Fallback text classification:', best)
  return best
}

function fallbackImageAnalysis() {
  return {
    type: 'Unknown', confidence: 0, urgency: 'medium',
    detected: ['Image analysis unavailable'],
    hasVictims: false, environmentalHazards: [],
    recommendedAction: 'Manual review required',
    reasoning: 'AI image analysis failed or no API key',
    isIncidentRelated: true,
    nonIncidentReason: '',
    isAuthentic: true, authenticityConfidence: 0,
    manipulationDetected: false, fakeness_indicators: [],
    authenticity_reasoning: 'No analysis performed', image_source: 'unknown'
  }
}

// ─── Combined Analysis ────────────────────────────────────────────────────────

export const analyzeIncident = async (description, imageUrl = null) => {
  console.log('🤖 Starting NVIDIA NIM analysis...')
  console.log('📝 Description:', description?.substring(0, 100))
  console.log('📸 Has Image:', !!imageUrl)

  const results = { text: null, image: null, combined: null }

  // Run text and image analysis in parallel for speed
  const [textResult, imageResult] = await Promise.all([
    description && description.trim().length > 5
      ? classifyTextWithOpenAI(description)
      : Promise.resolve(null),
    imageUrl
      ? analyzeImageWithOpenAI(imageUrl)
      : Promise.resolve(null)
  ])

  results.text  = textResult
  results.image = imageResult

  const textOk  = results.text  && results.text.type  !== 'Unknown'
  const imageOk = results.image && results.image.type !== 'Unknown'

  if (textOk && imageOk) {
    if (results.text.type === results.image.type) {
      results.combined = {
        type:       results.text.type,
        confidence: Math.min(0.97, (results.text.confidence + results.image.confidence) / 1.5),
        urgency:    results.image.urgency === 'critical' ? 'critical' : results.text.urgency,
        detected:   [...(results.text.keywords || []), ...(results.image.detected || [])],
        source:     'text + image',
        reasoning:  `Both text and image indicate ${results.text.type}`
      }
    } else {
      const winner = results.text.confidence >= results.image.confidence ? results.text : results.image
      results.combined = {
        ...winner,
        confidence: winner.confidence * 0.85,
        source:     results.text.confidence >= results.image.confidence ? 'text (primary)' : 'image (primary)',
        reasoning:  `Conflict: text=${results.text.type}, image=${results.image.type}`
      }
    }
  } else if (textOk) {
    results.combined = { ...results.text, source: 'text only' }
  } else if (imageOk) {
    results.combined = { ...results.image, source: 'image only' }
  } else {
    results.combined = { ...fallbackTextClassification(description || ''), source: 'fallback' }
  }

  console.log('✅ OpenAI Analysis complete:', results.combined)
  return results
}

// ─── Utility exports ──────────────────────────────────────────────────────────

export const isEmergency = (analysis) => {
  if (!analysis) return false
  return ['Fire', 'Flood', 'Crime', 'Accident'].includes(analysis.type) &&
         ['high', 'critical'].includes(analysis.urgency)
}

export const checkImageAuthenticity = (imageAnalysis) => {
  if (!imageAnalysis) return { isAuthentic: true, confidence: 0, warnings: [] }
  return {
    isAuthentic:          imageAnalysis.isAuthentic !== false,
    confidence:           imageAnalysis.authenticityConfidence || 0,
    imageSource:          imageAnalysis.image_source || 'unknown',
    manipulationDetected: imageAnalysis.manipulationDetected || false,
    indicators:           imageAnalysis.fakeness_indicators || [],
    reasoning:            imageAnalysis.authenticity_reasoning || '',
    warnings:             buildAuthWarnings(imageAnalysis)
  }
}

function buildAuthWarnings(a) {
  const w = []
  if (a.isAuthentic === false)           w.push('⚠️ Image may be AI-generated or manipulated')
  if (a.image_source === 'ai_generated') w.push('🤖 AI-generated image detected')
  if (a.image_source === 'screenshot')   w.push('📱 Screenshot detected')
  if (a.image_source === 'stock_photo')  w.push('📸 Stock photo detected')
  if (a.manipulationDetected)            w.push('✂️ Photo manipulation detected')
  return w
}

export const getRecommendedActions = (analysis) => {
  if (!analysis) return ['Submit report for manual review']
  const map = {
    Fire:        ['🚒 Alert Fire Department', '📢 Evacuate nearby residents', '⚠️ Send emergency responders'],
    Flood:       ['🚨 Issue flood warning', '🛟 Prepare rescue equipment', '📊 Monitor water levels'],
    Crime:       ['👮 Dispatch police', '📞 Contact witnesses', '🎥 Check CCTV footage'],
    Accident:    ['🚑 Send ambulance', '🚓 Secure accident scene', '📋 Document incident'],
    Disturbance: ['👥 Send barangay officials', '📝 Document disturbance', '☎️ Contact parties involved']
  }
  const actions = map[analysis.type] || ['Submit report for manual review']
  if (analysis.urgency === 'critical') actions.unshift('🚨 IMMEDIATE RESPONSE REQUIRED')
  return actions
}

// Aliases for any code still referencing old function names
export const classifyTextWithGemini    = classifyTextWithOpenAI
export const analyzeImageWithGemini    = analyzeImageWithOpenAI
export const classifyTextWithGitHubGPT = classifyTextWithOpenAI
export const analyzeImageWithGitHubGPT = analyzeImageWithOpenAI
export const classifyTextWithNvidia    = classifyTextWithOpenAI
export const analyzeImageWithNvidia    = analyzeImageWithOpenAI

export default analyzeIncident
