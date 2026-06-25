import { FiPhone, FiVideo, FiX } from 'react-icons/fi'
import { MdCall, MdSmartphone } from 'react-icons/md'

/**
 * Call Options Modal - Choose between Phone Call or In-App Call
 */
export default function CallOptionsModal({ isOpen, onClose, recipient, onSelectOption }) {
  if (!isOpen) return null

  const handleOptionClick = (callType, isVideo = false) => {
    onSelectOption(callType, isVideo)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9998,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(8px)',
      padding: 16,
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        maxWidth: 420,
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        animation: 'scaleIn 0.3s ease',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          padding: '24px',
          position: 'relative',
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseLeave={e => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            <FiX size={18} />
          </button>

          <div style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 24,
            fontWeight: 700,
            color: '#fff',
          }}>
            {recipient?.name?.[0]?.toUpperCase() || '?'}
          </div>

          <h2 style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: '#fff',
            fontFamily: "'DM Sans', sans-serif",
            textAlign: 'center',
          }}>
            Call {recipient?.name}
          </h2>

          {recipient?.phone && (
            <p style={{
              margin: '4px 0 0',
              fontSize: 14,
              color: 'rgba(255, 255, 255, 0.8)',
              textAlign: 'center',
            }}>
              {recipient.phone}
            </p>
          )}
        </div>

        {/* Call Options */}
        <div style={{ padding: '24px' }}>
          <p style={{
            margin: '0 0 20px',
            fontSize: 14,
            color: '#64748b',
            fontWeight: 500,
            textAlign: 'center',
          }}>
            Choose how you want to call
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Phone Call Option */}
            <button
              onClick={() => handleOptionClick('phone')}
              disabled={!recipient?.phone}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                borderRadius: 12,
                border: '2px solid #e5e7eb',
                background: recipient?.phone ? '#fff' : '#f9fafb',
                cursor: recipient?.phone ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                fontFamily: "'DM Sans', sans-serif",
                opacity: recipient?.phone ? 1 : 0.5,
              }}
              onMouseEnter={e => {
                if (recipient?.phone) {
                  e.target.style.borderColor = '#22c55e'
                  e.target.style.background = '#f0fdf4'
                }
              }}
              onMouseLeave={e => {
                e.target.style.borderColor = '#e5e7eb'
                e.target.style.background = recipient?.phone ? '#fff' : '#f9fafb'
              }}
            >
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <MdSmartphone size={24} color="#fff" />
              </div>

              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 2 }}>
                  Phone Call
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  {recipient?.phone ? 'Use cellular network' : 'No phone number available'}
                </div>
              </div>

              <FiPhone size={20} color="#22c55e" />
            </button>

            {/* In-App Voice Call Option */}
            <button
              onClick={() => handleOptionClick('app', false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                borderRadius: 12,
                border: '2px solid #e5e7eb',
                background: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={e => {
                e.target.style.borderColor = '#3b82f6'
                e.target.style.background = '#eff6ff'
              }}
              onMouseLeave={e => {
                e.target.style.borderColor = '#e5e7eb'
                e.target.style.background = '#fff'
              }}
            >
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <MdCall size={24} color="#fff" />
              </div>

              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 600, 
                  color: '#111827', 
                  marginBottom: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  In-App Voice Call
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: '#dbeafe',
                    color: '#2563eb',
                    fontSize: 10,
                    fontWeight: 700,
                  }}>
                    FREE
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  High quality voice call
                </div>
              </div>

              <FiPhone size={20} color="#3b82f6" />
            </button>

            {/* In-App Video Call Option */}
            <button
              onClick={() => handleOptionClick('app', true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                borderRadius: 12,
                border: '2px solid #e5e7eb',
                background: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={e => {
                e.target.style.borderColor = '#7c3aed'
                e.target.style.background = '#f5f3ff'
              }}
              onMouseLeave={e => {
                e.target.style.borderColor = '#e5e7eb'
                e.target.style.background = '#fff'
              }}
            >
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <FiVideo size={24} color="#fff" />
              </div>

              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 600, 
                  color: '#111827', 
                  marginBottom: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  In-App Video Call
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: '#f3e8ff',
                    color: '#7c3aed',
                    fontSize: 10,
                    fontWeight: 700,
                  }}>
                    FREE
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  Face-to-face video call
                </div>
              </div>

              <FiVideo size={20} color="#7c3aed" />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from { 
            opacity: 0; 
            transform: scale(0.95) translateY(10px);
          }
          to { 
            opacity: 1; 
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
