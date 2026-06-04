// Import useState and useEffect for hook
import { useState, useEffect } from 'react'

/**
 * Internationalization (i18n) System
 * Supports English and Tagalog
 */

// Translation strings
const translations = {
  en: {
    // Common
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    submit: 'Submit',
    close: 'Close',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
    search: 'Search',
    filter: 'Filter',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    
    // Navigation
    dashboard: 'Dashboard',
    report: 'Report Incident',
    map: 'Map',
    reports: 'All Reports',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Logout',
    
    // Incident Types
    crime: 'Crime',
    fire: 'Fire',
    flood: 'Flood',
    accident: 'Accident',
    disturbance: 'Disturbance',
    
    // Status
    pending: 'Pending',
    responding: 'Responding',
    resolved: 'Resolved',
    cancelled: 'Cancelled',
    
    // Report Incident
    reportIncident: 'Report an Incident',
    incidentType: 'Incident Type',
    description: 'Description',
    location: 'Location',
    pinLocation: 'Pin the Location',
    uploadEvidence: 'Upload Evidence',
    takePhoto: 'Take Photo',
    recordVideo: 'Record Video',
    reporterInfo: 'Reporter Information',
    reporterName: 'Full Name',
    contactNumber: 'Contact Number',
    submitReport: 'Submit Report',
    
    // SOS
    sosEmergency: 'SOS Emergency',
    sosMessage: 'This will immediately alert all available responders',
    triggerSOS: 'Trigger SOS',
    cancelSOS: 'Cancel',
    sosTriggered: 'SOS Alert Sent',
    sosHelp: 'Help is on the way! Stay calm and safe.',
    
    // Dashboard
    myReports: 'My Reports',
    recentIncidents: 'Recent Incidents',
    communityAlerts: 'Community Alerts',
    emergencyContacts: 'Emergency Contacts',
    viewAll: 'View All',
    
    // Admin
    adminDashboard: 'Officials Dashboard',
    allIncidents: 'All Incidents',
    analytics: 'Analytics',
    assignResponder: 'Assign Responder',
    updateStatus: 'Update Status',
    addComment: 'Add Comment',
    
    // Notifications
    newIncident: 'New Incident',
    statusUpdated: 'Status Updated',
    responderAssigned: 'Responder Assigned',
    incidentResolved: 'Incident Resolved',
    
    // Messages
    reportSubmitted: 'Report submitted successfully!',
    reportFailed: 'Failed to submit report. Please try again.',
    loginRequired: 'Please login to continue',
    noData: 'No data available',
    errorOccurred: 'An error occurred',
    
    // Validation
    required: 'This field is required',
    invalidEmail: 'Invalid email address',
    invalidPhone: 'Invalid phone number',
    
    // Time
    justNow: 'Just now',
    minutesAgo: 'minutes ago',
    hoursAgo: 'hours ago',
    daysAgo: 'days ago',
    
    // Evidence
    evidence: 'Evidence',
    uploadFiles: 'Upload Files',
    maxFileSize: 'Max file size',
    supportedFormats: 'Supported formats',
    
    // Search
    advancedSearch: 'Advanced Search',
    searchResults: 'Search Results',
    noResultsFound: 'No results found',
    filters: 'Filters',
    clearFilters: 'Clear Filters',
    
    // Comments
    comments: 'Comments',
    addComment: 'Add a comment',
    officialResponse: 'Official Response',
    
    // Assignment
    assignedTo: 'Assigned to',
    assignResponder: 'Assign Responder',
    reassign: 'Reassign',
    responderAccepted: 'Responder Accepted',
    enRoute: 'En Route',
    onScene: 'On Scene',
    
    // Dashboard specific
    welcome: 'Welcome',
    todayIncidents: "Today's Incidents",
    pendingAction: 'Pending Action',
    totalReports: 'Total Reports',
    viewAllReports: 'View All Reports',
    reportNow: 'Report Now',
    quickActions: 'Quick Actions',
    
    // Map
    viewMap: 'View Map',
    incidentMap: 'Incident Map',
    showOnMap: 'Show on Map',
    
    // Analytics
    statistics: 'Statistics',
    insights: 'Insights',
    trends: 'Trends',
    byType: 'By Type',
    byLocation: 'By Location',
    byStatus: 'By Status',
    hotspots: 'Hotspots',
    topLocations: 'Top Locations',
    
    // Report form
    selectType: 'Select incident type',
    enterDescription: 'Enter description',
    selectLocation: 'Select location on map',
    uploadPhoto: 'Upload Photo',
    uploadVideo: 'Upload Video',
    optional: 'Optional',
    required: 'Required',
    
    // Status actions
    markAsResolved: 'Mark as Resolved',
    markAsResponding: 'Mark as Responding',
    markAsPending: 'Mark as Pending',
    
    // Emergency
    emergency: 'Emergency',
    urgentAlert: 'Urgent Alert',
    needsAttention: 'Needs Attention',
    
    // Time
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    
    // Common actions
    refresh: 'Refresh',
    export: 'Export',
    download: 'Download',
    share: 'Share',
    print: 'Print',
    view: 'View',
    manage: 'Manage',
    details: 'Details',
    
    // Sidebar menu
    home: 'Home',
    incidents: 'Incidents',
    contacts: 'Contacts',
    about: 'About',
    help: 'Help',
  },
  
  tl: {
    // Common
    loading: 'Naglo-load...',
    save: 'I-save',
    cancel: 'Kanselahin',
    delete: 'Tanggalin',
    edit: 'I-edit',
    submit: 'Isumite',
    close: 'Isara',
    confirm: 'Kumpirmahin',
    yes: 'Oo',
    no: 'Hindi',
    search: 'Maghanap',
    filter: 'I-filter',
    back: 'Bumalik',
    next: 'Susunod',
    previous: 'Nakaraan',
    
    // Navigation
    dashboard: 'Dashboard',
    report: 'Mag-report ng Insidente',
    map: 'Mapa',
    reports: 'Lahat ng Ulat',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Mag-logout',
    
    // Incident Types
    crime: 'Krimen',
    fire: 'Sunog',
    flood: 'Baha',
    accident: 'Aksidente',
    disturbance: 'Gulo',
    
    // Status
    pending: 'Naghihintay',
    responding: 'Tumutugon',
    resolved: 'Nalutas',
    cancelled: 'Kinansela',
    
    // Report Incident
    reportIncident: 'Mag-report ng Insidente',
    incidentType: 'Uri ng Insidente',
    description: 'Paglalarawan',
    location: 'Lokasyon',
    pinLocation: 'I-pin ang Lokasyon',
    uploadEvidence: 'Mag-upload ng Ebidensya',
    takePhoto: 'Kumuha ng Larawan',
    recordVideo: 'Mag-record ng Video',
    reporterInfo: 'Impormasyon ng Nag-uulat',
    reporterName: 'Buong Pangalan',
    contactNumber: 'Numero ng Telepono',
    submitReport: 'Isumite ang Ulat',
    
    // SOS
    sosEmergency: 'SOS Emergency',
    sosMessage: 'Agarang aabisuhan ang lahat ng available na responder',
    triggerSOS: 'I-trigger ang SOS',
    cancelSOS: 'Kanselahin',
    sosTriggered: 'SOS Alert Naipadala',
    sosHelp: 'Parating na ang tulong! Manatiling kalmado at ligtas.',
    
    // Dashboard
    myReports: 'Aking mga Ulat',
    recentIncidents: 'Kamakailang Insidente',
    communityAlerts: 'Community Alerts',
    emergencyContacts: 'Emergency Contacts',
    viewAll: 'Tingnan Lahat',
    
    // Admin
    adminDashboard: 'Dashboard ng mga Opisyal',
    allIncidents: 'Lahat ng Insidente',
    analytics: 'Analytics',
    assignResponder: 'Magtalaga ng Responder',
    updateStatus: 'I-update ang Status',
    addComment: 'Magdagdag ng Komento',
    
    // Notifications
    newIncident: 'Bagong Insidente',
    statusUpdated: 'Na-update ang Status',
    responderAssigned: 'May Nakatalagang Responder',
    incidentResolved: 'Nalutas ang Insidente',
    
    // Messages
    reportSubmitted: 'Matagumpay na naisumite ang ulat!',
    reportFailed: 'Nabigo ang pagsusumite ng ulat. Pakisubukan muli.',
    loginRequired: 'Mag-login upang magpatuloy',
    noData: 'Walang available na data',
    errorOccurred: 'May naganap na error',
    
    // Validation
    required: 'Kinakailangan ang field na ito',
    invalidEmail: 'Hindi valid na email address',
    invalidPhone: 'Hindi valid na numero ng telepono',
    
    // Time
    justNow: 'Ngayon lang',
    minutesAgo: 'minuto ang nakalipas',
    hoursAgo: 'oras ang nakalipas',
    daysAgo: 'araw ang nakalipas',
    
    // Evidence
    evidence: 'Ebidensya',
    uploadFiles: 'Mag-upload ng Files',
    maxFileSize: 'Maximum na laki ng file',
    supportedFormats: 'Suportadong format',
    
    // Search
    advancedSearch: 'Advanced na Paghahanap',
    searchResults: 'Mga Resulta ng Paghahanap',
    noResultsFound: 'Walang natagpuang resulta',
    filters: 'Mga Filter',
    clearFilters: 'I-clear ang mga Filter',
    
    // Comments
    comments: 'Mga Komento',
    addComment: 'Magdagdag ng komento',
    officialResponse: 'Opisyal na Tugon',
    
    // Assignment
    assignedTo: 'Nakatalagang kay',
    assignResponder: 'Magtalaga ng Responder',
    reassign: 'Muling Italaga',
    responderAccepted: 'Tinanggap ng Responder',
    enRoute: 'Papunta na',
    onScene: 'Nasa Lugar na',
    
    // Dashboard specific
    welcome: 'Maligayang Pagdating',
    todayIncidents: 'Insidente Ngayong Araw',
    pendingAction: 'Naghihintay ng Aksyon',
    totalReports: 'Kabuuang Ulat',
    viewAllReports: 'Tingnan Lahat ng Ulat',
    reportNow: 'Mag-report Ngayon',
    quickActions: 'Mabilis na Aksyon',
    
    // Map
    viewMap: 'Tingnan ang Mapa',
    incidentMap: 'Mapa ng Insidente',
    showOnMap: 'Ipakita sa Mapa',
    
    // Analytics
    statistics: 'Estadistika',
    insights: 'Mga Detalye',
    trends: 'Mga Kalakaran',
    byType: 'Ayon sa Uri',
    byLocation: 'Ayon sa Lokasyon',
    byStatus: 'Ayon sa Katayuan',
    hotspots: 'Mga Pangunahing Lugar',
    topLocations: 'Mga Nangungunang Lokasyon',
    
    // Report form
    selectType: 'Pumili ng uri ng insidente',
    enterDescription: 'Ilagay ang paglalarawan',
    selectLocation: 'Pumili ng lokasyon sa mapa',
    uploadPhoto: 'Mag-upload ng Larawan',
    uploadVideo: 'Mag-upload ng Video',
    optional: 'Opsyonal',
    required: 'Kinakailangan',
    
    // Status actions
    markAsResolved: 'Markahan bilang Nalutas',
    markAsResponding: 'Markahan bilang Tumutugon',
    markAsPending: 'Markahan bilang Naghihintay',
    
    // Emergency
    emergency: 'Emergency',
    urgentAlert: 'Agarang Alerto',
    needsAttention: 'Kailangan ng Pansin',
    
    // Time
    today: 'Ngayong Araw',
    yesterday: 'Kahapon',
    thisWeek: 'Ngayong Linggo',
    thisMonth: 'Ngayong Buwan',
    
    // Common actions
    refresh: 'I-refresh',
    export: 'I-export',
    download: 'I-download',
    share: 'Ibahagi',
    print: 'I-print',
    view: 'Tingnan',
    manage: 'Pamahalaan',
    details: 'Mga Detalye',
    
    // Sidebar menu
    home: 'Home',
    incidents: 'Mga Insidente',
    contacts: 'Mga Contact',
    about: 'Tungkol',
    help: 'Tulong',
  }
}

