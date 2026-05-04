import { TrendingUp, Calendar, Percent, MapPin, Flame } from 'lucide-react'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { useState, useEffect } from 'react'
import AdminSidebar from '../components/AdminSidebar'
import AdminNavTabs from '../components/AdminNavTabs'
import TopBar from '../components/TopBar'
import { getIncidentStats, getHotspots } from '../lib/database'
import IncidentIcon from '../components/IncidentIcon'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler)

const C = { crime:'#9333ea', accident:'#f97316', fire:'#ef4444', flood:'#3b82f6', disturbance:'#eab308' }
const T = { crime:'Crime', accident:'Accident', fire:'Fire', flood:'Flood', disturbance:'Disturbance' }

const base = { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false},tooltip:{backgroundColor:'#1f2937',padding:10,cornerRadius:6}} }
const xy = { x:{grid:{display:false},ticks:{color:'#9ca3af',font:{size:11}}}, y:{beginAtZero:true,grid:{color:'#f3f4f6'},ticks:{color:'#9ca3af',font:{size:11}}} }

export default function Analytics() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: statsData } = await getIncidentStats('7d')
    const { data: hotspotsData } = await getHotspots()
    
    if (statsData) {
      const total = statsData.total
      const resolved = statsData.byStatus.resolved || 0
      const rate = total > 0 ? Math.round((resolved/total)*100) : 0
      
      const tc = ['crime','accident','fire','flood','disturbance'].map(t=>statsData.byType[t] || 0)
      const sc = ['pending','responding','resolved'].map(s=>statsData.byStatus[s] || 0)
      
      const hs = Object.entries(hotspotsData || {}).sort((a,b)=>b[1].count-a[1].count).slice(0,5).map(([loc,d])=>{
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

  const lineData = { labels:['Apr 21','Apr 22','Apr 23','Apr 24','Apr 25','Apr 26','Apr 27'], datasets:[{data:[0,0,0,0,0,0,stats?.total||0],borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,0.1)',pointBackgroundColor:'#3b82f6',pointBorderColor:'#fff',pointBorderWidth:2,pointRadius:4,tension:0.3,fill:true}] }
  const lineOpts = { ...base, scales:{...xy,y:{...xy.y,max:Math.max(4, (stats?.total||0)+1),ticks:{...xy.y.ticks,stepSize:1}}} }

  const donutData = { labels:Object.values(T), datasets:[{data:stats?.tc||[0,0,0,0,0],backgroundColor:Object.values(C),borderWidth:0,hoverOffset:4}] }
  const donutOpts = { ...base, cutout:'65%' }

  const barData = { labels:['Pending','Responding','Resolved'], datasets:[{data:stats?.sc||[0,0,0],backgroundColor:['#f59e0b','#3b82f6','#10b981'],borderRadius:6,barThickness:40}] }
  const barOpts = { ...base, scales:{...xy,y:{...xy.y,max:Math.max(5, Math.max(...(stats?.sc||[0]))+1),ticks:{...xy.y.ticks,stepSize:1}}} }

  const summaryStats = [
    {icon:Calendar,label:'Total Incidents',value:stats?.total||0,color:'text-blue-700'},
    {icon:Calendar,label:'This Week',value:0,color:'text-gray-700'},
    {icon:Percent,label:'Resolution Rate',value:`${stats?.rate||0}%`,color:'text-emerald-600'},
    {icon:MapPin,label:'Hotspot Puroks',value:stats?.hs?.length||0,color:'text-orange-500'},
  ]

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar />
        <div className="flex-1 ml-60">
          <TopBar title="Analytics" />
          <div className="p-6 flex items-center justify-center">
            <div className="text-gray-500">Loading analytics...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 ml-60">
        <TopBar title="Analytics">
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">Official</span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-white text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full bg-green-500" />Live
          </span>
        </TopBar>
        <AdminNavTabs />

        <main className="p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Analytics & Hotspots</h2>
            <p className="text-sm text-gray-500 mt-1">Incident trends and pattern analysis</p>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {summaryStats.map((s,i)=>{
              const Icon=s.icon
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                  <div className={`text-3xl font-bold ${s.color} mb-1`}>{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-600" />7-Day Incident Trend
              </h3>
              <div className="h-56">
                <Line data={lineData} options={lineOpts} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Flame size={16} className="text-orange-500" />By Incident Type
              </h3>
              <div className="flex items-center gap-6">
                <div className="h-44 w-44 relative">
                  <Doughnut data={donutData} options={donutOpts} />
                </div>
                <div className="flex-1 space-y-2">
                  {Object.entries(T).map(([k,v],i)=> (
                    <div key={k} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{background:C[k]}} />
                        <span className="text-gray-700">{v}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{stats?.tc?.[i]||0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Response Status</h3>
              <div className="h-56">
                <Bar data={barData} options={barOpts} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Flame size={16} className="text-red-500" />Incident Hotspots by Purok
              </h3>
              <div className="space-y-3">
                {stats?.hs?.map((h,i)=> (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center">{i+1}</span>
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
    </div>
  )
}