import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (credentials) => {
    try {
      let result
      
      if (credentials.phone) {
        // Phone OTP login
        result = await supabase.auth.signInWithOtp({
          phone: credentials.phone,
        })
      } else if (credentials.email) {
        // Email login
        result = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        })
      }

      if (result.error) throw result.error
      
      return { user: result.data?.user || { phone: credentials.phone }, error: null }
    } catch (error) {
      return { user: null, error: error.message }
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
        // Phone signup with OTP
        result = await supabase.auth.signUp({
          phone: credentials.phone,
          password: credentials.password,
          options: {
            data: {
              full_name: credentials.name,
            },
          },
        })
      } else if (credentials.email) {
        // Email signup
        result = await supabase.auth.signUp({
          email: credentials.email,
          password: credentials.password,
          options: {
            data: {
              full_name: credentials.name,
            },
          },
        })
      }

      if (result.error) throw result.error
      
      return { user: result.data?.user, error: null }
    } catch (error) {
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

      // Refresh profile
      await fetchProfile(user.id)
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      signIn, 
      signUp, 
      verifyOtp,
      saveProfile, 
      signOut, 
      loading, 
      isAdmin: profile?.role === 'admin' 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
