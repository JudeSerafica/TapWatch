import { TrendingUp, Calendar, Percent, Flame, MapPin } from 'lucide-react'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { useState, useEffect } from 'react'
import { useTranslation } from '../lib/i18n'
import AdminSidebar from '../components/AdminSidebar'
import AdminNavTabs from '../components/AdminNavTabs'
import TopBar from '../components/TopBar'
import { getIncidentStats, getHotspots, getIncidents } from '../lib/database'
import IncidentIcon from '../components/IncidentIcon'
import AdminMobileBottomNav from '../components/AdminMobileBottomNav'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler)

const C = { crime:'#9333ea', accident:'#f97316', fire:'#ef4444', flood:'#3b82f6', disturbance:'#eab308' }
const T = { crime:'Crime', accident:'Accident', fire:'Fire', flood:'Flood', disturbance:'Disturbance' }

const base = { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false},tooltip:{backgroundColor:'#1f2937',padding:10,cornerRadius:6}} }
const xy = { x:{grid:{display:false},ticks:{color:'#9ca3af',font:{size:11}}}, y:{beginAtZero:true,grid:{color:'#f3f4f6'},ticks:{color:'#9ca3af',font:{size:11}}} }

export default function Analytics() {
  const { t } = useTranslation()
  const [stats, setStats] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      // Parallel data fetching for faster loading
      const [statsResult, hotspotsResult, incidentsResult] = await Promise.all([
        getIncidentStats('7d'),
        getHotspots(),
        getIncidents()
      ])
      
      if (incidentsResult.data) {
        setIncidents(incidentsResult.data)
      }
      
      if (statsResult.data) {
        const total = statsResult.data.total
        const resolved = statsResult.data.byStatus.resolved || 0
        const rate = total > 0 ? Math.round((resolved/total)*100) : 0
        
        const tc = ['crime','accident','fire','flood','disturbance'].map(t=>statsResult.data.byType[t] || 0)
        const sc = ['pending','responding','resolved'].map(s=>statsResult.data.byStatus[s] || 0)
        
        const hs = Object.entries(hotspotsResult.data || {}).sort((a,b)=>b[1].count-a[1].count).slice(0,5).map(([loc,d])=>{
          const tt=Object.entries(d.types).sort((a,b)=>b[1]-a[1])[0]
          return{location:loc,count:d.count,type:tt[0]}
        })

        setStats({
          total,
          thisWeek: 0,
          rate,
          tc,
          sc,
          hs
        })
      }
      setLoading(false)
    }
    
    loadStats()
  }, [])

  // Generate last 7 days labels dynamically
  const getLast7Days = () => {
    const days = []
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const month = months[date.getMonth()]
      const day = date.getDate()
      days.push(`${month} ${day}`)
    }
    
    return days
  }

  const lineData = { 
    labels: getLast7Days(), 
    datasets: [{
      data: [0, 0, 0, 0, 0, 0, stats?.total || 0],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.1)',
      pointBackgroundColor: '#3b82f6',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      tension: 0.3,
      fill: true
    }] 
  }
  const lineOpts = { ...base, scales:{...xy,y:{...xy.y,max:Math.max(4, (stats?.total||0)+1),ticks:{...xy.y.ticks,stepSize:1}}} }

  const donutData = { labels:Object.values(T), datasets:[{data:stats?.tc||[0,0,0,0,0],backgroundColor:Object.values(C),borderWidth:0,hoverOffset:4}] }
  const donutOpts = { ...base, cutout:'65%' }

  const barData = { labels:['Pending','Responding','Resolved'], datasets:[{data:stats?.sc||[0,0,0],backgroundColor:['#f59e0b','#3b82f6','#10b981'],borderRadius:6,barThickness:40}] }
  const barOpts = { ...base, scales:{...xy,y:{...xy.y,max:Math.max(5, Math.max(...(stats?.sc||[0]))+1),ticks:{...xy.y.ticks,stepSize:1}}} }

  const summaryStats = [
    {icon:Calendar,label:t('allIncidents'),value:stats?.total||0,color:'text-blue-700'},
    {icon:Calendar,label:t('thisWeek'),value:0,color:'text-gray-700'},
    {icon:Percent,label:t('resolved'),value:`${stats?.rate||0}%`,color:'text-emerald-600'},
    {icon:MapPin,label:t('hotspots'),value:stats?.hs?.length||0,color:'text-orange-500'},
  ]

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar />
        <div className="flex-1 md:ml-60 pb-16 md:pb-0">
          <TopBar 
            title="Analytics" 
            showNotifications={true}
            showUserMenu={true}
          >
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">Official</span>
          </TopBar>
          <div className="p-4 md:p-6 flex items-center justify-center">
            <div className="text-gray-500">Loading analytics...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
  <div className="flex min-h-screen bg-gray-50">
    <AdminSidebar />
    <div className="flex-1 md:ml-60 pb-16 md:pb-0">
      <TopBar 
        title="Analytics" 
        showNotifications={true}
        showUserMenu={true}
      >
        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">Official</span>
      </TopBar>
      <AdminNavTabs />

      <main className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">{t('analytics')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('trends')}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {summaryStats.map((s,i) => (
            <div key={i} className="bg-white rounded-xl border p-4 md:p-5 text-center">
              <div className={`text-2xl md:text-3xl font-bold ${s.color} mb-1`}>{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white rounded-xl border p-4 md:p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" />7-Day Incident Trend
            </h3>
            <div className="h-48 md:h-56">
              <Line data={lineData} options={lineOpts} />
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4 md:p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Flame size={16} className="text-orange-500" />By Incident Type
            </h3>
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <div className="h-44 w-44 relative flex-shrink-0">
                <Doughnut data={donutData} options={donutOpts} />
              </div>
              <div className="flex-1 w-full space-y-2">
                {Object.entries(T).map(([k,v],i) => (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:C[k]}} />
                      <span className="text-gray-700">{v}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{stats?.tc?.[i]||0}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Progress bars with incident type colors */}
            <div className="mt-4 space-y-1.5">
              {Object.entries(T).map(([k,v],i) => {
                const maxCount = Math.max(...(stats?.tc||[0]), 1)
                const count = stats?.tc?.[i] || 0
                return (
                  <div key={k} className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${(count / maxCount) * 100}%`,
                        backgroundColor: C[k]
                      }} 
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white rounded-xl border p-4 md:p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Response Status</h3>
            <div className="h-48 md:h-56">
              <Bar data={barData} options={barOpts} />
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4 md:p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Flame size={16} className="text-red-500" />Incident Hotspots by Purok
            </h3>
            <div className="space-y-3">
              {stats?.hs?.map((h,i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{h.location}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <IncidentIcon type={h.type} size={12} />
                        <span className="text-xs text-gray-500 capitalize">{h.type}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{h.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
    <AdminMobileBottomNav />
  </div>
)
}
