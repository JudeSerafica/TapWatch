import { useState } from 'react'
import { Shield, X } from 'lucide-react'

const sections = [
  {
    number: '1',
    title: 'Account Verification',
    content: [
      'To help ensure that Tap-Watch is used by legitimate residents and authorized users, you may be required to submit a valid identification document for account verification.',
      'The submitted ID will be reviewed by an authorized Tap-Watch administrator for the purpose of verifying your identity and eligibility to use the system.',
      'Accounts may be rejected if the submitted information or document is incomplete, invalid, altered, unreadable, misleading, or cannot be reasonably verified.',
    ],
  },
  {
    number: '2',
    title: 'Collection of Personal Information',
    content: [
      'During registration and verification, Tap-Watch may collect information such as your name, contact information, account information, and identification document submitted for verification.',
      'Only information that is necessary and relevant to the stated purpose of account verification should be collected and processed.',
    ],
  },
  {
    number: '3',
    title: 'Purpose of Processing',
    intro: 'Your personal information and identification document may be processed for the following purposes:',
    bullets: [
      'Verifying your identity and account eligibility;',
      'Preventing fraudulent, duplicate, or unauthorized accounts;',
      'Maintaining the security and integrity of the Tap-Watch system;',
      'Facilitating legitimate access to Tap-Watch services; and',
      'Complying with applicable laws, regulations, and lawful requests from authorized authorities.',
    ],
    outro: 'Your identification document will not be used for purposes unrelated to account verification without an appropriate lawful basis.',
  },
  {
    number: '4',
    title: 'Confidentiality and Access',
    content: [
      'Your submitted identification document and personal information are confidential and shall only be accessible to authorized personnel who require access for verification, administration, security, or other legitimate purposes.',
      'Your identification document will not be publicly displayed through the Tap-Watch system and should not be disclosed to unauthorized individuals.',
    ],
  },
  {
    number: '5',
    title: 'Data Security',
    content: [
      'Tap-Watch will implement reasonable organizational, physical, and technical measures intended to protect your personal information against unauthorized access, disclosure, alteration, loss, or misuse.',
      'However, no electronic system can guarantee absolute security. Users are also responsible for protecting their account credentials and immediately reporting suspected unauthorized access.',
    ],
  },
  {
    number: '6',
    title: 'Data Retention',
    content: [
      'Your personal information and verification document will be retained only for as long as reasonably necessary to fulfill the purposes for which they were collected, subject to applicable policies and legal requirements.',
      'When the information is no longer necessary, it should be securely deleted, disposed of, or anonymized in accordance with the applicable retention policy.',
    ],
  },
  {
    number: '7',
    title: 'User Responsibilities',
    intro: 'By submitting an identification document, you confirm that:',
    bullets: [
      'The information you provide is true and accurate;',
      'The identification document belongs to you or you are legally authorized to submit it;',
      'The document has not been intentionally altered or falsified;',
      'You will not upload another person\'s identification document without lawful authority; and',
      'You will use Tap-Watch only for legitimate purposes.',
    ],
    outro: 'Submitting false or fraudulent information may result in account rejection, suspension, or other appropriate action.',
  },
  {
    number: '8',
    title: 'Your Data Privacy Rights',
    content: [
      'Under applicable Philippine data protection laws, you may have rights regarding your personal information, including the right to be informed, access your personal information, request correction of inaccurate information, and object to certain processing activities, subject to applicable laws and limitations.',
      'For privacy-related concerns or requests, please contact the designated Tap-Watch/Barangay data privacy contact.',
    ],
  },
  {
    number: '9',
    title: 'Consent and Agreement',
    content: [
      'By selecting "I Agree & Continue," you acknowledge that you have read and understood this Terms of Use & Data Privacy Notice and consent to the collection and processing of your personal information and submitted identification document for the purposes described above, where consent is the applicable legal basis.',
      'You understand that your account may not be approved if the required verification information is not provided or cannot be reasonably verified.',
    ],
  },
]

export default function TermsOfUseModal({ onAccept, onCancel }) {
  const [checked, setChecked] = useState(false)

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* ── HEADER ── */}
        <div className="relative flex items-start gap-4 px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex-shrink-0 w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div className="flex-1 pr-6">
            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              Terms of Use &amp; Data Privacy Notice
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tap-Watch – Barangay East Tapinac
            </p>
          </div>
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          >
            <X size={17} />
          </button>
        </div>

        {/* ── INTRO ── */}
        <div className="px-6 pt-4 pb-2 flex-shrink-0">
          <p className="text-sm text-gray-600 leading-relaxed">
            Before creating and using your Tap-Watch account, please read and understand the following
            terms regarding account verification and the processing of your personal information.
          </p>
        </div>

        {/* ── SCROLLABLE SECTIONS ── */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">
          {sections.map((sec) => (
            <div key={sec.number}>
              {/* Section heading */}
              <div className="flex items-center gap-2 mb-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  {sec.number}
                </span>
                <h3 className="text-sm font-semibold text-gray-900">{sec.title}</h3>
              </div>

              {/* Paragraphs */}
              {sec.content && sec.content.map((para, i) => (
                <p key={i} className="text-sm text-gray-600 leading-relaxed mb-2 pl-8">
                  {para}
                </p>
              ))}

              {/* Intro + bullets + outro */}
              {sec.intro && (
                <p className="text-sm text-gray-600 leading-relaxed mb-1 pl-8">{sec.intro}</p>
              )}
              {sec.bullets && (
                <ul className="pl-10 mb-2 space-y-1">
                  {sec.bullets.map((b, i) => (
                    <li key={i} className="text-sm text-gray-600 leading-relaxed list-disc">
                      {b}
                    </li>
                  ))}
                </ul>
              )}
              {sec.outro && (
                <p className="text-sm text-gray-600 leading-relaxed pl-8">{sec.outro}</p>
              )}
            </div>
          ))}
        </div>

        {/* ── FOOTER ── */}
        <div className="px-6 pt-4 pb-6 border-t border-gray-100 bg-gray-50/70 space-y-4 flex-shrink-0">
          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
            <span className="text-sm text-gray-700 leading-snug">
              I have read, understood, and agree to the{' '}
              <span className="font-semibold text-blue-600">
                Terms of Use &amp; Data Privacy Notice
              </span>
              .
            </span>
          </label>

          {/* Buttons */}
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
              I Agree &amp; Continue
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
