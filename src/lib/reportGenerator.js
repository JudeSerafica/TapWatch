import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel
} from 'docx'

export const generateIncidentSummary = (incidents) => {
  if (!incidents.length) {
    return {
      total: 0,
      resolved: 0,
      pending: 0,
      responding: 0,
      topType: 'N/A',
      topPurok: 'N/A'
    }
  }

  const total = incidents.length

  const resolved = incidents.filter(
    i => i.status === 'resolved'
  ).length

  const pending = incidents.filter(
    i => i.status === 'pending'
  ).length

  const responding = incidents.filter(
    i => i.status === 'responding'
  ).length

  const typeCount = {}
  const purokCount = {}

  incidents.forEach(i => {
    typeCount[i.type] = (typeCount[i.type] || 0) + 1
    purokCount[i.purok] = (purokCount[i.purok] || 0) + 1
  })

  const topType = Object.keys(typeCount).reduce((a, b) =>
    typeCount[a] > typeCount[b] ? a : b
  )

  const topPurok = Object.keys(purokCount).reduce((a, b) =>
    purokCount[a] > purokCount[b] ? a : b
  )

  return {
    total,
    resolved,
    pending,
    responding,
    topType,
    topPurok
  }
}

export const generateNarrativeReport = (summary) => {
  return `
Barangay Incident Report

Total Incidents: ${summary.total}

Resolved Cases: ${summary.resolved}
Pending Cases: ${summary.pending}
Responding Cases: ${summary.responding}

Most Common Incident:
${summary.topType}

Highest Incident Area:
${summary.topPurok}

Generated on:
${new Date().toLocaleString()}
`
}

export const exportReportPDF = async (
  elementId,
  filename = 'incident-report.pdf'
) => {
  const input = document.getElementById(elementId)

  const canvas = await html2canvas(input)

  const imgData = canvas.toDataURL('image/png')

  const pdf = new jsPDF('p', 'mm', 'a4')

  const pdfWidth = pdf.internal.pageSize.getWidth()

  const imgProps = pdf.getImageProperties(imgData)

  const pdfHeight =
    (imgProps.height * pdfWidth) / imgProps.width

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)

  pdf.save(filename)
}

export const exportReportWord = async (
  text,
  filename = 'incident-report.docx'
) => {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: 'Barangay Incident Report',
            heading: HeadingLevel.HEADING_1
          }),

          new Paragraph({
            children: [
              new TextRun(text)
            ]
          })
        ]
      }
    ]
  })

  const blob = await Packer.toBlob(doc)

  saveAs(blob, filename)
}