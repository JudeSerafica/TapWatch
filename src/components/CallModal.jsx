import { useState, useEffect, useRef } from 'react'
import { FiPhone, FiPhoneOff, FiMic, FiMicOff, FiVideo, FiVideoOff, FiX } from 'react-icons/fi'
import { MdCall, MdSmartphone } from 'react-icons/md'

/**
 * Call Modal Component - Handles both incoming and outgoing calls
 */
export default function CallModal({ 
  isOpen, 
  onClose, 
  callData, 
  onAnswer, 
  onDecline, 
  onEnd,
  isIncoming = false,
  localStream = null,
  remoteStream = null
}) {
  const [callStatus, setCallStatus] = useState(isIncoming ? 'ringing' : 'connecting')
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(callData?.isVideo || false)
  const [callDuration, setCallDuration] = useState(0)
  
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const timerRef = useRef(null)

  // Set up video streams
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream
      setCallStatus('active')
      
      // Start call timer
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [remoteStream])

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleToggleMute = () => {
    setIsMuted(!isMuted)
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted
      })
    }
  }

  const handleToggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled)
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled
      })
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.95)',
      backdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.3s ease',
    }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="call-modal-title"
    >
      <div style={{
        width: '100%',
        maxWidth: callStatus === 'active' && callData?.isVideo ? 900 : 480,
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        transition: 'all 0.3s ease',
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          aria-label="Close call"
          onMouseEnter={e => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={e => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
        >
          <FiX size={20} aria-hidden="true" />
        </button>

        {/* Video Call Interface */}
        {callStatus === 'active' && callData?.isVideo ? (
          <div style={{ position: 'relative', height: 600 }}>
            {/* Remote Video (Main) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                background: '#000',
              }}
            />

            {/* Local Video (Picture-in-Picture) */}
            <div style={{
              position: 'absolute',
              top: 16,
              left: 16,
              width: 200,
              height: 150,
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
            }}>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)', // Mirror local video
                }}
              />
            </div>

            {/* Call Info Overlay */}
            <div style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              padding: '8px 16px',
              borderRadius: 20,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
            }}>
              {formatDuration(callDuration)}
            </div>
          </div>
        ) : (
          /* Voice Call / Ringing Interface */
          <div style={{ padding: 48, textAlign: 'center' }}>
            {/* Avatar */}
            <div style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              animation: callStatus === 'ringing' ? 'pulse 2s ease-in-out infinite' : 'none',
            }}>
              {callData?.callerName?.[0]?.toUpperCase() || callData?.calleeName?.[0]?.toUpperCase() || '?'}
            </div>

            {/* Caller/Callee Name */}
            <h2 id="call-modal-title" style={{
              margin: '0 0 8px',
              fontSize: 28,
              fontWeight: 700,
              color: '#fff',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {isIncoming ? callData?.callerName : callData?.calleeName || 'Unknown'}
            </h2>

            {/* Call Status */}
            <p style={{
              margin: '0 0 32px',
              fontSize: 16,
              color: '#94a3b8',
              fontWeight: 500,
            }}>
              {callStatus === 'ringing' && isIncoming && (
                <>
                  <span style={{ fontSize: 24, marginRight: 8 }}>📞</span>
                  {callData?.isVideo ? 'Video' : 'Voice'} Call Incoming...
                </>
              )}
              {callStatus === 'ringing' && !isIncoming && 'Ringing...'}
              {callStatus === 'connecting' && 'Connecting...'}
              {callStatus === 'active' && formatDuration(callDuration)}
            </p>

            {/* Call Type Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 20,
              background: callData?.callType === 'app' 
                ? 'rgba(59, 130, 246, 0.2)' 
                : 'rgba(34, 197, 94, 0.2)',
              border: `1px solid ${callData?.callType === 'app' ? '#3b82f6' : '#22c55e'}`,
              color: callData?.callType === 'app' ? '#60a5fa' : '#4ade80',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 32,
            }}>
              {callData?.callType === 'app' ? <MdCall size={14} /> : <MdSmartphone size={14} />}
              {callData?.callType === 'app' ? 'In-App Call' : 'Phone Call'}
            </div>

            {/* Hidden video elements for voice calls */}
            {callStatus === 'active' && !callData?.isVideo && (
              <div style={{ display: 'none' }}>
                <video ref={localVideoRef} autoPlay playsInline muted />
                <video ref={remoteVideoRef} autoPlay playsInline />
              </div>
            )}
          </div>
        )}

        {/* Call Controls */}
        <div style={{
          padding: 24,
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}>
          {/* Incoming Call Buttons */}
          {isIncoming && callStatus === 'ringing' && (
            <>
              <button
                onClick={onDecline}
                style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: '#ef4444', border: 'none', color: '#fff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', transition: 'all 0.2s',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                }}
                aria-label="Decline call"
                onMouseEnter={e => e.target.style.transform = 'scale(1.1)'}
                onMouseLeave={e => e.target.style.transform = 'scale(1)'}
              >
                <FiPhoneOff size={24} aria-hidden="true" />
              </button>

              <button
                onClick={onAnswer}
                style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: '#22c55e', border: 'none', color: '#fff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', transition: 'all 0.2s',
                  boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
                aria-label="Answer call"
                onMouseEnter={e => e.target.style.transform = 'scale(1.1)'}
                onMouseLeave={e => e.target.style.transform = 'scale(1)'}
              >
                <FiPhone size={24} aria-hidden="true" />
              </button>
            </>
          )}

          {/* Active Call Controls */}
          {callStatus === 'active' && (
            <>
              {/* Mute Button */}
              <button
                onClick={handleToggleMute}
                style={{
                  width: 50, height: 50, borderRadius: '50%',
                  background: isMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.1)',
                  border: 'none', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                aria-pressed={isMuted}
                onMouseEnter={e => e.target.style.background = isMuted ? '#dc2626' : 'rgba(255, 255, 255, 0.2)'}
                onMouseLeave={e => e.target.style.background = isMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}
              >
                {isMuted ? <FiMicOff size={20} aria-hidden="true" /> : <FiMic size={20} aria-hidden="true" />}
              </button>

              {/* Video Toggle (if video call) */}
              {callData?.isVideo && (
                <button
                  onClick={handleToggleVideo}
                  style={{
                    width: 50, height: 50, borderRadius: '50%',
                    background: !isVideoEnabled ? '#ef4444' : 'rgba(255, 255, 255, 0.1)',
                    border: 'none', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                  aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                  aria-pressed={!isVideoEnabled}
                  onMouseEnter={e => e.target.style.background = !isVideoEnabled ? '#dc2626' : 'rgba(255, 255, 255, 0.2)'}
                  onMouseLeave={e => e.target.style.background = !isVideoEnabled ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}
                >
                  {isVideoEnabled ? <FiVideo size={20} aria-hidden="true" /> : <FiVideoOff size={20} aria-hidden="true" />}
                </button>
              )}

              {/* End Call Button */}
              <button
                onClick={onEnd}
                style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: '#ef4444', border: 'none', color: '#fff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', transition: 'all 0.2s',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                }}
                aria-label="End call"
                onMouseEnter={e => e.target.style.transform = 'scale(1.1)'}
                onMouseLeave={e => e.target.style.transform = 'scale(1)'}
              >
                <FiPhoneOff size={24} aria-hidden="true" />
              </button>
            </>
          )}

          {/* Connecting/Outgoing Call - End Button Only */}
          {(callStatus === 'connecting' || (callStatus === 'ringing' && !isIncoming)) && (
            <button
              onClick={onEnd}
              style={{
                width: 60, height: 60, borderRadius: '50%',
                background: '#ef4444', border: 'none', color: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', transition: 'all 0.2s',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
              }}
              aria-label="Cancel call"
              onMouseEnter={e => e.target.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.target.style.transform = 'scale(1)'}
            >
              <FiPhoneOff size={24} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  )
}
