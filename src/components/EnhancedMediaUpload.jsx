import { useState, useRef } from 'react'
import { X, Upload, Camera, Video, Image as ImageIcon, Plus } from 'lucide-react'

/**
 * Enhanced Media Upload Component
 * Supports multiple photos/videos with preview
 */
export default function EnhancedMediaUpload({ onMediaChange, maxFiles = 5 }) {
  const [mediaFiles, setMediaFiles] = useState([])
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const MAX_SIZE = 50 * 1024 * 1024 // 50MB per file

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    addFiles(files)
    e.target.value = '' // Reset input
  }

  const addFiles = (files) => {
    const validFiles = []

    for (const file of files) {
      // Check file size
      if (file.size > MAX_SIZE) {
        alert(`${file.name} is too large (max 50MB)`)
        continue
      }

      // Check if we've reached max files
      if (mediaFiles.length + validFiles.length >= maxFiles) {
        alert(`Maximum ${maxFiles} files allowed`)
        break
      }

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        const newFile = {
          id: Date.now() + Math.random(),
          file: file,
          name: file.name,
          type: file.type.startsWith('video') ? 'video' : 'image',
          preview: e.target.result,
          size: file.size
        }

        setMediaFiles(prev => {
          const updated = [...prev, newFile]
          onMediaChange(updated)
          return updated
        })
      }
      reader.readAsDataURL(file)
      validFiles.push(file)
    }
  }

  const removeFile = (id) => {
    setMediaFiles(prev => {
      const updated = prev.filter(f => f.id !== id)
      onMediaChange(updated)
      return updated
    })
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-3">
      {/* Upload Buttons */}
      <div className="flex gap-2">
        {/* Upload from Gallery */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={mediaFiles.length >= maxFiles}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload size={18} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            Upload Files
          </span>
        </button>

        {/* Take Photo/Video */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={mediaFiles.length >= maxFiles}
          className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera size={18} className="text-gray-600" />
        </button>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* File Counter */}
      {mediaFiles.length > 0 && (
        <div className="text-xs text-gray-500 text-center">
          {mediaFiles.length} / {maxFiles} files selected
        </div>
      )}

      {/* Preview Grid */}
      {mediaFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {mediaFiles.map((media) => (
            <div
              key={media.id}
              className="relative group border rounded-xl overflow-hidden bg-gray-50"
            >
              {/* Preview */}
              <div className="aspect-square">
                {media.type === 'video' ? (
                  <div className="relative w-full h-full">
                    <video
                      src={media.preview}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Video size={32} className="text-white" />
                    </div>
                  </div>
                ) : (
                  <img
                    src={media.preview}
                    alt={media.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* File Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="text-xs text-white font-medium truncate">
                  {media.name}
                </p>
                <p className="text-xs text-gray-300">
                  {formatFileSize(media.size)}
                </p>
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => removeFile(media.id)}
                className="absolute top-2 right-2 w-6 h-6 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                <X size={14} className="text-white" />
              </button>

              {/* Type Badge */}
              <div className="absolute top-2 left-2">
                <span className="px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full text-xs text-white font-medium flex items-center gap-1">
                  {media.type === 'video' ? (
                    <>
                      <Video size={10} />
                      Video
                    </>
                  ) : (
                    <>
                      <ImageIcon size={10} />
                      Photo
                    </>
                  )}
                </span>
              </div>
            </div>
          ))}

          {/* Add More Button */}
          {mediaFiles.length < maxFiles && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition flex flex-col items-center justify-center gap-2"
            >
              <Plus size={24} className="text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">
                Add More
              </span>
            </button>
          )}
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-gray-500 text-center">
        Upload up to {maxFiles} photos or videos (max 50MB each)
      </p>
    </div>
  )
}
