/**
 * WebRTC Service for In-App Voice/Video Calling
 * Handles peer-to-peer connection establishment and media streaming
 */

import { supabase } from './supabase'

class WebRTCService {
  constructor() {
    this.peerConnection = null
    this.localStream = null
    this.remoteStream = null
    this.callId = null
    this.isInitiator = false
    this.signalingChannel = null
    
    // ICE servers for NAT traversal (using free STUN servers)
    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ]
    }
  }

  /**
   * Initialize local media stream (audio/video)
   */
  async initializeMedia(audioOnly = false) {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: audioOnly ? false : {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      }

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log('✅ Local media stream initialized:', audioOnly ? 'Audio Only' : 'Audio + Video')
      return this.localStream
    } catch (error) {
      console.error('❌ Failed to get local media:', error)
      throw new Error('Cannot access camera/microphone. Please check permissions.')
    }
  }

  /**
   * Create a new peer connection
   */
  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.iceServers)

    // Add local stream tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream)
      })
    }

    // Handle incoming remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('📥 Received remote track:', event.track.kind)
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream()
      }
      this.remoteStream.addTrack(event.track)
    }

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 New ICE candidate:', event.candidate.type)
        this.sendSignal({
          type: 'ice-candidate',
          candidate: event.candidate
        })
      }
    }

    // Connection state monitoring
    this.peerConnection.onconnectionstatechange = () => {
      console.log('🔄 Connection state:', this.peerConnection.connectionState)
    }

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state:', this.peerConnection.iceConnectionState)
    }

    return this.peerConnection
  }

  /**
   * Start a call (initiator side)
   */
  async startCall(calleeId, audioOnly = false, callType = 'app') {
    try {
      // Initialize media
      await this.initializeMedia(audioOnly)

      // Create call record in database
      const { data: callData, error } = await supabase
        .from('calls')
        .insert({
          caller_id: (await supabase.auth.getUser()).data.user.id,
          callee_id: calleeId,
          call_type: callType,
          status: 'ringing',
          is_video: !audioOnly,
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      this.callId = callData.id
      this.isInitiator = true

      // Set up signaling channel
      this.setupSignalingChannel()

      // Create peer connection and offer
      this.createPeerConnection()
      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)

      // Send offer through signaling
      await this.sendSignal({
        type: 'offer',
        sdp: offer
      })

      console.log('📞 Call initiated:', this.callId)
      return { callId: this.callId, localStream: this.localStream }
    } catch (error) {
      console.error('❌ Failed to start call:', error)
      this.cleanup()
      throw error
    }
  }

  /**
   * Answer incoming call
   */
  async answerCall(callId, audioOnly = false) {
    try {
      this.callId = callId
      this.isInitiator = false

      // Initialize media
      await this.initializeMedia(audioOnly)

      // Update call status
      await supabase
        .from('calls')
        .update({ status: 'active', answered_at: new Date().toISOString() })
        .eq('id', callId)

      // Set up signaling
      this.setupSignalingChannel()

      // Create peer connection
      this.createPeerConnection()

      // Wait for offer and create answer
      console.log('📞 Call answered, waiting for offer...')
      return { callId: this.callId, localStream: this.localStream }
    } catch (error) {
      console.error('❌ Failed to answer call:', error)
      this.cleanup()
      throw error
    }
  }

  /**
   * Handle incoming signaling messages
   */
  async handleSignal(signal) {
    try {
      switch (signal.type) {
        case 'offer':
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp))
          const answer = await this.peerConnection.createAnswer()
          await this.peerConnection.setLocalDescription(answer)
          await this.sendSignal({ type: 'answer', sdp: answer })
          console.log('📨 Sent answer')
          break

        case 'answer':
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp))
          console.log('✅ Answer received and set')
          break

        case 'ice-candidate':
          if (signal.candidate) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate))
            console.log('🧊 Added ICE candidate')
          }
          break

        default:
          console.warn('⚠️ Unknown signal type:', signal.type)
      }
    } catch (error) {
      console.error('❌ Error handling signal:', error)
    }
  }

  /**
   * Set up real-time signaling channel using Supabase
   */
  setupSignalingChannel() {
    // Listen for signaling messages
    this.signalingChannel = supabase
      .channel(`call:${this.callId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'call_signals',
          filter: `call_id=eq.${this.callId}`
        }, 
        (payload) => {
          console.log('📡 Received signal:', payload.new.signal_type)
          this.handleSignal(payload.new.signal_data)
        }
      )
      .subscribe()
  }

  /**
   * Send signaling message through database
   */
  async sendSignal(signal) {
    try {
      await supabase
        .from('call_signals')
        .insert({
          call_id: this.callId,
          signal_type: signal.type,
          signal_data: signal,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('❌ Failed to send signal:', error)
    }
  }

  /**
   * End the call
   */
  async endCall(reason = 'ended') {
    try {
      if (this.callId) {
        await supabase
          .from('calls')
          .update({ 
            status: reason,
            ended_at: new Date().toISOString()
          })
          .eq('id', this.callId)
      }

      this.cleanup()
      console.log('📴 Call ended:', reason)
    } catch (error) {
      console.error('❌ Error ending call:', error)
      this.cleanup()
    }
  }

  /**
   * Toggle audio mute
   */
  toggleAudio(mute) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !mute
      })
      return !mute
    }
    return false
  }

  /**
   * Toggle video
   */
  toggleVideo(enable) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enable
      })
      return enable
    }
    return false
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    // Stop remote stream
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop())
      this.remoteStream = null
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    // Unsubscribe from signaling channel
    if (this.signalingChannel) {
      this.signalingChannel.unsubscribe()
      this.signalingChannel = null
    }

    this.callId = null
    this.isInitiator = false
  }

  /**
   * Get remote stream
   */
  getRemoteStream() {
    return this.remoteStream
  }

  /**
   * Get local stream
   */
  getLocalStream() {
    return this.localStream
  }
}

// Export singleton instance
export const webrtcService = new WebRTCService()

/**
 * Helper function to initiate a phone call using system dialer
 */
export function initiatePhoneCall(phoneNumber) {
  if (!phoneNumber) {
    throw new Error('Phone number is required')
  }

  // Format phone number (remove spaces, dashes)
  const cleanNumber = phoneNumber.replace(/[\s-]/g, '')

  // Create tel: link
  window.location.href = `tel:${cleanNumber}`
  
  console.log('📱 Initiating phone call to:', cleanNumber)
}
