export default function TopBar({ title, children }) {
  return (
    <header className="h-14 md:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
      <h1 className="text-base md:text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-2 md:gap-3">
        {children}
      </div>
    </header>
  )
}
