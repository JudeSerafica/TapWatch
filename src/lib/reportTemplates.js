// Report Templates and Quick Reporting System

export const reportTemplates = {
  emergency: {
    id: 'emergency',
    name: 'Emergency Report',
    icon: '🚨',
    category: 'Quick',
    fields: {
      type: 'Crime',
      description: 'Emergency incident requiring immediate attention',
      urgency_level: 'high',
    },
    color: '#dc2626',
  },
  
  crime: {
    id: 'crime',
    name: 'Crime Report',
    icon: '👮',
    category: 'Standard',
    fields: {
      type: 'Crime',
      urgency_level: 'high',
    },
    prompts: {
      description: 'Describe the crime incident (e.g., theft, vandalism, etc.)',
    },
    color: '#dc2626',
  },

  fire: {
    id: 'fire',
    name: 'Fire Emergency',
    icon: '🔥',
    category: 'Emergency',
    fields: {
      type: 'Fire',
      urgency_level: 'critical',
    },
    prompts: {
      description: 'Describe the fire location, size, and any persons at risk',
    },
    color: '#ea580c',
  },

  flood: {
    id: 'flood',
    name: 'Flood Report',
    icon: '🌊',
    category: 'Emergency',
    fields: {
      type: 'Flood',
      urgency_level: 'high',
    },
    prompts: {
      description: 'Describe the flood level and affected areas',
    },
    color: '#2563eb',
  },

  accident: {
    id: 'accident',
    name: 'Accident Report',
    icon: '🚗',
    category: 'Standard',
    fields: {
      type: 'Accident',
      urgency_level: 'medium',
    },
    prompts: {
      description: 'Describe the accident and any injuries',
    },
    color: '#d97706',
  },

  disturbance: {
    id: 'disturbance',
    name: 'Noise/Disturbance',
    icon: '📢',
    category: 'Standard',
    fields: {
      type: 'Disturbance',
      urgency_level: 'low',
    },
    prompts: {
      description: 'Describe the disturbance and its impact',
    },
    color: '#7c3aed',
  },

  medicalEmergency: {
    id: 'medicalEmergency',
    name: 'Medical Emergency',
    icon: '⚕️',
    category: 'Emergency',
    fields: {
      type: 'Accident',
      urgency_level: 'critical',
    },
    prompts: {
      description: 'Describe the medical emergency and condition of the patient',
    },
    color: '#dc2626',
  },

  suspiciousActivity: {
    id: 'suspiciousActivity',
    name: 'Suspicious Activity',
    icon: '👁️',
    category: 'Standard',
    fields: {
      type: 'Crime',
      urgency_level: 'medium',
    },
    prompts: {
      description: 'Describe the suspicious activity or persons',
    },
    color: '#7c3aed',
  },

  roadHazard: {
    id: 'roadHazard',
    name: 'Road Hazard',
    icon: '⚠️',
    category: 'Standard',
    fields: {
      type: 'Accident',
      urgency_level: 'low',
    },
    prompts: {
      description: 'Describe the road hazard or obstruction',
    },
    color: '#d97706',
  },

  powerOutage: {
    id: 'powerOutage',
    name: 'Power Outage',
    icon: '💡',
    category: 'Standard',
    fields: {
      type: 'Disturbance',
      urgency_level: 'low',
    },
    prompts: {
      description: 'Describe the power outage and affected area',
    },
    color: '#6b7280',
  },
}

export const getTemplatesByCategory = () => {
  const categories = {
    Emergency: [],
    Quick: [],
    Standard: [],
  }

  Object.values(reportTemplates).forEach(template => {
    categories[template.category].push(template)
  })

  return categories
}

export const getFrequentlyUsedTemplates = (userHistory = []) => {
  // Get templates user has used most
  const templateCounts = {}
  
  userHistory.forEach(incident => {
    const templateId = incident.template_id || 'custom'
    templateCounts[templateId] = (templateCounts[templateId] || 0) + 1
  })

  const sortedTemplates = Object.entries(templateCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => reportTemplates[id])
    .filter(Boolean)

  return sortedTemplates
}

export const applyTemplate = (template, existingData = {}) => {
  return {
    ...existingData,
    ...template.fields,
    template_id: template.id,
  }
}

export const createQuickReport = async (templateId, location, userId, profileData) => {
  const template = reportTemplates[templateId]
  
  if (!template) {
    throw new Error('Template not found')
  }

  const quickReport = {
    ...template.fields,
    template_id: templateId,
    location: location || 'Current Location',
    user_id: userId,
    reporter_name: profileData?.full_name || 'Anonymous',
    reporter_contact: profileData?.phone || null,
    purok: profileData?.purok || null,
    status: 'pending',
    created_at: new Date().toISOString(),
  }

  return quickReport
}
