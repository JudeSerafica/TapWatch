import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { webrtcService, initiatePhoneCall } from '../lib/webrtcService'
import { useAuth } from '../context/useAuth'

/**
 * Custom Hook for Managing Calls
 * Handles both phone calls and in-app WebRTC calls
 */
export function useCallManager() {
  const { profile } = useAuth()
  const [activeCall, setActiveCall] = useState(null)
  const [incomingCall, setIncomingCall] = useState(null)
  const [callState, setCallState] = useState('idle') // idle, calling, ringing, active
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [error, setError] = useState(null)

  /**
   * Listen for incoming calls
   */
  useEffect(() => {
    if (!profile?.id) return

    console.log('📡 Listening for incoming calls...')

    const callsChannel = supabase
      .channel('incoming-calls')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `callee_id=eq.${profile.id}`
        },
        async (payload) => {
          const call = payload.new
          console.log('📞 Incoming call:', call)

          if (call.status === 'ringing') {
            // Fetch caller details
            const { data: callerData } = await supabase
              .from('profiles')
              .select('full_name, phone')
              .eq('id', call.caller_id)
              .single()

            setIncomingCall({
              id: call.id,
              callerId: call.caller_id,
              callerName: callerData?.full_name || 'Unknown',
              callerPhone: callerData?.phone,
              callType: call.call_type,
              isVideo: call.is_video,
            })

            setCallState('ringing')

            // Play ringtone (you can add audio element here)
            playRingtone()
          }
        }
      )
      .subscribe()

    return () => {
      callsChannel.unsubscribe()
    }
  }, [profile?.id])

  /**
   * Listen for call status changes (for active calls)
   */
  useEffect(() => {
    if (!activeCall?.id) return

    const callStatusChannel = supabase
      .channel(`call-status:${activeCall.id}`)
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `id=eq.${activeCall.id}`
        },
        (payload) => {
          const updatedCall = payload.new
          console.log('🔄 Call status updated:', updatedCall.status)

          if (updatedCall.status === 'ended' || updatedCall.status === 'declined') {
            handleCallEnd()
          }
        }
      )
      .subscribe()

    return () => {
      callStatusChannel.unsubscribe()
    }
  }, [activeCall?.id])

  /**
   * Initiate a call
   */
  const initiateCall = useCallback(async (recipientId, recipientName, recipientPhone, callType, isVideo = false) => {
    try {
      setError(null)
      setCallState('calling')

      if (callType === 'phone') {
        // Phone call - use system dialer
        if (!recipientPhone) {
          throw new Error('Phone number not available')
        }

        initiatePhoneCall(recipientPhone)

        // Record phone call in database
        const { data: callData, error: callError } = await supabase
          .from('calls')
          .insert({
            caller_id: profile.id,
            callee_id: recipientId,
            call_type: 'phone',
            is_video: false,
            status: 'active', // Phone calls are immediately active
            started_at: new Date().toISOString(),
            answered_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (callError) throw callError

        setActiveCall({
          id: callData.id,
          calleeId: recipientId,
          calleeName: recipientName,
          calleePhone: recipientPhone,
          callType: 'phone',
          isVideo: false,
        })

        setCallState('active')

      } else {
        // In-app call - use WebRTC
        const { callId, localStream: stream } = await webrtcService.startCall(
          recipientId,
          !isVideo,
          'app'
        )

        setLocalStream(stream)

        setActiveCall({
          id: callId,
          calleeId: recipientId,
          calleeName: recipientName,
          calleePhone: recipientPhone,
          callType: 'app',
          isVideo: isVideo,
        })

        // Listen for remote stream
        const checkRemoteStream = setInterval(() => {
          const remote = webrtcService.getRemoteStream()
          if (remote && remote.getTracks().length > 0) {
            setRemoteStream(remote)
            setCallState('active')
            clearInterval(checkRemoteStream)
          }
        }, 500)

        // Timeout after 30 seconds
        setTimeout(() => {
          clearInterval(checkRemoteStream)
          if (callState !== 'active') {
            handleCallEnd('no-answer')
          }
        }, 30000)
      }

      console.log('✅ Call initiated successfully')
    } catch (err) {
      console.error('❌ Failed to initiate call:', err)
      setError(err.message)
      setCallState('idle')
      setActiveCall(null)
    }
  }, [profile?.id, callState])

  /**
   * Answer incoming call
   */
  const answerCall = useCallback(async () => {
    try {
      if (!incomingCall) return

      setError(null)
      stopRingtone()

      if (incomingCall.callType === 'app') {
        // Answer WebRTC call
        const { localStream: stream } = await webrtcService.answerCall(
          incomingCall.id,
          !incomingCall.isVideo
        )

        setLocalStream(stream)
        setActiveCall(incomingCall)
        setIncomingCall(null)
        setCallState('active')

        // Listen for remote stream
        const checkRemoteStream = setInterval(() => {
          const remote = webrtcService.getRemoteStream()
          if (remote && remote.getTracks().length > 0) {
            setRemoteStream(remote)
            clearInterval(checkRemoteStream)
          }
        }, 500)

      } else {
        // Phone call answered (just update UI)
        setActiveCall(incomingCall)
        setIncomingCall(null)
        setCallState('active')

        await supabase
          .from('calls')
          .update({
            status: 'active',
            answered_at: new Date().toISOString()
          })
          .eq('id', incomingCall.id)
      }

      console.log('✅ Call answered')
    } catch (err) {
      console.error('❌ Failed to answer call:', err)
      setError(err.message)
      handleCallEnd('failed')
    }
  }, [incomingCall])

  /**
   * Decline incoming call
   */
  const declineCall = useCallback(async () => {
    try {
      if (!incomingCall) return

      stopRingtone()

      await supabase
        .from('calls')
        .update({ status: 'declined', ended_at: new Date().toISOString() })
        .eq('id', incomingCall.id)

      setIncomingCall(null)
      setCallState('idle')

      console.log('❌ Call declined')
    } catch (err) {
      console.error('❌ Failed to decline call:', err)
    }
  }, [incomingCall])

  /**
   * End active call
   */
  const endCall = useCallback(async () => {
    await handleCallEnd('ended')
  }, [activeCall])

  /**
   * Handle call end
   */
  const handleCallEnd = async (reason = 'ended') => {
    try {
      if (activeCall?.callType === 'app') {
        await webrtcService.endCall(reason)
      }

      if (activeCall?.id) {
        await supabase
          .from('calls')
          .update({
            status: reason,
            ended_at: new Date().toISOString()
          })
          .eq('id', activeCall.id)
      }

      // Cleanup
      setLocalStream(null)
      setRemoteStream(null)
      setActiveCall(null)
      setCallState('idle')

      console.log('📴 Call ended:', reason)
    } catch (err) {
      console.error('❌ Error ending call:', err)
    }
  }

  /**
   * Get call history
   */
  const getCallHistory = useCallback(async (limit = 50) => {
    try {
      const { data, error } = await supabase
        .from('call_history')
        .select(`
          *,
          other_user:other_user_id (
            full_name,
            phone
          )
        `)
        .eq('user_id', profile.id)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data
    } catch (err) {
      console.error('❌ Failed to fetch call history:', err)
      return []
    }
  }, [profile?.id])

  /**
   * Ringtone functions
   */
  const playRingtone = () => {
    // You can add actual audio playback here
    console.log('🔔 Playing ringtone...')
  }

  const stopRingtone = () => {
    console.log('🔕 Stopping ringtone...')
  }

  return {
    // State
    activeCall,
    incomingCall,
    callState,
    localStream,
    remoteStream,
    error,

    // Actions
    initiateCall,
    answerCall,
    declineCall,
    endCall,
    getCallHistory,
  }
}
