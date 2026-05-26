import { X, Play, Image as ImageIcon } from 'lucide-react'

export default function MediaPreview({ mediaUrl, mediaName, isOpen, onClose }) {
  if (!isOpen || !mediaUrl) return null

  const isVideo = mediaUrl.startsWith('data:video') || mediaName?.endsWith('.mp4') || mediaName?.endsWith('.webm') || mediaName?.endsWith('.mov')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {isVideo ? <Play size={18} className="text-blue-600" /> : <ImageIcon size={18} className="text-blue-600" />}
            <span className="text-sm font-medium text-gray-700">{mediaName}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md transition">
            <X size={20} className="text-gray-600" />
          </button>
        </div>
        <div className="flex items-center justify-center bg-gray-50 p-6">
          {isVideo ? (
            <video src={mediaUrl} controls className="max-h-96 max-w-full rounded-lg" />
          ) : (
            <img src={mediaUrl} alt={mediaName} className="max-h-96 max-w-full rounded-lg object-contain" />
          )}
        </div>
      </div>
    </div>
  )
}
