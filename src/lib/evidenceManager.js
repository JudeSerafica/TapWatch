/**
 * Evidence Management System
 * Handles multiple file uploads, compression, and evidence tracking
 */

import { supabase } from './supabase'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const STORAGE_BUCKET = 'incident-media'

/**
 * Compress image before upload
 */
export const compressImage = async (file, maxWidth = 1920, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Scale down if too large
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              
              console.log(`📸 Compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`)
              resolve(compressedFile)
            } else {
              reject(new Error('Compression failed'))
            }
          },
          'image/jpeg',
          quality
        )
      }

      img.onerror = reject
      img.src = e.target.result
    }

    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Validate file
 */
export const validateFile = (file) => {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type)

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error: 'File type not supported. Use JPG, PNG, GIF, or MP4 video.'
    }
  }

  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_FILE_SIZE

  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / 1024 / 1024)
    return {
      valid: false,
      error: `File too large. Maximum ${maxSizeMB}MB for ${isVideo ? 'videos' : 'images'}.`
    }
  }

  return { valid: true, isImage, isVideo }
}

/**
 * Upload single evidence file
 */
export const uploadEvidence = async (file, incidentId, userId, onProgress) => {
  try {
    // Validate
    const validation = validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Compress images
    let fileToUpload = file
    if (validation.isImage && file.size > 500 * 1024) { // Compress if > 500KB
      onProgress?.(10, 'Compressing image...')
      fileToUpload = await compressImage(file)
    }

    onProgress?.(20, 'Uploading...')

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${incidentId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) throw uploadError

    onProgress?.(80, 'Finalizing...')

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName)

    // Save to evidence table
    const { data: evidence, error: dbError } = await supabase
      .from('incident_evidence')
      .insert([{
        incident_id: incidentId,
        uploaded_by: userId,
        file_name: file.name,
        file_path: fileName,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: fileToUpload.size,
        media_type: validation.isImage ? 'image' : 'video',
        uploaded_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (dbError) throw dbError

    onProgress?.(100, 'Complete')

    console.log('✅ Evidence uploaded:', evidence.id)

    return {
      success: true,
      evidence
    }
  } catch (error) {
    console.error('❌ Upload failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Upload multiple evidence files
 */
export const uploadMultipleEvidence = async (files, incidentId, userId, onProgress) => {
  try {
    const results = []
    let completed = 0

    for (const file of files) {
      const result = await uploadEvidence(
        file,
        incidentId,
        userId,
        (progress, status) => {
          const overallProgress = ((completed + progress / 100) / files.length) * 100
          onProgress?.(overallProgress, `${status} (${completed + 1}/${files.length})`)
        }
      )

      results.push(result)
      completed++
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`📊 Upload complete: ${successful} success, ${failed} failed`)

    return {
      success: true,
      results,
      successful,
      failed
    }
  } catch (error) {
    console.error('❌ Multiple upload failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get all evidence for an incident
 */
export const getIncidentEvidence = async (incidentId) => {
  try {
    const { data, error } = await supabase
      .from('incident_evidence')
      .select(`
        *,
        uploader:profiles!incident_evidence_uploaded_by_fkey (
          full_name
        )
      `)
      .eq('incident_id', incidentId)
      .order('uploaded_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      evidence: data || []
    }
  } catch (error) {
    console.error('Error fetching evidence:', error)
    return {
      success: false,
      error: error.message,
      evidence: []
    }
  }
}

/**
 * Delete evidence
 */
export const deleteEvidence = async (evidenceId, userId) => {
  try {
    // Get evidence details
    const { data: evidence, error: fetchError } = await supabase
      .from('incident_evidence')
      .select('*')
      .eq('id', evidenceId)
      .single()

    if (fetchError) throw fetchError

    // Check permission (only uploader or admin can delete)
    if (evidence.uploaded_by !== userId) {
      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (profile?.role !== 'admin') {
        throw new Error('Permission denied')
      }
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([evidence.file_path])

    if (storageError) console.warn('Storage delete failed:', storageError)

    // Delete from database
    const { error: dbError } = await supabase
      .from('incident_evidence')
      .delete()
      .eq('id', evidenceId)

    if (dbError) throw dbError

    console.log('🗑️ Evidence deleted:', evidenceId)

    return { success: true }
  } catch (error) {
    console.error('❌ Delete failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Generate evidence report for incident
 */
export const generateEvidenceReport = async (incidentId) => {
  try {
    const { evidence } = await getIncidentEvidence(incidentId)

    const report = {
      incidentId,
      totalFiles: evidence.length,
      totalSize: evidence.reduce((sum, e) => sum + (e.file_size || 0), 0),
      images: evidence.filter(e => e.media_type === 'image').length,
      videos: evidence.filter(e => e.media_type === 'video').length,
      uploaders: [...new Set(evidence.map(e => e.uploaded_by))].length,
      timeline: evidence.map(e => ({
        file: e.file_name,
        uploadedBy: e.uploader?.full_name || 'Unknown',
        uploadedAt: e.uploaded_at
      }))
    }

    return report
  } catch (error) {
    console.error('Error generating report:', error)
    return null
  }
}

/**
 * Mark evidence as verified (for chain of custody)
 */
export const verifyEvidence = async (evidenceId, verifiedBy, notes) => {
  try {
    const { data, error } = await supabase
      .from('incident_evidence')
      .update({
        is_verified: true,
        verified_by: verifiedBy,
        verified_at: new Date().toISOString(),
        verification_notes: notes
      })
      .eq('id', evidenceId)
      .select()
      .single()

    if (error) throw error

    console.log('✅ Evidence verified:', evidenceId)

    return {
      success: true,
      evidence: data
    }
  } catch (error) {
    console.error('❌ Verification failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get storage usage for user
 */
export const getUserStorageUsage = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('incident_evidence')
      .select('file_size')
      .eq('uploaded_by', userId)

    if (error) throw error

    const totalBytes = data.reduce((sum, e) => sum + (e.file_size || 0), 0)
    const totalMB = (totalBytes / 1024 / 1024).toFixed(2)

    return {
      success: true,
      totalBytes,
      totalMB,
      fileCount: data.length
    }
  } catch (error) {
    console.error('Error calculating usage:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
