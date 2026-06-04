import { useState, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { i18n } from '../lib/i18n'

export default function LanguageSwitch() {
  const [language, setLanguage] = useState(i18n.getLanguage())
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const unsubscribe = i18n.subscribe((newLang) => {
      setLanguage(newLang)
    })
    return unsubscribe
  }, [])

  const handleLanguageChange = (lang) => {
    i18n.setLanguage(lang)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
        title="Change Language"
      >
        <Globe size={18} />
        <span className="hidden md:inline">
          {language === 'en' ? 'EN' : 'TL'}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border z-20 overflow-hidden">
            <div className="py-2">
              <button
                onClick={() => handleLanguageChange('en')}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition flex items-center justify-between ${
                  language === 'en' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
                }`}
              >
                <span>English</span>
                {language === 'en' && (
                  <span className="text-xs">✓</span>
                )}
              </button>

              <button
                onClick={() => handleLanguageChange('tl')}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition flex items-center justify-between ${
                  language === 'tl' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
                }`}
              >
                <span>Tagalog</span>
                {language === 'tl' && (
                  <span className="text-xs">✓</span>
                )}
              </button>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-gray-50 border-t">
              <p className="text-xs text-gray-500 text-center">
                {language === 'en' 
                  ? 'Select your preferred language' 
                  : 'Piliin ang iyong wika'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
