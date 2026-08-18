import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ error, errorInfo })

    // Auto-reload after 1 second
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
          <div className="flex flex-col items-center gap-5">

            {/* Logo + spinning ring */}
            <div className="relative">
              {/* Outer spinning ring */}
              <div className="w-20 h-20 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin" />
              {/* Logo centered inside */}
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src="/Tapinac.logo.jpg"
                  alt="Tap-Watch"
                  className="w-11 h-11 rounded-full object-cover shadow"
                />
              </div>
            </div>

            {/* Text */}
            <div className="text-center">
              <p className="text-base font-bold text-gray-800 tracking-wide">
                Tap<span className="text-blue-600">-Watch</span>
              </p>
              <p className="text-sm text-gray-400 mt-1">Loading, please wait…</p>
            </div>

            {/* Subtle dot pulse */}
            <div className="flex items-center gap-1.5">
              {[0, 150, 300].map(delay => (
                <span
                  key={delay}
                  className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
