import { Droplets, ShieldAlert, Flame, Waves, Volume2 } from 'lucide-react'

const config = {
  crime: { icon: ShieldAlert, color: 'text-purple-600', bg: 'bg-purple-50' },
  accident: { icon: Droplets, color: 'text-orange-500', bg: 'bg-orange-50' },
  fire: { icon: Flame, color: 'text-red-500', bg: 'bg-red-50' },
  flood: { icon: Waves, color: 'text-blue-500', bg: 'bg-blue-50' },
  disturbance: { icon: Volume2, color: 'text-yellow-600', bg: 'bg-yellow-50' },
}

export default function IncidentIcon({ type, size = 16 }) {
  const c = config[type?.toLowerCase()] || config.disturbance
  const Icon = c.icon
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${c.bg}`}>
      <Icon size={size} className={c.color} />
    </span>
  )
}

export function IncidentTypeLabel({ type }) {
  const c = config[type?.toLowerCase()] || config.disturbance
  const Icon = c.icon
  return (
    <span className="inline-flex items-center gap-2 text-sm text-gray-700">
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${c.bg}`}>
        <Icon size={14} className={c.color} />
      </span>
      <span className="capitalize">{type}</span>
    </span>
  )
}
