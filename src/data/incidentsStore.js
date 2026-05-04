import { mockIncidents } from './mockIncidents'

const STORAGE_KEY = 'tapwatch_submitted_incidents'

export function getAllIncidents() {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  return [...mockIncidents, ...stored]
}

export function addIncident(incident) {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  stored.push(incident)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}
