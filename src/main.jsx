import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "leaflet/dist/leaflet.css";
import './index.css'
import App from './App.jsx'

// Lock screen orientation to portrait on mobile
if ('screen' in window && 'orientation' in window.screen) {
  const lockOrientation = async () => {
    try {
      if (window.screen.orientation?.lock) {
        await window.screen.orientation.lock('portrait')
        console.log('✅ Screen locked to portrait orientation')
      }
    } catch (error) {
      console.log('⚠️ Orientation lock not supported or already locked:', error.message)
    }
  }
  
  // Lock orientation when app loads
  lockOrientation()
  
  // Lock orientation when fullscreen is activated (for PWA)
  document.addEventListener('fullscreenchange', lockOrientation)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