/**
 * i18n Manager Class
 */
class I18nManager {
  constructor() {
    this.currentLanguage = this.getStoredLanguage() || 'en'
    this.listeners = []
  }

  /**
   * Get stored language from localStorage
   */
  getStoredLanguage() {
    try {
      return localStorage.getItem('tapwatch_language')
    } catch {
      return null
    }
  }

  /**
   * Set and store language
   */
  setLanguage(language) {
    if (!translations[language]) {
      console.warn(`Language ${language} not supported`)
      return false
    }

    this.currentLanguage = language

    try {
      localStorage.setItem('tapwatch_language', language)
    } catch (error) {
      console.error('Failed to store language preference:', error)
    }

    // Notify listeners
    this.notifyListeners()

    console.log(`✅ Language changed to: ${language}`)
    return true
  }

  /**
   * Get current language
   */
  getLanguage() {
    return this.currentLanguage
  }

  /**
   * Translate a key
   */
  t(key, params = {}) {
    const lang = this.currentLanguage
    let translation = translations[lang]?.[key] || translations.en[key] || key

    // Replace parameters
    Object.keys(params).forEach(param => {
      translation = translation.replace(`{${param}}`, params[param])
    })

    return translation
  }

  /**
   * Get all translations for current language
   */
  getTranslations() {
    return translations[this.currentLanguage] || translations.en
  }

