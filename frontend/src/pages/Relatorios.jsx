import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../services/api'

const fmtMoeda = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'

function BarChart({ items, maxValue, color = '' }) {
  if (!items?.length) return <p style={{ color: '#6c757d', fontSize: 13 }}>Sem dados</p>
  return (
    <div className="bar-chart">
      {items.map((item, i) => (
        <div className="bar-item" key={i}>
          <div className="bar-label">{item.label}</div>
          <div className="bar-track">
            <div
              className={`bar-fill ${color}`}
              style={{ width: maxValue ? `${Math.min((item.value / maxValue) * 100, 100)}%` : '0%' }}
            />
          </div>
          <div className="bar-value">{item.formatted}</div>
        </div>
      ))}
    </div>
  )
}

export default function Relatorios() {
  const [relLotes, setRelLotes] = useState([])
  const [relFin, setRelFin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('lotes')

  useEffect(() => {
    Promise.all([
      api.get('/api/relatorios/lotes'),
      api.get('/api/relatorios/financeiro')
    ]).then(([rl, rf]) => {
      setRelLotes(rl.data)
      setRelFin(rf.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <Layout title="Relatórios">
      <div className="loading"><div className="spinner" /> Carregando...</div>
    </Layout>
  )

  const desp = relFin?.despesas_por_categoria || []
  const rec = relFin?.receitas_por_categoria || []
  const maxDesp = Math.max(...desp.map(d => d.total), 1)
  const maxRec = Math.max(...rec.map(r => r.total), 1)
  const maxMort = Math.max(...relLotes.map(l => l.taxa_mortalidade), 1)

  return (
    <Layout title="Relatórios">
      <div className="page-header">
        <div><h1>📈 Relatórios</h1><p>Análise completa da granja</p></div>
        <button className="btn btn-outline" onClick={() => window.print()}>🖨️ Imprimir</button>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'lotes' ? 'active' : ''}`} onClick={() => setTab('lotes')}>🐖 Lotes</div>
        <div className={`tab ${tab === 'financeiro' ? 'active' : ''}`} onClick={() => setTab('financeiro')}>💰 Financeiro</div>
      </div>

      {tab === 'lotes' && (
        <div>
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-icon green">🐖</div>
              <div>
                <div className="stat-value">{relLotes.length}</div>
                <div className="stat-label">Total de Lotes</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue">✅</div>
              <div>
                <div className="stat-value">{relLotes.filter(l => l.status === 'ativo').length}</div>
                <div className="stat-label">Lotes Ativos</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange">📊</div>
              <div>
                <div className="stat-value">
                  {relLotes.reduce((s, l) => s + l.quantidade_atual, 0)}
                </div>
                <div className="stat-label">Total Animais</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red">⚠️</div>
              <div>
                <div className="stat-value">
                  {(relLotes.reduce((s, l) => s + l.taxa_mortalidade, 0) / (relLotes.length || 1)).toFixed(1)}%
                </div>
                <div className="stat-label">Mortalidade Média</div>
              </div>
            </div>
          </div>

          {/* Mortalidade por lote */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">⚠️ Taxa de Mortalidade por Lote</div>
            <div style={{ marginTop: 16 }}>
              <BarChart
                items={relLotes.map(l => ({
                  label: l.numero,
                  value: l.taxa_mortalidade,
                  formatted: `${l.taxa_mortalidade}%`
                }))}
                maxValue={maxMort}
                color="red"
              />
            </div>
          </div>

          {/* Detalhes */}
          <div className="table-container">
            <div className="table-toolbar">
              <strong>Detalhes por Lote</strong>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Entrada</th>
                  <th>Fase</th>
                  <th>Qtd Inicial</th>
                  <th>Qtd Atual</th>
                  <th>Mortalidade</th>
                  <th>% Mort.</th>
                  <th>Custo Ração</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {relLotes.map(l => (
                  <tr key={l.id}>
                    <td><strong>{l.numero}</strong></td>
                    <td>{fmtData(l.data_entrada)}</td>
                    <td>{l.fase || '-'}</td>
                    <td>{l.quantidade_inicial}</td>
                    <td>{l.quantidade_atual}</td>
                    <td style={{ color: l.mortalidade > 0 ? '#dc3545' : '#198754' }}>
                      {l.mortalidade}
                    </td>
                    <td>
                      <span className={`badge ${l.taxa_mortalidade > 5 ? 'badge-red' : l.taxa_mortalidade > 2 ? 'badge-yellow' : 'badge-green'}`}>
                        {l.taxa_mortalidade}%
                      </span>
                    </td>
                    <td>{fmtMoeda(l.custo_total_alimentacao)}</td>
                    <td>
                      <span className={`badge ${l.status === 'ativo' ? 'badge-green' : 'badge-gray'}`}>{l.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'financeiro' && relFin && (
        <div>
          {/* Summary */}
          <div className="fin-summary" style={{ marginBottom: 20 }}>
            <div className="fin-card receita">
              <div className="fin-label">📈 Total Receitas</div>
              <div className="fin-value">{fmtMoeda(relFin.total_receitas)}</div>
            </div>
            <div className="fin-card despesa">
              <div className="fin-label">📉 Total Despesas</div>
              <div className="fin-value">{fmtMoeda(relFin.total_despesas)}</div>
            </div>
            <div className="fin-card saldo">
              <div className="fin-label">💼 Lucro</div>
              <div className="fin-value" style={{ color: relFin.lucro >= 0 ? '#198754' : '#dc3545' }}>
                {fmtMoeda(relFin.lucro)}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Despesas */}
            <div className="card">
              <div className="card-title">📉 Despesas por Categoria</div>
              <div style={{ marginTop: 16 }}>
                <BarChart
                  items={desp.map(d => ({
                    label: d.categoria,
                    value: d.total,
                    formatted: fmtMoeda(d.total)
                  }))}
                  maxValue={maxDesp}
                  color="red"
                />
              </div>
            </div>

            {/* Receitas */}
            <div className="card">
              <div className="card-title">📈 Receitas por Categoria</div>
              <div style={{ marginTop: 16 }}>
                <BarChart
                  items={rec.map(r => ({
                    label: r.categoria,
                    value: r.total,
                    formatted: fmtMoeda(r.total)
                  }))}
                  maxValue={maxRec}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
