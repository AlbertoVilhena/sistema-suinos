import React, { useEffect } from 'react'

export default function Modal({ title, onClose, onSave, saving, children, size = '' }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size ? 'modal-' + size : ''}`}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          {onSave && (
            <button className="btn btn-primary" onClick={onSave} disabled={saving}>
              {saving ? '⏳ Salvando...' : '✅ Salvar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