  /**
   * Subscribe to language changes
   */
  subscribe(callback) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback)
    }
  }

  /**
   * Notify all listeners of language change
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      callback(this.currentLanguage)
    })
  }

  /**
   * Format date based on language
   */
  formatDate(date, format = 'short') {
    const d = new Date(date)
    const locale = this.currentLanguage === 'tl' ? 'tl-PH' : 'en-US'

    if (format === 'short') {
      return d.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } else if (format === 'long') {
      return d.toLocaleDateString(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    } else if (format === 'time') {
      return d.toLocaleTimeString(locale, {
        hour: 'numeric',
        minute: '2-digit'
      })
    } else if (format === 'datetime') {
      return d.toLocaleString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    }

    return d.toLocaleDateString(locale)
  }

  /**
   * Format relative time (e.g., "5 minutes ago")
   */
  formatRelativeTime(date) {
    const now = new Date()
    const then = new Date(date)
    const diffMs = now - then
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) {
      return this.t('justNow')
    } else if (diffMins < 60) {
      return `${diffMins} ${this.t('minutesAgo')}`
    } else if (diffHours < 24) {
      return `${diffHours} ${this.t('hoursAgo')}`
    } else {
      return `${diffDays} ${this.t('daysAgo')}`
    }
  }
}

// Export singleton instance
export const i18n = new I18nManager()

// React hook for i18n
export const useTranslation = () => {
  const [language, setLanguageState] = useState(i18n.getLanguage())

  useEffect(() => {
    const unsubscribe = i18n.subscribe((newLang) => {
      setLanguageState(newLang)
    })
    return unsubscribe
  }, [])

  return {
    t: (key, params) => i18n.t(key, params),
    language,
    setLanguage: (lang) => i18n.setLanguage(lang),
    formatDate: (date, format) => i18n.formatDate(date, format),
    formatRelativeTime: (date) => i18n.formatRelativeTime(date)
  }
}
