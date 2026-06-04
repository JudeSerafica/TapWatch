import { useState, useEffect } from 'react'
import { Phone, Mail, User, X, AlertCircle, Shield } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function EmergencyHotline() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState('emergency') // 'emergency' or 'officials'

  // Emergency hotline numbers
  const emergencyNumbers = [
    {
      id: 1,
      name: 'National Emergency Hotline',
      number: '911',
      description: 'Police, Fire, Medical Emergency',
      icon: '🚨',
      color: 'red'
    },
    {
      id: 2,
      name: 'PNP Hotline',
      number: '117',
      description: 'Philippine National Police',
      icon: '👮',
      color: 'blue'
    },
    {
      id: 3,
      name: 'NDRRMC',
      number: '(02) 8911-1406',
      description: 'Disaster Response',
      icon: '🆘',
      color: 'orange'
    },
    {
      id: 4,
      name: 'Red Cross',
      number: '143',
      description: 'Emergency Medical Services',
      icon: '🏥',
      color: 'red'
    },
    {
      id: 5,
      name: 'BFP Fire Emergency',
      number: '(02) 8426-0219',
      description: 'Bureau of Fire Protection',
      icon: '🚒',
      color: 'orange'
    },
    {
      id: 6,
      name: 'Coast Guard',
      number: '(02) 8527-8481',
      description: 'Maritime Emergency',
      icon: '⚓',
      color: 'blue'
    }
  ]

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

      {/* Full Contacts Modal with Tabs */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Emergency Contacts</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              <button
                onClick={() => setActiveTab('emergency')}
                className={`flex-1 px-6 py-3 text-sm font-medium transition ${
                  activeTab === 'emergency'
                    ? 'text-red-600 border-b-2 border-red-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <AlertCircle size={18} />
                  Emergency Hotlines
                </div>
              </button>
              <button
                onClick={() => setActiveTab('officials')}
                className={`flex-1 px-6 py-3 text-sm font-medium transition ${
                  activeTab === 'officials'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Shield size={18} />
                  Barangay Officials
                </div>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Emergency Numbers Tab */}
              {activeTab === 'emergency' && (
                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-red-800 font-medium">
                      🚨 For life-threatening emergencies, call 911 immediately
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {emergencyNumbers.map((emergency) => (
                      <a
                        key={emergency.id}
                        href={`tel:${emergency.number}`}
                        className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-red-300 hover:shadow-md transition group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-3xl">{emergency.icon}</div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 text-sm mb-1">
                              {emergency.name}
                            </h4>
                            <p className="text-xs text-gray-600 mb-2">
                              {emergency.description}
                            </p>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                              <Phone size={14} className="text-red-600" />
                              <span className="text-sm font-bold text-red-600">
                                {emergency.number}
                              </span>
                            </div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Barangay Officials Tab */}
              {activeTab === 'officials' && (
                <div>
                  {loading ? (
                    <div className="text-center py-12 text-gray-500">
                      Loading contacts...
                    </div>
                  ) : contacts.length === 0 ? (
                    <div className="text-center py-12">
                      <User size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">No barangay officials available</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {contacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                        >
                          <div className="flex flex-col items-center text-center mb-3">
                            {contact.photo_url ? (
                              <img
                                src={contact.photo_url}
                                alt={contact.name}
                                className="w-20 h-20 rounded-full object-cover mb-3 border-2 border-gray-200"
                              />
                            ) : (
                              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-3 border-2 border-gray-200">
                                <User size={32} className="text-blue-600" />
                              </div>
                            )}
                            <h4 className="font-bold text-gray-900">{contact.name}</h4>
                            <p className="text-sm text-blue-600 font-medium">{contact.position}</p>
                          </div>

                          <div className="space-y-2">
                            <a
                              href={`tel:${contact.phone}`}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-green-50 hover:border-green-300 transition"
                            >
                              <Phone size={16} className="text-green-600" />
                              {contact.phone}
                            </a>
                            {contact.email && (
                              <a
                                href={`mailto:${contact.email}`}
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition"
                              >
                                <Mail size={16} className="text-blue-600" />
                                <span className="truncate">{contact.email}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
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
