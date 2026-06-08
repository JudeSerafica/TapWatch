import { useState, useEffect, useRef } from 'react'
import {
  Search,
  ChevronDown,
  X,
  User,
  MapPin,
  Calendar,
  Image as ImageIcon,
  Play,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
} from 'lucide-react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import * as XLSX from 'xlsx'
import { useTranslation } from '../lib/i18n'

import AdminSidebar from '../components/AdminSidebar'
import AdminNavTabs from '../components/AdminNavTabs'
import AdminMobileBottomNav from '../components/AdminMobileBottomNav'
import StatusBadge from '../components/StatusBadge'
import IncidentIcon from '../components/IncidentIcon'
import TopBar from '../components/TopBar'
import Toast, { useToast } from '../components/Toast'
import { FaDownload } from 'react-icons/fa6'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../lib/supabase'
import { MdDelete } from "react-icons/md"
import { eastTapinacGeoJSON } from '../data/EastTapinac'

import {
  getIncidents,
  updateIncident,
  updateIncidentStatus,
  subscribeToIncidents,
  deleteIncident as deleteIncidentDB,
} from '../lib/database'

// Emergency fix will be imported dynamically when needed

import {
  generateIncidentSummary,
  generateNarrativeReport,
} from '../lib/reportGenerator'

// ─────────────────────────────────────────────────────────────
// MAP UTILITIES
// ─────────────────────────────────────────────────────────────

const typeColors = {
  crime: '#9333ea',
  accident: '#f97316',
  fire: '#ef4444',
  flood: '#3b82f6',
  disturbance: '#eab308',
}

