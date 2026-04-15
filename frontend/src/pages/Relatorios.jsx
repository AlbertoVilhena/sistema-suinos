import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../services/api'

const fmtMoeda = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
const fmtNum = (v, dec = 1) => Number(v || 0).toFixed(dec)

function BarChart({ items, maxValue, color = '' }) {
  if (!items?.length) return <p style={{ color: '#6c757d', fontSize: 13 }}>Sem dados</p>
  return (
    <div className="bar-chart">
      {items.map((item, i) => (
        <div className="bar-item" key={i}>
          <div className="bar-label">{item.label}</div>
          <div className="bar-track">
            <div className={`bar-fill ${color}`} style={{ width: maxValue ? `${Math.min((item.value / maxValue) * 100, 100)}%` : '0%' }} />
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
  const [analise, setAnalise] = useState(null)
  const [analiseLoading, setAnaliseLoading] = useState(false)
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

  const carregarAnalise = () => {
    setAnaliseLoading(true)
    api.get('/api/analise/venda').then(r => setAnalise(r.data)).catch(() => setAnalise({ erro: 'Não foi possível gerar análise.' })).finally(() => setAnaliseLoading(false))
  }

  useEffect(() => { if (tab === 'ia') carregarAnalise() }, [tab])

  if (loading) return <Layout title="Relatórios"><div className="loading"><div className="spinner" />Carregando...</div></Layout>

  const desp = relFin?.despesas_por_categoria || []
  const rec = relFin?.receitas_por_categoria || []
  const maxDesp = Math.max(...desp.map(d => d.total), 1)
  const maxRec = Math.max(...rec.map(r => r.total), 1)

  const handlePrint = () => {
    document.title = `Relatório GranjaApp - ${tab === 'lotes' ? 'Lotes' : tab === 'financeiro' ? 'Financeiro' : 'Análise IA'}`
    window.print()
  }

  return (
    <Layout title="Relatórios">
      <div className="page-header no-print">
        <div><h1>📈 Relatórios</h1><p>Análise completa da granja</p></div>
        <button className="btn btn-outline" onClick={handlePrint}>🖨️ Exportar PDF</button>
      </div>

      <div className="tabs no-print">
        <div className={`tab ${tab === 'lotes' ? 'active' : ''}`} onClick={() => setTab('lotes')}>🐖 Lotes</div>
        <div className={`tab ${tab === 'financeiro' ? 'active' : ''}`} onClick={() => setTab('financeiro')}>💰 Financeiro</div>
        <div className={`tab ${tab === 'ia' ? 'active' : ''}`} onClick={() => setTab('ia')}>🤖 Análise IA</div>
      </div>

      {/* Print header - only visible when printing */}
      <div className="print-only print-header">
        <h2>GranjaApp — {tab === 'lotes' ? 'Relatório de Lotes' : tab === 'financeiro' ? 'Relatório Financeiro' : 'Análise IA — Momento de Venda'}</h2>
        <p>Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
      </div>

      {/* ===== ABA LOTES ===== */}
      {tab === 'lotes' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div className="stat-card"><div className="stat-icon green">🐖</div><div><div className="stat-value">{relLotes.length}</div><div className="stat-label">Total de Lotes</div></div></div>
            <div className="stat-card"><div className="stat-icon blue">✅</div><div><div className="stat-value">{relLotes.filter(l => l.status === 'ativo').length}</div><div className="stat-label">Lotes Ativos</div></div></div>
            <div className="stat-card"><div className="stat-icon teal">🐷</div><div><div className="stat-value">{relLotes.reduce((s, l) => s + (l.quantidade_atual || 0), 0)}</div><div className="stat-label">Animais Ativos</div></div></div>
            <div className="stat-card"><div className="stat-icon yellow">⚖️</div><div><div className="stat-value">{fmtNum(relLotes.reduce((s, l) => s + (l.peso_medio_saida || 0), 0) / Math.max(relLotes.length, 1))} kg</div><div className="stat-label">Peso Médio Saída</div></div></div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">📋 Detalhes por Lote</div>
            <div style={{ overflowX: 'auto', marginTop: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>Lote</th><th>Fase</th><th>Status</th><th>Qtd Inicial</th><th>Qtd Atual</th>
                    <th>Mortalidade</th><th>Custo Ração</th><th>Custo Sanidade</th><th>Custo Aquisição</th><th>Total Custos</th><th>Custo/Animal</th><th>Receita</th><th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {relLotes.length === 0
                    ? <tr><td colSpan={13} className="table-empty">Nenhum lote cadastrado</td></tr>
                    : relLotes.map(l => (
                      <tr key={l.id}>
                        <td data-label="Lote"><strong>{l.numero}</strong><div style={{ fontSize: 11, color: '#6c757d' }}>{fmtData(l.data_entrada)}</div></td>
                        <td data-label="Fase">{l.fase || '-'}</td>
                        <td data-label="Status"><span className={`badge ${l.status === 'ativo' ? 'badge-green' : l.status === 'vendido' ? 'badge-blue' : 'badge-gray'}`}>{l.status}</span></td>
                        <td data-label="Qtd Inicial">{l.quantidade_inicial}</td>
                        <td data-label="Qtd Atual">{l.quantidade_atual}</td>
                        <td data-label="Mortalidade" style={{ color: l.taxa_mortalidade > 5 ? '#dc3545' : 'inherit' }}>{fmtNum(l.taxa_mortalidade)}%</td>
                        <td data-label="Custo Ração">{fmtMoeda(l.custo_racao)}</td>
                        <td data-label="Custo Sanidade">{fmtMoeda(l.custo_sanidade)}</td>
                        <td data-label="Custo Aquisição">{fmtMoeda(l.custo_aquisicao_animais)}</td>
                        <td data-label="Total Custos" style={{ fontWeight: 600 }}>{fmtMoeda(l.total_operacional)}</td>
                        <td data-label="Custo/Animal">{fmtMoeda(l.custo_por_animal)}</td>
                        <td data-label="Receita" style={{ color: '#198754', fontWeight: 600 }}>{fmtMoeda(l.receita_lote)}</td>
                        <td data-label="Resultado" style={{ fontWeight: 700, color: l.resultado_lote >= 0 ? '#198754' : '#dc3545' }}>
                          {l.resultado_lote >= 0 ? '+' : ''}{fmtMoeda(l.resultado_lote)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-title">📊 Mortalidade por Lote (%)</div>
            <div style={{ marginTop: 16 }}>
              <BarChart items={relLotes.map(l => ({ label: l.numero, value: l.taxa_mortalidade, formatted: `${fmtNum(l.taxa_mortalidade)}%` }))} maxValue={Math.max(...relLotes.map(l => l.taxa_mortalidade), 1)} color="red" />
            </div>
          </div>
        </div>
      )}

      {/* ===== ABA FINANCEIRO ===== */}
      {tab === 'financeiro' && relFin && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div className="stat-card"><div className="stat-icon green">📈</div><div><div className="stat-value" style={{ fontSize: 18 }}>{fmtMoeda(relFin.total_receitas)}</div><div className="stat-label">Total Receitas</div></div></div>
            <div className="stat-card"><div className="stat-icon red">📉</div><div><div className="stat-value" style={{ fontSize: 18 }}>{fmtMoeda(relFin.total_despesas)}</div><div className="stat-label">Total Despesas</div></div></div>
            <div className="stat-card" style={{ borderLeft: `4px solid ${relFin.saldo >= 0 ? '#198754' : '#dc3545'}` }}>
              <div className="stat-icon">{relFin.saldo >= 0 ? '✅' : '⚠️'}</div>
              <div><div className="stat-value" style={{ fontSize: 18, color: relFin.saldo >= 0 ? '#198754' : '#dc3545' }}>{fmtMoeda(relFin.saldo)}</div><div className="stat-label">Saldo</div></div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card">
              <div className="card-title">📉 Despesas por Categoria</div>
              <div style={{ marginTop: 16 }}><BarChart items={desp.map(d => ({ label: d.categoria || 'Outros', value: d.total, formatted: fmtMoeda(d.total) }))} maxValue={maxDesp} color="red" /></div>
            </div>
            <div className="card">
              <div className="card-title">📈 Receitas por Categoria</div>
              <div style={{ marginTop: 16 }}><BarChart items={rec.map(r => ({ label: r.categoria || 'Outros', value: r.total, formatted: fmtMoeda(r.total) }))} maxValue={maxRec} /></div>
            </div>
          </div>

          {relFin.resultado_por_lote?.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title">🐖 Resultado por Lote</div>
              <div style={{ overflowX: 'auto', marginTop: 12 }}>
                <table>
                  <thead>
                    <tr><th>Lote</th><th>Status</th><th>Receita</th><th>Custo Total</th><th>Resultado</th></tr>
                  </thead>
                  <tbody>
                    {relFin.resultado_por_lote.map(l => (
                      <tr key={l.lote_id}>
                        <td data-label="Lote"><strong>{l.lote_numero}</strong></td>
                        <td data-label="Status"><span className={`badge ${l.status === 'ativo' ? 'badge-green' : l.status === 'vendido' ? 'badge-blue' : 'badge-gray'}`}>{l.status}</span></td>
                        <td data-label="Receita" style={{ color: '#198754', fontWeight: 600 }}>{fmtMoeda(l.receita)}</td>
                        <td data-label="Custo Total" style={{ color: '#dc3545' }}>{fmtMoeda(l.custo_total)}</td>
                        <td data-label="Resultado" style={{ fontWeight: 700, color: l.resultado >= 0 ? '#198754' : '#dc3545' }}>
                          {l.resultado >= 0 ? '+' : ''}{fmtMoeda(l.resultado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {relFin.custos_operacionais && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title">⚙️ Custos Operacionais</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
                {[
                  { label: 'Custo Ração', value: relFin.custos_operacionais.custo_racao },
                  { label: 'Custo Sanidade', value: relFin.custos_operacionais.custo_sanidade },
                  { label: 'Custo Aquisição', value: relFin.custos_operacionais.custo_aquisicao_animais },
                  { label: 'Total Operacional', value: relFin.custos_operacionais.total_operacional, bold: true },
                ].map((item, i) => (
                  <div key={i} style={{ padding: '10px 14px', background: '#f8f9fa', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: '#6c757d' }}>{item.label}</div>
                    <div style={{ fontWeight: item.bold ? 700 : 600, fontSize: 16, color: '#212529', marginTop: 2 }}>{fmtMoeda(item.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== ABA ANÁLISE IA ===== */}
      {tab === 'ia' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div className="card-title">🤖 Análise IA — Momento Ideal de Venda</div>
                <p style={{ color: '#6c757d', fontSize: 13, marginTop: 4 }}>Análise baseada em ganho de peso, custo operacional e métricas de produção por lote.</p>
              </div>
              <button className="btn btn-outline no-print" onClick={carregarAnalise} disabled={analiseLoading}>
                {analiseLoading ? '⏳ Analisando...' : '🔄 Atualizar Análise'}
              </button>
            </div>
          </div>

          {analiseLoading && <div className="loading"><div className="spinner" />Analisando dados dos lotes...</div>}

          {analise?.erro && <div className="error-msg">{analise.erro}</div>}

          {analise?.lotes?.length === 0 && (
            <div className="card"><div className="table-empty"><span className="empty-icon">🤖</span>Nenhum lote ativo para analisar. Cadastre lotes e animais primeiro.</div></div>
          )}

          {analise?.lotes?.map(l => (
            <div key={l.lote_id} className="card" style={{ marginBottom: 16, borderLeft: `4px solid ${l.cor_recomendacao}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <strong style={{ fontSize: 17 }}>Lote {l.numero}</strong>
                    <span className="badge" style={{ background: l.cor_recomendacao, color: '#fff', fontWeight: 700 }}>{l.icone_recomendacao} {l.recomendacao}</span>
                    <span className={`badge ${l.fase === 'terminacao' ? 'badge-yellow' : 'badge-blue'}`}>{l.fase || '-'}</span>
                  </div>
                  <p style={{ color: '#495057', fontSize: 14, margin: 0 }}>{l.justificativa}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
                {[
                  { label: 'Animais ativos', value: l.qtd_animais },
                  { label: 'Peso médio atual', value: `${fmtNum(l.peso_medio_atual)} kg` },
                  { label: 'Ganho/dia', value: `${fmtNum(l.ganho_diario_medio, 3)} kg/dia` },
                  { label: 'Dias em produção', value: l.dias_em_producao },
                  { label: 'Custo total', value: fmtMoeda(l.custo_total) },
                  { label: 'Custo por kg', value: `${fmtMoeda(l.custo_por_kg)}/kg` },
                  { label: 'Preço mín. lucro', value: `${fmtMoeda(l.preco_minimo_lucro)}/kg` },
                  { label: 'Dias para peso alvo', value: l.dias_para_peso_alvo > 0 ? `${l.dias_para_peso_alvo} dias` : '— atingido' },
                ].map((m, i) => (
                  <div key={i} style={{ background: '#f8f9fa', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ fontSize: 11, color: '#6c757d' }}>{m.label}</div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#212529', marginTop: 2 }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {l.alertas?.length > 0 && (
                <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>
                  {l.alertas.map((a, i) => <div key={i}>⚠️ {a}</div>)}
                </div>
              )}
            </div>
          ))}

          {analise?.resumo && (
            <div className="card" style={{ background: '#f8fff9', border: '1px solid #c3e6cb' }}>
              <div className="card-title">📊 Resumo Geral</div>
              <div style={{ marginTop: 10, fontSize: 14, color: '#212529', lineHeight: 1.7 }}>
                <div>🐖 Lotes analisados: <strong>{analise.resumo.total_lotes}</strong></div>
                <div>✅ Prontos para venda: <strong style={{ color: '#198754' }}>{analise.resumo.prontos_venda}</strong></div>
                <div>⏳ Aguardar: <strong style={{ color: '#0d6efd' }}>{analise.resumo.aguardar}</strong></div>
                <div>💰 Receita potencial estimada: <strong style={{ color: '#198754' }}>{fmtMoeda(analise.resumo.receita_potencial)}</strong></div>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
