import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// Excel Export with filtering
export const exportToExcel = async (incidents, filters = {}) => {
  try {
    console.log('🔄 Starting Excel export...')

    if (!incidents || incidents.length === 0) {
      throw new Error('No incidents data available')
    }

    const filteredData = applyFilters(incidents, filters)

    if (filteredData.length === 0) {
      throw new Error('No incidents match the selected filters')
    }

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Incidents')

    // Define columns
    worksheet.columns = [
      { header: 'ID',              key: 'id',              width: 12 },
      { header: 'Type',            key: 'type',            width: 14 },
      { header: 'Description',     key: 'description',     width: 40 },
      { header: 'Location',        key: 'location',        width: 20 },
      { header: 'Purok',           key: 'purok',           width: 12 },
      { header: 'Status',          key: 'status',          width: 12 },
      { header: 'Urgency',         key: 'urgency',         width: 12 },
      { header: 'Reporter',        key: 'reporter',        width: 20 },
      { header: 'Contact',         key: 'contact',         width: 16 },
      { header: 'Date Reported',   key: 'date',            width: 14 },
      { header: 'Time',            key: 'time',            width: 10 },
      { header: 'Resolved At',     key: 'resolvedAt',      width: 20 },
      { header: 'AI Classification', key: 'aiClass',       width: 18 },
      { header: 'Confidence',      key: 'confidence',      width: 12 },
    ]

    // Style the header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    worksheet.getRow(1).fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' }
    }

    // Add rows
    filteredData.forEach(incident => {
      worksheet.addRow({
        id:          (incident.id || 'N/A').substring(0, 8),
        type:        incident.type || 'N/A',
        description: incident.description || 'No description',
        location:    incident.location || 'N/A',
        purok:       incident.purok || 'N/A',
        status:      incident.status || 'pending',
        urgency:     incident.urgency_level || 'medium',
        reporter:    incident.reporter_name || incident.full_name || 'Anonymous',
        contact:     incident.reporter_contact || incident.phone || 'N/A',
        date:        incident.created_at ? new Date(incident.created_at).toLocaleDateString() : 'N/A',
        time:        incident.created_at ? new Date(incident.created_at).toLocaleTimeString() : 'N/A',
        resolvedAt:  incident.resolved_at ? new Date(incident.resolved_at).toLocaleString() : 'Pending',
        aiClass:     incident.ai_classification || 'N/A',
        confidence:  incident.ai_confidence ? `${(incident.ai_confidence * 100).toFixed(0)}%` : 'N/A',
      })
    })

    const filename = `incident_report_${new Date().toISOString().split('T')[0]}.xlsx`
    const buffer = await workbook.xlsx.writeBuffer()
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename)

    console.log('✅ Excel download complete!')
    return filename
  } catch (err) {
    console.error('❌ Excel export error:', err)
    throw err
  }
}