function createIncidentIcon(type, isFocused = true) {
  const color = typeColors[type] || '#6b7280'
  const size = isFocused ? 36 : 28
  const height = isFocused ? 45 : 35

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width:${size}px;
        height:${height}px;
        display:flex;
        align-items:center;
        justify-content:center;
        ${isFocused ? 'animation: pulse 2s infinite;' : ''}
      ">
        <svg width="${size}" height="${height}" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C7.58 0 4 3.58 4 8C4 14 12 24 12 24C12 24 20 14 20 8C20 3.58 16.42 0 12 0Z" fill="${color}" stroke="white" stroke-width="1.5"/>
          <circle cx="12" cy="8" r="3" fill="white"/>
        </svg>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      </style>
    `,
    iconSize: [size, height],
    iconAnchor: [size / 2, height],
    popupAnchor: [0, -height],
  })
}

// Map Bounds Handler Component for displaying GeoJSON boundaries
function MapBoundsHandler() {
  const map = useMap()
  const geoJsonRef = useRef(null)

  useEffect(() => {
    if (!map || !geoJsonRef.current) return

    const layer = geoJsonRef.current

    let bounds = null

    if (layer.getLayers) {
      layer.getLayers().forEach((geoLayer) => {
        const layerBounds = geoLayer.getBounds()

        if (bounds) {
          bounds.extend(layerBounds)
        } else {
          bounds = layerBounds
        }
      })
    }

    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [20, 20],
      })
    }
  }, [map])

  return (
    <GeoJSON
      ref={geoJsonRef}
      data={eastTapinacGeoJSON}
      style={{
        color: '#1d4ed8',
        weight: 5,
        opacity: 0.7,
        fillColor: '#3b82f6',
        fillOpacity: 0.08,
      }}
    />
  )
}

// Fly to incident location component
function FlyToIncidentModal({ incident }) {
  const map = useMap()

  useEffect(() => {
    if (incident && incident.latitude && incident.longitude) {
      map.flyTo([incident.latitude, incident.longitude], 18, {
        duration: 1.2,
      })
    }
  }, [incident, map])

  return null
}

const isVideoFile = (url = '', name = '') => {
  if (!url) return false

  if (
    url.includes('.mp4') ||
    url.includes('.mov') ||
    url.includes('.webm') ||
    url.includes('video')
  ) {
    return true
  }

  if (name) {
    const lower = name.toLowerCase()

    return (
      lower.endsWith('.mp4') ||
      lower.endsWith('.mov') ||
      lower.endsWith('.webm')
    )
  }

  return false
}

// ─────────────────────────────────────────────────────────────
// EXPORT FUNCTIONS
// ─────────────────────────────────────────────────────────────

const exportToExcel = (data, filename = 'incidents_report') => {
  const excelData = data.map((incident) => ({
    'Type': incident.type?.toUpperCase() || 'N/A',
    'Description': incident.description || 'N/A',
    'Location': incident.location || 'N/A',
    'Purok': incident.purok || 'N/A',
    'Date': new Date(incident.created_at).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }),
    'Status': incident.status?.toUpperCase() || 'N/A',
    'Reporter': incident.reporter_name || incident.profiles?.full_name || 'Anonymous',
    'Contact': incident.reporter_contact || 'N/A',
    'AI Classification': incident.ai_classification || incident.type || 'N/A',
    'Official Notes': incident.official_notes || 'N/A',
  }))

  const ws = XLSX.utils.json_to_sheet(excelData)

  // Column widths
  ws['!cols'] = [
    { wch: 12 }, // Type
    { wch: 30 }, // Description
    { wch: 25 }, // Location
    { wch: 15 }, // Purok
    { wch: 20 }, // Date
    { wch: 12 }, // Status
    { wch: 20 }, // Reporter
    { wch: 15 }, // AI Classification
    { wch: 30 }, // Official Notes
  ]

  // Style header row — blue background, white bold text
  const headers = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1', 'I1']
  headers.forEach((cell) => {
    if (ws[cell]) {
      ws[cell].s = {
        fill: {
          patternType: 'solid',
          fgColor: { rgb: '3B82F6' }, // blue-500
        },
        font: {
          bold: true,
          color: { rgb: 'FFFFFF' },
          sz: 11,
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center',
        },
        border: {
          top: { style: 'thin', color: { rgb: '2563EB' } },
          bottom: { style: 'thin', color: { rgb: '2563EB' } },
          left: { style: 'thin', color: { rgb: '2563EB' } },
          right: { style: 'thin', color: { rgb: '2563EB' } },
        },
      }
    }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Incidents')

  const timestamp = new Date().toISOString().split('T')[0]
  const finalFilename = `${filename}_${timestamp}.xlsx`

  // xlsx-js-style supports cell styling — use writeFile with cellStyles option
  XLSX.writeFile(wb, finalFilename, { cellStyles: true })
}

const exportToPDF = (data, typeFilter) => {
  try {
    const doc = new jsPDF()

    const title = typeFilter === 'All Types'
      ? 'All Incidents Report'
      : `${typeFilter} Incidents Report`

    doc.setFontSize(18)
    doc.text(title, 14, 20)

    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)
    doc.text(`Total Records: ${data.length}`, 14, 34)

    const tableData = data.map((incident) => [
      (incident.type || 'N/A').toUpperCase(),
      (incident.description || 'N/A').substring(0, 40),
      (incident.location || 'N/A').substring(0, 25),
      new Date(incident.created_at).toLocaleDateString(),
      (incident.status || 'N/A').toUpperCase(),
      incident.reporter_name || incident.profiles?.full_name || 'Anonymous',
      incident.reporter_contact || 'N/A',
    ])

    autoTable(doc, {
      startY: 40,
      head: [['Type', 'Description', 'Location', 'Date', 'Status', 'Reporter', 'Contact']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 45 },
        2: { cellWidth: 35 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 28 },
        6: { cellWidth: 25 },
      },
      margin: { top: 40, left: 14, right: 14 },
      styles: {
        overflow: 'linebreak',
        cellPadding: 2,
        fontSize: 8,
      },
    })

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = typeFilter === 'All Types'
      ? `all_incidents_${timestamp}.pdf`
      : `${typeFilter.toLowerCase()}_incidents_${timestamp}.pdf`

    doc.save(filename)
  } catch (error) {
    console.error('Error generating PDF:', error)
    alert('Error generating PDF: ' + error.message)
  }
}

const exportToWord = (data, typeFilter) => {
  Promise.all([
    import('docx'),
    import('file-saver')
  ]).then(([docxModule, fileSaverModule]) => {
    const {
      Document, Paragraph, Table, TableCell, TableRow,
      WidthType, AlignmentType, TextRun, ShadingType, Packer
    } = docxModule
    const { saveAs } = fileSaverModule

    const title = typeFilter === 'All Types'
      ? 'All Incidents Report'
      : `${typeFilter} Incidents Report`

    const headerLabels = ['Type', 'Description', 'Location', 'Date', 'Status', 'Reporter', 'Contact']

    // Header row — blue background, white bold text
    const headerRow = new TableRow({
      tableHeader: true,
      children: headerLabels.map((label) =>
        new TableCell({
          shading: {
            type: ShadingType.SOLID,
            color: '3B82F6', // blue-500
            fill: '3B82F6',
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: label,
                  bold: true,
                  color: 'FFFFFF',
                  size: 18,
                }),
              ],
            }),
          ],
        })
      ),
    })

    // Data rows
    const dataRows = data.map((incident, index) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(incident.type?.toUpperCase() || 'N/A')] }),
          new TableCell({ children: [new Paragraph(incident.description || 'N/A')] }),
          new TableCell({ children: [new Paragraph(incident.location || 'N/A')] }),
          new TableCell({ children: [new Paragraph(new Date(incident.created_at).toLocaleDateString())] }),
          new TableCell({ children: [new Paragraph(incident.status?.toUpperCase() || 'N/A')] }),
          new TableCell({ children: [new Paragraph(incident.reporter_name || incident.profiles?.full_name || 'Anonymous')] }),
          new TableCell({ children: [new Paragraph(incident.reporter_contact || 'N/A')] }),
        ],
      })
    )

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            children: [new TextRun({ text: title, bold: true, size: 32 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Generated: ${new Date().toLocaleString()}`, size: 18, color: '6B7280' })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Total Records: ${data.length}`, size: 18, color: '6B7280' })],
            spacing: { after: 300 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
          }),
        ],
      }],
    })

    Packer.toBlob(doc).then((blob) => {
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = typeFilter === 'All Types'
        ? `all_incidents_${timestamp}.docx`
        : `${typeFilter.toLowerCase()}_incidents_${timestamp}.docx`
      saveAs(blob, filename)
    })
  })
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function AllReports() {
  const { t } = useTranslation()
  const { toast, showToast } = useToast()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState({
    startDate: '',
    endDate: '',
    hasEvidence: false,
    sosOnly: false,
  })

  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedIncident, setSelectedIncident] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [officialNotes, setOfficialNotes] = useState('')

  const [selectedMedia, setSelectedMedia] = useState(null)
  const [mediaPreviewOpen, setMediaPreviewOpen] = useState(false)

  const [exportOpen, setExportOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  // LOAD INCIDENTS
  useEffect(() => {
    const loadIncidents = async () => {

      const { data, error } = await getIncidents()

      if (error) {
        console.error('Error fetching incidents:', error)
      } else {
        setIncidents(data || [])
      }

      setLoading(false)
    }

    loadIncidents()

    const subscription = subscribeToIncidents((payload) => {
      if (payload.eventType === 'INSERT') {
        setIncidents((prev) => [payload.new, ...prev])
      } else if (payload.eventType === 'UPDATE') {
        setIncidents((prev) =>
          prev.map((i) =>
            i.id === payload.new.id ? payload.new : i
          )
        )
      } else if (payload.eventType === 'DELETE') {
        setIncidents((prev) =>
          prev.filter((i) => i.id !== payload.old.id)
        )
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // OPEN MODAL
  const openModal = (incident) => {
    setSelectedIncident(incident)
    setOfficialNotes(incident.official_notes || '')
    setIsModalOpen(true)
  }

  // CLOSE MODAL
  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedIncident(null)
    setOfficialNotes('')
  }

  // UPDATE STATUS (with emergency fix)
  const updateStatus = async (newStatus) => {
    console.log(`🔄 Attempting to update status to: ${newStatus}`)
    
    // Try emergency fix first
    const { directStatusUpdate } = await import('../lib/emergencyFix')
    const { success, error, data } = await directStatusUpdate(
      selectedIncident.id,
      newStatus
    )

    if (!success || error) {
      // If emergency fix fails, try the regular way
      console.warn('⚠️ Emergency fix failed, trying regular update...')
      const { error: regularError } = await updateIncidentStatus(
        selectedIncident.id,
        newStatus
      )
      
      if (regularError) {
        showToast('Failed to update status: ' + regularError.message, 'error')
        console.error('❌ All status update methods failed:', regularError)
        return
      }
    }

    console.log('✅ Status update successful:', data)
    
    // Update both selected incident and incidents array
    setSelectedIncident((prev) => ({
      ...prev,
      status: newStatus,
    }))
    
    // Update incidents array so it reflects in the table
    setIncidents((prev) => 
      prev.map(incident => 
        incident.id === selectedIncident.id 
          ? { ...incident, status: newStatus }
          : incident
      )
    )
    
    // Show success toast
    const statusEmoji = {
      'pending': '📋',
      'responding': '🚨',
      'resolved': '✅'
    }
    const emoji = statusEmoji[newStatus] || ''
    showToast(`${emoji} Status updated to ${newStatus}!`, 'success', 2000)
    console.log(`✅ Status updated to ${newStatus}`)
    
    // Verify the status was actually saved
    setTimeout(async () => {
      const { verifyStatusUpdate } = await import('../lib/emergencyFix')
      const verify = await verifyStatusUpdate(selectedIncident.id)
      console.log('🔍 Status verification:', verify)
      if (verify.success && verify.data?.status === newStatus) {
        console.log('✅ CONFIRMED: Status saved to database!')
      } else {
        console.warn('⚠️ WARNING: Status may not have saved to database')
      }
    }, 1000)
  }

  // SAVE NOTES
  const saveNotes = async () => {
    if (!officialNotes || officialNotes.trim() === '') {
      showToast('Please add notes before saving', 'warning')
      return
    }

    const { error } = await updateIncident(
      selectedIncident.id,
      {
        official_notes: officialNotes,
      }
    )

    if (error) {
      showToast('Failed to save notes: ' + error.message, 'error')
      console.error('❌ Failed to save notes:', error)
      return
    }

    console.log('✅ Notes saved to database')

    // Send notification to user that official notes were added
    try {
      const { createNotification } = await import('../lib/notificationService')
      
      console.log('📤 Creating notification for user:', selectedIncident.user_id)
      
      const { data: notifData, error: notifError } = await createNotification({
        userId: selectedIncident.user_id,
        title: `📋 Official Notes on Your ${selectedIncident.type?.toUpperCase()} Report`,
        message: `The barangay has added official notes to your incident report. Please check your incident details to read them.`,
        type: 'note',
        incidentId: selectedIncident.id
      })
      
      if (notifError) {
        console.warn('⚠️ Notification creation failed:', notifError)
        showToast('✅ Notes saved! (notification to user pending)', 'success', 2000)
      } else {
        console.log('✅ Notification created successfully:', notifData)
        showToast('✅ Notes saved and user notified!', 'success', 2000)
      }
    } catch (notifErr) {
      console.error('❌ Error creating notification:', notifErr)
      showToast('✅ Notes saved! (notification pending)', 'success', 2000)
    }
  }

  // SEND NOTES TO USER
  const sendNotesToUser = async () => {
    if (!officialNotes || !selectedIncident) {
      showToast('No notes to send', 'warning')
      return
    }

    try {
      console.log('📬 Starting to send notes to user:', selectedIncident.user_id)
      
      // First save the notes
      const { error: saveError } = await updateIncident(
        selectedIncident.id,
        {
          official_notes: officialNotes,
        }
      )

      if (saveError) {
        console.error('❌ Failed to save notes:', saveError)
        showToast('Failed to save notes: ' + saveError.message, 'error')
        return
      }

      console.log('✅ Notes saved to incident')
      showToast('✅ Notes saved successfully!', 'success', 2000)

      // Then send notification to user using the proper function
      // This is optional - don't fail if it doesn't work
      try {
        const { createNotification } = await import('../lib/notificationService')
        
        const notificationData = {
          userId: selectedIncident.user_id,
          title: `📋 Official Notes on Your ${selectedIncident.type?.toUpperCase()} Report`,
          message: `The barangay has added official notes to your incident report. Please check your incident details to read them.`,
          type: 'note',
          incidentId: selectedIncident.id
        }

        console.log('📤 Sending notification with data:', notificationData)

        const { data: notifData, error: notifError } = await createNotification(notificationData)

        if (notifError) {
          console.warn('⚠️ Notification creation error (non-critical):', notifError)
          // Don't fail - just log warning
          console.log('✅ Notes were saved, but notification to user failed (this is OK)')
        } else {
          console.log('✅ Notification created successfully:', notifData)
          
          // Show browser notification if supported
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('📋 Official Notes from Barangay', {
              body: `Official notes have been added to your ${selectedIncident.type} incident report`,
              icon: '/favicon.ico',
              tag: 'official-notes-' + selectedIncident.id
            })
            console.log('✅ Browser notification sent')
          }
        }
      } catch (notifErr) {
        console.warn('⚠️ Notification service error (non-critical):', notifErr)
        // Don't fail - just log warning
      }

      console.log('✅ Complete: Notes sent to user:', selectedIncident.user_id)
    } catch (err) {
      console.error('❌ Error sending notes:', err)
      showToast('Error: ' + err.message, 'error')
    }
  }

  // DELETE INCIDENT
  const deleteIncident = async () => {
    if (!selectedIncident) return

    try {
      console.log('🗑️ Deleting incident:', selectedIncident.id)

      const { error } = await deleteIncidentDB(selectedIncident.id)

      if (error) {
        console.error('❌ Failed to delete incident:', error)
        showToast('Failed to delete incident: ' + error.message, 'error')
        return
      }

      console.log('✅ Incident deleted successfully')

      // Remove from local state
      setIncidents(prev => prev.filter(i => i.id !== selectedIncident.id))

      // Close modals
      setShowDeleteConfirm(false)
      setIsModalOpen(false)
      setSelectedIncident(null)

      // Show success toast
      showToast('✅ Incident report deleted successfully!', 'success', 3000)
    } catch (err) {
      console.error('❌ Error deleting incident:', err)
      showToast('Error: ' + err.message, 'error')
    }
  }

  // CONFIRM DELETE
  const confirmDelete = () => {
    setShowDeleteConfirm(true)
  }

  // CANCEL DELETE
  const cancelDelete = () => {
    setShowDeleteConfirm(false)
  }

  // FILTERED DATA
  const filtered = incidents.filter((i) => {
    if (
      search &&
      !i.description
        ?.toLowerCase()
        .includes(search.toLowerCase()) &&
      !i.location
        ?.toLowerCase()
        .includes(search.toLowerCase())
    ) {
      return false
    }

    if (
      typeFilter !== 'All Types' &&
      i.type !== typeFilter.toLowerCase()
    ) {
      return false
    }

    if (
      statusFilter !== 'All Status' &&
      i.status !== statusFilter.toLowerCase()
    ) {
      return false
    }

    // Advanced Filters
    if (advancedFilters.startDate && i.created_at) {
      const incidentDate = new Date(i.created_at)
      if (incidentDate < new Date(advancedFilters.startDate)) return false
    }

    if (advancedFilters.endDate && i.created_at) {
      const incidentDate = new Date(i.created_at)
      if (incidentDate > new Date(advancedFilters.endDate)) return false
    }

    if (advancedFilters.hasEvidence && !i.media_url) {
      return false
    }

    if (advancedFilters.sosOnly && !i.is_sos) {
      return false
    }

    return true
  })

  // SUMMARY
  const summary = generateIncidentSummary(filtered)
  const narrative = generateNarrativeReport(summary)

  // LOADING
  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar />

        <div className="flex-1 md:ml-60 pb-16 md:pb-0">
          <TopBar 
            title="All Reports" 
            showNotifications={true}
            showUserMenu={true}
          >
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">Official</span>
          </TopBar>

          <div className="p-4 md:p-6 flex items-center justify-center">
            <div className="text-gray-500">
              Loading incidents...
            </div>
          </div>
        </div>

        <AdminMobileBottomNav />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />

      <div className="flex-1 md:ml-60 pb-16 md:pb-0">
        <TopBar 
          title="All Reports" 
          showNotifications={true}
          showUserMenu={true}
        >
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">Official</span>
        </TopBar>
        <AdminNavTabs />

        <main className="p-4 md:p-6 space-y-4 md:space-y-5">
          {/* HEADER */}
          <div className="flex flex-row flex-wrap items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              {t('reports')}
            </h2>

            <span className="text-xs md:text-sm font-semibold text-gray-900 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
              {incidents.length} records
            </span>
          </div>

          {/* FILTERS - ADVANCED SEARCH */}
          <div className="space-y-3">
            {/* Search Bar Row */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search incidents by description, location..."
                />
              </div>

              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="px-4 py-2 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2 text-xs md:text-sm"
              >
                <Filter size={16} />
                Filters
                {(advancedFilters.startDate || advancedFilters.endDate || advancedFilters.hasEvidence || advancedFilters.sosOnly) && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs">
                    {[advancedFilters.startDate, advancedFilters.endDate, advancedFilters.hasEvidence, advancedFilters.sosOnly].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>

            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Filter size={14} />
                    Filters
                  </h3>
                  <button
                    onClick={() => {
                      setAdvancedFilters({
                        startDate: '',
                        endDate: '',
                        hasEvidence: false,
                        sosOnly: false,
                      })
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Incident Type
                    </label>
                    <div className="relative">
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full appearance-none pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-xs md:text-sm text-gray-700 focus:outline-none"
                      >
                        <option>All Types</option>
                        <option>Crime</option>
                        <option>Accident</option>
                        <option>Fire</option>
                        <option>Flood</option>
                        <option>Disturbance</option>
                      </select>
                      <ChevronDown
                        size={14}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Status
                    </label>
                    <div className="relative">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full appearance-none pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-xs md:text-sm text-gray-700 focus:outline-none"
                      >
                        <option>All Status</option>
                        <option>Pending</option>
                        <option>Responding</option>
                        <option>Resolved</option>
                      </select>
                      <ChevronDown
                        size={14}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={advancedFilters.startDate}
                      onChange={(e) => setAdvancedFilters({ ...advancedFilters, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={advancedFilters.endDate}
                      onChange={(e) => setAdvancedFilters({ ...advancedFilters, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hasEvidence"
                      checked={advancedFilters.hasEvidence}
                      onChange={(e) => setAdvancedFilters({ ...advancedFilters, hasEvidence: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="hasEvidence" className="text-xs text-gray-700">
                      Has Evidence
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="sosOnly"
                      checked={advancedFilters.sosOnly}
                      onChange={(e) => setAdvancedFilters({ ...advancedFilters, sosOnly: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="sosOnly" className="text-xs text-gray-700">
                      SOS Only
                    </label>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                  <button
                    onClick={() => setShowAdvancedFilters(false)}
                    className="px-4 py-2 text-xs text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => setShowAdvancedFilters(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SUMMARY */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border rounded-xl p-4">
              <p className="text-xs text-gray-500">
                Total Incidents
              </p>

              <h2 className="text-2xl font-bold">
                {summary.total}
              </h2>
            </div>

            <div className="bg-white border rounded-xl p-4">
              <p className="text-xs text-gray-500">
                Resolved
              </p>

              <h2 className="text-2xl font-bold text-emerald-600">
                {summary.resolved}
              </h2>
            </div>

            <div className="bg-white border rounded-xl p-4">
              <p className="text-xs text-gray-500">
                Top Incident
              </p>

              <h2 className="text-lg font-bold capitalize">
                {summary.topType}
              </h2>
            </div>

            <div className="bg-white border rounded-xl p-4">
              <p className="text-xs text-gray-500">
                Highest Area
              </p>

              <h2 className="text-lg font-bold">
                {summary.topPurok}
              </h2>
            </div>
          </div>

          {/* EXPORT */}
<div className="bg-white rounded-xl border p-4">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-sm font-semibold text-gray-700">
        Download Reports
      </h3>
      <p className="text-xs text-gray-500 mt-0.5">
        {filtered.length} record(s) will be exported
        {typeFilter !== 'All Types' && (
          <span className="font-medium text-blue-600 ml-1">· {typeFilter}</span>
        )}
        {statusFilter !== 'All Status' && (
          <span className="font-medium text-blue-600 ml-1">· {statusFilter}</span>
        )}
      </p>
    </div>

    <div className="relative">
      <button
        onClick={() => setExportOpen((prev) => !prev)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
      >
        <FaDownload size={14} />
        Export
      </button>

      {exportOpen && (
        <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
          <button
            onClick={() => {
              exportToExcel(filtered, typeFilter === 'All Types' ? 'all_incidents' : `${typeFilter.toLowerCase()}_incidents`)
              setExportOpen(false)
            }}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            Download Excel
          </button>

          <button
            onClick={() => {
              exportToPDF(filtered, typeFilter)
              setExportOpen(false)
            }}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition border-t border-gray-100"
          >
            <FileText size={15} className="text-red-600" />
            Download PDF
          </button>

          <button
            onClick={() => {
              exportToWord(filtered, typeFilter)
              setExportOpen(false)
            }}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition border-t border-gray-100"
          >
            <Download size={15} className="text-blue-600" />
            Download Word
          </button>
        </div>
      )}
    </div>
  </div>
</div>

          {/* TABLE */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-xs table-fixed">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b bg-gray-50">
                  <th className="px-1.5 py-2.5 w-8">
                    Type
                  </th>

                  <th className="px-1.5 py-2.5 w-[30%]">
                    Description
                  </th>

                  <th className="px-1.5 py-2.5 w-[22%]">
                    Location
                  </th>

                  <th className="px-1.5 py-2.5 w-[18%]">
                    Date
                  </th>

                  <th className="px-1.5 py-2.5 w-[10%]">
                    Status
                  </th>

                  <th className="px-1.5 py-2.5 w-[12%] text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((i) => (
                  <tr
                    key={i.id}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-1.5 py-2.5">
                      <div className="flex items-center gap-1">
                        <IncidentIcon type={i.type} />
                        {i.is_sos && (
                          <span className="text-xs">🚨</span>
                        )}
                      </div>
                    </td>

                    <td className="px-1.5 py-2.5">
                      <div className="flex flex-col gap-1">
                        {i.is_sos && (
                          <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold w-fit animate-pulse">
                            🚨 SOS EMERGENCY
                          </span>
                        )}
                        <span className="block truncate text-gray-800">
                          {i.description}
                        </span>
                      </div>
                    </td>

                    <td className="px-1.5 py-2.5">
                      <span className="block truncate text-gray-500">
                        {i.location}
                      </span>
                    </td>

                    <td className="px-1.5 py-2.5 text-gray-500">
                      {new Date(
                        i.created_at
                      ).toLocaleDateString()}
                    </td>

                    <td className="px-1.5 py-2.5">
                      <StatusBadge status={i.status} />
                    </td>

                    <td className="px-1.5 py-2.5 text-right">
                      <button
                        onClick={() => openModal(i)}
                        className="px-2 py-1 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 w-full"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* INCIDENT MODAL */}
{isModalOpen && selectedIncident && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3">

    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

      {/* HEADER */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">

        <div className="flex items-center gap-3 min-w-0">

          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
            <IncidentIcon type={selectedIncident.type} />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 capitalize truncate">
              {selectedIncident.type} Incident
            </h2>

            <p className="text-xs text-gray-500">
              Incident Report Details
            </p>
          </div>

        </div>

        <button
          onClick={closeModal}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition shrink-0"
        >
          <X size={16} className="text-gray-500" />
        </button>

      </div>

      {/* BODY - SCROLLABLE */}
      <div className="overflow-y-auto flex-1">
        <div className="p-5 space-y-4">

        {/* MAP DISPLAY */}
        {selectedIncident.latitude && selectedIncident.longitude && (
          <div className="relative rounded-xl border border-gray-200 overflow-hidden h-64 bg-gray-100">
            <MapContainer
              center={[selectedIncident.latitude, selectedIncident.longitude]}
              zoom={15}
              scrollWheelZoom={true}
              dragging={true}
              className="h-full w-full"
              style={{ zIndex: 1 }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapBoundsHandler />
              <FlyToIncidentModal incident={selectedIncident} />
              <Marker
                position={[selectedIncident.latitude, selectedIncident.longitude]}
                icon={createIncidentIcon(selectedIncident.type, true)}
              >
                <Popup>
                  <div className="space-y-1">
                    <p className="font-semibold text-sm capitalize">{selectedIncident.type}</p>
                    <p className="text-xs text-gray-600">{selectedIncident.location}</p>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
            
            {/* Coordinates Badge */}
            <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-gray-200 text-[10px] font-mono text-gray-700 shadow-sm">
              <div>📍 {selectedIncident.latitude.toFixed(6)}</div>
              <div>📍 {selectedIncident.longitude.toFixed(6)}</div>
            </div>
          </div>
        )}

        {/* STATUS + DATE */}
        <div className="grid grid-cols-2 gap-3">

          <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
              Status
            </p>

            <StatusBadge status={selectedIncident.status} />
          </div>

          <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
              Date & Time
            </p>

            <div className="flex items-start gap-1.5 text-xs text-gray-700 leading-5">
              <Calendar size={13} className="text-gray-400 mt-0.5 shrink-0" />

              <span>
                {new Date(selectedIncident.created_at).toLocaleString(
                  'en-US',
                  {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric'
                  }
                )}
              </span>
            </div>
          </div>

        </div>

        {/* LOCATION + REPORTER */}
        <div className="grid grid-cols-2 gap-3">

          <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
              Location
            </p>

            <div className="flex items-start gap-1.5 text-xs text-gray-700 leading-5">
              <MapPin size={13} className="text-gray-400 mt-0.5 shrink-0" />

              <div className="break-words">
                {selectedIncident.location || 'No location'}

                {selectedIncident.purok && (
                  <div className="text-gray-500 mt-0.5">
                    {selectedIncident.purok}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
              Reporter
            </p>

            <div className="flex items-center gap-1.5 text-xs text-gray-700">
              <User size={13} className="text-gray-400 shrink-0" />

              <span className="truncate">
                {selectedIncident.reporter_name ||
                  selectedIncident.profiles?.full_name ||
                  'Anonymous'}
              </span>
            </div>

            {selectedIncident.reporter_contact && (
              <div className="flex items-center gap-1.5 text-xs text-gray-700">
                <span className="text-gray-400 shrink-0">📱</span>
                <span className="truncate">{selectedIncident.reporter_contact}</span>
              </div>
            )}
            {!selectedIncident.reporter_contact && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="text-gray-400 shrink-0">📱</span>
                <span>No contact provided</span>
              </div>
            )}
          </div>

        </div>

        {/* DESCRIPTION */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
            Description
          </p>

          <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 text-xs text-gray-700 leading-5 break-words">
            {selectedIncident.description}
          </div>
        </div>

        {/* AI + EVIDENCE */}
        <div className="grid grid-cols-2 gap-3">

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
              AI Classification
            </p>

            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold capitalize border border-blue-100">
              {selectedIncident.ai_classification ||
                selectedIncident.type}
            </span>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
              Evidence
            </p>

            {selectedIncident.media_url ? (
              <button
                onClick={() => {
                  setSelectedMedia({
                    url: selectedIncident.media_url,
                    name: selectedIncident.media_name || 'Media'
                  })

                  setMediaPreviewOpen(true)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition"
              >

                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  {isVideoFile(
                    selectedIncident.media_url,
                    selectedIncident.media_name
                  ) ? (
                    <Play size={14} className="text-blue-600" />
                  ) : (
                    <ImageIcon size={14} className="text-blue-600" />
                  )}
                </div>

                <div className="text-left min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">
                    View Media
                  </p>

                  <p className="text-[10px] text-gray-500">
                    Preview
                  </p>
                </div>

              </button>
            ) : (
              <div className="bg-gray-50 rounded-xl border border-gray-100 px-3 py-2 text-xs text-gray-400">
                No media
              </div>
            )}
          </div>

        </div>

        {/* OFFICIAL NOTES */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
            Official Notes
          </p>

          <textarea
            value={officialNotes}
            onChange={(e) => setOfficialNotes(e.target.value)}
            onBlur={saveNotes}
            rows={3}
            placeholder="Add notes..."
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />

          {/* Send Notes to User Button */}
          {officialNotes && (
            <button
              onClick={() => sendNotesToUser()}
              className="mt-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
            >
              📬 Send Notes to User
            </button>
          )}
        </div>

        {/* UPDATE STATUS */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Update Status
          </p>

          <div className="grid grid-cols-3 gap-2">

            {['pending', 'responding', 'resolved'].map((s) => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                className={`py-2 rounded-xl text-[11px] font-semibold border transition capitalize ${
                  selectedIncident.status === s
                    ? s === 'pending'
                      ? 'bg-amber-100 border-amber-200 text-amber-700'
                      : s === 'responding'
                      ? 'bg-blue-100 border-blue-200 text-blue-700'
                      : 'bg-emerald-100 border-emerald-200 text-emerald-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s}
              </button>
            ))}

          </div>
        </div>

        {/* DELETE INCIDENT BUTTON */}
        <div>
          <button
            onClick={confirmDelete}
            className="w-full px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold transition border border-red-200 flex items-center justify-center gap-2"
          >
            <MdDelete /> Delete Report
          </button>
        </div>

        </div>
      </div>

      {/* STICKY FOOTER - Action Buttons */}
      <div className="shrink-0 border-t border-gray-100 bg-gray-50 p-4 flex gap-3">
        <button
          onClick={closeModal}
          className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition"
        >
          Close
        </button>
        <button
          onClick={() => updateStatus(selectedIncident.status === 'pending' ? 'responding' : selectedIncident.status === 'responding' ? 'resolved' : 'pending')}
          className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
        >
          ⚡ Quick Update Status
        </button>
      </div>

    </div>

  </div>
)}

          {/* MEDIA PREVIEW */}
          {mediaPreviewOpen &&
            selectedMedia && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
                <div className="bg-white rounded-lg w-full max-w-6xl max-h-[100vh]">
                  <div className="p-3 border-b flex justify-between">
                    <span>{selectedMedia.name}</span>

                    <button
                      onClick={() =>
                        setMediaPreviewOpen(false)
                      }
                    >
                      <X />
                    </button>
                  </div>

                  <div className="p-4 flex justify-center bg-gray-50">
                    {isVideoFile(
                      selectedMedia.url,
                      selectedMedia.name
                    ) ? (
                      <video
                        src={selectedMedia.url}
                        controls
                        className="max-h-[80vh] w-full rounded bg-black"
                      />
                    ) : (
                      <img
                        src={selectedMedia.url}
                        alt="preview"
                        className="max-h-[80vh] object-contain rounded"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
        </main>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="bg-red-50 p-6 border-b border-red-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-2xl"><MdDelete /> 
</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Delete Report</h3>
                  <p className="text-sm text-gray-600 mt-1">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-gray-700 mb-3">
                  Are you sure you want to delete this <span className="font-bold capitalize">{selectedIncident?.type}</span> incident report?
                </p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>📋 <span className="font-medium">Reporter:</span> {selectedIncident?.reporter_name || 'Anonymous'}</p>
                  <p>📅 <span className="font-medium">Date:</span> {selectedIncident?.created_at ? new Date(selectedIncident.created_at).toLocaleDateString() : 'N/A'}</p>
                  <p>📍 <span className="font-medium">Location:</span> {selectedIncident?.location || 'Unknown'}</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                <p className="text-xs text-amber-900 flex items-start gap-2">
                  <span className="text-lg flex-shrink-0">⚠️</span>
                  <span>Deleting this report will permanently remove all associated data including notes, media, and comments. This cannot be reversed.</span>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={deleteIncident}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition text-sm flex items-center justify-center gap-2"
              >
                <MdDelete /> Delete Report
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out forwards;
        }
      `}</style>

      <AdminMobileBottomNav />

      {/* Toast Notification */}
      {toast && (
        <Toast 
          key={toast.key}
          message={toast.message} 
          type={toast.type} 
          duration={toast.duration}
        />
      )}
    </div>
  )
}