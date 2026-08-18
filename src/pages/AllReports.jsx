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
import * as ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { useTranslation } from '../lib/i18n'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, SortableContext } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import AdminNavTabs from '../components/AdminNavTabs'
import AdminMobileBottomNav from '../components/AdminMobileBottomNav'
import StatusBadge from '../components/StatusBadge'
import IncidentIcon from '../components/IncidentIcon'
import TopBar from '../components/TopBar'
import Toast, { useToast } from '../components/Toast'
import { FaDownload, FaPersonRunning } from 'react-icons/fa6'
import { FaRegCheckCircle } from 'react-icons/fa'
import { MdDelete, MdPendingActions } from "react-icons/md"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../lib/supabase'
import { eastTapinacGeoJSON } from '../data/EastTapinac'

import {
  getIncidents,
  updateIncident,
  updateIncidentStatus,
  subscribeToIncidents,
  deleteIncident as deleteIncidentDB,
} from '../lib/database'
import { playSOSAlarm, playReportAlarm } from '../lib/alarmService'
import { analyzeIncident, checkImageAuthenticity } from '../lib/aiService'
import ImageAuthenticityModal from '../components/ImageAuthenticityModal'

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

const exportToExcel = async (data, filename = 'incidents_report') => {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Incidents')

  worksheet.columns = [
    { header: 'Type',              key: 'type',        width: 12 },
    { header: 'Description',       key: 'description', width: 30 },
    { header: 'Location',          key: 'location',    width: 25 },
    { header: 'Purok',             key: 'purok',       width: 15 },
    { header: 'Date',              key: 'date',        width: 20 },
    { header: 'Status',            key: 'status',      width: 12 },
    { header: 'Reporter',          key: 'reporter',    width: 20 },
    { header: 'Contact',           key: 'contact',     width: 15 },
    { header: 'AI Classification', key: 'aiClass',     width: 18 },
    { header: 'Official Notes',    key: 'notes',       width: 30 },
  ]

  // Style header row — blue background, white bold text
  worksheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top:    { style: 'thin', color: { argb: 'FF2563EB' } },
      bottom: { style: 'thin', color: { argb: 'FF2563EB' } },
      left:   { style: 'thin', color: { argb: 'FF2563EB' } },
      right:  { style: 'thin', color: { argb: 'FF2563EB' } },
    }
  })

  data.forEach(incident => {
    worksheet.addRow({
      type:        incident.type?.toUpperCase() || 'N/A',
      description: incident.description || 'N/A',
      location:    incident.location || 'N/A',
      purok:       incident.purok || 'N/A',
      date:        new Date(incident.created_at).toLocaleString('en-US', {
                     month: 'short', day: 'numeric', year: 'numeric',
                     hour: 'numeric', minute: 'numeric'
                   }),
      status:      incident.status?.toUpperCase() || 'N/A',
      reporter:    incident.reporter_name || incident.profiles?.full_name || 'Anonymous',
      contact:     incident.reporter_contact || 'N/A',
      aiClass:     incident.ai_classification || incident.type || 'N/A',
      notes:       incident.official_notes || 'N/A',
    })
  })

  const timestamp = new Date().toISOString().split('T')[0]
  const finalFilename = `${filename}_${timestamp}.xlsx`
  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), finalFilename)
}

const exportToPDF = (data, typeFilter) => {
  try {
    const doc = new jsPDF()

    const title = typeFilter === 'All Types'
      ? 'All Incidents Report'
      : `${typeFilter} Incidents Report`

    // Center-aligned title
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    const titleWidth = doc.getTextWidth(title)
    const titleX = (doc.internal.pageSize.width - titleWidth) / 2
    doc.text(title, titleX, 20)

    // Metadata
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)
    doc.text(`Total Records: ${data.length}`, 14, 34)

    const tableData = data.map((incident) => [
      (incident.type || 'N/A').toUpperCase(),
      (incident.description || 'N/A').substring(0, 35),
      (incident.location || 'N/A').substring(0, 20),
      new Date(incident.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
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
        halign: 'center',
        valign: 'middle',
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
        valign: 'middle',
      },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center' },  // Type - centered
        1: { cellWidth: 50, halign: 'left' },    // Description - left
        2: { cellWidth: 30, halign: 'left' },    // Location - left
        3: { cellWidth: 24, halign: 'center' },  // Date - centered
        4: { cellWidth: 24, halign: 'center' },  // Status - centered
        5: { cellWidth: 30, halign: 'left' },    // Reporter - left
        6: { cellWidth: 25, halign: 'center' },  // Contact - centered
      },
      // Center the table on the page
      margin: { 
        top: 40, 
        left: (doc.internal.pageSize.width - 205) / 2,  // Center horizontally
        right: (doc.internal.pageSize.width - 205) / 2
      },
      styles: {
        overflow: 'linebreak',
        cellPadding: 3,
        fontSize: 8,
        lineColor: [200, 200, 200],
        lineWidth: 0.5,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    })

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = typeFilter === 'All Types'
      ? `all_incidents_${timestamp}.pdf`
      : `${typeFilter.toLowerCase()}_incidents_${timestamp}.pdf`

    doc.save(filename)
  } catch (error) {
    console.error('Error generating PDF:', error)
    // Do not surface raw error.message — PDF failures are non-critical export issues
  }
}

