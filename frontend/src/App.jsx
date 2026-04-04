import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Lotes from './pages/Lotes'
import Animais from './pages/Animais'
import Sanidade from './pages/Sanidade'
import Reproducao from './pages/Reproducao'
import Alimentacao from './pages/Alimentacao'
import Financeiro from './pages/Financeiro'
import Relatorios from './pages/Relatorios'
import Usuarios from './pages/Usuarios'

function ProtectedRoute({ children, adminOnly = false }) {
  const { usuario, loading } = useAuth()
  if (loading) return <div className="loading"><div className="spinner"></div> Carregando...</div>
  if (!usuario) return <Navigate to="/login" replace />
  if (adminOnly && usuario.role !== 'admin') return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { usuario, loading } = useAuth()
  if (loading) return <div className="loading"><div className="spinner"></div> Carregando...</div>

  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/lotes" element={<ProtectedRoute><Lotes /></ProtectedRoute>} />
      <Route path="/animais" element={<ProtectedRoute><Animais /></ProtectedRoute>} />
      <Route path="/sanidade" element={<ProtectedRoute><Sanidade /></ProtectedRoute>} />
      <Route path="/reproducao" element={<ProtectedRoute><Reproducao /></ProtectedRoute>} />
      <Route path="/alimentacao" element={<ProtectedRoute><Alimentacao /></ProtectedRoute>} />
      <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
      <Route path="/usuarios" element={<ProtectedRoute adminOnly><Usuarios /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
