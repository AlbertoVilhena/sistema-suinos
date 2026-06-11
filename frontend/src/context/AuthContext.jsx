import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const saved = localStorage.getItem('usuario')
    if (token && saved) {
      try { setUsuario(JSON.parse(saved)) } catch {}
    }
    setLoading(false)
  }, [])

  const login = async (email, senha) => {
    const res = await api.post('/api/auth/login', { email, senha })
    const { token, usuario } = res.data
    localStorage.setItem('token', token)
    localStorage.setItem('usuario', JSON.stringify(usuario))
    setUsuario(usuario)
    return usuario
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setUsuario(null)
  }

  const isAdmin = () => usuario?.role === 'admin'
  const canEdit = () => ['admin', 'gerente'].includes(usuario?.role)
  const canWrite = () => ['admin', 'gerente', 'operador'].includes(usuario?.role)

  return (
    <AuthContext.Provider value={{ usuario, login, logout, loading, isAdmin, canEdit, canWrite }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