const exportToWord = (data, typeFilter) => {
  Promise.all([
    import('docx'),
    import('file-saver')
  ]).then(([docxModule, fileSaverModule]) => {
    const {
      Document, Paragraph, Table, TableCell, TableRow,
      WidthType, AlignmentType, TextRun, ShadingType, Packer, BorderStyle
    } = docxModule
    const { saveAs } = fileSaverModule

    const title = typeFilter === 'All Types'
      ? 'All Incidents Report'
      : `${typeFilter} Incidents Report`

    const headerLabels = ['Type', 'Description', 'Location', 'Date', 'Status', 'Reporter', 'Contact']

    // Header row — blue background, white bold text, centered
    const headerRow = new TableRow({
      tableHeader: true,
      children: headerLabels.map((label) =>
        new TableCell({
          shading: {
            type: ShadingType.SOLID,
            color: '3B82F6', // blue-500
            fill: '3B82F6',
          },
          verticalAlign: 'center',
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: label,
                  bold: true,
                  color: 'FFFFFF',
                  size: 20,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        })
      ),
    })

    // Data rows with centered alignment
    const dataRows = data.map((incident, index) =>
      new TableRow({
        children: [
          new TableCell({ 
            verticalAlign: 'center',
            children: [new Paragraph({
              text: incident.type?.toUpperCase() || 'N/A',
              alignment: AlignmentType.CENTER
            })] 
          }),
          new TableCell({ 
            verticalAlign: 'center',
            children: [new Paragraph({
              text: incident.description || 'N/A',
              alignment: AlignmentType.LEFT
            })] 
          }),
          new TableCell({ 
            verticalAlign: 'center',
            children: [new Paragraph({
              text: incident.location || 'N/A',
              alignment: AlignmentType.LEFT
            })] 
          }),
          new TableCell({ 
            verticalAlign: 'center',
            children: [new Paragraph({
              text: new Date(incident.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              }),
              alignment: AlignmentType.CENTER
            })] 
          }),
          new TableCell({ 
            verticalAlign: 'center',
            children: [new Paragraph({
              text: incident.status?.toUpperCase() || 'N/A',
              alignment: AlignmentType.CENTER
            })] 
          }),
          new TableCell({ 
            verticalAlign: 'center',
            children: [new Paragraph({
              text: incident.reporter_name || incident.profiles?.full_name || 'Anonymous',
              alignment: AlignmentType.LEFT
            })] 
          }),
          new TableCell({ 
            verticalAlign: 'center',
            children: [new Paragraph({
              text: incident.reporter_contact || 'N/A',
              alignment: AlignmentType.CENTER
            })] 
          }),
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
            alignment: AlignmentType.LEFT,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Total Records: ${data.length}`, size: 18, color: '6B7280' })],
            alignment: AlignmentType.LEFT,
            spacing: { after: 300 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            alignment: AlignmentType.CENTER,
            rows: [headerRow, ...dataRows],
            columnWidths: [1000, 2500, 1500, 1200, 1200, 1500, 1200], // DXA units (twips/20)
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
// ═══════════════════════════════════════════════════════════
// STATUS COLUMN COMPONENT (for grouped status view)
// ═══════════════════════════════════════════════════════════

function StatusColumn({ status, label, icon, count, incidents, colorClasses, onViewDetails }) {
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Column Header */}
      <div className={`${colorClasses.headerBg} px-4 md:px-5 py-3 md:py-4 border-b border-gray-100`}>
        <div className="flex items-center gap-2 md:gap-3">
          <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg ${colorClasses.iconBg} flex items-center justify-center flex-shrink-0`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-sm md:text-base ${colorClasses.text} truncate`}>
              {label}
            </h3>
          </div>
          <div className={`px-2 md:px-3 py-1 rounded-full ${colorClasses.badgeBg} ${colorClasses.badgeText} text-xs font-bold flex-shrink-0`}>
            {count}
          </div>
        </div>
      </div>

      {/* Incident Cards Container */}
      <div 
        className="flex-1 overflow-y-auto bg-gray-50/30 custom-scrollbar" 
        style={{ maxHeight: '70vh' }}
      >
        {incidents.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-12 md:py-20 px-4 md:px-6">
            <div className={`w-20 md:w-24 h-20 md:h-24 rounded-2xl ${colorClasses.emptyBg} flex items-center justify-center mb-4 md:mb-6`}>
              <svg className={`w-10 md:w-12 h-10 md:h-12 ${colorClasses.emptyIcon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-xs md:text-sm font-semibold text-gray-600 mb-1.5 text-center">
              No incidents are currently<br className="hidden md:inline" />being {status}.
            </p>
          </div>
        ) : (
          // Incident Cards
          <div className="p-3 md:p-4 space-y-2 md:space-y-3">
            {incidents.map((incident, index) => (
              <div
                key={incident.id}
                className="bg-white border border-gray-200 rounded-xl p-3 md:p-4 hover:shadow-md hover:border-gray-300 transition-all"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-2 md:mb-3">
                  <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 md:w-11 md:h-11 rounded-lg ${colorClasses.cardIconBg} flex items-center justify-center flex-shrink-0`}>
                      <IncidentIcon type={incident.type} size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-xs md:text-sm text-gray-900 mb-1 leading-snug line-clamp-2">
                        {incident.description || 'No description'}
                      </h4>
                    </div>
                  </div>
                  <span className={`px-2 md:px-2.5 py-1 rounded-md text-[9px] md:text-[10px] font-bold uppercase tracking-wide flex-shrink-0 ml-2 ${colorClasses.statusBg} ${colorClasses.statusText}`}>
                    {status}
                  </span>
                </div>

                {/* Location & Coordinates */}
                <div className="flex items-start gap-1.5 md:gap-2 mb-1.5 md:mb-2 text-xs text-gray-600">
                  <MapPin size={12} className="text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="font-medium text-[11px] md:text-xs line-clamp-1">
                    {incident.latitude && incident.longitude 
                      ? `${incident.latitude.toFixed(6)}, ${incident.longitude.toFixed(6)}`
                      : incident.location || 'Unknown'}
                  </span>
                </div>

                {/* Purok */}
                {incident.purok && (
                  <div className="mb-1.5 md:mb-2 text-[11px] md:text-xs text-gray-500">
                    {incident.purok}
                  </div>
                )}

                {/* Date & Time and View Details - Bottom Row */}
                <div className="flex items-center justify-between mt-2 md:mt-3 gap-2">
                  <div className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-xs text-gray-500 min-w-0">
                    <Calendar size={12} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">
                      {new Date(incident.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric'
                      })} • {new Date(incident.created_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>

                  {/* View Details Link - Bottom Right */}
                  <button 
                    onClick={() => onViewDetails(incident)}
                    className="text-[11px] md:text-xs text-gray-600 hover:text-blue-600 font-semibold flex items-center gap-1 group whitespace-nowrap flex-shrink-0"
                  >
                    <span className="hidden sm:inline">View Details</span>
                    <span className="sm:hidden">View</span>
                    <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            
            {/* Footer Count */}
            <div className="text-center py-2 md:py-3 text-[11px] md:text-xs text-gray-500 font-medium">
              Showing {incidents.length} of {count} {status} incident{count !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  )
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
  const [allReportsMapSatellite, setAllReportsMapSatellite] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [officialNotes, setOfficialNotes] = useState('')

  const [selectedMedia, setSelectedMedia] = useState(null)
  const [mediaPreviewOpen, setMediaPreviewOpen] = useState(false)

  // 🔍 Image Authenticity Scanning (Admin only)
  const [imageAuthenticity, setImageAuthenticity] = useState(null)
  const [showAuthenticityModal, setShowAuthenticityModal] = useState(false)
  const [scanningImage, setScanningImage] = useState(false)

  // 📊 View Mode Toggle (Card vs Table)
  const [viewMode, setViewMode] = useState('card') // 'card' or 'table'

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
        
        // 🔔 Play alarm sound when new incident arrives
        if (payload.new.is_sos && payload.new.status === 'pending') {
          // 🚨 SOS Emergency - play urgent alarm
          console.log('🚨 [Admin] New SOS emergency alert received!')
          playSOSAlarm()
        } else {
          // 📢 Regular incident - play standard notification
          console.log('🔔 [Admin] New incident report received')
          playReportAlarm()
        }
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

  // 🔍 SCAN IMAGE FOR AUTHENTICITY (Admin only) - NOW SUPPORTS VIDEOS!
  const scanImageAuthenticity = async () => {
    if (!selectedIncident?.media_url) {
      showToast('No media to scan', 'warning')
      return
    }

    const isVideo = isVideoFile(selectedIncident.media_url, selectedIncident.media_name)

    setScanningImage(true)
    
    try {
      console.log(`🔍 Admin scanning ${isVideo ? 'video' : 'image'} for authenticity...`)
      
      let imageToAnalyze = selectedIncident.media_url

      // If it's a video, extract first frame
      if (isVideo) {
        console.log('📹 Video detected, extracting first frame...')
        showToast('📹 Extracting video frame...', 'success')
        
        imageToAnalyze = await extractVideoFrame(selectedIncident.media_url)
        
        if (!imageToAnalyze) {
          showToast('Failed to extract video frame', 'error')
          setScanningImage(false)
          return
        }
        
        console.log('✅ Video frame extracted successfully')
      }

      // Analyze the image (or video frame)
      const analysis = await analyzeIncident(
        selectedIncident.description || '',
        imageToAnalyze
      )

      if (analysis.image) {
        // Check authenticity
        const authenticityCheck = checkImageAuthenticity(analysis.image)
        console.log('✅ Authenticity scan result:', authenticityCheck)
        
        setImageAuthenticity(authenticityCheck)
        
        // Show modal after small delay
        setTimeout(() => {
          setShowAuthenticityModal(true)
        }, 300)
        
        showToast(`✅ ${isVideo ? 'Video frame' : 'Image'} scan complete`, 'success')
      } else {
        showToast('Failed to analyze media', 'error')
      }

    } catch (error) {
      console.error('❌ Media scan error:', error)
      showToast('Media scan failed: ' + error.message, 'error')
    } finally {
      setScanningImage(false)
    }
  }

  // 🎬 Extract first frame from video as base64 image
  const extractVideoFrame = (videoUrl) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.src = videoUrl
      video.muted = true
      video.playsInline = true
      
      video.onloadeddata = () => {
        try {
          // Seek to 1 second into the video (or first frame if shorter)
          video.currentTime = Math.min(1, video.duration || 0)
        } catch (err) {
          console.error('Error seeking video:', err)
          reject(err)
        }
      }

      video.onseeked = () => {
        try {
          // Create canvas and draw video frame
          const canvas = document.createElement('canvas')
          canvas.width = video.videoWidth || 640
          canvas.height = video.videoHeight || 480
          
          const ctx = canvas.getContext('2d')
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          // Convert to base64 image
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
          
          console.log('✅ Video frame extracted:', canvas.width, 'x', canvas.height)
          resolve(dataUrl)
        } catch (err) {
          console.error('Error extracting frame:', err)
          reject(err)
        }
      }

      video.onerror = (err) => {
        console.error('Video loading error:', err)
        reject(new Error('Failed to load video'))
      }

      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Video frame extraction timeout'))
      }, 10000)
    })
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
      showToast(`🗑️ ${selectedIncident.type} report deleted successfully`, 'success', 4000)
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

  // 📊 GROUP INCIDENTS BY STATUS (for grouped view)
  const groupedIncidents = {
    pending: filtered.filter(i => i.status === 'pending'),
    responding: filtered.filter(i => i.status === 'responding'),
    resolved: filtered.filter(i => i.status === 'resolved')
  }

  // LOADING
  if (loading) {
    return (
      <div className="pb-16 md:pb-0">
        <TopBar 
          title="All Reports" 
          showNotifications={true}
          showUserMenu={true}
        >
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">Official</span>
        </TopBar>

        <div className="p-4 md:p-6 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-gray-500">
            Loading incidents...
          </div>
        </div>

        <AdminMobileBottomNav />
      </div>
    )
  }

  return (
    <div className="pb-16 md:pb-0">
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

          {/* SUMMARY */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white shadow-sm rounded-xl p-4">
              <p className="text-xs text-gray-500">
                Total Incidents
              </p>

              <h2 className="text-2xl font-bold">
                {summary.total}
              </h2>
            </div>

            <div className="bg-white shadow-sm rounded-xl p-4">
              <p className="text-xs text-gray-500">
                Resolved
              </p>

              <h2 className="text-2xl font-bold text-emerald-600">
                {summary.resolved}
              </h2>
            </div>

            <div className="bg-white shadow-sm rounded-xl p-4">
              <p className="text-xs text-gray-500">
                Top Incident
              </p>

              <h2 className="text-lg font-bold capitalize">
                {summary.topType}
              </h2>
            </div>

            <div className="bg-white shadow-sm rounded-xl p-4">
              <p className="text-xs text-gray-500">
                Highest Area
              </p>

              <h2 className="text-lg font-bold">
                {summary.topPurok}
              </h2>
            </div>
          </div>

          {/* EXPORT & VIEW TOGGLE - RESPONSIVE */}
<div className="bg-white rounded-xl shadow-sm p-3 md:p-4 space-y-3 md:space-y-4">
  {/* Export Section */}
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
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
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition w-full sm:w-auto justify-center"
      >
        <FaDownload size={14} />
        <span>Export</span>
      </button>

      {exportOpen && (
        <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
          <button
            onClick={async () => {
              await exportToExcel(filtered, typeFilter === 'All Types' ? 'all_incidents' : `${typeFilter.toLowerCase()}_incidents`)
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

  {/* Filters and View Toggle - RESPONSIVE */}
  <div className="flex flex-col gap-2 pt-3 border-t border-gray-100">
    {/* Row 1: Search Bar (Full Width on Mobile) */}
    <div className="relative w-full">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Search incidents..."
      />
    </div>

    {/* Row 2: Filters and View Toggle */}
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      {/* Type Filter */}
      <div className="relative flex-1 sm:flex-initial">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="appearance-none w-full pl-3 pr-10 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 font-medium hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option>All Types</option>
          <option>Crime</option>
          <option>Accident</option>
          <option>Fire</option>
          <option>Flood</option>
          <option>Disturbance</option>
        </select>
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      </div>

      {/* Status Filter */}
      <div className="relative flex-1 sm:flex-initial">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="appearance-none w-full pl-3 pr-10 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 font-medium hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option>All Status</option>
          <option>Pending</option>
          <option>Responding</option>
          <option>Resolved</option>
        </select>
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-gray-50 w-full sm:w-auto">
        <button
          onClick={() => setViewMode('card')}
          className={`flex-1 sm:flex-initial px-3 py-2 rounded-md text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
            viewMode === 'card'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          title="All Incidents"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          <span>All</span>
        </button>
        <button
          onClick={() => setViewMode('grouped')}
          className={`flex-1 sm:flex-initial px-3 py-2 rounded-md text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
            viewMode === 'grouped'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          title="Group by Status"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <rect x="3" y="3" width="6" height="18" rx="1"/>
            <rect x="12" y="3" width="9" height="18" rx="1"/>
          </svg>
          <span>Status</span>
        </button>
      </div>
    </div>
  </div>
</div>

          {/* INCIDENTS DISPLAY - VIEW MODE CONDITIONAL - RESPONSIVE */}
          {viewMode === 'card' ? (
            /* ═══ TABLE VIEW (ALL INCIDENTS) - RESPONSIVE ═══ */
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Desktop Table View - Hidden on Mobile */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-600 border-b border-gray-200 bg-gray-50/50">
                      <th className="px-6 py-4 font-semibold">
                        Type
                      </th>

                      <th className="px-6 py-4 font-semibold">
                        Description
                      </th>

                      <th className="px-6 py-4 font-semibold">
                        Location
                      </th>

                      <th className="px-6 py-4 font-semibold">
                        Date & Time
                      </th>

                      <th className="px-6 py-4 font-semibold">
                        Status
                      </th>

                      <th className="px-6 py-4 font-semibold text-center">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((i, index) => (
                      <tr
                        key={i.id}
                        className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}
                      >
                        {/* Type Column with Icon */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
                              <IncidentIcon type={i.type} size={20} />
                            </div>
                            {i.is_sos && (
                              <span className="text-sm">🚨</span>
                            )}
                          </div>
                        </td>

                        {/* Description Column */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            {i.is_sos && (
                              <span className="px-2.5 py-1 bg-red-600 text-white rounded-md text-[10px] font-bold w-fit animate-pulse">
                                🚨 SOS EMERGENCY
                              </span>
                            )}
                            <p className="font-semibold text-gray-900 text-sm leading-relaxed">
                              {i.description}
                            </p>
                            <p className="text-xs text-orange-600 font-medium capitalize">
                              {i.type}
                            </p>
                          </div>
                        </td>

                        {/* Location Column */}
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-2">
                            <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm text-gray-900 font-medium">
                                {i.location || 'Unknown'}
                              </p>
                              {i.purok && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {i.purok}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Date & Time Column */}
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-2">
                            <Calendar size={14} className="text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-900 font-medium">
                                {new Date(i.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {new Date(i.created_at).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Status Column */}
                        <td className="px-6 py-4">
                          <StatusBadge status={i.status} />
                        </td>

                        {/* Action Column */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openModal(i)}
                              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
                            >
                              Manage
                            </button>
                            <button
                              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
                              onClick={() => openModal(i)}
                            >
                              <span className="text-gray-400 text-lg">⋮</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View - Visible only on Mobile */}
              <div className="md:hidden divide-y divide-gray-100">
                {filtered.map((i, index) => (
                  <div
                    key={i.id}
                    className={`p-4 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                  >
                    {/* SOS Badge */}
                    {i.is_sos && (
                      <div className="mb-2">
                        <span className="px-2.5 py-1 bg-red-600 text-white rounded-md text-[10px] font-bold inline-block animate-pulse">
                          🚨 SOS EMERGENCY
                        </span>
                      </div>
                    )}

                    {/* Header Row - Icon, Type, Status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center flex-shrink-0">
                          <IncidentIcon type={i.type} size={20} />
                        </div>
                        <div>
                          <p className="text-xs text-orange-600 font-medium capitalize">
                            {i.type}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={i.status} />
                    </div>

                    {/* Description */}
                    <p className="font-semibold text-gray-900 text-sm leading-relaxed mb-3">
                      {i.description}
                    </p>

                    {/* Location */}
                    <div className="flex items-start gap-2 mb-2 text-xs">
                      <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-900 font-medium">
                          {i.location || 'Unknown'}
                        </p>
                        {i.purok && (
                          <p className="text-gray-500 mt-0.5">
                            {i.purok}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="flex items-start gap-2 mb-3 text-xs">
                      <Calendar size={14} className="text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-gray-900 font-medium">
                          {new Date(i.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-gray-500 mt-0.5">
                          {new Date(i.created_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => openModal(i)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all"
                    >
                      Manage Incident
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ═══ GROUPED STATUS VIEW - RESPONSIVE ═══ */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {/* Pending Column */}
              <StatusColumn
                status="pending"
                label="Pending"
                icon={<MdPendingActions className="text-amber-600" size={24} />}
                count={groupedIncidents.pending.length}
                incidents={groupedIncidents.pending}
                colorClasses={{
                  headerBg: 'bg-amber-50',
                  iconBg: 'bg-amber-100',
                  text: 'text-amber-800',
                  badgeBg: 'bg-amber-100',
                  badgeText: 'text-amber-700',
                  cardIconBg: 'bg-orange-50',
                  statusBg: 'bg-amber-50',
                  statusText: 'text-amber-700',
                  emptyBg: 'bg-amber-50',
                  emptyIcon: 'text-amber-400'
                }}
                onViewDetails={openModal}
              />
              
              {/* Responding Column */}
              <StatusColumn
                status="responding"
                label="Responding"
                icon={<FaPersonRunning className="text-blue-600" size={24} />}
                count={groupedIncidents.responding.length}
                incidents={groupedIncidents.responding}
                colorClasses={{
                  headerBg: 'bg-blue-50',
                  iconBg: 'bg-blue-100',
                  text: 'text-blue-800',
                  badgeBg: 'bg-blue-100',
                  badgeText: 'text-blue-700',
                  cardIconBg: 'bg-blue-50',
                  statusBg: 'bg-blue-50',
                  statusText: 'text-blue-700',
                  emptyBg: 'bg-blue-50',
                  emptyIcon: 'text-blue-400'
                }}
                onViewDetails={openModal}
              />
              
              {/* Resolved Column */}
              <StatusColumn
                status="resolved"
                label="Resolved"
                icon={<FaRegCheckCircle className="text-green-600" size={24} />}
                count={groupedIncidents.resolved.length}
                incidents={groupedIncidents.resolved}
                colorClasses={{
                  headerBg: 'bg-green-50',
                  iconBg: 'bg-green-100',
                  text: 'text-green-800',
                  badgeBg: 'bg-green-100',
                  badgeText: 'text-green-700',
                  cardIconBg: 'bg-green-50',
                  statusBg: 'bg-green-50',
                  statusText: 'text-green-700',
                  emptyBg: 'bg-green-50',
                  emptyIcon: 'text-green-400'
                }}
                onViewDetails={openModal}
              />
            </div>
          )}

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
              {allReportsMapSatellite ? (
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution="Tiles &copy; Esri"
                  maxZoom={19}
                />
              ) : (
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              )}
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
            
            {/* Satellite/Street Toggle */}
            <div style={{
              position: 'absolute', top: 8, right: 8, zIndex: 1000,
              display: 'flex', borderRadius: 8, overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.3)'
            }}>
              <button
                onClick={() => setAllReportsMapSatellite(false)}
                style={{
                  padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: 'none', transition: 'all 0.2s',
                  background: !allReportsMapSatellite ? '#2563eb' : 'rgba(255,255,255,0.9)',
                  color: !allReportsMapSatellite ? '#fff' : '#374151',
                }}
              >Street</button>
              <button
                onClick={() => setAllReportsMapSatellite(true)}
                style={{
                  padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: 'none', transition: 'all 0.2s',
                  background: allReportsMapSatellite ? '#2563eb' : 'rgba(255,255,255,0.9)',
                  color: allReportsMapSatellite ? '#fff' : '#374151',
                }}
              >Satellite</button>
            </div>

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
                    View & Scan Media
                  </p>

                  <p className="text-[10px] text-gray-500">
                    Click to preview & analyze
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

          {/* 🔍 IMAGE AUTHENTICITY MODAL (Admin only) */}
          <ImageAuthenticityModal
            isOpen={showAuthenticityModal}
            onClose={() => setShowAuthenticityModal(false)}
            authenticity={imageAuthenticity}
          />

          {/* MEDIA PREVIEW MODAL with SCAN BUTTON */}
          {mediaPreviewOpen && selectedMedia && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-0" style={{ minHeight: '100vh', height: '100%' }}>
              <div className="bg-white rounded-2xl w-full h-full md:w-[90vw] md:h-[95vh] md:rounded-2xl flex flex-col shadow-2xl overflow-hidden">
                
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      {isVideoFile(selectedMedia.url, selectedMedia.name) ? (
                        <Play size={18} className="text-blue-600" />
                      ) : (
                        <ImageIcon size={18} className="text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Media Preview</h3>
                      <p className="text-xs text-gray-500 truncate max-w-md">{selectedMedia.name}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setMediaPreviewOpen(false)}
                    className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center transition"
                  >
                    <X size={20} className="text-gray-600" />
                  </button>
                </div>

                {/* Image/Video Display with Scan Animation Overlay - LARGER */}
                <div className="flex-1 p-8 flex flex-col items-center justify-center bg-gray-900 relative overflow-hidden">
                  
                  {/* Media Content - LARGER SIZE */}
                  {isVideoFile(selectedMedia.url, selectedMedia.name) ? (
                    <video
                      src={selectedMedia.url}
                      controls
                      className="max-h-[80vh] max-w-full rounded-lg shadow-2xl"
                      style={{ objectFit: 'contain' }}
                    />
                  ) : (
                    <img
                      src={selectedMedia.url}
                      alt="preview"
                      className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl"
                    />
                  )}

                  {/* 🔍 Scanning Animation Overlay - CORNER SCANNER STYLE */}
                  {scanningImage && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-10">
                      
                      {/* Scanner Frame with Clean Corner Brackets */}
                      <div className="relative w-[80%] h-[70%] max-w-4xl">
                        
                        {/* Top Left Corner Bracket */}
                        <div className="absolute top-0 left-0">
                          {/* Horizontal line */}
                          <div className="absolute top-0 left-0 h-1 w-40 bg-[#0B4EDB]"
                               style={{ 
                                 boxShadow: '0 0 15px rgba(11, 78, 219, 1), 0 0 30px rgba(11, 78, 219, 0.6)',
                               }}>
                          </div>
                          {/* Vertical line */}
                          <div className="absolute top-0 left-0 w-1 h-40 bg-[#0B4EDB]"
                               style={{ 
                                 boxShadow: '0 0 15px rgba(11, 78, 219, 1), 0 0 30px rgba(11, 78, 219, 0.6)',
                               }}>
                          </div>
                        </div>
                        
                        {/* Top Right Corner Bracket */}
                        <div className="absolute top-0 right-0">
                          {/* Horizontal line */}
                          <div className="absolute top-0 right-0 h-1 w-40 bg-[#0B4EDB]"
                               style={{ 
                                 boxShadow: '0 0 15px rgba(11, 78, 219, 1), 0 0 30px rgba(11, 78, 219, 0.6)',
                               }}>
                          </div>
                          {/* Vertical line */}
                          <div className="absolute top-0 right-0 w-1 h-40 bg-[#0B4EDB]"
                               style={{ 
                                 boxShadow: '0 0 15px rgba(11, 78, 219, 1), 0 0 30px rgba(11, 78, 219, 0.6)',
                               }}>
                          </div>
                        </div>
                        
                        {/* Bottom Left Corner Bracket */}
                        <div className="absolute bottom-0 left-0">
                          {/* Horizontal line */}
                          <div className="absolute bottom-0 left-0 h-1 w-40 bg-[#0B4EDB]"
                               style={{ 
                                 boxShadow: '0 0 15px rgba(11, 78, 219, 1), 0 0 30px rgba(11, 78, 219, 0.6)',
                               }}>
                          </div>
                          {/* Vertical line */}
                          <div className="absolute bottom-0 left-0 w-1 h-40 bg-[#0B4EDB]"
                               style={{ 
                                 boxShadow: '0 0 15px rgba(11, 78, 219, 1), 0 0 30px rgba(11, 78, 219, 0.6)',
                               }}>
                          </div>
                        </div>
                        
                        {/* Bottom Right Corner Bracket */}
                        <div className="absolute bottom-0 right-0">
                          {/* Horizontal line */}
                          <div className="absolute bottom-0 right-0 h-1 w-40 bg-[#0B4EDB]"
                               style={{ 
                                 boxShadow: '0 0 15px rgba(11, 78, 219, 1), 0 0 30px rgba(11, 78, 219, 0.6)',
                               }}>
                          </div>
                          {/* Vertical line */}
                          <div className="absolute bottom-0 right-0 w-1 h-40 bg-[#0B4EDB]"
                               style={{ 
                                 boxShadow: '0 0 15px rgba(11, 78, 219, 1), 0 0 30px rgba(11, 78, 219, 0.6)',
                               }}>
                          </div>
                        </div>

                        {/* Animated Horizontal Scanning Line (moves up and down) */}
                        <div className="absolute left-0 right-0 h-1 bg-[#0B4EDB] animate-scan-vertical"
                             style={{ 
                               boxShadow: '0 0 20px rgba(11, 78, 219, 1), 0 0 40px rgba(11, 78, 219, 0.8)',
                             }}>
                        </div>
                      </div>

                      {/* Center Status Text */}
                      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
                        <div className="bg-black/80 backdrop-blur-md rounded-xl px-8 py-4 border-2"
                             style={{ 
                               borderColor: 'rgba(11, 78, 219, 0.5)',
                               boxShadow: '0 0 30px rgba(11, 78, 219, 0.5)' 
                             }}>
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-[#0B4EDB] rounded-full animate-pulse"
                                 style={{ boxShadow: '0 0 10px rgba(11, 78, 219, 0.8)' }}>
                            </div>
                            <p className="font-bold text-lg tracking-wider" style={{ color: '#0B4EDB' }}>SCANNING IMAGE</p>
                          </div>
                          <p className="text-sm mt-2 text-center font-mono" style={{ color: '#6B9EFF' }}>
                            Analyzing authenticity & detecting manipulation...
                          </p>
                          <div className="flex items-center justify-center gap-1 mt-3">
                            <div className="w-2 h-2 bg-[#0B4EDB] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                            <div className="w-2 h-2 bg-[#0B4EDB] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-[#0B4EDB] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>

                      {/* Center Status Text */}
                      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
                        <div className="bg-black/60 backdrop-blur-md rounded-xl px-8 py-4 border-2 border-cyan-400/50"
                             style={{ boxShadow: '0 0 30px rgba(34, 211, 238, 0.5)' }}>
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"
                                 style={{ boxShadow: '0 0 10px rgba(34, 211, 238, 0.8)' }}>
                            </div>
                            <p className="text-cyan-400 font-bold text-lg tracking-wider">SCANNING IMAGE</p>
                          </div>
                          <p className="text-cyan-300 text-sm mt-2 text-center font-mono">
                            Analyzing authenticity & detecting manipulation...
                          </p>
                          <div className="flex items-center justify-center gap-1 mt-3">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer with Scan Button */}
                <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
                  
                  {/* Info */}
                  <div className="text-xs text-gray-500">
                    {isVideoFile(selectedMedia.url, selectedMedia.name) ? (
                      <span>📹 Video frame will be extracted and scanned</span>
                    ) : (
                      <span>🔍 Click "Scan Media" to check authenticity</span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    
                    {/* Close Button */}
                    <button
                      onClick={() => setMediaPreviewOpen(false)}
                      className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition"
                    >
                      Close
                    </button>

                    {/* Scan Button (NOW WORKS FOR BOTH IMAGES AND VIDEOS!) */}
                    <button
                      onClick={scanImageAuthenticity}
                      disabled={scanningImage}
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {scanningImage ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          Scanning...
                        </>
                      ) : (
                        <>
                          <span className="text-base">🔍</span>
                          Scan {isVideoFile(selectedMedia.url, selectedMedia.name) ? 'Video' : 'Image'} for Fake/AI
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Scan Animation Styles */}
          <style>{`
            @keyframes spin-slow {
              from { transform: rotate(0deg); }
              to { transform: rotate(-360deg); }
            }
            .animate-spin-slow {
              animation: spin-slow 3s linear infinite;
            }
            @keyframes scan-vertical {
              0% {
                top: 0%;
                opacity: 0;
              }
              10% {
                opacity: 1;
              }
              90% {
                opacity: 1;
              }
              100% {
                top: 100%;
                opacity: 0;
              }
            }
            .animate-scan-vertical {
              animation: scan-vertical 2s ease-in-out infinite;
            }
          `}</style>
        </main>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="bg-red-50 p-6 border-b border-red-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-2xl"><MdDelete /></span>
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
        
        /* Custom scrollbar for status columns */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
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