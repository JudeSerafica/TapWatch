import { useNavigate } from 'react-router-dom'
import { FaShieldAlt, FaUsers, FaBell } from 'react-icons/fa'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-cover bg-center bg-no-repeat flex items-center justify-center px-4"
      style={{
        backgroundImage: "url('/backgrounds.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="flex flex-col items-center justify-center text-center max-w-md w-full -mt-10">
        {/* DOTS DECORATION - Top Left */}
        <div className="absolute top-8 left-8 grid grid-cols-5 gap-2 opacity-20 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
          ))}
        </div>

        {/* DOTS DECORATION - Bottom Right */}
        <div className="absolute bottom-8 right-8 grid grid-cols-5 gap-2 opacity-20 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
          ))}
        </div>

        {/* LOGO AND TITLE */}
        <div className="mb-15 mt-20">
          <img
            src="/Tapinac.logo.jpg"
            alt="TapWatch Logo"
            className="w-45 h-45 object-contain mx-auto mb-4 drop-shadow-lg"
          />
          <h1 className="text-5xl md:text-5xl font-bold leading-tight">
            <span className="text-black">Tap</span>
            <span className="text-blue-600">-</span>
            <span className="text-blue-600">Watch</span>
          </h1>
          <p className="text-[20px] text-center text-black font-semibold mt-1">
            Barangay East Tapinac
          </p>
          {/* LINE */}
         <div className="w-[375px] h-[1px] bg-blue-200 mt-3 mb-3 relative">
         <div className="absolute left-1/2 -translate-x-1/2 -top-[1px] w-8 h-[2px] bg-blue-600 rounded-full"></div>
         </div>

        {/* DESCRIPTION */}
         <p className="text-[19px] text-center text-blue-600 font-medium mb-6">
           Community Emergency Monitoring System
         </p>
        </div>

        {/* FEATURES CARDS */}
        <div className="space-y-2 mb-10 w-full -mt-15">
          {/* Report Incidents */}
          <div className="bg-white/90 border border-gray-200 shadow-md rounded-xl p-4 backdrop-blur-md hover:bg-white/95 hover:shadow-lg transition-all transform hover:scale-105">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-3 rounded-lg flex-shrink-0">
                <FaShieldAlt className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-gray-900 text-sm">Report Incidents</h3>
                <p className="text-gray-600 text-xs">Quickly report emergencies in your area</p>
              </div>
            </div>
          </div>

          {/* Community Safety */}
          <div className="bg-white/90 border border-gray-200 shadow-md rounded-xl p-4 backdrop-blur-md hover:bg-white/95 hover:shadow-lg transition-all transform hover:scale-105">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-3 rounded-lg flex-shrink-0">
                <FaUsers className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-gray-900 text-sm">Community Safety</h3>
                <p className="text-gray-600 text-xs">Working together for a safer community</p>
              </div>
            </div>
          </div>

          {/* Real-time Updates */}
          <div className="bg-white/90 border border-gray-200 shadow-md rounded-xl p-4 backdrop-blur-md hover:bg-white/95 hover:shadow-lg transition-all transform hover:scale-105">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-3 rounded-lg flex-shrink-0">
                <FaBell className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-gray-900 text-sm">Real-time Updates</h3>
                <p className="text-gray-600 text-xs">Get live notifications and alerts</p>
              </div>
            </div>
          </div>
        </div>

        {/* LOGIN BUTTON */}
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg mb-3 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
        >
          Login
        </button>

        {/* CREATE ACCOUNT LINK */}
        <button
          onClick={() => navigate('/signup')}
          className="w-full bg-white/20 hover:bg-white/30 text-blue-600 font-semibold py-3 px-6 mb-1 rounded-lg border-2 border-blue-600 hover:border-blue-700 hover:text-blue-600 hover:bg-white/60 transition-all transform hover:scale-105 active:scale-95 backdrop-blur-sm"
        >
          Create an Account
        </button>

        {/* BOTTOM DIVIDER */}
        <div className="w-40 h-0.5 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full mt-6 mb-4"></div>

        {/* FOOTER TEXT */}
        <p className="text-white/70 text-xs font-medium">
          Be alert. Be responsible. Be part of the solution.
        </p>
      </div>
    </div>
  )
}
