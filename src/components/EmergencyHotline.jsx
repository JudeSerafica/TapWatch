import { useState, useEffect } from 'react'
import { Phone, Mail, User, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function EmergencyHotline() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (error) throw error
      setContacts(data || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-4">Emergency Hotline</h3>
        <p className="text-sm text-gray-500">Loading contacts...</p>
      </div>
    )
  }

  if (contacts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-4">Emergency Hotline</h3>
        <p className="text-sm text-gray-500">No emergency contacts available</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Emergency Hotline</h3>
          <button
            onClick={() => setShowModal(true)}
            className="text-sm text-blue-600 font-medium hover:text-blue-700"
          >
            View All
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {contacts.slice(0, 3).map((contact) => (
            <div key={contact.id} className="flex items-center gap-3">
              {contact.photo_url ? (
                <img
                  src={contact.photo_url}
                  alt={contact.name}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User size={20} className="text-blue-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{contact.name}</p>
                <p className="text-xs text-gray-500 truncate">{contact.position}</p>
              </div>
              <a
                href={`tel:${contact.phone}`}
                className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center hover:bg-green-200 transition"
                title={`Call ${contact.name}`}
              >
                <Phone size={18} className="text-green-600" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Full Contacts Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Barangay Emergency Contacts</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {contact.photo_url ? (
                        <img
                          src={contact.photo_url}
                          alt={contact.name}
                          className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <User size={24} className="text-blue-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900">{contact.name}</h4>
                        <p className="text-sm text-gray-600">{contact.position}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
                      >
                        <Phone size={16} className="text-green-600" />
                        {contact.phone}
                      </a>
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                          <Mail size={16} className="text-blue-600" />
                          {contact.email}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
