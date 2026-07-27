import { useSidebar } from '../context/SidebarContext'
import AdminSidebar from './AdminSidebar'
import ErrorBoundary from './ErrorBoundary'

export default function AdminLayout({ children }) {
  const { isCollapsed } = useSidebar()

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      
      <main 
        className={`
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}
          min-h-screen
        `}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  )
}