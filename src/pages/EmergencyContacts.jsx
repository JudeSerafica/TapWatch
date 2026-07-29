import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Phone, Mail, User, Save, X } from 'lucide-react'
import AdminMobileBottomNav from '../components/AdminMobileBottomNav'
import TopBar from '../components/TopBar'
import { supabase } from '../lib/supabase'
import { useCallManager } from '../hooks/useCallManager'
import CallOptionsModal from '../components/CallOptionsModal'
import CallModal from '../components/CallModal'

export default function EmergencyContacts() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [contactToDelete, setContactToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    phone: '',
    email: '',
    photo_url: '',
    is_active: true,
    position_type: '',
    position_index: null
  })

  // Predefined organizational structure
  const organizationalStructure = {
    punongBarangay: {
      title: 'PUNONG BARANGAY',
      color: 'blue',
      positions: ['Punong Barangay']
    },
    sanggunian: {
      title: 'SANGGUNIANG BARANGAY (KAGAWAD)',
      color: 'blue',
      positions: Array(7).fill('Barangay Kagawad')
    },
    officials: {
      skChairperson: {
        title: 'SK CHAIRPERSON',
        color: 'purple',
        position: 'SK Chairperson'
      },
      secretary: {
        title: 'BARANGAY SECRETARY',
        color: 'green',
        position: 'Barangay Secretary'
      },
      treasurer: {
        title: 'BARANGAY TREASURER',
        color: 'orange',
        position: 'Barangay Treasurer'
      },
      chiefTanod: {
        title: 'CHIEF TANOD',
        color: 'blue',
        position: 'Chief Tanod'
      }
    }
  }

  // Calling System Integration
  const [showCallOptions, setShowCallOptions] = useState(false)
  const [selectedContact, setSelectedContact] = useState(null)
  
  const {
    activeCall,
    incomingCall,
    localStream,
    remoteStream,
    initiateCall,
    answerCall,
    declineCall,
    endCall
  } = useCallManager()

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setContacts(data || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      // Only use the basic fields that exist in the database
      const dataToSave = {
        name: formData.name,
        position: formData.position,
        phone: formData.phone,
        email: formData.email,
        photo_url: formData.photo_url,
        is_active: formData.is_active
      }

      console.log('Attempting to save contact:', dataToSave)

      if (editingContact) {
        // Update existing contact
        const { data, error } = await supabase
          .from('emergency_contacts')
          .update(dataToSave)
          .eq('id', editingContact.id)
          .select()

        console.log('Update response:', { data, error })
        if (error) throw error
      } else {
        // Create new contact
        const { data, error } = await supabase
          .from('emergency_contacts')
          .insert([dataToSave])
          .select()

        console.log('Insert response:', { data, error })
        if (error) throw error
      }

      // Reset form and refresh
      setFormData({
        name: '',
        position: '',
        phone: '',
        email: '',
        photo_url: '',
        is_active: true,
        position_type: '',
        position_index: null
      })
      setShowForm(false)
      setEditingContact(null)
      fetchContacts()
    } catch (error) {
      console.error('Error saving contact:', error)
      
      // More detailed error message
      if (error?.message?.includes('relation "public.emergency_contacts" does not exist')) {
        alert('Database table not found. Please run the emergency_contacts migration first.')
      } else if (error?.code === '42501') {
        alert('Permission denied. Please check database policies.')
      } else if (error?.code === 'PGRST116') {
        alert('Table not found. Please create the emergency_contacts table first.')
      } else {
        alert(`Error saving contact: ${error?.message || 'Unknown error'}. Please try again.`)
      }
    }
  }

  const handleEdit = (contact) => {
    setEditingContact(contact)
    setFormData({
      name: contact.name,
      position: contact.position,
      phone: contact.phone,
      email: contact.email || '',
      photo_url: contact.photo_url || '',
      is_active: contact.is_active
    })
    setPhotoPreview(contact.photo_url || null)
    setShowForm(true)
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, GIF, WebP)')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB')
      return
    }

    try {
      setUploading(true)
      console.log('Starting photo upload...', { 
        name: file.name, 
        size: file.size, 
        type: file.type 
      })

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const filePath = `emergency-contacts/${fileName}`

      console.log('Uploading to path:', filePath)

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('emergency-contacts')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      console.log('Upload response:', { data, error })

      if (error) {
        console.error('Upload error details:', error)
        
        // Handle specific errors
        if (error.message?.includes('Bucket not found')) {
          throw new Error('Storage bucket not found. Please create the emergency-contacts bucket first.')
        } else if (error.message?.includes('Access denied')) {
          throw new Error('Access denied. Please check storage permissions.')
        } else if (error.message?.includes('Already exists')) {
          throw new Error('File already exists. Please try again.')
        } else {
          throw error
        }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('emergency-contacts')
        .getPublicUrl(filePath)

      console.log('Generated public URL:', publicUrl)

      if (!publicUrl) {
        throw new Error('Failed to generate public URL')
      }

      // Update form data and preview
      setFormData({ ...formData, photo_url: publicUrl })
      setPhotoPreview(publicUrl)
      
      console.log('Photo upload successful!')
      
    } catch (error) {
      console.error('Error uploading photo:', error)
      
      // Provide specific error messages
      if (error.message?.includes('bucket not found')) {
        alert('❌ Storage bucket not found.\n\nPlease:\n1. Go to Supabase Dashboard\n2. Create "emergency-contacts" bucket in Storage\n3. Set it as Public\n4. Try again')
      } else if (error.message?.includes('Access denied')) {
        alert('❌ Access denied to storage.\n\nPlease:\n1. Check storage policies\n2. Ensure you are logged in\n3. Try again')
      } else if (error.message?.includes('Already exists')) {
        alert('❌ File already exists.\n\nPlease try uploading again with a different file.')
      } else {
        alert(`❌ Error uploading photo: ${error.message || 'Unknown error'}\n\nPlease try again or contact support.`)
      }
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = () => {
    setFormData({ ...formData, photo_url: '' })
    setPhotoPreview(null)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this contact?')) return

    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchContacts()
    } catch (error) {
      console.error('Error deleting contact:', error)
      alert('Error deleting contact. Please try again.')
    }
  }

  const openDeleteModal = (contact) => {
    setContactToDelete(contact)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setContactToDelete(null)
    setShowDeleteModal(false)
  }

  const confirmDelete = async () => {
    if (!contactToDelete) return

    setDeleting(true)
    try {
      console.log('Deleting contact:', contactToDelete.id)
      
      const { data, error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', contactToDelete.id)

      if (error) {
        console.error('Supabase delete error:', error)
        throw error
      }
      
      console.log('Delete successful:', data)
      closeDeleteModal()
      fetchContacts()
    } catch (error) {
      console.error('Error deleting contact:', error)
      alert(`Error deleting contact: ${error.message || 'Please try again.'}`)
    } finally {
      setDeleting(false)
    }
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingContact(null)
    setPhotoPreview(null)
    setFormData({
      name: '',
      position: '',
      phone: '',
      email: '',
      photo_url: '',
      is_active: true,
      position_type: '',
      position_index: null
    })
  }

  // Helper function to get contact by position (using position text only)
  const getContactByPosition = (positionType, index = null) => {
    return contacts.find(contact => {
      const pos = contact.position.toLowerCase()
      
      if (positionType === 'punong_barangay') {
        return pos.includes('punong') || pos.includes('captain')
      } else if (positionType === 'kagawad' && index !== null) {
        return pos.includes('kagawad') && pos.includes((index + 1).toString())
      } else if (positionType === 'sk_chairperson') {
        return pos.includes('sk') && pos.includes('chairperson')
      } else if (positionType === 'secretary') {
        return pos.includes('secretary')
      } else if (positionType === 'treasurer') {
        return pos.includes('treasurer')
      } else if (positionType === 'chief_tanod') {
        return pos.includes('tanod') || pos.includes('chief')
      }
      return false
    })
  }

  // Helper function to get position type from position text
  const getPositionTypeFromText = (positionText) => {
    const pos = positionText.toLowerCase()
    if (pos.includes('punong') || pos.includes('captain')) {
      return 'punong_barangay'
    } else if (pos.includes('kagawad')) {
      return 'kagawad'
    } else if (pos.includes('sk') && pos.includes('chairperson')) {
      return 'sk_chairperson'
    } else if (pos.includes('secretary')) {
      return 'secretary'
    } else if (pos.includes('treasurer')) {
      return 'treasurer'
    } else if (pos.includes('tanod') || pos.includes('chief')) {
      return 'chief_tanod'
    }
    return 'other'
  }

  // Helper function to get index from kagawad position text
  const getIndexFromPosition = (positionText) => {
    const pos = positionText.toLowerCase()
    if (pos.includes('kagawad')) {
      const match = pos.match(/(\d+)/)
      if (match) {
        return parseInt(match[1]) - 1
      }
    }
    return null
  }

  // Handle editing a specific position
  const handleEditPosition = (positionType, positionTitle, index = null) => {
    const existingContact = getContactByPosition(positionType, index)
    
    setFormData({
      name: existingContact?.name || '',
      position: positionTitle,
      phone: existingContact?.phone || '',
      email: existingContact?.email || '',
      photo_url: existingContact?.photo_url || '',
      is_active: existingContact?.is_active ?? true,
      position_type: positionType, // Keep for UI logic only
      position_index: index // Keep for UI logic only
    })
    
    setEditingContact(existingContact)
    setPhotoPreview(existingContact?.photo_url || null)
    setShowForm(true)
    setIsEditMode(false)
  }

  // Render empty card
  const renderEmptyCard = (title, colorClass, positionType, index = null, isLarge = false) => {
    const isEditable = isEditMode
    
    return (
      <div 
        key={`${positionType}-${index || 0}`}
        className={`bg-white rounded-xl shadow-lg border-2 border-dashed border-gray-300 ${colorClass} ${isLarge ? 'w-full max-w-lg' : ''} ${isEditable ? 'cursor-pointer hover:border-blue-500 hover:shadow-xl transition-all' : ''}`}
        onClick={() => isEditable && handleEditPosition(positionType, title, index)}
      >
        <div className={`flex ${isLarge ? 'flex-row items-center p-6 gap-6' : 'flex-col items-center text-center p-4'}`}>
          {/* Position Header for small cards */}
          {!isLarge && (
            <div className={`w-full text-center py-1 px-2 rounded-t text-xs font-medium uppercase mb-3 ${getColorClasses(colorClass).text} ${getColorClasses(colorClass).bg}`}>
              {title}
            </div>
          )}
          
          {/* Empty Avatar */}
          <div className={`${isLarge ? 'w-32 h-32' : 'w-16 h-16'} ${isLarge ? 'rounded-lg' : 'rounded-full'} bg-gray-100 flex items-center justify-center ${isLarge ? 'flex-shrink-0' : 'mb-3'} border-4 border-gray-200`}>
            <User size={isLarge ? 48 : 24} className="text-gray-400" />
          </div>
          
          {/* Content section for large cards */}
          {isLarge ? (
            <div className="flex-1">
              <p className="text-lg font-bold text-gray-400 mb-2">NO OFFICIAL ASSIGNED</p>
              <p className="text-sm text-blue-600 font-medium mb-3">{title}</p>
              
              {/* Contact Placeholders */}
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <Phone size={16} />
                  <span>No phone</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={16} />
                  <span>No email</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Position Title for Large Cards */}
              <p className="text-xs text-gray-400 mb-2">No official assigned</p>
              
              {/* Contact Placeholders */}
              <div className="space-y-1 text-xs text-gray-300">
                <div className="flex items-center justify-center gap-1">
                  <Phone size={12} />
                  <span>No phone</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Mail size={12} />
                  <span>No email</span>
                </div>
              </div>
            </>
          )}
          
          {/* Edit indicator */}
          {isEditable && (
            <div className="mt-3 text-blue-500 text-xs font-medium">
              Click to edit
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render filled card
  const renderFilledCard = (contact, colorClass, isLarge = false) => {
    const isEditable = isEditMode
    
    return (
      <div 
        key={contact.id}
        className={`bg-white rounded-xl shadow-lg border-2 ${colorClass} ${isLarge ? 'w-full max-w-lg' : ''} ${isEditable ? 'cursor-pointer hover:border-blue-500 hover:shadow-xl transition-all' : ''}`}
        onClick={() => isEditable && handleEditPosition(getPositionTypeFromText(contact.position), contact.position, getIndexFromPosition(contact.position))}
      >
        <div className={`flex ${isLarge ? 'flex-row items-center p-6 gap-6' : 'flex-col items-center text-center p-4'}`}>
          {/* Position Header for small cards */}
          {!isLarge && (
            <div className={`w-full text-center py-1 px-2 rounded-t text-xs font-medium uppercase mb-3 ${getColorClasses(colorClass).text} ${getColorClasses(colorClass).bg}`}>
              {contact.position}
            </div>
          )}
          
          {/* Profile Photo */}
          {contact.photo_url ? (
            <img
              src={contact.photo_url}
              alt={contact.name}
              className={`${isLarge ? 'w-32 h-32 rounded-lg' : 'w-16 h-16 rounded-full'} object-cover ${isLarge ? 'flex-shrink-0' : 'mb-3'} border-4 border-gray-100`}
            />
          ) : (
            <div className={`${isLarge ? 'w-32 h-32 rounded-lg' : 'w-16 h-16 rounded-full'} ${getColorClasses(colorClass).bg} flex items-center justify-center ${isLarge ? 'flex-shrink-0' : 'mb-3'} border-4 border-gray-200`}>
              <User size={isLarge ? 48 : 24} className={getColorClasses(colorClass).text} />
            </div>
          )}
          
          {/* Content section */}
          {isLarge ? (
            <div className="flex-1">
              {/* Name and Position */}
              <h4 className="font-bold text-xl text-gray-900 leading-tight mb-1">{contact.name}</h4>
              <p className="text-base text-blue-600 font-medium mb-4">{contact.position}</p>
              
              {/* Contact Info */}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Phone size={16} />
                  <span>{contact.phone}</span>
                </div>
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={16} />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Name and Position for small cards */}
              <h4 className="font-bold text-sm text-gray-900 leading-tight">{contact.name}</h4>
              <p className="text-xs text-blue-600 font-medium mb-2">{contact.position}</p>
              
              {/* Contact Info */}
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center justify-center gap-1">
                  <Phone size={12} />
                  <span>{contact.phone}</span>
                </div>
                {contact.email && (
                  <div className="flex items-center justify-center gap-1">
                    <Mail size={12} />
                    <span className="truncate max-w-24">{contact.email}</span>
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* Status Badge */}
          {!contact.is_active && (
            <span className="mt-2 px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              Inactive
            </span>
          )}
          
          {/* Edit indicator */}
          {isEditable && (
            <div className="mt-3 text-blue-500 text-xs font-medium">
              Click to edit
            </div>
          )}
          
          {/* Action Buttons (only show when not in edit mode) */}
          {!isEditMode && (
            <div className={`flex gap-1 mt-3 ${isLarge ? 'self-start' : ''}`}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit(contact)
                }}
                className="flex items-center gap-1 px-2 py-1.5 bg-blue-50 text-blue-600 rounded text-xs font-medium hover:bg-blue-100 transition"
              >
                <Edit2 size={10} />
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openDeleteModal(contact)
                }}
                className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-medium hover:bg-red-100 transition"
              >
                <Trash2 size={10} />
                Remove
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Get color classes helper
  const getColorClasses = (color) => {
    const colorMap = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
      green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
      gray: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' }
    }
    return colorMap[color] || colorMap.gray
  }

  // Handle Call Button Click
  const handleCallClick = (contact) => {
    setSelectedContact({
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
    })
    setShowCallOptions(true)
  }

  // Handle Call Type Selection
  const handleCallTypeSelected = async (callType, isVideo) => {
    if (!selectedContact) return

    await initiateCall(
      selectedContact.id,
      selectedContact.name,
      selectedContact.phone,
      callType,
      isVideo
    )
  }

  return (
    <div className="pb-16 md:pb-0 bg-gray-50 min-h-screen">
      <TopBar 
        title="Barangay Officials" 
        showUserMenu={true} 
        showNotifications={true}
      >
        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">Official</span>
      </TopBar>
      
      <main className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Barangay Officials</h2>
              <p className="text-sm text-gray-500 mt-1">Organizational chart of Barangay East Tapinac Officials</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                <Plus size={20} />
                Add Official
              </button>
            </div>
          </div>

          {/* Edit Mode Notice */}
          {isEditMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-700">
                <Edit2 size={16} />
                <p className="text-sm font-medium">
                  Edit Mode Active - Click on any card to edit the official information for that position
                </p>
              </div>
            </div>
          )}

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900">
                      {editingContact ? 'Edit Contact' : 'Add New Contact'}
                    </h3>
                    <button
                      onClick={cancelForm}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Photo Upload Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Profile Photo
                      </label>
                      <div className="flex flex-col items-center gap-4">
                        {/* Photo Preview */}
                        <div className="relative">
                          {photoPreview ? (
                            <img
                              src={photoPreview}
                              alt="Preview"
                              className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                            />
                          ) : (
                            <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-200">
                              <User size={48} className="text-gray-400" />
                            </div>
                          )}
                          {photoPreview && (
                            <button
                              type="button"
                              onClick={removePhoto}
                              className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>

                        {/* Upload Button */}
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                            disabled={uploading}
                          />
                          <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition flex items-center gap-2">
                            {uploading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Plus size={16} />
                                {photoPreview ? 'Change Photo' : 'Upload Photo'}
                              </>
                            )}
                          </div>
                        </label>
                        <p className="text-xs text-gray-500 text-center">
                          Max 5MB • JPG, PNG, GIF
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Juan Dela Cruz"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Position *
                      </label>
                      {formData.position_type ? (
                        // Read-only when editing from card click
                        <input
                          type="text"
                          value={formData.position}
                          readOnly
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                        />
                      ) : (
                        // Dropdown when adding new official
                        <select
                          required
                          value={formData.position}
                          onChange={(e) => {
                            const selectedPosition = e.target.value
                            let positionType = ''
                            let positionIndex = null
                            
                            // Determine position type and index based on selection
                            if (selectedPosition === 'Punong Barangay') {
                              positionType = 'punong_barangay'
                            } else if (selectedPosition.startsWith('Barangay Kagawad')) {
                              positionType = 'kagawad'
                              positionIndex = parseInt(selectedPosition.split(' ')[2]) - 1
                            } else if (selectedPosition === 'SK Chairperson') {
                              positionType = 'sk_chairperson'
                            } else if (selectedPosition === 'Barangay Secretary') {
                              positionType = 'secretary'
                            } else if (selectedPosition === 'Barangay Treasurer') {
                              positionType = 'treasurer'
                            } else if (selectedPosition === 'Chief Tanod') {
                              positionType = 'chief_tanod'
                            }
                            
                            setFormData({ 
                              ...formData, 
                              position: selectedPosition,
                              position_type: positionType,
                              position_index: positionIndex
                            })
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select Position...</option>
                          <option value="Punong Barangay">Punong Barangay</option>
                          <optgroup label="Sangguniang Barangay">
                            <option value="Barangay Kagawad 1">Barangay Kagawad 1</option>
                            <option value="Barangay Kagawad 2">Barangay Kagawad 2</option>
                            <option value="Barangay Kagawad 3">Barangay Kagawad 3</option>
                            <option value="Barangay Kagawad 4">Barangay Kagawad 4</option>
                            <option value="Barangay Kagawad 5">Barangay Kagawad 5</option>
                            <option value="Barangay Kagawad 6">Barangay Kagawad 6</option>
                            <option value="Barangay Kagawad 7">Barangay Kagawad 7</option>
                          </optgroup>
                          <optgroup label="Other Officials">
                            <option value="SK Chairperson">SK Chairperson</option>
                            <option value="Barangay Secretary">Barangay Secretary</option>
                            <option value="Barangay Treasurer">Barangay Treasurer</option>
                            <option value="Chief Tanod">Chief Tanod</option>
                          </optgroup>
                        </select>
                      )}
                      {formData.position_type && (
                        <p className="text-xs text-gray-500 mt-1">
                          Position is assigned to this organizational slot
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="09171234567"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email (Optional)
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="official@barangay.gov.ph"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="is_active" className="text-sm text-gray-700">
                        Active (visible to residents)
                      </label>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={cancelForm}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                      >
                        <Save size={18} />
                        {editingContact ? 'Update' : 'Save'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Main Container - Large Container Layout */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mx-auto max-w-8xl">

            {/* Fixed Organizational Chart Layout */}
            <div className="space-y-12">
              {/* Punong Barangay Section */}
              <div className="text-center">
                <div className="flex items-center justify-center mb-6">
                  <div className="flex-1 h-px bg-blue-300"></div>
                  <div className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-base shadow-md mx-4">
                    <div className="flex items-center gap-2">
                      <User size={20} className="text-white" />
                      PUNONG BARANGAY
                    </div>
                  </div>
                  <div className="flex-1 h-px bg-blue-300"></div>
                </div>
                <div className="flex justify-center">
                  {(() => {
                    const contact = getContactByPosition('punong_barangay')
                    return contact ? (
                      <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-300 p-6 w-full max-w-lg">
                        <div className="flex items-center gap-6">
                          {/* Large Square Photo */}
                          <div className="w-32 h-32 bg-blue-100 rounded-xl flex-shrink-0 overflow-hidden border-4 border-blue-200">
                            {contact.photo_url ? (
                              <img
                                src={contact.photo_url}
                                alt={contact.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                                <User size={48} className="text-blue-600" />
                              </div>
                            )}
                          </div>
                          
                          {/* Contact Info */}
                          <div className="flex-1 text-left">
                            <h3 className="font-bold text-2xl text-gray-900 mb-2">{contact.name}</h3>
                            <p className="text-blue-600 font-semibold text-lg mb-4">Punong Barangay</p>
                            
                            <div className="space-y-2 text-base text-gray-600">
                              <div className="flex items-center gap-3">
                                <Phone size={18} className="text-gray-400" />
                                <span>{contact.phone}</span>
                              </div>
                              {contact.email && (
                                <div className="flex items-center gap-3">
                                  <Mail size={18} className="text-gray-400" />
                                  <span className="truncate">{contact.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          {!isEditMode && (
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => handleEdit(contact)}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => openDeleteModal(contact)}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl shadow-lg border-2 border-dashed border-blue-300 p-6 w-full max-w-lg cursor-pointer hover:border-blue-500 transition-all"
                           onClick={() => isEditMode && handleEditPosition('punong_barangay', 'Punong Barangay')}>
                        <div className="flex items-center gap-6">
                          <div className="w-32 h-32 bg-gray-100 rounded-xl flex-shrink-0 flex items-center justify-center border-4 border-gray-200">
                            <User size={48} className="text-gray-400" />
                          </div>
                          <div className="flex-1 text-left">
                            <h3 className="font-bold text-2xl text-gray-400 mb-2">NO OFFICIAL ASSIGNED</h3>
                            <p className="text-blue-600 font-semibold text-lg mb-4">Punong Barangay</p>
                            <div className="space-y-2 text-base text-gray-300">
                              <div className="flex items-center gap-3">
                                <Phone size={18} />
                                <span>No phone</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <Mail size={18} />
                                <span>No email</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Sangguniang Barangay Section */}
              <div>
                <div className="flex items-center justify-center mb-6">
                  <div className="flex-1 h-px bg-blue-300"></div>
                  <div className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-base shadow-md mx-4">
                    <div className="flex items-center gap-2">
                      <User size={20} className="text-white" />
                      SANGGUNIANG BARANGAY (KAGAWAD)
                    </div>
                  </div>
                  <div className="flex-1 h-px bg-blue-300"></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                  {Array.from({ length: 7 }, (_, index) => {
                    const contact = getContactByPosition('kagawad', index)
                    return contact ? (
                      <div key={`kagawad-${index}`} className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-4 hover:shadow-xl transition-shadow">
                        <div className="text-center">
                          <div className="w-20 h-20 bg-blue-100 rounded-xl mx-auto mb-3 overflow-hidden border-2 border-blue-200">
                            {contact.photo_url ? (
                              <img
                                src={contact.photo_url}
                                alt={contact.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                                <User size={32} className="text-blue-600" />
                              </div>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-gray-900 mb-1 leading-tight">{contact.name}</h4>
                          <p className="text-blue-600 font-semibold text-xs mb-3">Barangay Kagawad</p>
                          <div className="space-y-1 text-xs text-gray-600">
                            <div className="flex items-center justify-center gap-2">
                              <Phone size={14} />
                              <span className="truncate">{contact.phone}</span>
                            </div>
                            {contact.email && (
                              <div className="flex items-center justify-center gap-2">
                                <Mail size={14} />
                                <span className="truncate text-xs">{contact.email}</span>
                              </div>
                            )}
                          </div>
                          {!isEditMode && (
                            <div className="flex justify-center gap-1 mt-3">
                              <button
                                onClick={() => handleEdit(contact)}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => openDeleteModal(contact)}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div key={`kagawad-empty-${index}`} 
                           className="bg-white rounded-xl shadow-lg border-2 border-dashed border-gray-300 p-4 cursor-pointer hover:border-blue-400 hover:shadow-xl transition-all"
                           onClick={() => isEditMode && handleEditPosition('kagawad', `Barangay Kagawad ${index + 1}`, index)}>
                        <div className="text-center">
                          <div className="w-20 h-20 bg-gray-100 rounded-xl mx-auto mb-3 flex items-center justify-center border-2 border-gray-200">
                            <User size={32} className="text-gray-400" />
                          </div>
                          <h4 className="font-bold text-sm text-gray-400 mb-1">NO OFFICIAL</h4>
                          <p className="text-blue-600 font-semibold text-xs mb-3">Barangay Kagawad</p>
                          <div className="space-y-1 text-xs text-gray-300">
                            <div className="flex items-center justify-center gap-2">
                              <Phone size={14} />
                              <span>No phone</span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <Mail size={14} />
                              <span>No email</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Other Officials Section */}
              <div>
                <div className="flex items-center justify-center mb-6">
                  <div className="flex-1 h-px bg-blue-300"></div>
                  <div className="px-8 py-3 bg-purple-600 text-white rounded-xl font-bold text-base shadow-md mx-4">
                    <div className="flex items-center gap-2">
                      <User size={20} className="text-white" />
                      OTHER OFFICIALS
                    </div>
                  </div>
                  <div className="flex-1 h-px bg-blue-300"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* SK Chairperson */}
                {(() => {
                  const contact = getContactByPosition('sk_chairperson')
                  return (
                    <div className="bg-white rounded-xl shadow-lg border-l-4 border-purple-500 p-6 hover:shadow-xl transition-shadow">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-5 h-5 bg-purple-500 rounded-full"></div>
                        <h3 className="font-bold text-sm text-purple-600 uppercase tracking-wide">SK CHAIRPERSON</h3>
                      </div>
                      {contact ? (
                        <div className="text-center">
                          <div className="w-20 h-20 bg-purple-100 rounded-xl mx-auto mb-3 overflow-hidden border-2 border-purple-200">
                            {contact.photo_url ? (
                              <img src={contact.photo_url} alt={contact.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User size={32} className="text-purple-600" />
                              </div>
                            )}
                          </div>
                          <h4 className="font-bold text-base text-gray-900 mb-1">{contact.name}</h4>
                          <p className="text-purple-600 font-semibold text-sm mb-3">SK Chairperson</p>
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center justify-center gap-2">
                              <Phone size={14} />
                              <span>{contact.phone}</span>
                            </div>
                            {contact.email && (
                              <div className="flex items-center justify-center gap-2">
                                <Mail size={14} />
                                <span className="truncate">{contact.email}</span>
                              </div>
                            )}
                          </div>
                          {!isEditMode && (
                            <div className="flex justify-center gap-2 mt-4">
                              <button onClick={() => handleEdit(contact)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => openDeleteModal(contact)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center cursor-pointer" onClick={() => isEditMode && handleEditPosition('sk_chairperson', 'SK Chairperson')}>
                          <div className="w-20 h-20 bg-gray-100 rounded-xl mx-auto mb-3 flex items-center justify-center border-2 border-gray-200">
                            <User size={32} className="text-gray-400" />
                          </div>
                          <h4 className="font-bold text-base text-gray-400 mb-1">NO OFFICIAL</h4>
                          <p className="text-purple-600 font-semibold text-sm mb-3">SK Chairperson</p>
                          <div className="space-y-2 text-sm text-gray-300">
                            <div className="flex items-center justify-center gap-2">
                              <Phone size={14} />
                              <span>No phone</span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <Mail size={14} />
                              <span>No email</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Barangay Secretary */}
                {(() => {
                  const contact = getContactByPosition('secretary')
                  return (
                    <div className="bg-white rounded-xl shadow-lg border-l-4 border-green-500 p-6 hover:shadow-xl transition-shadow">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-5 h-5 bg-green-500 rounded-full"></div>
                        <h3 className="font-bold text-sm text-green-600 uppercase tracking-wide">BARANGAY SECRETARY</h3>
                      </div>
                      {contact ? (
                        <div className="text-center">
                          <div className="w-20 h-20 bg-green-100 rounded-xl mx-auto mb-3 overflow-hidden border-2 border-green-200">
                            {contact.photo_url ? (
                              <img src={contact.photo_url} alt={contact.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User size={32} className="text-green-600" />
                              </div>
                            )}
                          </div>
                          <h4 className="font-bold text-base text-gray-900 mb-1">{contact.name}</h4>
                          <p className="text-green-600 font-semibold text-sm mb-3">Barangay Secretary</p>
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center justify-center gap-2">
                              <Phone size={14} />
                              <span>{contact.phone}</span>
                            </div>
                            {contact.email && (
                              <div className="flex items-center justify-center gap-2">
                                <Mail size={14} />
                                <span className="truncate">{contact.email}</span>
                              </div>
                            )}
                          </div>
                          {!isEditMode && (
                            <div className="flex justify-center gap-2 mt-4">
                              <button onClick={() => handleEdit(contact)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => openDeleteModal(contact)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center cursor-pointer" onClick={() => isEditMode && handleEditPosition('secretary', 'Barangay Secretary')}>
                          <div className="w-20 h-20 bg-gray-100 rounded-xl mx-auto mb-3 flex items-center justify-center border-2 border-gray-200">
                            <User size={32} className="text-gray-400" />
                          </div>
                          <h4 className="font-bold text-base text-gray-400 mb-1">NO OFFICIAL</h4>
                          <p className="text-green-600 font-semibold text-sm mb-3">Barangay Secretary</p>
                          <div className="space-y-2 text-sm text-gray-300">
                            <div className="flex items-center justify-center gap-2">
                              <Phone size={14} />
                              <span>No phone</span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <Mail size={14} />
                              <span>No email</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Barangay Treasurer */}
                {(() => {
                  const contact = getContactByPosition('treasurer')
                  return (
                    <div className="bg-white rounded-xl shadow-lg border-l-4 border-orange-500 p-6 hover:shadow-xl transition-shadow">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-5 h-5 bg-orange-500 rounded-full"></div>
                        <h3 className="font-bold text-sm text-orange-600 uppercase tracking-wide">BARANGAY TREASURER</h3>
                      </div>
                      {contact ? (
                        <div className="text-center">
                          <div className="w-20 h-20 bg-orange-100 rounded-xl mx-auto mb-3 overflow-hidden border-2 border-orange-200">
                            {contact.photo_url ? (
                              <img src={contact.photo_url} alt={contact.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User size={32} className="text-orange-600" />
                              </div>
                            )}
                          </div>
                          <h4 className="font-bold text-base text-gray-900 mb-1">{contact.name}</h4>
                          <p className="text-orange-600 font-semibold text-sm mb-3">Barangay Treasurer</p>
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center justify-center gap-2">
                              <Phone size={14} />
                              <span>{contact.phone}</span>
                            </div>
                            {contact.email && (
                              <div className="flex items-center justify-center gap-2">
                                <Mail size={14} />
                                <span className="truncate">{contact.email}</span>
                              </div>
                            )}
                          </div>
                          {!isEditMode && (
                            <div className="flex justify-center gap-2 mt-4">
                              <button onClick={() => handleEdit(contact)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => openDeleteModal(contact)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center cursor-pointer" onClick={() => isEditMode && handleEditPosition('treasurer', 'Barangay Treasurer')}>
                          <div className="w-20 h-20 bg-gray-100 rounded-xl mx-auto mb-3 flex items-center justify-center border-2 border-gray-200">
                            <User size={32} className="text-gray-400" />
                          </div>
                          <h4 className="font-bold text-base text-gray-400 mb-1">NO OFFICIAL</h4>
                          <p className="text-orange-600 font-semibold text-sm mb-3">Barangay Treasurer</p>
                          <div className="space-y-2 text-sm text-gray-300">
                            <div className="flex items-center justify-center gap-2">
                              <Phone size={14} />
                              <span>No phone</span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <Mail size={14} />
                              <span>No email</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

              {/* SK Chairperson - Note: Removing Lupon Tagapamayapa as requested */}
              {(() => {
                const contact = getContactByPosition('chief_tanod')
                return (
                  <div className="bg-white rounded-xl shadow-lg border-l-4 border-blue-500 p-6 hover:shadow-xl transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-5 h-5 bg-blue-500 rounded-full"></div>
                      <h3 className="font-bold text-sm text-blue-600 uppercase tracking-wide">CHIEF TANOD</h3>
                    </div>
                    {contact ? (
                      <div className="text-center">
                        <div className="w-20 h-20 bg-blue-100 rounded-xl mx-auto mb-3 overflow-hidden border-2 border-blue-200">
                          {contact.photo_url ? (
                            <img src={contact.photo_url} alt={contact.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User size={32} className="text-blue-600" />
                            </div>
                          )}
                        </div>
                        <h4 className="font-bold text-base text-gray-900 mb-1">{contact.name}</h4>
                        <p className="text-blue-600 font-semibold text-sm mb-3">Chief Tanod</p>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center justify-center gap-2">
                            <Phone size={14} />
                            <span>{contact.phone}</span>
                          </div>
                          {contact.email && (
                            <div className="flex items-center justify-center gap-2">
                              <Mail size={14} />
                              <span className="truncate">{contact.email}</span>
                            </div>
                          )}
                        </div>
                        {!isEditMode && (
                          <div className="flex justify-center gap-2 mt-4">
                            <button onClick={() => handleEdit(contact)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => openDeleteModal(contact)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center cursor-pointer" onClick={() => isEditMode && handleEditPosition('chief_tanod', 'Chief Tanod')}>
                        <div className="w-20 h-20 bg-gray-100 rounded-xl mx-auto mb-3 flex items-center justify-center border-2 border-gray-200">
                          <User size={32} className="text-gray-400" />
                        </div>
                        <h4 className="font-bold text-base text-gray-400 mb-1">NO OFFICIAL</h4>
                        <p className="text-blue-600 font-semibold text-sm mb-3">Chief Tanod</p>
                        <div className="space-y-2 text-sm text-gray-300">
                          <div className="flex items-center justify-center gap-2">
                            <Phone size={14} />
                            <span>No phone</span>
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <Mail size={14} />
                            <span>No email</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
                </div>
              </div>
            </div>

          {/* Delete Confirmation Modal */}
          {showDeleteModal && contactToDelete && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                      <Trash2 size={32} className="text-red-600" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Delete Contact?
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Are you sure you want to delete this emergency contact?
                    </p>
                    
                    {/* Contact Info */}
                    <div className="bg-gray-50 rounded-lg p-4 text-left">
                      <div className="flex items-center gap-3 mb-2">
                        {contactToDelete.photo_url ? (
                          <img
                            src={contactToDelete.photo_url}
                            alt={contactToDelete.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <User size={24} className="text-blue-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-gray-900">{contactToDelete.name}</p>
                          <p className="text-sm text-gray-500">{contactToDelete.position}</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-red-600 font-medium mt-4">
                      This action cannot be undone.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={closeDeleteModal}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDelete}
                      disabled={deleting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 size={18} />
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12 text-gray-500">Loading contacts...</div>
          )}
          </div>
        </main>
        <AdminMobileBottomNav />

        {/* Call Options Modal */}
        <CallOptionsModal
          isOpen={showCallOptions}
          onClose={() => setShowCallOptions(false)}
          recipient={selectedContact}
          onSelectOption={handleCallTypeSelected}
        />

        {/* Incoming Call Modal */}
        {incomingCall && (
          <CallModal
            isOpen={true}
            onClose={() => {}}
            callData={incomingCall}
            isIncoming={true}
            onAnswer={answerCall}
            onDecline={declineCall}
            localStream={localStream}
            remoteStream={remoteStream}
          />
        )}

        {/* Active Call Modal */}
        {activeCall && (
          <CallModal
            isOpen={true}
            onClose={() => {}}
            callData={activeCall}
            isIncoming={false}
            onEnd={endCall}
            localStream={localStream}
            remoteStream={remoteStream}
          />
        )}
      </div>
  )
}
