import { createContext, useContext, useState, useCallback } from 'react'
import { isSesionActiva, cerrarSesion, tienePasswordConfigurada } from './auth.js'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [autenticado, setAutenticado] = useState(() => isSesionActiva())
  const [passwordConfigurada, setPasswordConfigurada] = useState(() => tienePasswordConfigurada())

  const onLogin = useCallback(() => {
    setAutenticado(true)
    setPasswordConfigurada(true)
  }, [])

  const onLogout = useCallback(() => {
    cerrarSesion()
    setAutenticado(false)
  }, [])

  return (
    <AuthContext.Provider value={{ autenticado, passwordConfigurada, onLogin, onLogout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
