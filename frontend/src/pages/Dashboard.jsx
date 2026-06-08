import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../services/api'

const fmtMoeda = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'

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
    { icon: '🐖', label: 'Lotes Ativos', value: data?.total_lotes_ativos ?? 0, cls: 'green' },
    { icon: '🐷', label: 'Animais Ativos', value: data?.total_animais ?? 0, cls: 'blue' },
    { icon: '💉', label: 'Vacinações', value: data?.total_vacinacoes ?? 0, cls: 'purple' },
    { icon: '🫀', label: 'Partos (30 dias)', value: data?.partos_previstos_30dias ?? 0, cls: 'orange' },
    { icon: '📈', label: 'Receitas', value: fmtMoeda(data?.receitas), cls: 'teal' },
    { icon: '📉', label: 'Despesas', value: fmtMoeda(data?.despesas), cls: 'red' },
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
          <div className="card-title">💰 Resumo Financeiro</div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: '📈 Receitas', value: fmtMoeda(data?.receitas), color: '#198754' },
              { label: '📉 Despesas Financeiro', value: fmtMoeda(data?.despesas_financeiro ?? data?.despesas), color: '#dc3545' },
              { label: '⚙️ Custos Operacionais', value: fmtMoeda(data?.total_operacional), color: '#fd7e14', sub: 'ração + sanidade + aquisição' },
              { label: '💼 Saldo da Operação', value: fmtMoeda(saldo), color: saldo >= 0 ? '#198754' : '#dc3545', bold: true, border: true },
              { label: '🌽 Ração (30 dias)', value: fmtMoeda(data?.custo_racao_30dias) },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: 4,
                ...(row.border ? { borderTop: '1px solid #dee2e6', paddingTop: 12 } : {})
              }}>
                <div>
                  <span style={{ color: '#6c757d', fontSize: 13 }}>{row.label}</span>
                  {row.sub && <div style={{ fontSize: 11, color: '#adb5bd' }}>{row.sub}</div>}
                </div>
                <strong style={{ color: row.color, fontSize: row.bold ? 16 : 14 }}>{row.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
