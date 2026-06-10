import { useState } from 'react'
import { reportTemplates, getTemplatesByCategory, createQuickReport } from '../lib/reportTemplates'
import { createIncident } from '../lib/database'
import { notifyAllAdmins } from '../lib/notificationService'
import { playReportAlarm } from '../lib/alarmService'
import { FiZap, FiClock, FiCheck } from 'react-icons/fi'

export default function QuickReportTemplates({ profile, currentLocation, onReportSubmitted, onVerificationRequired }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [additionalDetails, setAdditionalDetails] = useState('')

  const categories = getTemplatesByCategory()

  const handleQuickReport = async (templateId) => {
    // ✅ CHECK VERIFICATION STATUS FIRST
    if (!profile?.verification_status || profile.verification_status === 'unverified') {
      if (onVerificationRequired) {
        onVerificationRequired()
      }
      return
    }

    const template = reportTemplates[templateId]
    
    // For emergency templates, submit immediately
    if (template.category === 'Emergency' || template.category === 'Quick') {
      await submitQuickReport(templateId, '')
    } else {
      // For standard templates, ask for additional details
      setSelectedTemplate(templateId)
      setShowModal(true)
    }
  }

  const submitQuickReport = async (templateId, details = '') => {
    setSubmitting(true)

    try {
      const quickReportData = await createQuickReport(
        templateId,
        currentLocation,
        profile?.id,
        profile
      )

      // Add additional details if provided
      if (details) {
        quickReportData.description = `${quickReportData.description}\n\nAdditional Details: ${details}`
      }

      const { data, error } = await createIncident(quickReportData)

      if (error) throw error

      // 🔊 Play report alarm sound for admin notification
      playReportAlarm()

      // Notify admins
      await notifyAllAdmins({
        title: `Quick Report: ${reportTemplates[templateId].name}`,
        message: `Emergency report submitted at ${currentLocation}`,
        type: 'alert',
        incidentId: data.id,
      })

      if (onReportSubmitted) {
        onReportSubmitted(data)
      }

      setShowModal(false)
      setAdditionalDetails('')
    } catch (err) {
      console.error('Quick report failed:', err)
      alert('Failed to submit quick report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <FiZap size={18} color="#fff" />
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              fontWeight: 700,
              color: '#111827',
            }}>
              Quick Report Templates
            </h3>
            <p style={{
              margin: '2px 0 0',
              fontSize: 12,
              color: '#6b7280',
            }}>
              Report incidents instantly with one tap
            </p>
          </div>
        </div>

        {/* Emergency Templates */}
        {categories.Emergency.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#dc2626',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 8,
            }}>
              🚨 Emergency Templates
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {categories.Emergency.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleQuickReport(template.id)}
                  disabled={submitting}
                  style={{
                    padding: '12px',
                    border: `2px solid ${template.color}`,
                    borderRadius: 12,
                    background: `${template.color}08`,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'center',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.background = `${template.color}15`
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `${template.color}08`
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{template.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: template.color }}>
                    {template.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Standard Templates */}
        {categories.Standard.length > 0 && (
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#2563eb',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 8,
            }}>
              📋 Standard Templates
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {categories.Standard.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleQuickReport(template.id)}
                  disabled={submitting}
                  style={{
                    padding: '12px',
                    border: `2px solid ${template.color}`,
                    borderRadius: 12,
                    background: `${template.color}08`,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'center',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.background = `${template.color}15`
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `${template.color}08`
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{template.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: template.color }}>
                    {template.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Additional Details Modal */}
      {showModal && selectedTemplate && (
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
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 32 }}>
                  {reportTemplates[selectedTemplate].icon}
                </div>
                <div>
                  <h3 style={{
                    margin: 0,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#111827',
                  }}>
                    {reportTemplates[selectedTemplate].name}
                  </h3>
                  <p style={{
                    margin: '4px 0 0',
                    fontSize: 13,
                    color: '#6b7280',
                  }}>
                    Add additional details (optional)
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px' }}>
              <textarea
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                placeholder={reportTemplates[selectedTemplate].prompts?.description || 'Provide additional details...'}
                style={{
                  width: '100%',
                  minHeight: 100,
                  padding: '12px 14px',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: 10,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  resize: 'vertical',
                  outline: 'none',
                }}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: 10,
            }}>
              <button
                onClick={() => {
                  setShowModal(false)
                  setAdditionalDetails('')
                }}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: 10,
                  background: '#fff',
                  color: '#6b7280',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => submitQuickReport(selectedTemplate, additionalDetails)}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: 10,
                  background: submitting ? '#9ca3af' : reportTemplates[selectedTemplate].color,
                  color: '#fff',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {submitting ? (
                  <>
                    <FiClock size={16} />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FiCheck size={16} />
                    Submit Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
