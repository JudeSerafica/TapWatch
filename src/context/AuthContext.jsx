import { createContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId, authUser) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        setProfile({ 
          id: userId, 
          role: 'resident', 
          full_name: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'User' 
        })
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setProfile({ id: userId, role: 'resident' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
  let initialized = false

  // If Supabase has no stored session token at all, we know immediately
  // there's no user — skip the async wait and set loading false right away.
  // This eliminates the loading flash on the /login page after sign-out.
  const hasStoredSession = Object.keys(localStorage).some(
    k => k.startsWith('sb-') && k.endsWith('-auth-token')
  )
  if (!hasStoredSession) {
    setLoading(false)
  }

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      setUser(session.user)
      fetchProfile(session.user.id, session.user)
    } else {
      setLoading(false)
    }
    initialized = true
  })

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (!initialized) return
    if (session?.user) {
      setUser(session.user)
      await fetchProfile(session.user.id, session.user)
    } else {
      setUser(null)
      setProfile(null)
      setLoading(false)
    }
  })

  // ── Auto-refresh when user returns to the app (tab/app resume) ──
  // Handles both browser tab switching and Android app switching.
  // Re-validates the Supabase session and re-fetches the profile
  // so the UI is always up-to-date without a manual refresh.
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user)
          fetchProfile(session.user.id, session.user)
        } else {
          // Session expired while app was in background — log out cleanly
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      })
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)

  return () => {
    subscription.unsubscribe()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}, [])

  const signIn = async (credentials) => {
    try {
      let result
      
      if (credentials.phone) {
        result = await supabase.auth.signInWithOtp({
          phone: credentials.phone,
        })
      } else if (credentials.email) {
        result = await supabase.auth.signInWithPassword({
          email: credentials.email.toLowerCase().trim(),
          password: credentials.password.trim(),
        })
      }

      if (result.error) throw result.error

      // Mark this tab as having an active session so ProtectedLanding
      // will redirect to dashboard within the same tab (cleared on tab close)
      sessionStorage.setItem('activeWebSession', '1')
    
      return { user: result.data?.user, error: null }
    } catch (error) {
      console.error('SignIn error:', error)
      return { user: null, error: error.message || 'Invalid credentials' }
    }
  }

  const verifyOtp = async (phone, token) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      })
      
      if (error) throw error
      
      return { user: data.user, error: null }
    } catch (error) {
      return { user: null, error: error.message }
    }
  }

  const signUp = async (credentials) => {
    try {
      let result
      
      if (credentials.phone) {
        result = await supabase.auth.signUp({
          phone: credentials.phone.trim(),
          password: credentials.password.trim(),
          options: {
            data: {
              full_name: credentials.name.trim(),
            },
          },
        })
      } else if (credentials.email) {
        result = await supabase.auth.signUp({
          email: credentials.email.toLowerCase().trim(),
          password: credentials.password.trim(),
          options: {
            data: {
              full_name: credentials.name.trim(),
            },
          },
        })
      }

      if (result.error) throw result.error
    
      return { user: result.data?.user, error: null }
    } catch (error) {
      console.error('SignUp error:', error)
      return { user: null, error: error.message }
    }
  }

  const saveProfile = async (profileData) => {
    try {
      if (!user) throw new Error('No authenticated user')

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.fullName,
          phone: profileData.phone,
          purok: profileData.purok,
          address: profileData.address,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      await fetchProfile(user.id, user)
      return { error: null }
    } catch (error) {
      // Provide a human-readable message for unique constraint violations
      if (error.code === '23505' || (error.message && error.message.includes('profiles_phone_key'))) {
        return { error: 'That contact number is already registered to another account. Please use a different number.' }
      }
      return { error: error.message }
    }
  }

  const acceptTerms = async () => {
    try {
      if (!user) throw new Error('No authenticated user')

      const now = new Date().toISOString()

      const { error } = await supabase
        .from('profiles')
        .update({ terms_accepted_at: now, updated_at: now })
        .eq('id', user.id)

      if (error) throw error

      // Refresh local profile so terms_accepted_at is available in context
      await fetchProfile(user.id, user)
      return { error: null }
    } catch (error) {
      console.error('acceptTerms error:', error)
      return { error: error.message }
    }
  }

  const markVerificationModalSeen = async () => {
    try {
      if (!user) throw new Error('No authenticated user')

      const now = new Date().toISOString()

      const { error } = await supabase
        .from('profiles')
        .update({ verification_modal_seen_at: now, updated_at: now })
        .eq('id', user.id)

      if (error) throw error

      // Refresh local profile so verification_modal_seen_at is available
      await fetchProfile(user.id, user)
      return { error: null }
    } catch (error) {
      console.error('markVerificationModalSeen error:', error)
      return { error: error.message }
    }
  }

  const signOut = async () => {
    try {
      // Clear all storage
      sessionStorage.clear()
      localStorage.clear()
      
      // Clear local state first
      setUser(null)
      setProfile(null)

      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'global' })

      // Navigate without a full page reload so there is no loading flash.
      // We use location.replace so the current page is removed from history.
      window.location.replace('/login')
      
      return { error: null }
    } catch (error) {
      console.error('Sign out error:', error)
      window.location.replace('/login')
      return { error: error.message }
    }
  }

  /** Force a fresh profile fetch from the DB — useful after DB-side changes
   *  (e.g. resident_id assigned by trigger) that the cached profile won't
   *  reflect until the next session without an explicit refresh. */
  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id, user)
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      signIn, 
      signUp, 
      verifyOtp,
      saveProfile,
      acceptTerms,
      markVerificationModalSeen,
      refreshProfile,
      signOut, 
      loading, 
      isAdmin: profile?.role === 'admin' 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext