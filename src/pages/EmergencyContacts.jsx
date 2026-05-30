import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Phone, Mail, User, Save, X } from 'lucide-react'
import AdminSidebar from '../components/AdminSidebar'
import AdminMobileBottomNav from '../components/AdminMobileBottomNav'
import TopBar from '../components/TopBar'
import { supabase } from '../lib/supabase'

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
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    phone: '',
    email: '',
    photo_url: '',
    is_active: true
  })

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
      if (editingContact) {
        // Update existing contact
        const { error } = await supabase
          .from('emergency_contacts')
          .update(formData)
          .eq('id', editingContact.id)

        if (error) throw error
      } else {
        // Create new contact
        const { error } = await supabase
          .from('emergency_contacts')
          .insert([formData])

        if (error) throw error
      }

      // Reset form and refresh
      setFormData({
        name: '',
        position: '',
        phone: '',
        email: '',
        photo_url: '',
        is_active: true
      })
      setShowForm(false)
      setEditingContact(null)
      fetchContacts()
    } catch (error) {
      console.error('Error saving contact:', error)
      alert('Error saving contact. Please try again.')
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
      alert('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB')
      return
    }

    try {
      setUploading(true)

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const filePath = `emergency-contacts/${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('emergency-contacts')
        .upload(filePath, file)

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('emergency-contacts')
        .getPublicUrl(filePath)

      // Update form data and preview
      setFormData({ ...formData, photo_url: publicUrl })
      setPhotoPreview(publicUrl)
    } catch (error) {
      console.error('Error uploading photo:', error)
      alert('Error uploading photo. Please try again.')
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
      is_active: true
    })
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 md:ml-60 pb-16 md:pb-0">
        <TopBar title="Emergency Contacts" showUserMenu={true} />
        
        <main className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Barangay Officials Contacts</h2>
              <p className="text-sm text-gray-500 mt-1">Manage emergency contact information for residents</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              <Plus size={20} />
              Add Contact
            </button>
          </div>

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
                      <input
                        type="text"
                        required
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Barangay Captain"
                      />
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

          {/* Contacts Grid */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading contacts...</div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-12">
              <User size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No emergency contacts yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-blue-600 font-medium hover:text-blue-700"
              >
                Add your first contact
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition max-w-xs mx-auto w-full"
                >
                  <div className="p-6">
                    {/* Centered Profile Section */}
                    <div className="flex flex-col items-center text-center mb-4">
                      {contact.photo_url ? (
                        <img
                          src={contact.photo_url}
                          alt={contact.name}
                          className="w-32 h-32 rounded-full object-cover mb-4 border-4 border-gray-100 shadow-md"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center mb-4 border-4 border-gray-100 shadow-md">
                          <User size={56} className="text-blue-600" />
                        </div>
                      )}
                      <h3 className="font-bold text-lg text-gray-900 leading-tight">{contact.name}</h3>
                      <p className="text-sm text-blue-600 font-medium mt-1">{contact.position}</p>
                      {!contact.is_active && (
                        <span className="mt-2 px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2 mb-4 pt-4 border-t border-gray-100">
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center justify-center gap-2 text-sm text-gray-700 hover:text-blue-600 transition"
                      >
                        <Phone size={16} className="text-gray-400" />
                        <span className="truncate">{contact.phone}</span>
                      </a>
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center justify-center gap-2 text-sm text-gray-700 hover:text-blue-600 transition"
                        >
                          <Mail size={16} className="text-gray-400" />
                          <span className="truncate">{contact.email}</span>
                        </a>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleEdit(contact)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
                      >
                        <Edit2 size={16} />
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteModal(contact)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      <AdminMobileBottomNav />
    </div>
  )
}
