// API base URL:
// - On Vercel (production): empty string → calls go to same origin (/api/signup, etc.)
// - On localhost: proxy via vite.config.js handles /api → localhost:5000
// - If VITE_API_BASE_URL is explicitly set in env, use that
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export default API_BASE_URL
