import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Plus, ShieldCheck, User } from 'lucide-react'
import { useState } from 'react'
import SOSPanicModal from './SOSPanicModal'
import { useAuth } from '../context/useAuth'

export default function MobileBottomNav() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { profile } = useAuth()
  const [sosOpen, setSosOpen] = useState(false)

  const active = (path) => location.pathname === path

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden z-40 bg-white border-t border-gray-200"
        style={{ height: 64 }}
      >
        <div className="flex items-center h-full">

          {/* Home */}
          <button
            onClick={() => navigate('/dashboard')}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 ${active('/dashboard') ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <Home size={22} strokeWidth={active('/dashboard') ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">Home</span>
          </button>

          {/* Report */}
          <button
            onClick={() => navigate('/report')}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 ${active('/report') ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <Plus size={22} strokeWidth={active('/report') ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">Report</span>
          </button>

          {/* Center — SOS elevated above bar, labeled "Map" */}
          <div className="flex flex-col items-center justify-end flex-1 relative" style={{ height: 64 }}>
            {/* White backing circle — creates the "floating" look */}
            <div
              className="absolute bg-white rounded-full"
              style={{ width: 72, height: 72, top: -20, left: '50%', transform: 'translateX(-50%)', boxShadow: '0 0 0 1px #e5e7eb' }}
            />
            {/* Red SOS circle */}
            <button
              onClick={() => setSosOpen(true)}
              className="absolute flex items-center justify-center rounded-full bg-red-500 text-white font-black text-base shadow-lg active:scale-95 transition-transform"
              style={{ width: 58, height: 58, top: -14, left: '50%', transform: 'translateX(-50%)' }}
            >
              SOS
            </button>
            {/* "Map" label at bottom */}
            <span className="text-[10px] font-medium text-gray-400 pb-1.5">Map</span>
          </div>

          {/* Verify */}
          <button
            onClick={() => navigate('/verification')}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 ${active('/verification') ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <ShieldCheck size={22} strokeWidth={active('/verification') ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">Verify</span>
          </button>

          {/* Profile */}
          <button
            onClick={() => navigate('/profile')}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 ${active('/profile') ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <User size={22} strokeWidth={active('/profile') ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">Profile</span>
          </button>

        </div>
      </nav>

      <SOSPanicModal isOpen={sosOpen} onClose={() => setSosOpen(false)} profile={profile} />
    </>
  )
}
