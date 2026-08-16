import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useSidebar } from '../context/SidebarContext'
import {
  getUserVerificationStatus,
  submitIDVerification,
  getUserReputation,
  uploadVerificationDocument,
  ID_TYPES,
  VERIFICATION_LEVELS,
} from '../lib/userVerification'
import UserVerificationBadge from '../components/UserVerificationBadge'
import ResidentSidebar from '../components/ResidentSidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import TopBar from '../components/TopBar'
import { FiShield, FiUpload, FiCheckCircle, FiClock, FiXCircle, FiCamera, FiUser } from 'react-icons/fi'

export default function VerificationCenter() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { isCollapsed } = useSidebar()
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [reputation, setReputation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const [formData, setFormData] = useState({
    idType: ID_TYPES.NATIONAL_ID,
    idNumber: '',
    idPhoto: null,
    selfiePhoto: null,
  })

  useEffect(() => {
    loadVerificationData()
  }, [profile?.id, profile?.verification_status])

  const loadVerificationData = async () => {
    if (!profile?.id) return

    setLoading(true)
    try {
      const [verificationData, reputationData] = await Promise.all([
        getUserVerificationStatus(profile.id),
        getUserReputation(profile.id),
      ])

      // Use profile.verification_status as the authoritative source.
      // An admin can change it directly via Manage Users without touching
      // the user_verifications table, so we must reconcile both.
      const profileStatus = profile?.verification_status // already in AuthContext
      const verRecord = verificationData.data

      if (verRecord) {
        // If the profile status was updated by admin but the verification record
        // wasn't synced yet, override the record's status with profile's status
        if (profileStatus && profileStatus !== verRecord.status &&
            (profileStatus === 'verified' || profileStatus === 'unverified' || profileStatus === 'trusted')) {
          setVerificationStatus({ ...verRecord, status: profileStatus })
        } else {
          setVerificationStatus(verRecord)
        }
      } else {
        // No verification record at all — synthesize one from profile status
        if (profileStatus === 'verified' || profileStatus === 'trusted') {
          setVerificationStatus({ status: profileStatus })
        } else {
          setVerificationStatus(null)
        }
      }

      setReputation(reputationData)
    } catch (err) {
      console.error('Error loading verification data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e, field) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, [field]: file })
    }
  }

  const handleSubmitVerification = async (e) => {
    e.preventDefault()

    if (!formData.idPhoto || !formData.selfiePhoto) {
      alert('Please upload both ID photo and selfie')
      return
    }

    setSubmitting(true)

    try {
      // Upload documents
      const [idUpload, selfieUpload] = await Promise.all([
        uploadVerificationDocument(profile.id, formData.idPhoto, 'id'),
        uploadVerificationDocument(profile.id, formData.selfiePhoto, 'selfie'),
      ])

      if (idUpload.error || selfieUpload.error) {
        throw new Error('Failed to upload documents')
      }

      // Submit verification request
      const { data, error } = await submitIDVerification(profile.id, {
        idType: formData.idType,
        idNumber: formData.idNumber,
        idPhotoUrl: idUpload.url,
        selfieUrl: selfieUpload.url,
      })

      if (error) throw error

      // Show success modal
      setShowSuccessModal(true)
      setShowSubmitForm(false)
      loadVerificationData()
      
      // Auto close modal and navigate after 3 seconds
      setTimeout(() => {
        setShowSuccessModal(false)
      }, 4000)
    } catch (err) {
      console.error('Verification submission error:', err)
      alert('Failed to submit verification: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <ResidentSidebar />
        <div className={`
          flex-1 pb-16 md:pb-0 transition-all duration-300
          ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}
        `}>
          <TopBar title="Verification Center" showNotifications={true} />
          <main className="p-4 md:p-6 max-w-4xl mx-auto">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading verification data...</p>
            </div>
          </main>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  const getStatusDisplay = (status) => {
    switch (status) {
      case VERIFICATION_LEVELS.VERIFIED:
      case VERIFICATION_LEVELS.TRUSTED:
        return {
          icon: <FiCheckCircle size={20} />,
          color: '#10b981',
          bg: '#d1fae5',
          text: 'Verified',
        }
      case VERIFICATION_LEVELS.PENDING:
        return {
          icon: <FiClock size={20} />,
          color: '#f59e0b',
          bg: '#fef3c7',
          text: 'Pending Review',
        }
      default:
        return {
          icon: <FiXCircle size={20} />,
          color: '#6b7280',
          bg: '#f3f4f6',
          text: 'Not Verified',
        }
    }
  }

  const statusDisplay = getStatusDisplay(verificationStatus?.status || VERIFICATION_LEVELS.UNVERIFIED)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ResidentSidebar />
      <div className={`
        flex-1 pb-16 md:pb-0 transition-all duration-300
        ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}
      `}>
        <TopBar title="Verification Center" showNotifications={true} />
        
        <main className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
          {/* Verification Status Card */}
          <div style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <div style={{
              background: `linear-gradient(135deg, ${statusDisplay.color} 0%, ${statusDisplay.color}dd 100%)`,
              padding: '24px',
              color: '#fff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {statusDisplay.icon}
                </div>
                <div>
                  <h2 style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 700,
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    {statusDisplay.text}
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: 14, opacity: 0.9 }}>
                    {verificationStatus?.status === VERIFICATION_LEVELS.PENDING
                      ? 'Your verification is being reviewed by admins'
                      : verificationStatus?.status === VERIFICATION_LEVELS.VERIFIED || verificationStatus?.status === VERIFICATION_LEVELS.TRUSTED
                      ? 'Your identity has been verified'
                      : 'Get verified to build trust in the community'}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ padding: 24 }}>
              {!verificationStatus || verificationStatus.status === VERIFICATION_LEVELS.UNVERIFIED ? (
                <button
                  onClick={() => setShowSubmitForm(true)}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    border: 'none',
                    borderRadius: 12,
                    background: '#2563eb',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                  }}
                >
                  <FiShield size={18} />
                  Start Verification Process
                </button>
              ) : verificationStatus.status === VERIFICATION_LEVELS.PENDING ? (
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #fbbf24',
                  borderRadius: 12,
                  padding: 16,
                  textAlign: 'center',
                }}>
                  <p style={{
                    margin: 0,
                    fontSize: 14,
                    color: '#92400e',
                    fontWeight: 500,
                  }}>
                    Your verification request is under review. You will be notified once it's processed.
                  </p>
                </div>
              ) : (
                <div style={{
                  background: '#d1fae5',
                  border: '1px solid #10b981',
                  borderRadius: 12,
                  padding: 16,
                  textAlign: 'center',
                }}>
                  <p style={{
                    margin: 0,
                    fontSize: 14,
                    color: '#065f46',
                    fontWeight: 500,
                  }}>
                    ✅ Your account is verified! This helps build trust with the community.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Reputation Score Card */}
          {reputation && (
            <div style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <FiShield size={20} color="#2563eb" />
                <h3 style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#111827',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  Community Reputation
                </h3>
              </div>

              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <UserVerificationBadge
                  badgeLevel={reputation.badgeLevel}
                  score={reputation.score}
                  size="large"
                  showTooltip={false}
                />
                <div style={{ marginTop: 12 }}>
                  <div style={{
                    fontSize: 36,
                    fontWeight: 700,
                    color: '#2563eb',
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    {reputation.score}
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: '#6b7280',
                    marginTop: 4,
                  }}>
                    Reputation Score
                  </div>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
                paddingTop: 20,
                borderTop: '1px solid #e5e7eb',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>
                    {reputation.stats.totalReports || 0}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Reports
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>
                    {reputation.stats.upvotes || 0}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Upvotes
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>
                    {reputation.stats.downvotes || 0}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Downvotes
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: 20,
                padding: 16,
                background: '#f9fafb',
                borderRadius: 12,
              }}>
                <h4 style={{
                  margin: '0 0 12px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#374151',
                }}>
                  How to improve your reputation:
                </h4>
                <ul style={{
                  margin: 0,
                  paddingLeft: 20,
                  fontSize: 13,
                  color: '#6b7280',
                  lineHeight: 1.8,
                }}>
                  <li>Report incidents accurately and honestly</li>
                  <li>Get your reports upvoted by the community</li>
                  <li>Complete ID verification (+50 points)</li>
                  <li>Stay active and engaged in community safety</li>
                </ul>
              </div>
            </div>
          )}

          {/* Verification Form Modal */}
          {showSubmitForm && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 16,
            }}>
              <div style={{
                background: '#fff',
                borderRadius: 16,
                maxWidth: 500,
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              }}>
                <div style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#111827',
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    Submit ID Verification
                  </h3>
                  <button
                    onClick={() => setShowSubmitForm(false)}
                    style={{
                      padding: 8,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <FiXCircle size={20} color="#6b7280" />
                  </button>
                </div>

                <form onSubmit={handleSubmitVerification} style={{ padding: '20px 24px' }}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: 8,
                    }}>
                      ID Type *
                    </label>
                    <select
                      required
                      value={formData.idType}
                      onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1.5px solid #e5e7eb',
                        borderRadius: 10,
                        fontSize: 14,
                        fontFamily: "'DM Sans', sans-serif",
                        outline: 'none',
                      }}
                    >
                      <option value={ID_TYPES.NATIONAL_ID}>National ID</option>
                      <option value={ID_TYPES.DRIVERS_LICENSE}>Driver's License</option>
                      <option value={ID_TYPES.PASSPORT}>Passport</option>
                      <option value={ID_TYPES.VOTERS_ID}>Voter's ID</option>
                      <option value={ID_TYPES.SSS_ID}>SSS ID</option>
                      <option value={ID_TYPES.POSTAL_ID}>Postal ID</option>
                      <option value={ID_TYPES.BARANGAY_ID}>Barangay ID</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: 8,
                    }}>
                      ID Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.idNumber}
                      onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1.5px solid #e5e7eb',
                        borderRadius: 10,
                        fontSize: 14,
                        fontFamily: "'DM Sans', sans-serif",
                        outline: 'none',
                      }}
                      placeholder="Enter your ID number"
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: 8,
                    }}>
                      Upload ID Photo *
                    </label>
                    <input
                      type="file"
                      required
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'idPhoto')}
                      style={{ display: 'none' }}
                      id="id-photo-upload"
                    />
                    <label
                      htmlFor="id-photo-upload"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: 16,
                        border: '2px dashed #cbd5e1',
                        borderRadius: 10,
                        cursor: 'pointer',
                        background: '#f8fafc',
                        transition: 'all 0.15s',
                      }}
                    >
                      <FiUpload size={20} color="#6b7280" />
                      <span style={{ fontSize: 14, color: '#6b7280' }}>
                        {formData.idPhoto ? formData.idPhoto.name : 'Choose file'}
                      </span>
                    </label>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: 8,
                    }}>
                      Upload Selfie *
                    </label>
                    <input
                      type="file"
                      required
                      accept="image/*"
                      capture="user"
                      onChange={(e) => handleFileChange(e, 'selfiePhoto')}
                      style={{ display: 'none' }}
                      id="selfie-upload"
                    />
                    <label
                      htmlFor="selfie-upload"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: 16,
                        border: '2px dashed #cbd5e1',
                        borderRadius: 10,
                        cursor: 'pointer',
                        background: '#f8fafc',
                        transition: 'all 0.15s',
                      }}
                    >
                      <FiCamera size={20} color="#6b7280" />
                      <span style={{ fontSize: 14, color: '#6b7280' }}>
                        {formData.selfiePhoto ? formData.selfiePhoto.name : 'Take selfie'}
                      </span>
                    </label>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: 10,
                  }}>
                    <button
                      type="button"
                      onClick={() => setShowSubmitForm(false)}
                      disabled={submitting}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        border: '1.5px solid #e5e7eb',
                        borderRadius: 10,
                        background: '#fff',
                        color: '#6b7280',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        border: 'none',
                        borderRadius: 10,
                        background: submitting ? '#9ca3af' : '#2563eb',
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {submitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
      <MobileBottomNav />

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 24,
            maxWidth: 480,
            width: '90%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            overflow: 'hidden',
          }}>
            {/* Animated Success Icon */}
            <div style={{
              padding: '40px 24px 24px',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Confetti effect */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.3) 0%, transparent 60%)',
              }} />
              
              <div style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                animation: 'bounceIn 0.6s ease',
                position: 'relative',
                zIndex: 1,
              }}>
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                }}>
                  <FiCheckCircle size={48} color="#10b981" strokeWidth={2.5} />
                </div>
              </div>
              
              <h2 style={{
                margin: '24px 0 0',
                fontSize: 28,
                fontWeight: 700,
                color: '#fff',
                fontFamily: "'DM Sans', sans-serif",
                position: 'relative',
                zIndex: 1,
              }}>
                Verification Submitted!
              </h2>
            </div>

            {/* Body */}
            <div style={{
              padding: '32px 24px',
              textAlign: 'center',
            }}>
              <p style={{
                margin: '0 0 24px',
                fontSize: 16,
                lineHeight: 1.6,
                color: '#374151',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                Your verification request has been successfully submitted! 🎉
              </p>

              {/* Status Steps */}
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: 12,
                padding: '20px',
                marginBottom: 24,
                textAlign: 'left',
              }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#15803d',
                  marginBottom: 16,
                  textAlign: 'center',
                }}>
                  📋 What happens next:
                </div>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: '#10b981',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      1
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#047857', marginBottom: 2 }}>
                        Review in Progress
                      </div>
                      <div style={{ fontSize: 12, color: '#166534' }}>
                        Admin will review your documents
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: '#10b981',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      2
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#047857', marginBottom: 2 }}>
                        Get Notified
                      </div>
                      <div style={{ fontSize: 12, color: '#166534' }}>
                        You'll receive an update once approved
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: '#10b981',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      3
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#047857', marginBottom: 2 }}>
                        Start Reporting
                      </div>
                      <div style={{ fontSize: 12, color: '#166534' }}>
                        You can submit incident reports
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => setShowSuccessModal(false)}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  border: 'none',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.5)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)'
                }}
              >
                Got It!
              </button>

              <p style={{
                margin: '16px 0 0',
                fontSize: 12,
                color: '#9ca3af',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                This usually takes less than 24 hours ⏱️
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.8) translateY(30px);
          }
          to { 
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}
