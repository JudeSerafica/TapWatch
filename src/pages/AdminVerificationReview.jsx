import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'
import {
  getPendingVerifications,
  reviewVerification,
  getReputationLeaderboard,
  getVerificationDocumentUrl,
  getVerifiedUsers,
} from '../lib/userVerification'
import UserVerificationBadge from '../components/UserVerificationBadge'
import AdminMobileBottomNav from '../components/AdminMobileBottomNav'
import TopBar from '../components/TopBar'
import { FiShield, FiCheckCircle, FiXCircle, FiUser, FiMail, FiPhone, FiAward, FiX } from 'react-icons/fi'

export default function AdminVerificationReview() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [pendingVerifications, setPendingVerifications] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [verifiedUsers, setVerifiedUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [selectedVerification, setSelectedVerification] = useState(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showImageModal, setShowImageModal] = useState(false)
  const [currentImage, setCurrentImage] = useState(null)
  const [loadingImage, setLoadingImage] = useState(false)

  useEffect(() => {
    if (profile?.role !== 'admin') {
      navigate('/dashboard')
      return
    }
    loadData()

    // Re-fetch verified users list when any profile verification_status changes
    const subscription = supabase
      .channel('profiles-verification')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
      }, () => {
        loadData()
      })
      .subscribe()

    return () => subscription.unsubscribe()
  }, [profile])

  const loadData = async () => {
    setLoading(true)
    try {
      const [verificationsData, leaderboardData, verifiedUsersData] = await Promise.all([
        getPendingVerifications(),
        getReputationLeaderboard(10),
        getVerifiedUsers(20),
      ])

      console.log('📥 Data loaded:')
      console.log('   Pending verifications:', verificationsData.data?.length || 0)
      console.log('   Leaderboard users:', leaderboardData.data?.length || 0)
      console.log('   Verified users:', verifiedUsersData.data?.length || 0)
      console.log('   Verified users data:', verifiedUsersData.data)

      setPendingVerifications(verificationsData.data || [])
      setLeaderboard(leaderboardData.data || [])
      setVerifiedUsers(verifiedUsersData.data || [])
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (verificationId, decision) => {
    setReviewing(verificationId)

    try {
      const { error } = await reviewVerification(verificationId, decision, reviewNotes)

      if (error) throw error

      // Show success modal
      setSuccessMessage(decision === 'approve' ? 'User has been verified successfully! ✅' : 'Verification request has been rejected.')
      setShowSuccessModal(true)
      setSelectedVerification(null)
      setReviewNotes('')
      loadData()

      // Auto close after 3 seconds
      setTimeout(() => {
        setShowSuccessModal(false)
      }, 3000)
    } catch (err) {
      console.error('Review error:', err)
      alert('Failed to review verification: ' + err.message)
    } finally {
      setReviewing(null)
    }
  }

  const handleViewDocument = async (url, title) => {
    setLoadingImage(true)
    setShowImageModal(true)
    setCurrentImage({ url: null, title })

    try {
      const signedUrl = await getVerificationDocumentUrl(url)
      if (signedUrl) {
        setCurrentImage({ url: signedUrl, title })
      } else {
        alert('Failed to load document')
        setShowImageModal(false)
      }
    } catch (err) {
      console.error('Error loading document:', err)
      alert('Failed to load document')
      setShowImageModal(false)
    } finally {
      setLoadingImage(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="flex-1 pb-16 md:pb-0">
          <TopBar title="Verification Review" showNotifications={true} />
          <main className="p-4 md:p-6 max-w-6xl mx-auto">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading verifications...</p>
            </div>
          </main>
        </div>
        <AdminMobileBottomNav />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex-1 pb-16 md:pb-0">
        <TopBar title="Verification Review" showNotifications={true} />

        <main className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
            <div style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <FiShield size={24} color="#f59e0b" />
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>
                    {pendingVerifications.length}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    Pending Reviews
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: '#d1fae5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <FiCheckCircle size={24} color="#10b981" />
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>
                    {leaderboard.length}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    Active Users
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Verifications */}
          <div style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <FiShield size={20} color="#2563eb" />
              <h2 style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: '#111827',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                Pending Verifications
              </h2>
            </div>

            <div style={{ padding: 24 }}>
              {pendingVerifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
                  <FiCheckCircle size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                  <p style={{ fontSize: 15, margin: 0 }}>No pending verifications</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                  {pendingVerifications.map((verification) => (
                    <div
                      key={verification.id}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: 12,
                        padding: 16,
                        background: '#fafafa',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: '#e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <FiUser size={24} color="#6b7280" />
                          </div>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
                              {verification.profiles?.full_name || 'Unknown'}
                            </div>
                            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                              {verification.profiles?.email}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 12,
                        padding: 12,
                        background: '#fff',
                        borderRadius: 8,
                        marginBottom: 12,
                      }}>
                        <div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>ID Type</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                            {verification.id_type?.replace('_', ' ').toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>ID Number</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                            {verification.id_number}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Submitted</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                            {new Date(verification.submitted_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        {verification.id_photo_url && (
                          <button
                            onClick={() => handleViewDocument(verification.id_photo_url, 'ID Photo')}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              border: '1px solid #cbd5e1',
                              borderRadius: 8,
                              background: '#fff',
                              textAlign: 'center',
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#2563eb',
                              cursor: 'pointer',
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            View ID Photo
                          </button>
                        )}
                        {verification.selfie_url && (
                          <button
                            onClick={() => handleViewDocument(verification.selfie_url, 'Selfie Photo')}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              border: '1px solid #cbd5e1',
                              borderRadius: 8,
                              background: '#fff',
                              textAlign: 'center',
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#2563eb',
                              cursor: 'pointer',
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            View Selfie
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleReview(verification.id, 'approve')}
                          disabled={reviewing === verification.id}
                          style={{
                            flex: 1,
                            padding: '10px 16px',
                            border: 'none',
                            borderRadius: 8,
                            background: reviewing === verification.id ? '#9ca3af' : '#10b981',
                            color: '#fff',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: reviewing === verification.id ? 'not-allowed' : 'pointer',
                            fontFamily: "'DM Sans', sans-serif",
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                          }}
                        >
                          <FiCheckCircle size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReview(verification.id, 'reject')}
                          disabled={reviewing === verification.id}
                          style={{
                            flex: 1,
                            padding: '10px 16px',
                            border: 'none',
                            borderRadius: 8,
                            background: reviewing === verification.id ? '#9ca3af' : '#ef4444',
                            color: '#fff',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: reviewing === verification.id ? 'not-allowed' : 'pointer',
                            fontFamily: "'DM Sans', sans-serif",
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                          }}
                        >
                          <FiXCircle size={16} />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reputation Leaderboard */}
          <div style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <FiAward size={20} color="#f59e0b" />
              <h2 style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: '#111827',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                Top Contributors
              </h2>
            </div>

            <div style={{ padding: 24 }}>
              {leaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
                  <p style={{ fontSize: 15, margin: 0 }}>No data yet</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {leaderboard.map((user, index) => (
                    <div
                      key={user.user_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        padding: 16,
                        background: index < 3 ? '#fef3c7' : '#f9fafb',
                        borderRadius: 12,
                        border: `1px solid ${index < 3 ? '#fbbf24' : '#e5e7eb'}`,
                      }}
                    >
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: index === 0 ? '#fbbf24' : index === 1 ? '#cbd5e1' : index === 2 ? '#f97316' : '#e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#fff',
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
                          {user.profiles?.full_name || 'Unknown'}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                          {user.profiles?.purok || 'No purok'}
                        </div>
                      </div>
                      <UserVerificationBadge
                        badgeLevel={user.badge_level}
                        score={user.score}
                        size="small"
                      />
                      <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: '#2563eb',
                      }}>
                        {user.score}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Verified Users List */}
          <div style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <FiCheckCircle size={20} color="#10b981" />
              <h2 style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: '#111827',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                Verified Users
              </h2>
            </div>

            <div style={{ padding: 24 }}>
              {verifiedUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
                  <FiCheckCircle size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                  <p style={{ fontSize: 15, margin: 0 }}>No verified users yet</p>
                </div>
              ) : (
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 16 
                }}>
                  {verifiedUsers.map((user) => (
                    <div
                      key={user.id}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: 12,
                        padding: 16,
                        background: '#f9fafb',
                        transition: 'all 0.3s ease',
                        hover: {
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          transform: 'translateY(-2px)',
                        }
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none'
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}
                    >
                      {/* User Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          fontWeight: 700,
                          color: '#fff',
                        }}>
                          ✓
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                            {user.full_name || 'Unknown'}
                          </div>
                          <div style={{ fontSize: 12, color: '#10b981', marginTop: 2, fontWeight: 500 }}>
                            Verified User
                          </div>
                        </div>
                      </div>

                      {/* User Info */}
                      <div style={{ space: '12px' }}>
                        {user.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <FiMail size={14} color="#6b7280" />
                            <span style={{ fontSize: 12, color: '#6b7280', wordBreak: 'break-all' }}>
                              {user.email}
                            </span>
                          </div>
                        )}
                        {user.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <FiPhone size={14} color="#6b7280" />
                            <span style={{ fontSize: 12, color: '#6b7280' }}>
                              {user.phone}
                            </span>
                          </div>
                        )}
                        {user.purok && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <FiUser size={14} color="#6b7280" />
                            <span style={{ fontSize: 12, color: '#6b7280' }}>
                              {user.purok}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Divider */}
                      <div style={{ height: 1, background: '#e5e7eb', margin: '12px 0' }} />

                      {/* Verification Date */}
                      <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
                        Verified on {new Date(user.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      <AdminMobileBottomNav />

      {/* Image Preview Modal */}
      {showImageModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.3s ease',
          padding: 20,
        }}
        onClick={() => setShowImageModal(false)}
        >
          <div style={{
            background: '#fff',
            borderRadius: 16,
            maxWidth: 800,
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            position: 'relative',
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f9fafb',
            }}>
              <h3 style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: '#111827',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {currentImage?.title || 'Document'}
              </h3>
              <button
                onClick={() => setShowImageModal(false)}
                style={{
                  padding: 8,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FiX size={20} color="#6b7280" />
              </button>
            </div>

            {/* Image */}
            <div style={{
              padding: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 400,
              maxHeight: 'calc(90vh - 100px)',
              overflow: 'auto',
              background: '#f3f4f6',
            }}>
              {loadingImage ? (
                <div style={{ textAlign: 'center' }}>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p style={{ marginTop: 16, color: '#6b7280', fontSize: 14 }}>Loading document...</p>
                </div>
              ) : currentImage?.url ? (
                <img
                  src={currentImage.url}
                  alt={currentImage.title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: 8,
                  }}
                />
              ) : (
                <p style={{ color: '#6b7280', fontSize: 14 }}>Failed to load document</p>
              )}
            </div>
          </div>
        </div>
      )}

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
            borderRadius: 20,
            maxWidth: 420,
            width: '90%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '32px 24px',
              textAlign: 'center',
              background: successMessage.includes('verified') 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              position: 'relative',
            }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                animation: 'bounceIn 0.6s ease',
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {successMessage.includes('verified') ? (
                    <FiCheckCircle size={36} color="#10b981" strokeWidth={2.5} />
                  ) : (
                    <FiXCircle size={36} color="#ef4444" strokeWidth={2.5} />
                  )}
                </div>
              </div>
              
              <h2 style={{
                margin: '20px 0 0',
                fontSize: 24,
                fontWeight: 700,
                color: '#fff',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {successMessage.includes('verified') ? 'Verification Approved' : 'Verification Rejected'}
              </h2>
            </div>

            {/* Body */}
            <div style={{
              padding: '24px',
              textAlign: 'center',
            }}>
              <p style={{
                margin: '0 0 20px',
                fontSize: 15,
                lineHeight: 1.6,
                color: '#374151',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {successMessage}
              </p>

              <button
                onClick={() => setShowSuccessModal(false)}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: 10,
                  background: successMessage.includes('verified') ? '#10b981' : '#ef4444',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'all 0.2s',
                }}
              >
                Got It!
              </button>
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
            transform: scale(0.9) translateY(20px);
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
            transform: scale(1.05);
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
