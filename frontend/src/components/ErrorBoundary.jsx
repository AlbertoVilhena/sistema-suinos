import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // In production you could send to an error tracking service here
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', gap: 16,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          background: '#f0f4f2', padding: 24, textAlign: 'center'
        }}>
          <div style={{ fontSize: 64 }}>😕</div>
          <h2 style={{ margin: 0, color: '#212529' }}>Ops! Algo deu errado</h2>
          <p style={{ color: '#6c757d', margin: 0, maxWidth: 400 }}>
            Ocorreu um erro inesperado. Tente recarregar a página. Se o problema persistir, contate o suporte.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px', background: '#2d6a4f', color: '#fff',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600
              }}
            >
              🔄 Recarregar página
            </button>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/' }}
              style={{
                padding: '10px 20px', background: 'transparent', color: '#2d6a4f',
                border: '1px solid #2d6a4f', borderRadius: 8, cursor: 'pointer', fontWeight: 600
              }}
            >
              🏠 Ir para início
            </button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details style={{ marginTop: 16, textAlign: 'left', maxWidth: 600, width: '100%' }}>
              <summary style={{ cursor: 'pointer', color: '#dc3545', fontWeight: 600 }}>
                Detalhes do erro (apenas em desenvolvimento)
              </summary>
              <pre style={{
                background: '#fff', padding: 16, borderRadius: 8, overflow: 'auto',
                fontSize: 12, color: '#495057', marginTop: 8, border: '1px solid #dee2e6'
              }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
