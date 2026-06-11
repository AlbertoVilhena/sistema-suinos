import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../services/api'

const fmtMoeda = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
const fmtK = (v) => {
  const n = Number(v || 0)
  if (Math.abs(n) >= 10000) return `R$${(n / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`
  return `R$${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const faseBadge = {
  maternidade: 'badge-purple',
  creche: 'badge-blue',
  crescimento: 'badge-teal',
  terminacao: 'badge-yellow',
}

const statusBadge = {
  ativo: 'badge-green',
  encerrado: 'badge-gray',
  vendido: 'badge-blue',
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/dashboard')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <Layout title="Dashboard">
      <div className="loading"><div className="spinner" /> Carregando...</div>
    </Layout>
  )

  const stats = [
    { icon: '🐖', label: 'Lotes Ativos',  value: data?.total_lotes_ativos ?? 0,      cls: 'green'  },
    { icon: '🐷', label: 'Animais',        value: data?.total_animais ?? 0,            cls: 'blue'   },
    { icon: '💉', label: 'Vacinações',     value: data?.total_vacinacoes ?? 0,         cls: 'purple' },
    { icon: '🫀', label: 'Partos 30d',     value: data?.partos_realizados_30dias ?? 0,  cls: 'orange' },
    { icon: '📈', label: 'Receitas',       value: fmtK(data?.receitas),               cls: 'teal'   },
    { icon: '📉', label: 'Despesas',       value: fmtK(data?.despesas),               cls: 'red'    },
  ]

  const saldo = data?.saldo ?? ((data?.receitas || 0) - (data?.despesas || 0))

  return (
    <Layout title="Dashboard">
      <div className="page-header">
        <div>
          <h1>Visão Geral</h1>
          <p>Resumo da sua granja em tempo real</p>
        </div>
        <div className="dash-saldo-header">
          <span style={{ fontSize: 12, color: '#6c757d' }}>Saldo atual</span>
          <strong style={{ color: saldo >= 0 ? '#198754' : '#dc3545', fontSize: 15, display: 'block' }}>
            {fmtMoeda(saldo)}
          </strong>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((s, i) => (
          <div className="stat-card" key={i}>
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
            <div style={{ minWidth: 0 }}>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerta alimentação — aparece quando há lotes sem registro hoje */}
      {(data?.lotes_sem_alimentacao_hoje > 0) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>⚠️</span>
          <div>
            <strong style={{ color: '#664d03', fontSize: 13 }}>
              {data.lotes_sem_alimentacao_hoje} lote{data.lotes_sem_alimentacao_hoje > 1 ? 's' : ''} sem alimentação registrada hoje
            </strong>
            <div style={{ fontSize: 11, color: '#856404', marginTop: 2 }}>Acesse Alimentação para registrar o fornecimento de ração.</div>
          </div>
        </div>
      )}

      <div className="dashboard-row">
        {/* Lotes recentes */}
        <div className="card">
          <div className="card-title">🐖 Lotes Recentes</div>
          {data?.lotes_recentes?.length === 0 ? (
            <p style={{ color: '#6c757d', marginTop: 12 }}>Nenhum lote cadastrado ainda.</p>
          ) : (
            <div className="table-container" style={{ marginTop: 12, border: 'none', boxShadow: 'none' }}>
              <table className="recent-table">
                <thead>
                  <tr>
                    <th>Número</th><th>Fase</th><th>Qtd</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.lotes_recentes?.map(l => (
                    <tr key={l.id}>
                      <td data-label="Número"><strong>{l.numero}</strong></td>
                      <td data-label="Fase">
                        <span className={`badge ${faseBadge[l.fase] || 'badge-gray'}`}>{l.fase || '-'}</span>
                      </td>
                      <td data-label="Qtd">{l.quantidade_atual}</td>
                      <td data-label="Status">
                        <span className={`badge ${statusBadge[l.status] || 'badge-gray'}`}>{l.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Resumo financeiro */}
        <div className="card">
          <div className="card-title" style={{ fontSize: 13 }}>💰 Resumo Financeiro</div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: '📈 Receitas',          value: fmtMoeda(data?.receitas),                                          color: '#198754' },
              { label: '📉 Desp. Financeiro',  value: fmtMoeda(data?.despesas_financeiro ?? data?.despesas),             color: '#dc3545' },
              { label: '⚙️ Custos Operac.',    value: fmtMoeda(data?.total_operacional),                                 color: '#fd7e14' },
              { label: '💼 Saldo',             value: fmtMoeda(saldo), color: saldo >= 0 ? '#198754' : '#dc3545', bold: true, border: true },
              { label: '🌽 Ração 30d',         value: fmtMoeda(data?.custo_racao_30dias) },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4,
                ...(row.border ? { borderTop: '1px solid #dee2e6', paddingTop: 8, marginTop: 2 } : {})
              }}>
                <span style={{ color: '#6c757d', fontSize: 12 }}>{row.label}</span>
                <strong style={{ color: row.color, fontSize: row.bold ? 14 : 13, whiteSpace: 'nowrap' }}>{row.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
