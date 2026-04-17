import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', icon: '📊', label: 'Dashboard', section: 'GERAL' },
  { to: '/lotes', icon: '🐖', label: 'Lotes', section: 'PRODUÇÃO' },
  { to: '/animais', icon: '🐷', label: 'Animais' },
  { to: '/alimentacao', icon: '🌽', label: 'Alimentação' },
  { to: '/sanidade', icon: '💉', label: 'Sanidade' },
  { to: '/reproducao', icon: '🫀', label: 'Reprodução' },
  { to: '/financeiro', icon: '💰', label: 'Financeiro', section: 'GESTÃO', gestaoOnly: true },
  { to: '/estoque', icon: '📦', label: 'Estoque', gestaoOnly: true },
  { to: '/formulacao', icon: '🌾', label: 'Formulação Ração', gestaoOnly: true },
  { to: '/relatorios', icon: '📈', label: 'Relatórios', gestaoOnly: true },
  { to: '/usuarios', icon: '👥', label: 'Usuários', adminOnly: true },
]

export default function Layout({ children, title }) {
  const { usuario, logout, isAdmin, canGestao } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const closeSidebar = () => setSidebarOpen(false)

  const initials = usuario?.nome
    ? usuario.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  const roleLabel = {
    admin: 'Administrador',
    gerente: 'Gerente',
    operador: 'Operador',
    visualizador: 'Visualizador'
  }[usuario?.role] || usuario?.role

  return (
    <div className="app-layout">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <span className="logo-icon">🐖</span>
          <div>
            <div className="logo-text">GranjaApp</div>
            <div className="logo-sub">Gestão de Suinocultura</div>
          </div>
          <button className="sidebar-close" onClick={closeSidebar}>✕</button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, i) => {
            if (item.adminOnly && !isAdmin()) return null
            if (item.gestaoOnly && !canGestao()) return null
            const showSection = item.section && (i === 0 || navItems[i - 1]?.section !== item.section)
            return (
              <React.Fragment key={item.to}>
                {showSection && <div className="nav-section">{item.section}</div>}
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  onClick={closeSidebar}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              </React.Fragment>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          v2.0.0 &copy; {new Date().getFullYear()} GranjaApp
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="header">
          <div className="header-left">
            <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Menu">
              <span /><span /><span />
            </button>
            <div className="header-title">{title}</div>
          </div>
          <div className="header-right">
            <div className="header-user">
              <div className="avatar">{initials}</div>
              <div className="user-info">
                <div className="user-name">{usuario?.nome}</div>
                <div className="user-role">{roleLabel}</div>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              🚪 Sair
            </button>
          </div>
        </header>

        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  )
}
