# Download Feature - AllReports Page

## Overview
Added download functionality to the AllReports page that allows exporting incident reports in multiple formats (Excel, PDF, and Word).

## Features

### 1. **Excel Export** (.xlsx)
- Downloads filtered incidents as an Excel spreadsheet
- Includes all incident details in organized columns
- Auto-sized columns for better readability
- Filename includes filter type and date

### 2. **PDF Export** (.pdf)
- Creates a formatted PDF document with incident table
- Includes report title, generation date, and total records
- Automatically handles pagination for large datasets
- Compact format optimized for printing

### 3. **Word Export** (.docx)
- Generates a professional Word document
- Includes formatted table with all incident data
- Easy to edit and customize after download
- Includes report metadata (title, date, record count)

## How It Works

### Filter-Based Export
The download buttons export **only the filtered data** based on:
- **Type Filter**: All Types, Crime, Accident, Fire, Flood, Disturbance
- **Status Filter**: All Status, Pending, Responding, Resolved
- **Search Query**: Text search in description and location

### Examples:
1. **Export All Incidents**
   - Set Type: "All Types"
   - Set Status: "All Status"
   - Click any download button
   - Result: All incidents exported

2. **Export Only Accidents**
   - Set Type: "Accident"
   - Click any download button
   - Result: Only accident incidents exported

3. **Export Resolved Crimes**
   - Set Type: "Crime"
   - Set Status: "Resolved"
   - Click any download button
   - Result: Only resolved crime incidents exported

## Data Included in Export

Each export includes:
- **Type**: Incident type (Crime, Accident, etc.)
- **Description**: Full incident description
- **Location**: Incident location
- **Purok**: Specific purok/area
- **Date**: Date and time of incident
- **Status**: Current status (Pending, Responding, Resolved)
- **Reporter**: Name of person who reported
- **AI Classification**: AI-detected incident type
- **Official Notes**: Admin notes (Excel only)

## File Naming Convention

Files are automatically named with:
- Filter type (e.g., "accident", "all_incidents")
- Current date (YYYY-MM-DD format)
- Appropriate extension (.xlsx, .pdf, .docx)

**Examples:**
- `all_incidents_2026-05-28.xlsx`
- `accident_incidents_2026-05-28.pdf`
- `crime_incidents_2026-05-28.docx`

## Technical Details

### Dependencies Added
- `xlsx` - For Excel export functionality
- `jspdf@2.5.2` - For PDF generation (updated from 4.2.1)
- `jspdf-autotable` - For automatic table generation in PDFs

### Existing Dependencies Used
- `docx` - For Word document generation
- `file-saver` - For saving files

### UI Components
- Download buttons with icons (FileSpreadsheet, FileText, Download)
- Filter indicator showing what will be exported
- Record count display

## Usage Instructions

1. **Navigate** to the All Reports page
2. **Apply filters** (optional):
   - Select incident type from dropdown
   - Select status from dropdown
   - Use search bar to filter by text
3. **Review** the record count to see how many incidents will be exported
4. **Click** the desired download button:
   - Green button for Excel
   - Red button for PDF
   - Blue button for Word
5. **File downloads** automatically to your default downloads folder

## Benefits

✅ **Flexible**: Export exactly what you need based on filters
✅ **Multiple Formats**: Choose the format that works best for your needs
✅ **Professional**: Clean, formatted output ready for reports
✅ **Easy to Use**: One-click download with clear visual feedback
✅ **Timestamped**: Files include date for easy organization
