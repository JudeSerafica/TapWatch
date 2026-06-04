import { FiShield, FiCheckCircle, FiStar, FiAward } from 'react-icons/fi'
import { BADGE_CONFIG } from '../lib/userVerification'

export default function UserVerificationBadge({ badgeLevel, score, size = 'normal', showTooltip = true }) {
  const badgeInfo = BADGE_CONFIG[badgeLevel] || BADGE_CONFIG.newcomer

  const sizes = {
    small: {
      container: 20,
      icon: 12,
      fontSize: 10,
    },
    normal: {
      container: 24,
      icon: 14,
      fontSize: 12,
    },
    large: {
      container: 32,
      icon: 18,
      fontSize: 14,
    },
  }

  const config = sizes[size] || sizes.normal

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
      title={showTooltip ? `${badgeInfo.label} - ${badgeInfo.description} (Score: ${score})` : ''}
    >
      <div
        style={{
          width: config.container,
          height: config.container,
          borderRadius: '50%',
          background: `${badgeInfo.color}15`,
          border: `2px solid ${badgeInfo.color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: config.fontSize,
        }}
      >
        {badgeInfo.icon}
      </div>
      {size !== 'small' && (
        <span
          style={{
            fontSize: config.fontSize,
            fontWeight: 600,
            color: badgeInfo.color,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {badgeInfo.label}
        </span>
      )}
    </div>
  )
}
