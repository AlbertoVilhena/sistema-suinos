import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'
import { ConfirmProvider } from './components/ConfirmDialog'

// Lazy loading: cada página só é carregada quando o usuário navega até ela
// Reduz o bundle inicial de ~400KB para ~80KB
const Login      = React.lazy(() => import('./pages/Login'))
const Dashboard  = React.lazy(() => import('./pages/Dashboard'))
const Lotes      = React.lazy(() => import('./pages/Lotes'))
const Animais    = React.lazy(() => import('./pages/Animais'))
const Sanidade   = React.lazy(() => import('./pages/Sanidade'))
const Reproducao = React.lazy(() => import('./pages/Reproducao'))
const Alimentacao= React.lazy(() => import('./pages/Alimentacao'))
const Plantel    = React.lazy(() => import('./pages/Plantel'))
const Financeiro = React.lazy(() => import('./pages/Financeiro'))
const Relatorios = React.lazy(() => import('./pages/Relatorios'))
const Formulacao = React.lazy(() => import('./pages/Formulacao'))
const Estoque    = React.lazy(() => import('./pages/Estoque'))
const Usuarios   = React.lazy(() => import('./pages/Usuarios'))

function PageLoading() {
  return (
    <div className="loading" style={{ height: '100vh' }}>
      <div className="spinner" />
      Carregando...
    </div>
  )
}

function NotFound() {
  const { usuario } = useAuth()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
      <div style={{ fontSize: 64 }}>🐖</div>
      <h2 style={{ margin: 0, color: '#212529' }}>Página não encontrada</h2>
      <p style={{ color: '#6c757d', margin: 0 }}>O endereço acessado não existe.</p>
      <a href={usuario?.role === 'operador' ? '/lotes' : '/'} className="btn btn-primary">
        Voltar ao início
      </a>
    </div>
  )
}

function ProtectedRoute({ children, adminOnly = false, gestaoOnly = false, noDashboard = false }) {
  const { usuario, loading } = useAuth()
  if (loading) return <PageLoading />
  if (!usuario) return <Navigate to="/login" replace />
  if (adminOnly && usuario.role !== 'admin') return <Navigate to="/" replace />
  if (gestaoOnly && !['admin', 'gerente'].includes(usuario.role)) return <Navigate to="/" replace />
  if (noDashboard && usuario.role === 'operador') return <Navigate to="/lotes" replace />
  return children
}

function AppRoutes() {
  const { usuario, loading } = useAuth()
  if (loading) return <PageLoading />

  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={<ProtectedRoute noDashboard><Dashboard /></ProtectedRoute>} />
        <Route path="/lotes" element={<ProtectedRoute><Lotes /></ProtectedRoute>} />
        <Route path="/animais" element={<ProtectedRoute><Animais /></ProtectedRoute>} />
        <Route path="/sanidade" element={<ProtectedRoute><Sanidade /></ProtectedRoute>} />
        <Route path="/reproducao" element={<ProtectedRoute><Reproducao /></ProtectedRoute>} />
        <Route path="/alimentacao" element={<ProtectedRoute><Alimentacao /></ProtectedRoute>} />
        <Route path="/plantel" element={<ProtectedRoute><Plantel /></ProtectedRoute>} />
        <Route path="/financeiro" element={<ProtectedRoute gestaoOnly><Financeiro /></ProtectedRoute>} />
        <Route path="/relatorios" element={<ProtectedRoute gestaoOnly><Relatorios /></ProtectedRoute>} />
        <Route path="/formulacao" element={<ProtectedRoute><Formulacao /></ProtectedRoute>} />
        <Route path="/estoque" element={<ProtectedRoute gestaoOnly><Estoque /></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute adminOnly><Usuarios /></ProtectedRoute>} />
        <Route path="*" element={
          loading ? <PageLoading /> : <NotFound />
        } />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
