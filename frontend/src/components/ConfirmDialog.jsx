import React, { createContext, useContext, useState, useCallback } from 'react'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false, message: '', resolve: null, confirmLabel: 'Confirmar', danger: false })

  const confirm = useCallback((message, { confirmLabel = 'Confirmar', danger = true } = {}) => {
    return new Promise((resolve) => {
      setState({ open: true, message, resolve, confirmLabel, danger })
    })
  }, [])

  const handleConfirm = () => {
    state.resolve(true)
    setState(s => ({ ...s, open: false }))
  }

  const handleCancel = () => {
    state.resolve(false)
    setState(s => ({ ...s, open: false }))
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state.open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99998, padding: 16,
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '24px 28px',
            maxWidth: 380, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            display: 'flex', flexDirection: 'column', gap: 20,
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 28, lineHeight: 1 }}>
                {state.danger ? '⚠️' : '❓'}
              </span>
              <p style={{ margin: 0, fontSize: 15, color: '#212529', lineHeight: 1.5, flex: 1 }}>
                {state.message}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: '1px solid #dee2e6',
                  background: '#fff', color: '#495057', fontWeight: 600, cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: 'none',
                  background: state.danger ? '#dc3545' : '#2d6a4f',
                  color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14,
                }}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider')
  return ctx
}
