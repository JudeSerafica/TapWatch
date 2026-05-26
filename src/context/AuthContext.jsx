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
  let initialized = false  // ← pigilan ang double fetch

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
    if (!initialized) return  // ← skip kung hindi pa tapos ang getSession
    if (session?.user) {
      setUser(session.user)
      await fetchProfile(session.user.id, session.user)
    } else {
      setUser(null)
      setProfile(null)
      setLoading(false)
    }
  })

  return () => subscription.unsubscribe()
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
          email: credentials.email,
          password: credentials.password,
        })
      }

      if (result.error) throw result.error
    
      return { user: result.data?.user, error: null }
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

      await fetchProfile(user.id, user)
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

export default AuthContext