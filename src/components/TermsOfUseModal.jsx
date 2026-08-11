import { useState } from 'react'
import { X, Shield, Home, CreditCard, Lock, UserCheck } from 'lucide-react'

/**
 * TermsOfUseModal
 * Shows once to a new resident after their first login.
 * Acceptance is stored in localStorage so it never shows again on this device.
 */
export default function TermsOfUseModal({ onAccept, onCancel }) {
  const [checked, setChecked] = useState(false)

  const validIds = [
    { label: "Driver's License", emoji: '🪪' },
    { label: 'Passport', emoji: '📗' },
    { label: "Voter's ID", emoji: '🗳️' },
    { label: 'SSS ID', emoji: '🪪' },
    { label: 'Postal ID', emoji: '✉️' },
    { label: 'Barangay ID', emoji: '🏛️' },
  ]

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden">

        {/* ── HEADER ── */}
        <div className="relative px-6 pt-6 pb-4 border-b border-gray-100">
          {/* Close button — only dismisses to Cancel */}
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-4">
            {/* Icon cluster */}
            <div className="relative flex-shrink-0 w-16 h-16">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center border-2 border-white">
                <UserCheck size={12} className="text-white" />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">
                Terms of Use &<br />Resident Verification
              </h2>
              <p className="text-sm text-gray-500 mt-1 leading-snug">
                Your safety and trust are our priority.<br />
                Please read and agree to the terms below to continue.
              </p>
            </div>
          </div>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Why do we need your ID? */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <Home size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">Why do we need your ID?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                To ensure that Tap-Watch is used only by legitimate residents of Barangay East Tapinac,
                we require you to upload a valid identification document. This helps us verify your identity
                and residency before your account can be approved by the admin.
              </p>
            </div>
          </div>

          {/* Acceptable documents */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <CreditCard size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-sm mb-2">
                Examples of acceptable documents may include:
              </h3>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {validIds.map((id) => (
                  <div
                    key={id.label}
                    className="flex flex-col items-center gap-1 p-2 border border-gray-200 rounded-xl bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition"
                  >
                    <span className="text-2xl">{id.emoji}</span>
                    <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">
                      {id.label}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 flex items-start gap-1 mt-1">
                <span className="text-blue-500 font-bold flex-shrink-0">ℹ</span>
                Please upload a clear and readable photo or scanned copy of one (1) valid ID.
              </p>
            </div>
          </div>

          {/* How your information is used */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <Lock size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">How your information is used</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Your information will be used for identity and residency verification, preventing fake or
                duplicate accounts, and maintaining the security of the Tap-Watch system. Your ID will not
                be shared or displayed publicly and will only be accessible to authorized personnel.
              </p>
            </div>
          </div>

          {/* Account Approval */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <UserCheck size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">Account Approval</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                After you submit your ID, your account will be pending for review. You will be notified once
                your account has been approved or if additional verification is needed.
              </p>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="px-6 pt-4 pb-6 border-t border-gray-100 bg-gray-50/60 space-y-4">
          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
            <span className="text-sm text-gray-700 leading-snug">
              I confirm that I have read, understood, and agree to the{' '}
              <span className="text-blue-600 font-medium">Terms of Use and Resident Verification Policy</span>
              {' '}of Tap-Watch.
            </span>
          </label>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={onAccept}
              disabled={!checked}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              <Shield size={15} />
              Agree &amp; Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
