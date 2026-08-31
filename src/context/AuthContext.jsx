import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [matricule, setMatricule] = useState(null)
  const [nom, setNom] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function chargerProfil() {
    if (!user) {
      setRole(null)
      setMatricule(null)
      setNom(null)
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('role, matricule, nom')
      .eq('id', user.id)
      .single()

    if (!error) {
      setRole(data?.role ?? null)
      setMatricule(data?.matricule ?? null)
      setNom(data?.nom ?? null)
    }
  }

  useEffect(() => {
    chargerProfil()
  }, [user])

  async function signUp(email, password, metadata) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  })
}

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function signOut() {
    return supabase.auth.signOut()
  }

  const value = { user, role, matricule, nom, loading, signUp, signIn, signOut, rafraichirProfil: chargerProfil }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return context
}