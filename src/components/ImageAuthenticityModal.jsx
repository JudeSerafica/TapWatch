import { FiX, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi'

/**
 * Modal that shows image authenticity check results
 * Displays immediately after AI analyzes an uploaded image
 */
export default function ImageAuthenticityModal({ isOpen, onClose, authenticity }) {
  console.log('🎭 ImageAuthenticityModal render:', { isOpen, hasAuthenticity: !!authenticity })
  
  if (!isOpen || !authenticity) return null

  console.log('✅ Modal rendering with authenticity data:', authenticity)

  const isAuthentic = authenticity.isAuthentic
  const confidence = Math.round(authenticity.confidence * 100)

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ animation: 'fadeIn 0.2s ease' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ animation: 'scaleIn 0.3s ease' }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{
            background: isAuthentic
              ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
              : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
          }}
        >
          <div className="flex items-center gap-3">
            {isAuthentic ? (
              <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
                <FiCheckCircle size={24} color="white" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-yellow-600 flex items-center justify-center animate-pulse">
                <FiAlertTriangle size={24} color="white" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold" style={{ color: isAuthentic ? '#065f46' : '#92400e' }}>
                {isAuthentic ? '✅ Authentic Image' : '⚠️ Suspicious Image'}
              </h3>
              <p className="text-sm" style={{ color: isAuthentic ? '#047857' : '#78350f' }}>
                Confidence: {confidence}%
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 transition"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isAuthentic ? (
            // AUTHENTIC IMAGE
            <div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-900 font-semibold mb-2">
                  ✅ Image Verified as Real
                </p>
                <p className="text-xs text-green-700">
                  {authenticity.reasoning}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-600">Detection Type:</span>
                  <span className="text-xs font-bold text-gray-900 uppercase">
                    {authenticity.imageSource?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600">AI Confidence:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-600 rounded-full transition-all"
                        style={{ width: `${confidence}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-green-700">{confidence}%</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  Your image appears to be an authentic photograph
                </p>
              </div>
            </div>
          ) : (
            // FAKE/SUSPICIOUS IMAGE
            <div>
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-900 font-bold mb-2">
                  ⚠️ Image May Not Be Authentic
                </p>
                <p className="text-xs text-yellow-800 mb-3">
                  {authenticity.reasoning}
                </p>

                {authenticity.warnings.length > 0 && (
                  <div className="space-y-1">
                    {authenticity.warnings.map((warning, idx) => (
                      <div key={idx} className="text-xs text-yellow-900 flex items-start gap-2">
                        <span>•</span>
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Detection Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-600">Detected As:</span>
                  <span className="text-xs font-bold text-red-700 uppercase">
                    {authenticity.imageSource?.replace('_', ' ')}
                  </span>
                </div>

                {authenticity.indicators && authenticity.indicators.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs font-semibold text-gray-600 block mb-1">
                      Fakeness Indicators:
                    </span>
                    <div className="space-y-1">
                      {authenticity.indicators.map((indicator, idx) => (
                        <div key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                          <span className="text-red-500">▸</span>
                          <span>{indicator}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600">Detection Confidence:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-600 rounded-full transition-all"
                        style={{ width: `${confidence}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-yellow-700">{confidence}%</span>
                  </div>
                </div>
              </div>

              {/* Warning Box */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-xs text-red-900 font-semibold mb-1">
                  📋 What This Means:
                </p>
                <p className="text-xs text-red-800">
                  • Your report will be flagged for manual review by admin
                  <br />
                  • You can still submit, but verification may be required
                  <br />
                  • Consider uploading an original photo taken at the scene
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-lg font-semibold text-sm transition-all"
            style={{
              background: isAuthentic
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            {isAuthentic ? 'Continue with Report' : 'I Understand, Continue'}
          </button>
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
            transform: scale(0.9) translateY(20px);
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
