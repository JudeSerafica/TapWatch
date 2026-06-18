/**
 * 🤖 AI Service for TapWatch
 * 
 * Features:
 * 1. Text Classification - Classify incidents from description
 * 2. Image Recognition - Detect incident type from photos
 * 3. Severity Assessment - Determine urgency level
 * 4. Emergency Detection - Detect if immediate response needed
 * 
 * Powered by GitHub Models API (FREE GPT-4o access!)
 */

// ══════════════════════════════════════════════════════════════
// OPTION 1: GitHub Models API - GPT-4o (FREE & POWERFUL!) ⭐
// ══════════════════════════════════════════════════════════════

/**
 * Classify incident using GitHub Models GPT-4o (FREE!)
 * @param {string} description - Incident description
 * @returns {Promise<{type: string, confidence: number, urgency: string, keywords: string[]}>}
 */
export const classifyTextWithGitHubGPT = async (description) => {
  const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN
  
  if (!GITHUB_TOKEN) {
    console.warn('⚠️ GitHub token not found, using fallback classification')
    return fallbackTextClassification(description)
  }

  try {
    const systemPrompt = `You are an emergency incident classifier for a barangay reporting system in the Philippines.

Analyze incident reports and classify them into these categories:
- Crime (theft, robbery, violence, suspicious activity, holdap, nakaw)
- Fire (sunog, smoke, flames, burning, apoy, nasusunog)
- Flood (baha, tubig, inundation, water rising, umaapaw)
- Accident (bangga, motor accident, injury, crash, aksidente)
- Disturbance (ingay, away, noise, fight, gulo, commotion)

You must respond ONLY with valid JSON in this exact format:
{
  "type": "Crime|Fire|Flood|Accident|Disturbance",
  "confidence": 0.85,
  "urgency": "low|medium|high|critical",
  "keywords": ["keyword1", "keyword2"],
  "reasoning": "brief explanation in 1 sentence"
}`

    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GITHUB_TOKEN}`
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Classify this incident report:\n\n"${description}"\n\nRespond with JSON only.` }
        ],
        model: 'gpt-4o',
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GitHub Models API error:', response.status, errorText)
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content)
    
    console.log('✅ GitHub GPT-4o classification:', result)
    return result

  } catch (error) {
    console.error('❌ GitHub GPT-4o error:', error)
    return fallbackTextClassification(description)
  }
}

/**
 * Analyze image using GitHub Models GPT-4o Vision (FREE!)
 * @param {string} imageDataUrl - Base64 image data URL
 * @returns {Promise<{type: string, confidence: number, detected: string[], urgency: string}>}
 */
