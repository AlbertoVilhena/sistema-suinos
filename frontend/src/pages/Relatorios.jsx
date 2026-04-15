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

/* Card por lote — visível apenas no mobile */
function LoteCard({ l }) {
  const [expanded, setExpanded] = useState(false)
  const resultadoColor = l.resultado_lote >= 0 ? '#198754' : '#dc3545'
  const statusCls = l.status === 'ativo' ? 'badge-green' : l.status === 'vendido' ? 'badge-blue' : 'badge-gray'

  return (
    <div className="rel-lote-card">
      {/* Cabeçalho */}
      <div className="rel-lote-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 16 }}>Lote {l.numero}</strong>
          <span className={`badge ${statusCls}`}>{l.status}</span>
          {l.fase && <span className="badge badge-gray">{l.fase}</span>}
        </div>
        <div style={{ fontSize: 12, color: '#6c757d', marginTop: 2 }}>{fmtData(l.data_entrada)} · {l.quantidade_atual} animais</div>
      </div>

      {/* Resultado em destaque */}
      <div className="rel-lote-resultado" style={{ borderColor: resultadoColor, color: resultadoColor }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 600, opacity: 0.8 }}>Resultado</div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>
          {l.resultado_lote >= 0 ? '+' : ''}{fmtMoeda(l.resultado_lote)}
        </div>
      </div>

      {/* Grid de métricas principais */}
      <div className="rel-lote-metrics">
        {[
          { label: 'Receita', value: fmtMoeda(l.receita_lote), color: '#198754' },
          { label: 'Total Custos', value: fmtMoeda(l.total_operacional), color: '#dc3545' },
          { label: 'Custo/Animal', value: fmtMoeda(l.custo_por_animal) },
          { label: 'Mortalidade', value: `${fmtNum(l.taxa_mortalidade)}%`, color: l.taxa_mortalidade > 5 ? '#dc3545' : '#198754' },
        ].map((m, i) => (
          <div key={i} className="rel-metric-box">
            <div className="rel-metric-label">{m.label}</div>
            <div className="rel-metric-value" style={m.color ? { color: m.color } : {}}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Detalhes expandíveis */}
      <button className="rel-expand-btn" onClick={() => setExpanded(e => !e)}>
        {expanded ? '▲ Menos detalhes' : '▼ Ver detalhes de custos'}
      </button>

      {expanded && (
        <div className="rel-lote-details">
          {[
            { label: 'Qtd Inicial', value: l.quantidade_inicial },
            { label: 'Qtd Atual', value: l.quantidade_atual },
            { label: 'Custo Ração', value: fmtMoeda(l.custo_racao) },
            { label: 'Custo Sanidade', value: fmtMoeda(l.custo_sanidade) },
            { label: 'Custo Aquisição', value: fmtMoeda(l.custo_aquisicao_animais) },
          ].map((d, i) => (
            <div key={i} className="rel-detail-row">
              <span>{d.label}</span>
              <strong>{d.value}</strong>
            </div>
          ))}
        </div>
      )}
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
        <button className="btn btn-outline" onClick={handlePrint}>🖨️ PDF</button>
      </div>

      <div className="tabs no-print">
        <div className={`tab ${tab === 'lotes' ? 'active' : ''}`} onClick={() => setTab('lotes')}>🐖 Lotes</div>
        <div className={`tab ${tab === 'financeiro' ? 'active' : ''}`} onClick={() => setTab('financeiro')}>💰 Financeiro</div>
        <div className={`tab ${tab === 'ia' ? 'active' : ''}`} onClick={() => setTab('ia')}>🤖 Análise IA</div>
      </div>

      <div className="print-only print-header">
        <h2>GranjaApp — {tab === 'lotes' ? 'Relatório de Lotes' : tab === 'financeiro' ? 'Relatório Financeiro' : 'Análise IA — Momento de Venda'}</h2>
        <p>Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
      </div>

      {/* ===== ABA LOTES ===== */}
      {tab === 'lotes' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div className="stat-card"><div className="stat-icon green">🐖</div><div><div className="stat-value">{relLotes.length}</div><div className="stat-label">Total de Lotes</div></div></div>
            <div className="stat-card"><div className="stat-icon blue">✅</div><div><div className="stat-value">{relLotes.filter(l => l.status === 'ativo').length}</div><div className="stat-label">Lotes Ativos</div></div></div>
            <div className="stat-card"><div className="stat-icon teal">🐷</div><div><div className="stat-value">{relLotes.reduce((s, l) => s + (l.quantidade_atual || 0), 0)}</div><div className="stat-label">Animais Ativos</div></div></div>
            <div className="stat-card"><div className="stat-icon yellow">⚖️</div><div><div className="stat-value">{fmtNum(relLotes.reduce((s, l) => s + (l.peso_medio_saida || 0), 0) / Math.max(relLotes.length, 1))} kg</div><div className="stat-label">Peso Médio</div></div></div>
          </div>

          {/* Mobile: cards por lote */}
          <div className="rel-lotes-mobile">
            {relLotes.length === 0
              ? <div className="card"><div className="table-empty"><span className="empty-icon">🐖</span>Nenhum lote cadastrado</div></div>
              : relLotes.map(l => <LoteCard key={l.id} l={l} />)
            }
          </div>

          {/* Desktop: tabela completa */}
          <div className="rel-lotes-desktop card" style={{ marginBottom: 16 }}>
            <div className="card-title">📋 Detalhes por Lote</div>
            <div style={{ overflowX: 'auto', marginTop: 12 }}>
              <table>
                <thead><tr>
                  <th>Lote</th><th>Fase</th><th>Status</th><th>Qtd Ini.</th><th>Qtd Atual</th>
                  <th>Mortalidade</th><th>Custo Ração</th><th>Custo Sanidade</th><th>Custo Aquisição</th>
                  <th>Total Custos</th><th>Custo/Animal</th><th>Receita</th><th>Resultado</th>
                </tr></thead>
                <tbody>
                  {relLotes.length === 0
                    ? <tr><td colSpan={13} className="table-empty">Nenhum lote cadastrado</td></tr>
                    : relLotes.map(l => (
                      <tr key={l.id}>
                        <td><strong>{l.numero}</strong><div style={{ fontSize: 11, color: '#6c757d' }}>{fmtData(l.data_entrada)}</div></td>
                        <td>{l.fase || '-'}</td>
                        <td><span className={`badge ${l.status === 'ativo' ? 'badge-green' : l.status === 'vendido' ? 'badge-blue' : 'badge-gray'}`}>{l.status}</span></td>
                        <td>{l.quantidade_inicial}</td>
                        <td>{l.quantidade_atual}</td>
                        <td style={{ color: l.taxa_mortalidade > 5 ? '#dc3545' : 'inherit' }}>{fmtNum(l.taxa_mortalidade)}%</td>
                        <td>{fmtMoeda(l.custo_racao)}</td>
                        <td>{fmtMoeda(l.custo_sanidade)}</td>
                        <td>{fmtMoeda(l.custo_aquisicao_animais)}</td>
                        <td style={{ fontWeight: 600 }}>{fmtMoeda(l.total_operacional)}</td>
                        <td>{fmtMoeda(l.custo_por_animal)}</td>
                        <td style={{ color: '#198754', fontWeight: 600 }}>{fmtMoeda(l.receita_lote)}</td>
                        <td style={{ fontWeight: 700, color: l.resultado_lote >= 0 ? '#198754' : '#dc3545' }}>
                          {l.resultado_lote >= 0 ? '+' : ''}{fmtMoeda(l.resultado_lote)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card no-print">
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
          {/* Saldo em destaque */}
          <div className="rel-fin-saldo" style={{ borderColor: relFin.saldo >= 0 ? '#198754' : '#dc3545' }}>
            <div className="rel-fin-saldo-label">Saldo</div>
            <div className="rel-fin-saldo-value" style={{ color: relFin.saldo >= 0 ? '#198754' : '#dc3545' }}>
              {relFin.saldo >= 0 ? '✅' : '⚠️'} {fmtMoeda(relFin.saldo)}
            </div>
          </div>

          {/* Receitas e Despesas */}
          <div className="rel-fin-grid">
            <div className="stat-card">
              <div className="stat-icon green">📈</div>
              <div><div className="stat-value" style={{ fontSize: 17 }}>{fmtMoeda(relFin.total_receitas)}</div><div className="stat-label">Total Receitas</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red">📉</div>
              <div><div className="stat-value" style={{ fontSize: 17 }}>{fmtMoeda(relFin.total_despesas)}</div><div className="stat-label">Total Despesas</div></div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="rel-charts-grid">
            <div className="card">
              <div className="card-title">📉 Despesas por Categoria</div>
              <div style={{ marginTop: 12 }}><BarChart items={desp.map(d => ({ label: d.categoria || 'Outros', value: d.total, formatted: fmtMoeda(d.total) }))} maxValue={maxDesp} color="red" /></div>
            </div>
            <div className="card">
              <div className="card-title">📈 Receitas por Categoria</div>
              <div style={{ marginTop: 12 }}><BarChart items={rec.map(r => ({ label: r.categoria || 'Outros', value: r.total, formatted: fmtMoeda(r.total) }))} maxValue={maxRec} /></div>
            </div>
          </div>

          {/* Resultado por lote */}
          {relFin.resultado_por_lote?.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title">🐖 Resultado por Lote</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {relFin.resultado_por_lote.map(l => (
                  <div key={l.lote_id} className="rel-resultado-row">
                    <div className="rel-resultado-info">
                      <strong>{l.lote_numero}</strong>
                      <span className={`badge ${l.status === 'ativo' ? 'badge-green' : l.status === 'vendido' ? 'badge-blue' : 'badge-gray'}`}>{l.status}</span>
                    </div>
                    <div className="rel-resultado-values">
                      <span style={{ color: '#198754', fontSize: 12 }}>↑ {fmtMoeda(l.receita)}</span>
                      <span style={{ color: '#dc3545', fontSize: 12 }}>↓ {fmtMoeda(l.custo_total)}</span>
                      <strong style={{ color: l.resultado >= 0 ? '#198754' : '#dc3545', fontSize: 14 }}>
                        {l.resultado >= 0 ? '+' : ''}{fmtMoeda(l.resultado)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custos operacionais */}
          {relFin.custos_operacionais && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title">⚙️ Custos Operacionais</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 12 }}>
                {[
                  { label: 'Ração', value: relFin.custos_operacionais.custo_racao },
                  { label: 'Sanidade', value: relFin.custos_operacionais.custo_sanidade },
                  { label: 'Aquisição', value: relFin.custos_operacionais.custo_aquisicao_animais },
                  { label: 'Total', value: relFin.custos_operacionais.total_operacional, bold: true },
                ].map((item, i) => (
                  <div key={i} style={{ padding: '10px 12px', background: '#f8f9fa', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#6c757d', textTransform: 'uppercase', fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontWeight: item.bold ? 700 : 600, fontSize: 15, color: '#212529', marginTop: 4 }}>{fmtMoeda(item.value)}</div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div className="card-title">🤖 Análise IA — Momento Ideal de Venda</div>
                <p style={{ color: '#6c757d', fontSize: 13, marginTop: 4 }}>Análise por ganho de peso, custo e métricas de produção.</p>
              </div>
              <button className="btn btn-outline no-print" onClick={carregarAnalise} disabled={analiseLoading} style={{ width: '100%' }}>
                {analiseLoading ? '⏳ Analisando...' : '🔄 Atualizar Análise'}
              </button>
            </div>
          </div>

          {analiseLoading && <div className="loading"><div className="spinner" />Analisando dados dos lotes...</div>}
          {analise?.erro && <div className="error-msg">{analise.erro}</div>}
          {analise?.lotes?.length === 0 && (
            <div className="card"><div className="table-empty"><span className="empty-icon">🤖</span>Nenhum lote ativo para analisar.</div></div>
          )}

          {analise?.lotes?.map(l => (
            <div key={l.lote_id} className="card" style={{ marginBottom: 12, borderLeft: `4px solid ${l.cor_recomendacao}` }}>
              {/* Cabeçalho do lote */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <strong style={{ fontSize: 16 }}>Lote {l.numero}</strong>
                <span className="badge" style={{ background: l.cor_recomendacao, color: '#fff', fontWeight: 700 }}>{l.icone_recomendacao} {l.recomendacao}</span>
                <span className={`badge ${l.fase === 'terminacao' ? 'badge-yellow' : 'badge-blue'}`}>{l.fase || '-'}</span>
              </div>
              <p style={{ color: '#495057', fontSize: 13, marginBottom: 12 }}>{l.justificativa}</p>

              {/* Métricas em grid 2x2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                {[
                  { label: 'Animais', value: l.qtd_animais },
                  { label: 'Peso médio', value: `${fmtNum(l.peso_medio_atual)} kg` },
                  { label: 'Ganho/dia', value: `${fmtNum(l.ganho_diario_medio, 3)} kg` },
                  { label: 'Dias prod.', value: l.dias_em_producao },
                  { label: 'Custo total', value: fmtMoeda(l.custo_total) },
                  { label: 'Custo/kg', value: `${fmtMoeda(l.custo_por_kg)}/kg` },
                  { label: 'Preço mín.', value: `${fmtMoeda(l.preco_minimo_lucro)}/kg` },
                  { label: 'Dias p/ alvo', value: l.dias_para_peso_alvo > 0 ? `${l.dias_para_peso_alvo}d` : '✅ atingido' },
                ].map((m, i) => (
                  <div key={i} style={{ background: '#f8f9fa', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: '#6c757d', textTransform: 'uppercase', fontWeight: 600 }}>{m.label}</div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#212529', marginTop: 2 }}>{m.value}</div>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                {[
                  { label: 'Lotes analisados', value: analise.resumo.total_lotes },
                  { label: 'Prontos p/ venda', value: analise.resumo.prontos_venda, color: '#198754' },
                  { label: 'Aguardar', value: analise.resumo.aguardar, color: '#0d6efd' },
                  { label: 'Receita potencial', value: fmtMoeda(analise.resumo.receita_potencial), color: '#198754' },
                ].map((m, i) => (
                  <div key={i} style={{ padding: '10px 12px', background: '#fff', borderRadius: 8, border: '1px solid #c3e6cb' }}>
                    <div style={{ fontSize: 11, color: '#6c757d', textTransform: 'uppercase', fontWeight: 600 }}>{m.label}</div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: m.color || '#212529', marginTop: 4 }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
