import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', icon: '📊', label: 'Dashboard', section: 'GERAL' },
  { to: '/lotes', icon: '🐖', label: 'Lotes', section: 'PRODUÇÃO' },
  { to: '/animais', icon: '🐷', label: 'Animais' },
  { to: '/alimentacao', icon: '🌽', label: 'Alimentação' },
  { to: '/sanidade', icon: '💉', label: 'Sanidade' },
  { to: '/reproducao', icon: '🫀', label: 'Reprodução' },
  { to: '/financeiro', icon: '💰', label: 'Financeiro', section: 'GESTÃO' },
  { to: '/relatorios', icon: '📈', label: 'Relatórios' },
  { to: '/usuarios', icon: '👥', label: 'Usuários', adminOnly: true },
]

export default function Layout({ children, title }) {
  const { usuario, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

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
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">🐖</span>
          <div>
            <div className="logo-text">GranjaApp</div>
            <div className="logo-sub">Gestão de Suinocultura</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, i) => {
            if (item.adminOnly && !isAdmin()) return null
            const showSection = item.section && (i === 0 || navItems[i - 1]?.section !== item.section)
            return (
              <React.Fragment key={item.to}>
                {showSection && <div className="nav-section">{item.section}</div>}
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
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
          <div className="header-title">{title}</div>
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