export const analyzeImageWithGitHubGPT = async (imageDataUrl) => {
  const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN
  
  if (!GITHUB_TOKEN) {
    console.warn('⚠️ GitHub token not found, image analysis unavailable')
    return fallbackImageAnalysis()
  }

  try {
    const systemPrompt = `You are an emergency incident analyzer for a Philippine barangay system with expertise in detecting AI-generated images and fake evidence.

CRITICAL: Analyze this image for AUTHENTICITY and emergency classification.

First, check if this image is REAL or FAKE:
1. AI-generated detection (Midjourney, DALL-E, Stable Diffusion artifacts)
2. Photoshop/manipulation signs (inconsistent lighting, shadows, perspective)
3. Stock photo indicators (watermarks, perfect composition, staged)
4. Screenshot from video/game
5. Metadata analysis (if available)

Then, detect incident details:
1. Incident type (Crime, Fire, Flood, Accident, Disturbance, or Unknown)
2. Severity and urgency level
3. Specific objects and situations visible
4. Presence of people in danger
5. Environmental hazards

Respond ONLY with valid JSON:
{
  "isAuthentic": true/false,
  "authenticityConfidence": 0.95,
  "manipulationDetected": false,
  "fakeness_indicators": ["list of signs if fake/AI-generated"],
  "authenticity_reasoning": "detailed explanation of why real or fake",
  "image_source": "real_photo|ai_generated|screenshot|stock_photo|manipulated",
  "type": "Crime|Fire|Flood|Accident|Disturbance|Unknown",
  "confidence": 0.92,
  "urgency": "low|medium|high|critical",
  "detected": ["object1", "object2", "situation"],
  "hasVictims": true,
  "environmentalHazards": ["hazard1", "hazard2"],
  "recommendedAction": "immediate action needed",
  "reasoning": "what you see in the image in 1-2 sentences"
}`

    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GITHUB_TOKEN}`
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image for AUTHENTICITY (real vs AI-generated/fake) AND emergency incident classification. Check for AI generation artifacts, photo manipulation, or stock photo indicators. Respond with JSON only.'
              },
              {
                type: 'image_url',
                image_url: { url: imageDataUrl }
              }
            ]
          }
        ],
        model: 'gpt-4o',
        temperature: 0.2, // Lower temperature for more consistent authenticity detection
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GitHub Vision API error:', response.status, errorText)
      throw new Error(`GitHub Vision API error: ${response.status}`)
    }

    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content)
    
    console.log('✅ GitHub GPT-4o Vision analysis (with authenticity check):', result)
    
    // Log warning if image is detected as fake
    if (!result.isAuthentic) {
      console.warn('⚠️ FAKE IMAGE DETECTED:', result.fakeness_indicators)
      console.warn('Authenticity reasoning:', result.authenticity_reasoning)
    }
    
    return result

  } catch (error) {
    console.error('❌ GitHub GPT-4o Vision error:', error)
    return fallbackImageAnalysis()
  }
}

// ══════════════════════════════════════════════════════════════
// OPTION 2: Google Gemini API (FREE & POWERFUL for images)
// ══════════════════════════════════════════════════════════════

/**
 * Classify incident from description using Gemini AI
 * @param {string} description - Incident description
 * @returns {Promise<{type: string, confidence: number, urgency: string, keywords: string[]}>}
 */
export const classifyTextWithGemini = async (description) => {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
  
  if (!GEMINI_API_KEY) {
    console.warn('⚠️ Gemini API key not found, using fallback classification')
    return fallbackTextClassification(description)
  }

  try {
    const prompt = `
You are an emergency incident classifier for a barangay reporting system in the Philippines.

Analyze this incident report and classify it:

Description: "${description}"

Available incident types:
- Crime (theft, robbery, violence, suspicious activity)
- Fire (sunog, smoke, flames, burning)
- Flood (baha, tubig, inundation, water rising)
- Accident (bangga, motor accident, injury, crash)
- Disturbance (ingay, away, noise, fight, commotion)

Respond ONLY with valid JSON:
{
  "type": "one of: Crime, Fire, Flood, Accident, Disturbance",
  "confidence": 0.0 to 1.0,
  "urgency": "low, medium, high, critical",
  "keywords": ["list", "of", "key", "words"],
  "reasoning": "brief explanation"
}
`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates[0].content.parts[0].text
    
    // Extract JSON from response (might be wrapped in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    if (!result) {
      throw new Error('Invalid response format from Gemini')
    }

    console.log('✅ Gemini classification:', result)
    return result

  } catch (error) {
    console.error('❌ Gemini classification error:', error)
    return fallbackTextClassification(description)
  }
}

/**
 * Analyze image to detect incident type using Gemini Vision
 * @param {string} imageDataUrl - Base64 image data URL
 * @returns {Promise<{type: string, confidence: number, detected: string[], urgency: string}>}
 */
export const analyzeImageWithGemini = async (imageDataUrl) => {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
  
  if (!GEMINI_API_KEY) {
    console.warn('⚠️ Gemini API key not found, image analysis unavailable')
    return { 
      type: 'Unknown', 
      confidence: 0, 
      detected: ['No API key'], 
      urgency: 'medium' 
    }
  }

  try {
    // Remove data URL prefix to get base64
    const base64Image = imageDataUrl.split(',')[1]

    const prompt = `
Analyze this image for emergency incident classification in the Philippines.

Detect:
1. Incident type (Crime, Fire, Flood, Accident, Disturbance)
2. Severity/urgency level
3. Specific objects/situations visible
4. Any people in danger
5. Environmental hazards

Respond ONLY with valid JSON:
{
  "type": "one of: Crime, Fire, Flood, Accident, Disturbance, Unknown",
  "confidence": 0.0 to 1.0,
  "urgency": "low, medium, high, critical",
  "detected": ["list of detected objects/situations"],
  "hasVictims": boolean,
  "environmentalHazards": ["list of hazards"],
  "recommendedAction": "immediate action needed",
  "reasoning": "what you see in the image"
}
`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Image
                }
              }
            ]
          }]
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini Vision API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates[0].content.parts[0].text
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    if (!result) {
      throw new Error('Invalid response format from Gemini Vision')
    }

    console.log('✅ Gemini Vision analysis:', result)
    return result

  } catch (error) {
    console.error('❌ Gemini Vision error:', error)
    return fallbackImageAnalysis()
  }
}

// ══════════════════════════════════════════════════════════════
// OPTION 2: OpenAI GPT-4 Vision (More Accurate but Paid)
// ══════════════════════════════════════════════════════════════

/**
 * Classify incident using OpenAI GPT-4
 * @param {string} description - Incident description
 * @returns {Promise<Object>}
 */
export const classifyTextWithOpenAI = async (description) => {
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
  
  if (!OPENAI_API_KEY) {
    console.warn('⚠️ OpenAI API key not found')
    return fallbackTextClassification(description)
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [{
          role: 'system',
          content: 'You are an emergency incident classifier. Respond only with valid JSON.'
        }, {
          role: 'user',
          content: `Classify this incident: "${description}". Categories: Crime, Fire, Flood, Accident, Disturbance. Return JSON: {"type": "...", "confidence": 0-1, "urgency": "low/medium/high/critical", "keywords": [], "reasoning": "..."}`
        }],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    })

    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content)
    
    console.log('✅ OpenAI classification:', result)
    return result

  } catch (error) {
    console.error('❌ OpenAI error:', error)
    return fallbackTextClassification(description)
  }
}

/**
 * Analyze image using OpenAI GPT-4 Vision
 * @param {string} imageDataUrl - Base64 image data URL
 * @returns {Promise<Object>}
 */
export const analyzeImageWithOpenAI = async (imageDataUrl) => {
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
  
  if (!OPENAI_API_KEY) {
    console.warn('⚠️ OpenAI API key not found')
    return fallbackImageAnalysis()
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image for emergency incidents. Detect type (Crime/Fire/Flood/Accident/Disturbance), urgency, objects, and hazards. Respond with JSON: {"type": "...", "confidence": 0-1, "urgency": "...", "detected": [], "hasVictims": bool, "environmentalHazards": [], "recommendedAction": "...", "reasoning": "..."}'
            },
            {
              type: 'image_url',
              image_url: { url: imageDataUrl }
            }
          ]
        }],
        max_tokens: 500
      })
    })

    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content)
    
    console.log('✅ OpenAI Vision analysis:', result)
    return result

  } catch (error) {
    console.error('❌ OpenAI Vision error:', error)
    return fallbackImageAnalysis()
  }
}

// ══════════════════════════════════════════════════════════════
// FALLBACK: Rule-based Classification (No API needed)
// ══════════════════════════════════════════════════════════════

/**
 * Fallback text classification using keyword matching
 */
function fallbackTextClassification(description) {
  const text = description.toLowerCase()
  
  const patterns = {
    Fire: {
      keywords: ['sunog', 'fire', 'apoy', 'usok', 'smoke', 'nasusunog', 'burning', 'flames', 'nagliliyab'],
      urgency: 'critical',
      confidence: 0.7
    },
    Flood: {
      keywords: ['baha', 'flood', 'tubig', 'water', 'inundation', 'umaapaw', 'lumalaki', 'rising'],
      urgency: 'high',
      confidence: 0.75
    },
    Crime: {
      keywords: ['nakaw', 'theft', 'robbery', 'holdap', 'snatcher', 'pulis', 'police', 'crime', 'suspicious', 'kawatan'],
      urgency: 'high',
      confidence: 0.7
    },
    Accident: {
      keywords: ['bangga', 'aksidente', 'accident', 'motor', 'sasakyan', 'crash', 'nabangga', 'injury', 'sugat'],
      urgency: 'high',
      confidence: 0.75
    },
    Disturbance: {
      keywords: ['ingay', 'away', 'disturbance', 'gulo', 'kagulo', 'riot', 'fight', 'noise', 'maingay'],
      urgency: 'medium',
      confidence: 0.7
    }
  }

  let bestMatch = {
    type: 'Accident', // default
    confidence: 0.5,
    urgency: 'medium',
    keywords: []
  }

  for (const [type, config] of Object.entries(patterns)) {
    const matches = config.keywords.filter(kw => text.includes(kw))
    
    if (matches.length > 0) {
      const confidence = Math.min(0.9, 0.6 + (matches.length * 0.1))
      
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          type,
          confidence,
          urgency: config.urgency,
          keywords: matches,
          reasoning: `Detected keywords: ${matches.join(', ')}`
        }
      }
    }
  }

  console.log('🔄 Fallback classification:', bestMatch)
  return bestMatch
}

/**
 * Fallback image analysis (basic check)
 */
function fallbackImageAnalysis() {
  return {
    type: 'Unknown',
    confidence: 0,
    urgency: 'medium',
    detected: ['Image analysis unavailable without AI API'],
    hasVictims: false,
    environmentalHazards: [],
    recommendedAction: 'Manual review required',
    reasoning: 'No AI API configured for image analysis'
  }
}

// ══════════════════════════════════════════════════════════════
// COMBINED ANALYSIS: Text + Image
// ══════════════════════════════════════════════════════════════

/**
 * Analyze both text description and image together
 * @param {string} description - Text description
 * @param {string} imageDataUrl - Image data URL (optional)
 * @returns {Promise<Object>} Combined analysis result
 */
export const analyzeIncident = async (description, imageDataUrl = null) => {
  console.log('🤖 Starting AI analysis...')
  console.log('📝 Description:', description?.substring(0, 100))
  console.log('📸 Has Image:', !!imageDataUrl)
  
  const results = {
    text: null,
    image: null,
    combined: null
  }

  // Try GitHub GPT-4o first (FREE and powerful!)
  const hasGitHubToken = !!import.meta.env.VITE_GITHUB_TOKEN
  
  if (hasGitHubToken) {
    console.log('🚀 Using GitHub Models GPT-4o (FREE)...')
    
    // Analyze text
    if (description && description.trim().length > 5) {
      results.text = await classifyTextWithGitHubGPT(description)
    }

    // Analyze image (if provided)
    if (imageDataUrl) {
      results.image = await analyzeImageWithGitHubGPT(imageDataUrl)
    }
  } else {
    console.log('🔄 GitHub token not found, trying Gemini...')
    
    // Fallback to Gemini
    if (description && description.trim().length > 5) {
      results.text = await classifyTextWithGemini(description)
    }

    if (imageDataUrl) {
      results.image = await analyzeImageWithGemini(imageDataUrl)
    }
  }

  // Combine results with weighted confidence
  if (results.text && results.image && results.image.type !== 'Unknown') {
    // If both agree, higher confidence
    if (results.text.type === results.image.type) {
      results.combined = {
        type: results.text.type,
        confidence: Math.min(0.95, (results.text.confidence + results.image.confidence) / 1.5),
        urgency: results.image.urgency === 'critical' ? 'critical' : results.text.urgency,
        detected: [...(results.text.keywords || []), ...(results.image.detected || [])],
        source: 'text + image',
        imageAnalysis: results.image,
        reasoning: `Text and image analysis both indicate ${results.text.type}`
      }
    } else {
      // If they disagree, use the one with higher confidence
      const bestResult = results.text.confidence > results.image.confidence ? results.text : results.image
      results.combined = {
        ...bestResult,
        confidence: bestResult.confidence * 0.9, // Slightly lower due to conflict
        source: results.text.confidence > results.image.confidence ? 'text (primary)' : 'image (primary)',
        reasoning: `Conflicting analysis - using ${bestResult.type} based on higher confidence`
      }
    }
  } else if (results.text) {
    results.combined = { ...results.text, source: 'text only' }
  } else if (results.image && results.image.type !== 'Unknown') {
    results.combined = { ...results.image, source: 'image only' }
  } else {
    results.combined = fallbackTextClassification(description || 'Unknown incident')
  }

  console.log('✅ AI Analysis complete:', results.combined)
  return results
}

/**
 * Detect if incident is an emergency requiring immediate response
 * @param {Object} analysisResult - Result from analyzeIncident
 * @returns {boolean} true if emergency
 */
export const isEmergency = (analysisResult) => {
  if (!analysisResult) return false
  
  const emergencyTypes = ['Fire', 'Flood', 'Crime', 'Accident']
  const isEmergencyType = emergencyTypes.includes(analysisResult.type)
  const isHighUrgency = ['high', 'critical'].includes(analysisResult.urgency)
  const hasVictims = analysisResult.imageAnalysis?.hasVictims === true
  
  return isEmergencyType && (isHighUrgency || hasVictims)
}

/**
 * Check if image is authentic (real photo) or fake/AI-generated
 * @param {Object} imageAnalysis - Image analysis result
 * @returns {Object} Authenticity check result
 */
export const checkImageAuthenticity = (imageAnalysis) => {
  if (!imageAnalysis) {
    return {
      isAuthentic: true, // Assume authentic if no analysis
      confidence: 0,
      warnings: ['No image analysis available']
    }
  }

  const result = {
    isAuthentic: imageAnalysis.isAuthentic !== false, // Default to true
    confidence: imageAnalysis.authenticityConfidence || 0,
    imageSource: imageAnalysis.image_source || 'unknown',
    manipulationDetected: imageAnalysis.manipulationDetected || false,
    indicators: imageAnalysis.fakeness_indicators || [],
    reasoning: imageAnalysis.authenticity_reasoning || 'No authenticity check performed',
    warnings: []
  }

  // Generate warnings based on authenticity check
  if (!result.isAuthentic) {
    result.warnings.push('⚠️ This image may be AI-generated or manipulated')
  }

  if (result.imageSource === 'ai_generated') {
    result.warnings.push('🤖 AI-generated image detected (Midjourney/DALL-E/Stable Diffusion)')
  }

  if (result.imageSource === 'screenshot') {
    result.warnings.push('📱 Screenshot detected - may not be original evidence')
  }

  if (result.imageSource === 'stock_photo') {
    result.warnings.push('📸 Stock photo detected - likely not real incident')
  }

  if (result.manipulationDetected) {
    result.warnings.push('✂️ Photo manipulation detected (Photoshop/editing)')
  }

  if (result.confidence < 0.6 && !result.isAuthentic) {
    result.warnings.push('❓ Low confidence - manual review recommended')
  }

  return result
}

/**
 * Generate recommended actions based on analysis
 * @param {Object} analysisResult - Result from analyzeIncident
 * @returns {string[]} Array of recommended actions
 */
export const getRecommendedActions = (analysisResult) => {
  const actions = []
  
  if (!analysisResult) return ['Submit report for manual review']
  
  switch (analysisResult.type) {
    case 'Fire':
      actions.push('🚒 Alert Fire Department immediately')
      actions.push('📢 Evacuate nearby residents')
      actions.push('⚠️ Send emergency responders to location')
      break
    case 'Flood':
      actions.push('🚨 Issue flood warning to affected area')
      actions.push('🛟 Prepare rescue boats and equipment')
      actions.push('📊 Monitor water levels')
      break
    case 'Crime':
      actions.push('👮 Dispatch police to location')
      actions.push('📞 Contact witnesses for statements')
      actions.push('🎥 Check for nearby CCTV footage')
      break
    case 'Accident':
      actions.push('🚑 Send ambulance if injuries reported')
      actions.push('🚓 Secure the accident scene')
      actions.push('📋 Document incident for insurance')
      break
    case 'Disturbance':
      actions.push('👥 Send barangay officials to mediate')
      actions.push('📝 Document the disturbance')
      actions.push('☎️ Contact involved parties')
      break
  }
  
  if (analysisResult.urgency === 'critical') {
    actions.unshift('🚨 IMMEDIATE RESPONSE REQUIRED')
  }
  
  return actions
}

// Export main function as default
export default analyzeIncident
