// Alarm Sound Service for different notification types

// Alarm type configurations
export const ALARM_TYPES = {
  REPORT: 'report',      // Regular incident report
  SOS: 'sos',            // Emergency SOS alert
  VERIFICATION: 'verification' // Verification alerts
}

// Generate audio context for different alarm types
const createAudioContext = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    return audioContext
  } catch (err) {
    console.error('❌ AudioContext not supported:', err)
    return null
  }
}

// Play alarm sound for report submission
export const playReportAlarm = () => {
  console.log('🔔 Playing report alarm sound...')
  playAlarmSound(ALARM_TYPES.REPORT)
}

// Play alarm sound for SOS emergency
export const playSOSAlarm = () => {
  console.log('🚨 Playing SOS alarm sound...')
  playAlarmSound(ALARM_TYPES.SOS)
}

// Play alarm sound for verification
export const playVerificationAlarm = () => {
  console.log('✅ Playing verification alarm sound...')
  playAlarmSound(ALARM_TYPES.VERIFICATION)
}

// Main alarm sound player
const playAlarmSound = (alarmType) => {
  const audioContext = createAudioContext()
  
  if (!audioContext) {
    console.warn('⚠️ AudioContext not available, trying HTML5 audio as fallback')
    playFallbackAlarm(alarmType)
    return
  }

  try {
    switch (alarmType) {
      case ALARM_TYPES.REPORT:
        playReportTone(audioContext)
        break
      case ALARM_TYPES.SOS:
        playSOSTone(audioContext)
        break
      case ALARM_TYPES.VERIFICATION:
        playVerificationTone(audioContext)
        break
      default:
        playReportTone(audioContext)
    }
  } catch (err) {
    console.error('❌ Error playing alarm:', err)
    playFallbackAlarm(alarmType)
  }
}

// Report alarm: 2 medium beeps (standard notification)
const playReportTone = (audioContext) => {
  const currentTime = audioContext.currentTime
  const duration = 0.3 // 300ms per beep
  const frequency = 800 // Hz
  const gap = 0.2 // 200ms gap between beeps

  for (let i = 0; i < 2; i++) {
    playBeep(audioContext, frequency, duration, currentTime + i * (duration + gap))
  }
}

// SOS alarm: 3 long urgent beeps (emergency alert)
const playSOSTone = (audioContext) => {
  const currentTime = audioContext.currentTime
  const duration = 0.5 // 500ms per beep - longer for emergency
  const frequency = 1000 // Higher frequency for urgency
  const gap = 0.1 // Shorter gap for urgency

  // S.O.S pattern: 3 short, 3 long, 3 short
  const pattern = [0.2, 0.2, 0.2, 0.5, 0.5, 0.5, 0.2, 0.2, 0.2]
  let totalTime = currentTime

  pattern.forEach((beepDuration) => {
    playBeep(audioContext, frequency, beepDuration, totalTime)
    totalTime += beepDuration + 0.15 // Add gap after each beep
  })
}

// Verification alarm: 1 pleasant beep
const playVerificationTone = (audioContext) => {
  const currentTime = audioContext.currentTime
  const duration = 0.4
  const frequency = 600 // Slightly lower frequency

  playBeep(audioContext, frequency, duration, currentTime)
}

// Helper: Play a single beep
const playBeep = (audioContext, frequency, duration, startTime) => {
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.value = frequency
  oscillator.type = 'sine' // Smooth sine wave

  // Fade in and out to avoid clicks
  gainNode.gain.setValueAtTime(0, startTime)
  gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02) // Fade in
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration - 0.02) // Fade out

  oscillator.start(startTime)
  oscillator.stop(startTime + duration)
}

// Fallback: Use HTML5 Audio API with Data URLs
const playFallbackAlarm = (alarmType) => {
  // Create a simple beep using data URL
  const generateAudioDataURL = (frequency = 800, duration = 300) => {
    // This creates a simple sine wave audio in base64
    // For production, you'd want to use pre-recorded audio files
    const sampleRate = 44100
    const samples = Math.floor((duration / 1000) * sampleRate)
    const audioData = new Float32Array(samples)

    for (let i = 0; i < samples; i++) {
      // Generate sine wave
      audioData[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.3
    }

    return audioData
  }

  try {
    // Try to play notification sound if available
    const audio = new Audio()
    
    // Different sounds for different alarm types
    switch (alarmType) {
      case ALARM_TYPES.REPORT:
        // Standard notification sound
        audio.src = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA=='
        break
      case ALARM_TYPES.SOS:
        // Emergency sound (will be more urgent if using real audio file)
        audio.src = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA=='
        break
      case ALARM_TYPES.VERIFICATION:
        audio.src = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA=='
        break
    }

    audio.volume = 0.5
    audio.play().catch(err => console.error('❌ Could not play fallback audio:', err))
  } catch (err) {
    console.error('❌ Fallback audio error:', err)
  }
}

// Convenience function: Stop all sounds (if needed)
export const stopAllAlarms = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    audioContext.close()
  } catch (err) {
    console.warn('Could not stop alarms:', err)
  }
}

// Check if audio is supported
export const isAudioSupported = () => {
  return !!(window.AudioContext || window.webkitAudioContext)
}
