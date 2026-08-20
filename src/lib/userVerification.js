import { supabase } from './supabase'
import { createNotification } from './notificationService'

// User Verification System

// Verification status levels
export const VERIFICATION_LEVELS = {
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  VERIFIED: 'verified',
  TRUSTED: 'trusted',
}

// ID Types accepted
export const ID_TYPES = {
  NATIONAL_ID: 'national_id',
  DRIVERS_LICENSE: 'drivers_license',
  PASSPORT: 'passport',
  VOTERS_ID: 'voters_id',
  SSS_ID: 'sss_id',
  POSTAL_ID: 'postal_id',
  BARANGAY_ID: 'barangay_id',
}

// Submit ID verification request
export const submitIDVerification = async (userId, idData) => {
  try {
    const { data, error } = await supabase
      .from('user_verifications')
      .insert([{
        user_id: userId,
        id_type: idData.idType,
        id_number: idData.idNumber,
        id_photo_url: idData.idPhotoUrl,
        selfie_url: idData.selfieUrl,
        status: VERIFICATION_LEVELS.PENDING,
        submitted_at: new Date().toISOString(),
      }])
      .select()
      .single()

    return { data, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

// Get user verification status
export const getUserVerificationStatus = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_verifications')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single()

    return { data, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

// Admin: Review verification request
export const reviewVerification = async (verificationId, decision, reviewNotes = '') => {
  try {
    const status = decision === 'approve' ? VERIFICATION_LEVELS.VERIFIED : VERIFICATION_LEVELS.UNVERIFIED

    const { data, error } = await supabase
      .from('user_verifications')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes,
      })
      .eq('id', verificationId)
      .select()
      .single()

    if (error) return { data: null, error }

    // Update user profile verification status
    if (data && decision === 'approve') {
      // Fetch the current profile to check if a resident_id already exists.
      // The DB trigger will auto-generate one when verification_status is set
      // to 'verified' and resident_id is NULL — we never generate it here on
      // the frontend.  We only update verification_status; the trigger handles
      // the rest safely and idempotently on the database side.
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ verification_status: VERIFICATION_LEVELS.VERIFIED })
        .eq('id', data.user_id)

      if (profileUpdateError) {
        console.error('⚠️ Failed to update profile verification_status:', profileUpdateError)
      }

      // ✅ Send notification to user about approval
      await createNotification({
        userId: data.user_id,
        title: '✅ Verification Approved!',
        message: 'Congratulations! Your account has been verified. You can now access all features including emergency SOS alerts. Your Resident ID has been generated and is available in your profile.',
        type: 'success'
      })
    } else if (data && decision === 'reject') {
      // ✅ Send notification to user about rejection
      await createNotification({
        userId: data.user_id,
        title: '❌ Verification Rejected',
        message: reviewNotes || 'Your verification request has been rejected. Please check your documents and try again.',
        type: 'warning'
      })
    }

    return { data, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

// Get pending verifications (admin)
export const getPendingVerifications = async () => {
  try {
    // First, get pending verifications
    const { data: verifications, error: verError } = await supabase
      .from('user_verifications')
      .select('*')
      .eq('status', VERIFICATION_LEVELS.PENDING)
      .order('submitted_at', { ascending: true })

    if (verError) {
      console.error('❌ Error fetching pending verifications:', verError)
      console.error('Error details:', {
        message: verError.message,
        details: verError.details,
        hint: verError.hint,
        code: verError.code,
      })
      return { data: null, error: verError }
    }

    // Then, get profile data for each verification
    if (verifications && verifications.length > 0) {
      const userIds = verifications.map(v => v.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', userIds)

      // Merge profile data with verifications
      const enrichedData = verifications.map(verification => ({
        ...verification,
        profiles: profiles?.find(p => p.id === verification.user_id) || null
      }))

      console.log('✅ Pending verifications fetched:', enrichedData.length)
      console.log('Data:', enrichedData)
      return { data: enrichedData, error: null }
    }

    console.log('✅ No pending verifications found')
    return { data: [], error: null }
  } catch (err) {
    console.error('❌ Exception in getPendingVerifications:', err)
    return { data: null, error: err }
  }
}

// ===== Community Reputation System =====

// Calculate user reputation score
export const calculateReputationScore = async (userId) => {
  try {
    // Get user's incidents
    const { data: incidents, error: incidentsError } = await supabase
      .from('incidents')
      .select('*')
      .eq('user_id', userId)

    if (incidentsError) throw incidentsError

    // Get votes on user's incidents
    const incidentIds = incidents.map(i => i.id)
    let upvotes = 0
    let downvotes = 0

    if (incidentIds.length > 0) {
      const { data: votes } = await supabase
        .from('incident_votes')
        .select('vote_type')
        .in('incident_id', incidentIds)

      if (votes) {
        upvotes = votes.filter(v => v.vote_type === 'upvote').length
        downvotes = votes.filter(v => v.vote_type === 'downvote').length
      }
    }

    // Get verification status
    const { data: verification } = await getUserVerificationStatus(userId)
    const isVerified = verification?.status === VERIFICATION_LEVELS.VERIFIED || 
                       verification?.status === VERIFICATION_LEVELS.TRUSTED

    // Calculate score
    const baseScore = 0
    const reportScore = incidents.length * 5
    const upvoteScore = upvotes * 10
    const downvotePenalty = downvotes * 5
    const verificationBonus = isVerified ? 50 : 0

    const totalScore = Math.max(0, baseScore + reportScore + upvoteScore - downvotePenalty + verificationBonus)

    // Determine badge level
    let badgeLevel = 'newcomer'
    if (totalScore >= 200) badgeLevel = 'trusted_reporter'
    else if (totalScore >= 100) badgeLevel = 'active_reporter'
    else if (totalScore >= 50) badgeLevel = 'verified_reporter'

    // Update user reputation in database
    await supabase
      .from('user_reputation')
      .upsert([{
        user_id: userId,
        score: totalScore,
        badge_level: badgeLevel,
        total_reports: incidents.length,
        upvotes,
        downvotes,
        is_verified: isVerified,
        updated_at: new Date().toISOString(),
      }], { onConflict: 'user_id' })

    return {
      score: totalScore,
      badgeLevel,
      stats: {
        totalReports: incidents.length,
        upvotes,
        downvotes,
        isVerified,
      },
    }
  } catch (err) {
    console.error('Error calculating reputation:', err)
    return { score: 0, badgeLevel: 'newcomer', stats: {} }
  }
}

// Get user reputation
export const getUserReputation = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_reputation')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      // Calculate if not exists
      return await calculateReputationScore(userId)
    }

    return {
      score: data.score,
      badgeLevel: data.badge_level,
      stats: {
        totalReports: data.total_reports,
        upvotes: data.upvotes,
        downvotes: data.downvotes,
        isVerified: data.is_verified,
      },
    }
  } catch (err) {
    return { score: 0, badgeLevel: 'newcomer', stats: {} }
  }
}

// Get leaderboard
export const getReputationLeaderboard = async (limit = 10) => {
  try {
    // First, get reputation data
    const { data: reputations, error: repError } = await supabase
      .from('user_reputation')
      .select('*')
      .order('score', { ascending: false })
      .limit(limit)

    if (repError) {
      console.error('❌ Error fetching leaderboard:', repError)
      return { data: null, error: repError }
    }

    // Then, get profile data for each user
    if (reputations && reputations.length > 0) {
      const userIds = reputations.map(r => r.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, purok')
        .in('id', userIds)

      // Merge profile data with reputation
      const enrichedData = reputations.map(reputation => ({
        ...reputation,
        profiles: profiles?.find(p => p.id === reputation.user_id) || null
      }))

      return { data: enrichedData, error: null }
    }

    return { data: [], error: null }
  } catch (err) {
    console.error('❌ Exception in getReputationLeaderboard:', err)
    return { data: null, error: err }
  }
}

// Award reputation points for specific actions
export const awardReputationPoints = async (userId, action, points = 0) => {
  try {
    const reputation = await getUserReputation(userId)
    const newScore = reputation.score + points

    await supabase
      .from('user_reputation')
      .upsert([{
        user_id: userId,
        score: newScore,
        updated_at: new Date().toISOString(),
      }], { onConflict: 'user_id' })

    // Log the action
    await supabase
      .from('reputation_history')
      .insert([{
        user_id: userId,
        action,
        points,
        created_at: new Date().toISOString(),
      }])

    return { success: true, newScore }
  } catch (err) {
    return { success: false, error: err }
  }
}

// Badge display configuration
export const BADGE_CONFIG = {
  newcomer: {
    label: 'Newcomer',
    icon: '🆕',
    color: '#6b7280',
    description: 'New community member',
  },
  verified_reporter: {
    label: 'Verified Reporter',
    icon: '✅',
    color: '#2563eb',
    description: 'Identity verified and active',
  },
  active_reporter: {
    label: 'Active Reporter',
    icon: '⭐',
    color: '#d97706',
    description: 'Consistently reports incidents',
  },
  trusted_reporter: {
    label: 'Trusted Reporter',
    icon: '🏆',
    color: '#dc2626',
    description: 'Highly trusted community member',
  },
}

// Check if user qualifies for trusted status
export const checkTrustedStatus = async (userId) => {
  const reputation = await getUserReputation(userId)
  
  const qualifications = {
    verified: reputation.stats.isVerified,
    minReports: reputation.stats.totalReports >= 10,
    minScore: reputation.score >= 200,
    goodRatio: reputation.stats.upvotes >= reputation.stats.downvotes * 2,
  }

  const qualifies = Object.values(qualifications).every(q => q === true)

  if (qualifies) {
    // Upgrade to trusted
    await supabase
      .from('user_verifications')
      .update({ status: VERIFICATION_LEVELS.TRUSTED })
      .eq('user_id', userId)

    await supabase
      .from('profiles')
      .update({ verification_status: VERIFICATION_LEVELS.TRUSTED })
      .eq('id', userId)
  }

  return { qualifies, qualifications }
}

// Upload verification documents to Supabase Storage
export const uploadVerificationDocument = async (userId, file, type = 'id') => {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${type}_${Date.now()}.${fileExt}`
    const filePath = `${userId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('verification-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    const { data: urlData } = supabase.storage
      .from('verification-documents')
      .getPublicUrl(filePath)

    return { url: urlData.publicUrl, error: null }
  } catch (err) {
    console.error('Upload document error:', err)
    return { url: null, error: err }
  }
}

// Get signed URL for viewing private verification documents (admin only)
export const getVerificationDocumentUrl = async (filePath) => {
  try {
    // Extract the path after the bucket name
    const pathParts = filePath.split('verification-documents/')
    const actualPath = pathParts[pathParts.length - 1]

    const { data, error } = await supabase.storage
      .from('verification-documents')
      .createSignedUrl(actualPath, 3600) // Valid for 1 hour

    if (error) {
      console.error('Error creating signed URL:', error)
      return null
    }

    return data.signedUrl
  } catch (err) {
    console.error('Error getting document URL:', err)
    return null
  }
}

// Get verified users list (admin)
export const getVerifiedUsers = async (limit = 20) => {
  try {
    // First, let's get ALL users to debug
    const { data: allProfiles, error: allError } = await supabase
      .from('profiles')
      .select('verification_status')
      .limit(5)

    console.log('📊 Sample profiles verification_status values:', allProfiles)

    // Now fetch verified users
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        phone,
        purok,
        verification_status,
        created_at
      `)
      .eq('verification_status', 'verified')
      .order('created_at', { ascending: false })
      .limit(limit)

    console.log('✅ Verified users query result:', { data, error })

    if (error) {
      console.error('Error fetching verified users:', error)
      return { data: [], error }
    }

    return { data: data || [], error: null }
  } catch (err) {
    console.error('Error in getVerifiedUsers:', err)
    return { data: [], error: err }
  }
}
