import { BarChart3, Clock } from 'lucide-react'
import AdminSidebar from '../components/AdminSidebar'
import AdminNavTabs from '../components/AdminNavTabs'
import TopBar from '../components/TopBar'

export default function Analytics() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 ml-60">
        <TopBar title="Analytics">
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">Official</span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-white text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full bg-blue-500" />Live
          </span>
        </TopBar>
        <AdminNavTabs />

        <main className="p-6">
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <BarChart3 size={28} className="text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Analytics Module</h2>
            <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
              Detailed analytics including incident trends, hotspot detection, and monthly summaries will be implemented here.
            </p>
            <div className="inline-flex items-center gap-2 text-xs text-gray-400">
              <Clock size={14} className="animate-spin" />
              Coming soon
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
