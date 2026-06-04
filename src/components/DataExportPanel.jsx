import { useState } from 'react'
import {
  exportToExcel,
  exportToPDF,
  generateMonthlyReport,
  generateQuarterlyReport,
  generateComplianceReport,
} from '../lib/dataExport'
import { FiDownload, FiFileText, FiCalendar, FiFilter } from 'react-icons/fi'

export default function DataExportPanel({ incidents }) {
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    purok: '',
    urgency: '',
    startDate: '',
    endDate: '',
  })
  const [reportType, setReportType] = useState('monthly')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedQuarter, setSelectedQuarter] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const handleExportExcel = () => {
    setExporting(true)
    try {
      console.log('📊 Exporting Excel with', incidents.length, 'incidents')
      console.log('📊 Filters:', filters)
      
      if (!incidents || incidents.length === 0) {
        setSuccessMessage(`⚠️ No incidents to export. Please add some incident reports first.`)
        setShowSuccessModal(true)
        setTimeout(() => setShowSuccessModal(false), 3000)
        return
      }
      
      const filename = exportToExcel(incidents, filters)
      setSuccessMessage(`✅ Excel file "${filename}" downloaded successfully with ${incidents.length} incidents!`)
      setShowSuccessModal(true)
      setTimeout(() => setShowSuccessModal(false), 3000)
    } catch (err) {
      console.error('❌ Excel export error:', err)
      setSuccessMessage(`❌ Export failed: ${err.message}`)
      setShowSuccessModal(true)
      setTimeout(() => setShowSuccessModal(false), 3000)
    } finally {
      setExporting(false)
    }
  }

  const handleExportPDF = () => {
    setExporting(true)
    try {
      console.log('📄 Exporting PDF with', incidents.length, 'incidents')
      console.log('📄 Filters:', filters)
      
      if (!incidents || incidents.length === 0) {
        setSuccessMessage(`⚠️ No incidents to export. Please add some incident reports first.`)
        setShowSuccessModal(true)
        setTimeout(() => setShowSuccessModal(false), 3000)
        return
      }
      
      const filename = exportToPDF(incidents, 'Incident Report', filters)
      setSuccessMessage(`✅ PDF file "${filename}" downloaded successfully with ${incidents.length} incidents!`)
      setShowSuccessModal(true)
      setTimeout(() => setShowSuccessModal(false), 3000)
    } catch (err) {
      console.error('❌ PDF export error:', err)
      setSuccessMessage(`❌ Export failed: ${err.message}`)
      setShowSuccessModal(true)
      setTimeout(() => setShowSuccessModal(false), 3000)
    } finally {
      setExporting(false)
    }
  }

  const handleGenerateReport = () => {
    setExporting(true)
    try {
      console.log('📋 Generating report type:', reportType)
      console.log('📋 Incidents count:', incidents.length)
      
      if (!incidents || incidents.length === 0) {
        setSuccessMessage(`⚠️ No incidents to generate report. Please add some incident reports first.`)
        setShowSuccessModal(true)
        setTimeout(() => setShowSuccessModal(false), 3000)
        return
      }
      
      let report
      let filename

      switch (reportType) {
        case 'monthly':
          report = generateMonthlyReport(incidents, selectedMonth, selectedYear)
          filename = `Monthly_Report_${report.period}.pdf`
          exportToPDF(incidents, filename.replace('.pdf', ''), filters)
          setSuccessMessage(`✅ Monthly Report for ${report.period} generated successfully!`)
          break
        case 'quarterly':
          report = generateQuarterlyReport(incidents, selectedQuarter, selectedYear)
          filename = `Quarterly_Report_${report.period}.pdf`
          exportToPDF(incidents, filename.replace('.pdf', ''), filters)
          setSuccessMessage(`✅ Quarterly Report for ${report.period} generated successfully!`)
          break
        case 'compliance':
          report = generateComplianceReport(
            incidents,
            filters.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            filters.endDate || new Date()
          )
          filename = `Compliance_Report_${new Date().toISOString().split('T')[0]}.pdf`
          exportToPDF(incidents, filename.replace('.pdf', ''), filters)
          setSuccessMessage(`✅ Compliance Report generated successfully!`)
          break
        default:
          throw new Error('Invalid report type')
      }

      setShowSuccessModal(true)
      setTimeout(() => setShowSuccessModal(false), 3000)
    } catch (err) {
      console.error('❌ Report generation error:', err)
      setSuccessMessage(`❌ Report generation failed: ${err.message}`)
      setShowSuccessModal(true)
      setTimeout(() => setShowSuccessModal(false), 3000)
    } finally {
      setExporting(false)
    }
  }

  const clearFilters = () => {
    setFilters({
      type: '',
      status: '',
      purok: '',
      urgency: '',
      startDate: '',
      endDate: '',
    })
  }

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <FiDownload size={18} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{
            margin: 0,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 16,
            fontWeight: 700,
            color: '#111827',
          }}>
            Data Export & Reporting
          </h3>
          <p style={{
            margin: '2px 0 0',
            fontSize: 12,
            color: '#6b7280',
          }}>
            Export incident data and generate reports ({incidents?.length || 0} incidents available)
          </p>
        </div>
      </div>

      {/* Filters Section */}
      <div style={{
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
        }}>
          <FiFilter size={14} color="#6b7280" />
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#374151',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            Filter Options
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 600,
              color: '#6b7280',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1.5px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                outline: 'none',
              }}
            >
              <option value="">All Types</option>
              <option value="Crime">Crime</option>
              <option value="Accident">Accident</option>
              <option value="Fire">Fire</option>
              <option value="Flood">Flood</option>
              <option value="Disturbance">Disturbance</option>
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 600,
              color: '#6b7280',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1.5px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                outline: 'none',
              }}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="responding">Responding</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 600,
              color: '#6b7280',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1.5px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 600,
              color: '#6b7280',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1.5px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                outline: 'none',
              }}
            />
          </div>
        </div>

        <button
          onClick={clearFilters}
          style={{
            marginTop: 10,
            padding: '6px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            background: '#fff',
            fontSize: 12,
            fontWeight: 600,
            color: '#6b7280',
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Clear Filters
        </button>
      </div>

      {/* Quick Export Actions */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#374151',
          marginBottom: 10,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Quick Export
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              borderRadius: 10,
              background: exporting ? '#9ca3af' : '#10b981',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: exporting ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <FiFileText size={16} />
            Export Excel
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              borderRadius: 10,
              background: exporting ? '#9ca3af' : '#ef4444',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: exporting ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <FiFileText size={16} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Report Generation */}
      <div>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#374151',
          marginBottom: 10,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Generate Reports
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => setReportType('monthly')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: `1.5px solid ${reportType === 'monthly' ? '#2563eb' : '#e5e7eb'}`,
              borderRadius: 8,
              background: reportType === 'monthly' ? '#eff6ff' : '#fff',
              color: reportType === 'monthly' ? '#2563eb' : '#6b7280',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setReportType('quarterly')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: `1.5px solid ${reportType === 'quarterly' ? '#2563eb' : '#e5e7eb'}`,
              borderRadius: 8,
              background: reportType === 'quarterly' ? '#eff6ff' : '#fff',
              color: reportType === 'quarterly' ? '#2563eb' : '#6b7280',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Quarterly
          </button>
          <button
            onClick={() => setReportType('compliance')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: `1.5px solid ${reportType === 'compliance' ? '#2563eb' : '#e5e7eb'}`,
              borderRadius: 8,
              background: reportType === 'compliance' ? '#eff6ff' : '#fff',
              color: reportType === 'compliance' ? '#2563eb' : '#6b7280',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Compliance
          </button>
        </div>

        {reportType === 'monthly' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 12 }}>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              style={{
                padding: '8px 10px',
                border: '1.5px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                outline: 'none',
              }}
            >
              {[...Array(12)].map((_, i) => (
                <option key={i} value={i}>
                  {new Date(2024, i, 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              min="2020"
              max="2030"
              style={{
                padding: '8px 10px',
                border: '1.5px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                outline: 'none',
              }}
            />
          </div>
        )}

        {reportType === 'quarterly' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
              style={{
                padding: '8px 10px',
                border: '1.5px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                outline: 'none',
              }}
            >
              <option value={1}>Q1 (Jan-Mar)</option>
              <option value={2}>Q2 (Apr-Jun)</option>
              <option value={3}>Q3 (Jul-Sep)</option>
              <option value={4}>Q4 (Oct-Dec)</option>
            </select>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              min="2020"
              max="2030"
              style={{
                padding: '8px 10px',
                border: '1.5px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                outline: 'none',
              }}
            />
          </div>
        )}

        <button
          onClick={handleGenerateReport}
          disabled={exporting}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: 'none',
            borderRadius: 10,
            background: exporting ? '#9ca3af' : '#2563eb',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: exporting ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <FiCalendar size={16} />
          {exporting ? 'Generating...' : `Generate ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`}
        </button>
      </div>

      {/* Success/Error Modal */}
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
            borderRadius: 16,
            maxWidth: 420,
            width: '90%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '24px',
              textAlign: 'center',
              background: successMessage.includes('❌') 
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                animation: 'bounceIn 0.6s ease',
              }}>
                <div style={{
                  fontSize: 32,
                }}>
                  {successMessage.includes('❌') ? '❌' : '✅'}
                </div>
              </div>
              
              <h2 style={{
                margin: '16px 0 0',
                fontSize: 20,
                fontWeight: 700,
                color: '#fff',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {successMessage.includes('❌') ? 'Export Failed' : 'Export Successful'}
              </h2>
            </div>

            {/* Body */}
            <div style={{
              padding: '20px 24px',
              textAlign: 'center',
            }}>
              <p style={{
                margin: '0 0 16px',
                fontSize: 14,
                lineHeight: 1.6,
                color: '#374151',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {successMessage.replace('✅ ', '').replace('❌ ', '')}
              </p>

              <button
                onClick={() => setShowSuccessModal(false)}
                style={{
                  width: '100%',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: 10,
                  background: successMessage.includes('❌') ? '#ef4444' : '#10b981',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
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