// PDF Export for compliance reports
export const exportToPDF = (incidents, reportTitle = 'Incident Report', filters = {}) => {
  try {
    console.log('🔄 Starting PDF export...')
    console.log('📄 Total incidents:', incidents?.length || 0)
    
    if (!incidents || incidents.length === 0) {
      throw new Error('No incidents data available')
    }
    
    const doc = new jsPDF()
    const filteredData = applyFilters(incidents, filters)
    
    console.log('📄 Filtered incidents:', filteredData.length)
    
    if (filteredData.length === 0) {
      throw new Error('No incidents match the selected filters')
    }

    // Header
    doc.setFontSize(18)
    doc.text(reportTitle, 14, 20)
    
    doc.setFontSize(11)
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, 28)
    doc.text(`Total Incidents: ${filteredData.length}`, 14, 34)

    // Filters applied
    let startY = 45
    if (Object.keys(filters).some(key => filters[key])) {
      doc.setFontSize(9)
      doc.text('Filters Applied:', 14, 42)
      let yPos = 47
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          doc.text(`${key}: ${value}`, 18, yPos)
          yPos += 5
        }
      })
      startY = yPos + 5
    }

    // Table
    const tableData = filteredData.map(incident => [
      (incident.id || 'N/A').substring(0, 8),
      incident.type || 'N/A',
      (incident.description || 'No description').substring(0, 50) + '...',
      incident.status || 'pending',
      incident.created_at ? new Date(incident.created_at).toLocaleDateString() : 'N/A',
    ])

    // Use autoTable correctly
    autoTable(doc, {
      startY,
      head: [['ID', 'Type', 'Description', 'Status', 'Date']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    })

    const filename = `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    
    console.log('✅ PDF created, downloading...')
    doc.save(filename)
    console.log('✅ PDF download complete!')
    
    return filename
  } catch (err) {
    console.error('❌ PDF export error:', err)
    throw err
  }
}

// Monthly Report Generator
export const generateMonthlyReport = (incidents, month, year) => {
  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 0)

  const monthlyIncidents = incidents.filter(incident => {
    const incidentDate = new Date(incident.created_at)
    return incidentDate >= startDate && incidentDate <= endDate
  })

  const report = {
    period: `${startDate.toLocaleString('default', { month: 'long' })} ${year}`,
    totalIncidents: monthlyIncidents.length,
    byType: {},
    byStatus: {},
    byPurok: {},
    byUrgency: {},
    responseTime: [],
    resolved: 0,
    pending: 0,
  }

  monthlyIncidents.forEach(incident => {
    // By type
    report.byType[incident.type] = (report.byType[incident.type] || 0) + 1
    
    // By status
    report.byStatus[incident.status] = (report.byStatus[incident.status] || 0) + 1
    
    // By purok
    if (incident.purok) {
      report.byPurok[incident.purok] = (report.byPurok[incident.purok] || 0) + 1
    }
    
    // By urgency
    const urgency = incident.urgency_level || 'medium'
    report.byUrgency[urgency] = (report.byUrgency[urgency] || 0) + 1
    
    // Resolved count
    if (incident.status === 'resolved') {
      report.resolved++
      
      // Calculate response time
      if (incident.resolved_at) {
        const responseTime = new Date(incident.resolved_at) - new Date(incident.created_at)
        report.responseTime.push(responseTime)
      }
    } else if (incident.status === 'pending') {
      report.pending++
    }
  })

  // Average response time
  if (report.responseTime.length > 0) {
    const avgResponseTime = report.responseTime.reduce((a, b) => a + b, 0) / report.responseTime.length
    report.avgResponseTimeHours = (avgResponseTime / (1000 * 60 * 60)).toFixed(2)
  }

  return report
}

// Quarterly Report Generator
export const generateQuarterlyReport = (incidents, quarter, year) => {
  const quarterMonths = {
    1: [0, 1, 2],   // Q1: Jan-Mar
    2: [3, 4, 5],   // Q2: Apr-Jun
    3: [6, 7, 8],   // Q3: Jul-Sep
    4: [9, 10, 11], // Q4: Oct-Dec
  }

  const months = quarterMonths[quarter]
  const quarterlyData = months.map(month => generateMonthlyReport(incidents, month, year))

  const report = {
    period: `Q${quarter} ${year}`,
    totalIncidents: quarterlyData.reduce((sum, m) => sum + m.totalIncidents, 0),
    byMonth: quarterlyData,
    trends: analyzeTrends(quarterlyData),
    summary: {
      mostCommonType: null,
      mostAffectedPurok: null,
      averageResponseTime: null,
      resolutionRate: 0,
    },
  }

  // Calculate summary statistics
  const allTypes = {}
  const allPuroks = {}
  let totalResolved = 0
  let totalIncidents = 0

  quarterlyData.forEach(month => {
    Object.entries(month.byType).forEach(([type, count]) => {
      allTypes[type] = (allTypes[type] || 0) + count
    })
    
    Object.entries(month.byPurok).forEach(([purok, count]) => {
      allPuroks[purok] = (allPuroks[purok] || 0) + count
    })
    
    totalResolved += month.resolved
    totalIncidents += month.totalIncidents
  })

  report.summary.mostCommonType = Object.entries(allTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
  report.summary.mostAffectedPurok = Object.entries(allPuroks).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
  report.summary.resolutionRate = totalIncidents > 0 ? ((totalResolved / totalIncidents) * 100).toFixed(1) : 0

  return report
}

// Compliance Report for Barangay Administration
export const generateComplianceReport = (incidents, startDate, endDate) => {
  const filtered = incidents.filter(incident => {
    const date = new Date(incident.created_at)
    return date >= new Date(startDate) && date <= new Date(endDate)
  })

  const report = {
    reportPeriod: {
      start: new Date(startDate).toLocaleDateString(),
      end: new Date(endDate).toLocaleDateString(),
    },
    totalIncidents: filtered.length,
    criticalIncidents: filtered.filter(i => i.urgency_level === 'critical').length,
    resolvedIncidents: filtered.filter(i => i.status === 'resolved').length,
    pendingIncidents: filtered.filter(i => i.status === 'pending').length,
    
    incidentsByCategory: {},
    responseMetrics: {
      avgResponseTime: null,
      fastestResponse: null,
      slowestResponse: null,
    },
    
    communityEngagement: {
      totalReporters: new Set(filtered.map(i => i.user_id)).size,
      anonymousReports: filtered.filter(i => !i.user_id || i.reporter_name === 'Anonymous').length,
    },
    
    geographicDistribution: {},
    recommendations: [],
  }

  // Calculate metrics
  filtered.forEach(incident => {
    report.incidentsByCategory[incident.type] = (report.incidentsByCategory[incident.type] || 0) + 1
    
    if (incident.purok) {
      report.geographicDistribution[incident.purok] = (report.geographicDistribution[incident.purok] || 0) + 1
    }
  })

  // Response time analysis
  const responseTimes = filtered
    .filter(i => i.resolved_at)
    .map(i => new Date(i.resolved_at) - new Date(i.created_at))

  if (responseTimes.length > 0) {
    report.responseMetrics.avgResponseTime = (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / (1000 * 60 * 60)).toFixed(2)
    report.responseMetrics.fastestResponse = (Math.min(...responseTimes) / (1000 * 60 * 60)).toFixed(2)
    report.responseMetrics.slowestResponse = (Math.max(...responseTimes) / (1000 * 60 * 60)).toFixed(2)
  }

  // Generate recommendations
  if (report.pendingIncidents > report.resolvedIncidents) {
    report.recommendations.push('High number of pending incidents. Consider increasing responder capacity.')
  }
  
  if (report.criticalIncidents > filtered.length * 0.2) {
    report.recommendations.push('High proportion of critical incidents. Review emergency response protocols.')
  }

  const highActivityPuroks = Object.entries(report.geographicDistribution)
    .filter(([, count]) => count > filtered.length * 0.15)
    .map(([purok]) => purok)
  
  if (highActivityPuroks.length > 0) {
    report.recommendations.push(`High incident activity in ${highActivityPuroks.join(', ')}. Consider targeted interventions.`)
  }

  return report
}

// Helper function to apply filters
const applyFilters = (incidents, filters) => {
  if (!incidents || !Array.isArray(incidents)) {
    console.warn('⚠️ Invalid incidents data, returning empty array')
    return []
  }
  
  try {
    return incidents.filter(incident => {
      if (!incident) return false
      
      if (filters.type && incident.type !== filters.type) return false
      if (filters.status && incident.status !== filters.status) return false
      if (filters.purok && incident.purok !== filters.purok) return false
      if (filters.urgency && incident.urgency_level !== filters.urgency) return false
      
      if (filters.startDate && incident.created_at) {
        const incidentDate = new Date(incident.created_at)
        if (incidentDate < new Date(filters.startDate)) return false
      }
      
      if (filters.endDate && incident.created_at) {
        const incidentDate = new Date(incident.created_at)
        if (incidentDate > new Date(filters.endDate)) return false
      }
      
      return true
    })
  } catch (err) {
    console.error('❌ Filter error:', err)
    return incidents
  }
}

// Analyze trends helper
const analyzeTrends = (monthlyData) => {
  const trends = {
    incidentTrend: null,
    mostImprovedArea: null,
    needsAttention: [],
  }

  const incidentCounts = monthlyData.map(m => m.totalIncidents)
  
  if (incidentCounts.length >= 2) {
    const first = incidentCounts[0]
    const last = incidentCounts[incidentCounts.length - 1]
    
    if (last > first * 1.2) {
      trends.incidentTrend = 'increasing'
    } else if (last < first * 0.8) {
      trends.incidentTrend = 'decreasing'
    } else {
      trends.incidentTrend = 'stable'
    }
  }

  return trends
}

// Chart data generator for presentations
export const generateChartData = (incidents, type = 'byType') => {
  const data = {}
  
  incidents.forEach(incident => {
    let key
    
    switch (type) {
      case 'byType':
        key = incident.type
        break
      case 'byStatus':
        key = incident.status
        break
      case 'byPurok':
        key = incident.purok || 'Unknown'
        break
      case 'byMonth':
        key = new Date(incident.created_at).toLocaleString('default', { month: 'short' })
        break
      case 'byUrgency':
        key = incident.urgency_level || 'medium'
        break
      default:
        key = 'Other'
    }
    
    data[key] = (data[key] || 0) + 1
  })

  return {
    labels: Object.keys(data),
    datasets: [{
      label: 'Incidents',
      data: Object.values(data),
      backgroundColor: [
        '#dc2626',
        '#d97706',
        '#ea580c',
        '#2563eb',
        '#7c3aed',
        '#059669',
        '#0891b2',
        '#6366f1',
      ],
    }],
  }
}
