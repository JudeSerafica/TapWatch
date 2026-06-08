import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

export default function Toast({ message, type = 'success', duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      if (onClose) onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!isVisible) return null

  const bgColor = {
    success: 'bg-emerald-50 border-emerald-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  }[type]

  const textColor = {
    success: 'text-emerald-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
  }[type]

  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertCircle,
    info: Info,
  }[type]

  const iconColor = {
    success: 'text-emerald-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
  }[type]

  return (
    <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className={`${bgColor} border rounded-lg p-4 flex items-center gap-3 shadow-lg max-w-md`}>
        <Icon className={`${iconColor} flex-shrink-0`} size={20} />
        <span className={`${textColor} font-medium text-sm flex-1`}>{message}</span>
        <button
          onClick={() => setIsVisible(false)}
          className={`${textColor} hover:opacity-70 flex-shrink-0`}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}

// Hook for easier usage
export function useToast() {
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success', duration = 3000) => {
    setToast({ message, type, duration, key: Date.now() })
  }

  const hideToast = () => {
    setToast(null)
  }

  return { toast, showToast, hideToast }
}
