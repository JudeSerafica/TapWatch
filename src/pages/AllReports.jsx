import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import * as XLSX from 'xlsx'

import AdminSidebar from '../components/AdminSidebar'
import AdminNavTabs from '../components/AdminNavTabs'
import AdminMobileBottomNav from '../components/AdminMobileBottomNav'
import StatusBadge from '../components/StatusBadge'
import IncidentIcon from '../components/IncidentIcon'
import TopBar from '../components/TopBar'
import { FaDownload } from 'react-icons/fa6'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import {
  getIncidents,
  updateIncident,
  subscribeToIncidents,
} from '../lib/database'

import {
  generateIncidentSummary,
  generateNarrativeReport,
} from '../lib/reportGenerator'

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
    ])

    autoTable(doc, {
      startY: 40,
      head: [['Type', 'Description', 'Location', 'Date', 'Status', 'Reporter']],
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
        1: { cellWidth: 50 },
        2: { cellWidth: 40 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 30 },
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

    const headerLabels = ['Type', 'Description', 'Location', 'Date', 'Status', 'Reporter']

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
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [statusFilter, setStatusFilter] = useState('All Status')

  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedIncident, setSelectedIncident] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [officialNotes, setOfficialNotes] = useState('')

  const [selectedMedia, setSelectedMedia] = useState(null)
  const [mediaPreviewOpen, setMediaPreviewOpen] = useState(false)

  const [exportOpen, setExportOpen] = useState(false)
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

  // UPDATE STATUS
  const updateStatus = async (newStatus) => {
    const { error } = await updateIncident(
      selectedIncident.id,
      {
        status: newStatus,
      }
    )

    if (error) {
      alert('Failed to update status: ' + error.message)
    } else {
      setSelectedIncident((prev) => ({
        ...prev,
        status: newStatus,
      }))
    }
  }

  // SAVE NOTES
  const saveNotes = async () => {
    const { error } = await updateIncident(
      selectedIncident.id,
      {
        official_notes: officialNotes,
      }
    )

    if (error) {
      alert('Failed to save notes: ' + error.message)
    }
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
          <TopBar title="All Reports" />

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
        <TopBar title="All Reports">
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">
            Official
          </span>

          <button
            onClick={() => window.location.href = '/dashboard'}
            className="relative flex items-center justify-center w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-lg hover:shadow-xl animate-pulse-slow"
          >
            <style>{`
              @keyframes pulse-slow {
                0%, 100% {
                  opacity: 1;
                  transform: scale(1);
                }
                50% {
                  opacity: 0.7;
                  transform: scale(1.05);
                }
              }
              @keyframes ripple {
                0% {
                  transform: scale(1);
                  opacity: 0.6;
                }
                100% {
                  transform: scale(1.8);
                  opacity: 0;
                }
              }
              .animate-pulse-slow {
                animation: pulse-slow 2s ease-in-out infinite;
              }
              .sos-ripple {
                position: absolute;
                inset: 0;
                border-radius: 50%;
                border: 2px solid #dc2626;
                animation: ripple 2s ease-out infinite;
              }
              .sos-ripple:nth-child(2) {
                animation-delay: 0.7s;
              }
              .sos-ripple:nth-child(3) {
                animation-delay: 1.4s;
              }
            `}</style>
            <span className="sos-ripple"></span>
            <span className="sos-ripple"></span>
            <span className="sos-ripple"></span>
            <span className="relative z-10 text-xl">🚨</span>
          </button>
        </TopBar>

        <AdminNavTabs />

        <main className="p-4 md:p-6 space-y-4 md:space-y-5">
          {/* HEADER */}
          <div className="flex flex-row flex-wrap items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              All Reports
            </h2>

            <span className="text-xs md:text-sm font-semibold text-gray-900 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
              {incidents.length} records
            </span>
          </div>

          {/* FILTERS */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search incidents..."
              />
            </div>

            <div className="relative flex-1 md:flex-none md:max-w-fit">
              <select
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value)
                }
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

            <div className="relative flex-1 md:flex-none md:max-w-fit">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
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
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition"
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

                  <th className="px-1.5 py-2.5 w-[22%]">
                    Description
                  </th>

                  <th className="px-1.5 py-2.5 w-[22%]">
                    Location
                  </th>

                  <th className="px-1.5 py-2.5 w-[18%]">
                    Date
                  </th>

                  <th className="px-1.5 py-2.5 w-[20%]">
                    Status
                  </th>

                  <th className="px-1.5 py-2.5 w-[15%] text-right">
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

    <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">

      {/* HEADER */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">

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

      {/* BODY */}
      <div className="p-5 space-y-4">

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

          <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
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

      <AdminMobileBottomNav />
    </div>
  )
}