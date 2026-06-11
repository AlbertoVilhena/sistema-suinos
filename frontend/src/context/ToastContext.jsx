import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

let _uid = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 320)
  }, [])

  const add = useCallback((type, message, duration = 4000) => {
    const id = ++_uid
    setToasts(prev => {
      // Limit to 4 toasts max
      const next = [...prev.slice(-3), { id, type, message, exiting: false }]
      return next
    })
    timers.current[id] = setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  const toast = {
    success: (msg, dur) => add('success', msg, dur),
    error:   (msg, dur) => add('error',   msg, dur || 6000),
    warning: (msg, dur) => add('warning', msg, dur),
    info:    (msg, dur) => add('info',    msg, dur),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

const ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }
const COLORS = {
  success: { bg: '#d1fae5', border: '#6ee7b7', color: '#065f46' },
  error:   { bg: '#fee2e2', border: '#fca5a5', color: '#991b1b' },
  warning: { bg: '#fff3cd', border: '#ffc107', color: '#92400e' },
  info:    { bg: '#dbeafe', border: '#93c5fd', color: '#1e40af' },
}

function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column', gap: 10,
      zIndex: 99999, maxWidth: 360, width: 'calc(100vw - 48px)',
    }}>
      {toasts.map(t => {
        const c = COLORS[t.type]
        return (
          <div
            key={t.id}
            onClick={() => onDismiss(t.id)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 14px',
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: 10,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              cursor: 'pointer',
              color: c.color,
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1.4,
              opacity: t.exiting ? 0 : 1,
              transform: t.exiting ? 'translateX(20px)' : 'translateX(0)',
              transition: 'opacity 0.3s, transform 0.3s',
              userSelect: 'none',
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{ICONS[t.type]}</span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <span style={{ fontSize: 16, flexShrink: 0, opacity: 0.5 }}>×</span>
          </div>
        )
      })}
    </div>
  )
}
