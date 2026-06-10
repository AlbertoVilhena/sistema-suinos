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

const GMD_STATUS = {
  ok:         { label: 'Normal',      cls: 'badge-green',  icon: '✅' },
  alerta:     { label: 'Abaixo',      cls: 'badge-yellow', icon: '⚠️' },
  critico:    { label: 'Crítico',     cls: 'badge-red',    icon: '🔴' },
  sem_dados:  { label: 'Sem dados',   cls: 'badge-gray',   icon: '⚫' },
  aguardando: { label: 'Aguardando',  cls: 'badge-blue',   icon: '⏳' },
}

const FASE_COR = {
  maternidade: '#9c27b0',
  creche:      '#1976d2',
  crescimento: '#009688',
  terminacao:  '#f57c00',
}

export default function Relatorios() {
  const [relLotes, setRelLotes] = useState([])
  const [relFin, setRelFin] = useState(null)
  const [relGmd, setRelGmd] = useState(null)
  const [analise, setAnalise] = useState(null)
  const [analiseLoading, setAnaliseLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('lotes')
  const [expandedGmd, setExpandedGmd] = useState({})

  useEffect(() => {
    Promise.all([
      api.get('/api/relatorios/lotes'),
      api.get('/api/relatorios/financeiro')
    ]).then(([rl, rf]) => {
      setRelLotes(rl.data)
      setRelFin(rf.data)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'gmd' && !relGmd) {
      api.get('/api/relatorios/gmd').then(r => setRelGmd(r.data)).catch(console.error)
    }
  }, [tab])

  const carregarAnalise = () => {
    setAnaliseLoading(true)
    api.get('/api/analise/venda').then(r => setAnalise(r.data)).catch(() => setAnalise({ erro: 'Não foi possível gerar análise.' })).finally(() => setAnaliseLoading(false))
  }

  useEffect(() => { if (tab === 'ia') carregarAnalise() }, [tab])

  if (loading) return <Layout title="Relatórios"><div className="loading"><div className="spinner" />Carregando...</div></Layout>

  const despFin = relFin?.despesas_por_categoria || []
  // Adiciona custos operacionais como categorias extras para o gráfico ficar completo
  const despOp = relFin?.custos_operacionais ? [
    ...(relFin.custos_operacionais.custo_racao > 0 ? [{ categoria: '🌽 Ração', total: relFin.custos_operacionais.custo_racao }] : []),
    ...(relFin.custos_operacionais.custo_sanidade > 0 ? [{ categoria: '💉 Sanidade', total: relFin.custos_operacionais.custo_sanidade }] : []),
    ...((relFin.custos_operacionais.custo_aquisicao_total ?? relFin.custos_operacionais.custo_aquisicao_animais ?? 0) > 0 ? [{ categoria: '🐖 Aquisição', total: relFin.custos_operacionais.custo_aquisicao_total ?? relFin.custos_operacionais.custo_aquisicao_animais }] : []),
  ] : []
  const desp = [...despFin, ...despOp]
  const rec = relFin?.receitas_por_categoria || []
  const maxDesp = Math.max(...desp.map(d => d.total), 1)
  const maxRec = Math.max(...rec.map(r => r.total), 1)

  const handlePrint = () => {
    document.title = `Relatório GranjaApp - ${tab === 'lotes' ? 'Lotes' : tab === 'financeiro' ? 'Financeiro' : 'Análise IA'}`
    window.print()
  }

  const gerarPDFGMD = () => {
    if (!relGmd) return
    const win = window.open('', '_blank')
    if (!win) { alert('Pop-up bloqueado. Permita pop-ups para este site.'); return }

    const hoje = new Date().toLocaleDateString('pt-BR')
    const fmtD = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—'
    const fmtKg = (v) => v != null && v > 0 ? `${Number(v).toFixed(2)} kg` : '—'
    const fmtGmd = (v) => v != null ? `${Number(v).toFixed(3)} kg/d` : '—'

    const COR   = { ok: '#198754', alerta: '#856404', critico: '#dc3545', sem_dados: '#6c757d', aguardando: '#0d6efd' }
    const LABEL = { ok: '✅ Normal', alerta: '⚠️ Abaixo mín.', critico: '🔴 Crítico', sem_dados: '— Sem dados', aguardando: '⏳ Aguardando' }
    const FASE  = { maternidade: '#9c27b0', creche: '#1976d2', crescimento: '#009688', terminacao: '#f57c00' }

    // 10 columns: Lote | Fase | Dias fase | Peso Ref. | Peso Atual | GMD Fase | GMD Total | Mín. | % Ideal | Status
    const NCOLS = 10

    const linhasLotes = relGmd.lotes.map((l, i) => {
      const cor  = COR[l.status_gmd]  || '#6c757d'
      const fc   = FASE[l.fase?.toLowerCase()] || '#6c757d'
      const rowBg = l.status_gmd === 'critico' ? '#fff8f8'
                  : l.status_gmd === 'alerta'  ? '#fffcf0'
                  : (i % 2 === 0 ? '#fff' : '#f9fafb')

      const faseStr = l.fase_desde_entrada === false && l.data_inicio_fase
        ? `<span style="color:${fc};font-weight:700">${l.fase}</span><br><span style="font-size:10px;color:#6c757d">desde ${fmtD(l.data_inicio_fase)}</span>`
        : `<span style="color:${fc};font-weight:700">${l.fase}</span>`

      const diasStr = `<strong>${l.dias_na_fase ?? '—'}d</strong>`

      const gmdFaseStr = l.gmd_fase != null
        ? `<strong style="color:${cor};font-size:14px">${Number(l.gmd_fase).toFixed(3)}</strong><br><span style="font-size:10px;color:#6c757d">kg/dia</span>`
        : `<span style="color:#0d6efd;font-size:11px;font-weight:700">⏳ Aguard.<br>2ª pesagem</span>`

      const pct = l.pct_ideal != null ? `<strong style="color:${cor}">${l.pct_ideal}%</strong>` : '—'

      const refMins = relGmd.referencias[l.fase?.toLowerCase()]
      const minStr = refMins ? `${refMins.min}` : '—'

      const histRows = (l.historico_pesagens || []).map(p => {
        const ref = relGmd.referencias[l.fase?.toLowerCase()]
        const gOk = p.gmd_intervalo != null && ref ? p.gmd_intervalo >= ref.min : null
        const gCor = gOk === false ? '#dc3545' : gOk === true ? '#198754' : '#666'
        return `<tr style="background:#f5f7fa">
          <td style="padding:4px 10px 4px 28px;border-bottom:1px solid #eee;font-size:10px;color:#555">
            ${p.fase_atual ? '⚡' : '◦'} ${fmtD(p.data)}
          </td>
          <td colspan="2" style="padding:4px 10px;border-bottom:1px solid #eee;font-size:10px;color:#555"></td>
          <td style="padding:4px 10px;border-bottom:1px solid #eee;font-size:10px;color:#555;text-align:right"></td>
          <td style="padding:4px 10px;border-bottom:1px solid #eee;font-size:10px;font-weight:600;color:#212529;text-align:right">${Number(p.peso_medio).toFixed(2)} kg</td>
          <td style="padding:4px 10px;border-bottom:1px solid #eee;font-size:10px;color:${gCor};text-align:center;font-weight:600">
            ${p.gmd_intervalo != null ? `${p.gmd_intervalo.toFixed(3)} kg/d` : '—'}
            ${p.dias_intervalo ? `<span style="color:#888;font-weight:400"> (${p.dias_intervalo}d)</span>` : ''}
          </td>
          <td colspan="4" style="padding:4px 10px;border-bottom:1px solid #eee"></td>
        </tr>`
      }).join('')

      const infoRow = `
        <tr style="background:${rowBg}">
          <td colspan="${NCOLS}" style="padding:3px 10px 6px 14px;border-bottom:1px solid #e0e0e0;font-size:10px;color:#6c757d">
            Data de Entrada: <strong>${fmtD(l.data_entrada)}</strong>
            ${l.dias_na_fase !== l.dias_producao && l.dias_producao != null ? ` &nbsp;·&nbsp; Dias total: <strong>${l.dias_producao}d</strong>` : ''}
          </td>
        </tr>`

      return `
        <tr style="background:${rowBg}">
          <td style="padding:9px 10px 6px 10px;border-bottom:none;vertical-align:middle">
            <strong style="font-size:13px">${l.numero}</strong>
          </td>
          <td style="padding:9px 10px 6px 10px;border-bottom:none;vertical-align:middle">${faseStr}</td>
          <td style="padding:9px 10px 6px 10px;border-bottom:none;text-align:center;vertical-align:middle">${diasStr}</td>
          <td style="padding:9px 10px 6px 10px;border-bottom:none;text-align:right;vertical-align:middle;color:#495057">
            ${fmtKg(l.peso_ref_fase)}
          </td>
          <td style="padding:9px 10px 6px 10px;border-bottom:none;text-align:right;vertical-align:middle">
            <strong style="font-size:13px;color:#212529">${fmtKg(l.peso_atual)}</strong>
          </td>
          <td style="padding:9px 10px 6px 10px;border-bottom:none;text-align:center;vertical-align:middle">${gmdFaseStr}</td>
          <td style="padding:9px 10px 6px 10px;border-bottom:none;text-align:center;vertical-align:middle;color:#6c757d;font-size:11px">${fmtGmd(l.gmd_total)}</td>
          <td style="padding:9px 10px 6px 10px;border-bottom:none;text-align:center;vertical-align:middle;color:#6c757d;font-size:11px">${minStr}</td>
          <td style="padding:9px 10px 6px 10px;border-bottom:none;text-align:center;vertical-align:middle">${pct}</td>
          <td style="padding:9px 10px 6px 10px;border-bottom:none;text-align:center;vertical-align:middle;font-weight:700;font-size:11px;color:${cor}">${LABEL[l.status_gmd] || '—'}</td>
        </tr>
        ${infoRow}
        ${histRows}`
    }).join('')

    const alertasHTML = relGmd.lotes
      .filter(l => l.status_gmd === 'critico' || l.status_gmd === 'alerta')
      .map(l => `
        <div style="display:flex;gap:10px;align-items:center;padding:8px 14px;margin-bottom:6px;background:${l.status_gmd === 'critico' ? '#fff5f5' : '#fffbf0'};border-left:4px solid ${l.status_gmd === 'critico' ? '#dc3545' : '#f0ad4e'};border-radius:0 6px 6px 0;font-size:12px">
          <span style="font-size:16px">${l.status_gmd === 'critico' ? '🔴' : '⚠️'}</span>
          <div>
            <strong>${l.numero}</strong> <span style="color:#6c757d">— ${l.fase}</span>
            ${l.alerta ? `<span style="color:${l.status_gmd === 'critico' ? '#dc3545' : '#856404'}"> · ${l.alerta}</span>` : ''}
          </div>
        </div>`).join('')

    const refsHTML = Object.entries(relGmd.referencias).map(([fase, ref]) => {
      const fc = FASE[fase] || '#6c757d'
      return `<span style="display:inline-block;font-size:11px;padding:3px 10px;border-radius:12px;background:${fc}18;border:1px solid ${fc}55;color:${fc};font-weight:600;margin-right:6px;margin-bottom:4px">${ref.label}: mín <strong>${ref.min}</strong> · ideal <strong>${ref.ideal}</strong> kg/dia</span>`
    }).join('')

    const totalLotes  = relGmd.lotes.length
    const nOk         = relGmd.resumo?.ok ?? relGmd.lotes.filter(l => l.status_gmd === 'ok').length
    const nAlerta     = relGmd.resumo?.alertas_atencao ?? relGmd.lotes.filter(l => l.status_gmd === 'alerta').length
    const nCritico    = relGmd.resumo?.alertas_criticos ?? relGmd.lotes.filter(l => l.status_gmd === 'critico').length
    const nAguardando = relGmd.lotes.filter(l => l.status_gmd === 'aguardando').length

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório GMD — GranjaApp</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#212529;background:#fff;padding:20px 24px}
    table{border-collapse:collapse;width:100%}
    th{font-weight:700;white-space:nowrap}
    td,th{vertical-align:middle}
    @media print{
      body{padding:0}
      button{display:none!important}
      @page{margin:10mm 12mm 14mm;size:A4 landscape}
    }
  </style>
</head>
<body>

  <!-- Cabeçalho -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:10px;border-bottom:3px solid #1b5e20">
    <div>
      <div style="font-size:18px;font-weight:700;color:#1b5e20;letter-spacing:-.3px">GMD — Ganho Médio Diário · GranjaApp</div>
      <div style="font-size:11px;color:#6c757d;margin-top:2px">Gerado em: <strong>${hoje}</strong> &nbsp;·&nbsp; ${totalLotes} lote${totalLotes !== 1 ? 's' : ''} analisado${totalLotes !== 1 ? 's' : ''}</div>
    </div>
    <button onclick="window.print()" style="padding:7px 16px;background:#1b5e20;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px;font-weight:600">🖨 Imprimir / Salvar PDF</button>
  </div>

  <!-- Cards resumo -->
  <div style="display:flex;gap:10px;margin-bottom:16px">
    ${[
      { v: totalLotes,   l: 'Total de Lotes',  c: '#0d6efd' },
      { v: nOk,          l: 'GMD Normal',      c: '#198754' },
      { v: nAguardando,  l: 'Aguardando',      c: '#0d6efd' },
      { v: nAlerta,      l: 'Abaixo Mín.',     c: '#856404' },
      { v: nCritico,     l: 'GMD Crítico',     c: '#dc3545' },
    ].map(s => `<div style="flex:1;border:1px solid #dee2e6;border-radius:6px;padding:10px 12px;border-top:3px solid ${s.c};text-align:center">
      <div style="font-size:28px;font-weight:700;color:${s.c};line-height:1">${s.v}</div>
      <div style="font-size:9px;color:#6c757d;text-transform:uppercase;letter-spacing:.6px;margin-top:4px">${s.l}</div>
    </div>`).join('')}
  </div>

  <!-- Alertas -->
  ${alertasHTML ? `<div style="margin-bottom:14px">${alertasHTML}</div>` : ''}

  <!-- Benchmarks por fase -->
  <div style="margin-bottom:10px;padding:8px 12px;background:#f8f9fa;border-radius:6px;border:1px solid #e9ecef">
    <span style="font-size:10px;font-weight:700;color:#495057;text-transform:uppercase;letter-spacing:.5px;margin-right:8px">Referências:</span>
    ${refsHTML}
  </div>

  <!-- Tabela principal -->
  <table>
    <thead>
      <tr style="background:#1b5e20;color:#fff;font-size:11px">
        <th style="padding:8px 10px;text-align:left;width:9%">LOTE</th>
        <th style="padding:8px 10px;text-align:left;width:11%">FASE</th>
        <th style="padding:8px 10px;text-align:center;width:8%">DIAS<br>FASE</th>
        <th style="padding:8px 10px;text-align:right;width:8%">PESO<br>REF.</th>
        <th style="padding:8px 10px;text-align:right;width:8%">PESO<br>ATUAL</th>
        <th style="padding:8px 10px;text-align:center;width:12%">GMD FASE ⚡</th>
        <th style="padding:8px 10px;text-align:center;width:10%">GMD TOTAL</th>
        <th style="padding:8px 10px;text-align:center;width:7%">MÍN.</th>
        <th style="padding:8px 10px;text-align:center;width:7%">% IDEAL</th>
        <th style="padding:8px 10px;text-align:center;width:11%">STATUS</th>
      </tr>
    </thead>
    <tbody>
      ${relGmd.lotes.length === 0
        ? `<tr><td colspan="${NCOLS}" style="padding:30px;text-align:center;color:#6c757d">Nenhum lote com dados de pesagem</td></tr>`
        : linhasLotes}
    </tbody>
  </table>

  <!-- Lotes sem dados -->
  ${relGmd.sem_dados?.length > 0 ? `
    <div style="margin-top:16px;padding:10px 14px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px">
      <div style="font-size:11px;font-weight:700;color:#6c757d;margin-bottom:6px">⚫ LOTES SEM DADOS DE GMD</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${relGmd.sem_dados.map(l => `<span style="padding:3px 10px;background:#fff;border:1px solid #dee2e6;border-radius:10px;font-size:11px"><strong>${l.numero}</strong> · ${l.fase || '—'} · <span style="color:#6c757d">${l.motivo || 'sem pesagem'}</span></span>`).join('')}
      </div>
    </div>` : ''}

  <!-- Assinaturas -->
  <div style="margin-top:32px;display:flex;gap:24px;padding-top:4px">
    ${['Responsável Técnico / Veterinário', 'Gerente / Responsável', 'Data de Conferência'].map(label => `
      <div style="flex:1">
        <div style="border-top:1px solid #adb5bd;margin-bottom:6px"></div>
        <div style="font-size:10px;color:#6c757d;text-align:center">${label}</div>
      </div>`).join('')}
  </div>

</body>
</html>`

    win.document.open()
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 400)
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
        <div className={`tab ${tab === 'gmd' ? 'active' : ''}`} onClick={() => setTab('gmd')}>📊 GMD</div>
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
              <table style={{ fontSize: 12 }}>
                <thead><tr style={{ whiteSpace: 'nowrap' }}>
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
            <div className="rel-fin-saldo-label">Saldo da Operação</div>
            <div className="rel-fin-saldo-value" style={{ color: relFin.saldo >= 0 ? '#198754' : '#dc3545' }}>
              {relFin.saldo >= 0 ? '✅' : '⚠️'} {fmtMoeda(relFin.saldo)}
            </div>
            <div style={{ fontSize: 12, color: '#6c757d', marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              <span>📈 Receitas: <strong style={{ color: '#198754' }}>{fmtMoeda(relFin.total_receitas)}</strong></span>
              <span>📉 Despesas: <strong style={{ color: '#dc3545' }}>{fmtMoeda(relFin.total_custos ?? (relFin.total_despesas + relFin.total_operacional))}</strong></span>
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
              <div>
                <div className="stat-value" style={{ fontSize: 17 }}>{fmtMoeda(relFin.total_custos ?? (relFin.total_despesas + relFin.total_operacional))}</div>
                <div className="stat-label">Total Despesas</div>
                <div style={{ fontSize: 11, color: '#6c757d', marginTop: 2 }}>
                  Financeiro + Operacional
                </div>
              </div>
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
                  { label: '🌽 Ração', value: relFin.custos_operacionais.custo_racao },
                  { label: '💉 Sanidade', value: relFin.custos_operacionais.custo_sanidade },
                  { label: '🐷 Aquisição Lotes', value: relFin.custos_operacionais.custo_aquisicao_animais },
                  { label: '🐖 Aquisição Plantel', value: relFin.custos_operacionais.custo_aquisicao_plantel ?? 0 },
                  { label: '⚙️ Total Operacional', value: relFin.custos_operacionais.total_operacional, bold: true },
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

      {/* ===== ABA GMD ===== */}
      {tab === 'gmd' && (
        <div>
          {relGmd && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }} className="no-print">
              <button className="btn btn-outline" onClick={gerarPDFGMD}>📄 Gerar PDF</button>
            </div>
          )}
          {!relGmd ? (
            <div className="loading"><div className="spinner" />Carregando GMD...</div>
          ) : (
            <>
              {/* Cards de resumo */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
                {[
                  { icon: '📊', label: 'Lotes com dados', value: relGmd.resumo.com_dados, cls: 'blue' },
                  { icon: '✅', label: 'GMD Normal', value: relGmd.resumo.ok, cls: 'green' },
                  { icon: '⚠️', label: 'Abaixo mín.', value: relGmd.resumo.alertas_atencao, cls: 'yellow' },
                  { icon: '🔴', label: 'GMD Crítico', value: relGmd.resumo.alertas_criticos, cls: 'red' },
                ].map((s, i) => (
                  <div className="stat-card" key={i}>
                    <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
                    <div><div className="stat-value">{s.value}</div><div className="stat-label">{s.label}</div></div>
                  </div>
                ))}
              </div>

              {/* Alertas críticos em destaque */}
              {relGmd.lotes.filter(l => l.status_gmd === 'critico' || l.status_gmd === 'alerta').map(l => (
                <div key={l.lote_id} style={{
                  padding: '10px 14px', borderRadius: 8, marginBottom: 8,
                  background: l.status_gmd === 'critico' ? '#fff5f5' : '#fffbf0',
                  border: `1px solid ${l.status_gmd === 'critico' ? '#f5c2c7' : '#ffe69c'}`,
                  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
                }}>
                  <span style={{ fontSize: 18 }}>{l.status_gmd === 'critico' ? '🔴' : '⚠️'}</span>
                  <div style={{ flex: 1 }}>
                    <strong>Lote {l.numero}</strong>
                    <span className="badge badge-gray" style={{ marginLeft: 6, background: FASE_COR[l.fase?.toLowerCase()] + '22', color: FASE_COR[l.fase?.toLowerCase()] || '#666', border: `1px solid ${FASE_COR[l.fase?.toLowerCase()] || '#ccc'}44` }}>{l.fase}</span>
                    <span style={{ marginLeft: 8, fontSize: 13, color: '#495057' }}>{l.alerta}</span>
                  </div>
                  <strong style={{ color: l.status_gmd === 'critico' ? '#dc3545' : '#856404', fontSize: 15 }}>
                    {l.gmd?.toFixed(3)} kg/dia
                  </strong>
                </div>
              ))}

              {/* Tabela comparativa */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-title">📋 Tabela Comparativa de GMD</div>

                {/* Referências */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0 14px' }}>
                  {Object.entries(relGmd.referencias).map(([fase, ref]) => (
                    <div key={fase} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: (FASE_COR[fase] || '#6c757d') + '18', border: `1px solid ${(FASE_COR[fase] || '#6c757d')}44`, color: FASE_COR[fase] || '#6c757d', fontWeight: 600 }}>
                      {ref.label}: mín {ref.min} · ideal {ref.ideal} kg/dia
                    </div>
                  ))}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ fontSize: 12, width: '100%' }}>
                    <thead>
                      <tr style={{ whiteSpace: 'nowrap' }}>
                        <th>Lote</th>
                        <th>Fase</th>
                        <th>Status</th>
                        <th>Dias na fase</th>
                        <th>Peso ref. fase</th>
                        <th>Peso atual</th>
                        <th>GMD fase ⚡</th>
                        <th>GMD total</th>
                        <th>Mín. esperado</th>
                        <th>Ideal</th>
                        <th>% do ideal</th>
                        <th>Pesagens</th>
                        <th>Status GMD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relGmd.lotes.length === 0 ? (
                        <tr><td colSpan={13} className="table-empty">Nenhum lote com dados de pesagem</td></tr>
                      ) : relGmd.lotes.map(l => {
                        const st = GMD_STATUS[l.status_gmd] || GMD_STATUS.sem_dados
                        const pctCor = l.pct_ideal >= 100 ? '#198754' : l.pct_ideal >= 70 ? '#856404' : '#dc3545'
                        const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
                        return (
                          <tr key={l.lote_id} style={{ background: l.status_gmd === 'critico' ? '#fff5f5' : l.status_gmd === 'alerta' ? '#fffbf0' : 'inherit' }}>
                            <td>
                              <strong>{l.numero}</strong>
                              <div style={{ fontSize: 10, color: '#6c757d' }}>entrada: {fmtDate(l.data_entrada)}</div>
                            </td>
                            <td>
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: (FASE_COR[l.fase?.toLowerCase()] || '#6c757d') + '20', color: FASE_COR[l.fase?.toLowerCase()] || '#6c757d', fontWeight: 600 }}>
                                {l.fase}
                              </span>
                              {!l.fase_desde_entrada && l.data_inicio_fase && (
                                <div style={{ fontSize: 10, color: '#6c757d', marginTop: 2 }}>desde {fmtDate(l.data_inicio_fase)}</div>
                              )}
                            </td>
                            <td><span className={`badge ${l.status === 'ativo' ? 'badge-green' : l.status === 'vendido' ? 'badge-blue' : 'badge-gray'}`}>{l.status}</span></td>
                            <td>
                              <span style={{ fontWeight: 600 }}>{l.dias_na_fase}d</span>
                              {l.dias_na_fase !== l.dias_producao && (
                                <div style={{ fontSize: 10, color: '#6c757d' }}>{l.dias_producao}d total</div>
                              )}
                            </td>
                            <td style={{ color: '#6c757d' }}>{l.peso_ref_fase > 0 ? `${l.peso_ref_fase} kg` : '-'}</td>
                            <td style={{ fontWeight: 600 }}>{l.peso_atual} kg</td>
                            <td style={{ fontWeight: 700, fontSize: 13, color: l.status_gmd === 'critico' ? '#dc3545' : l.status_gmd === 'alerta' ? '#856404' : '#198754' }}>
                              {l.gmd_fase != null ? `${l.gmd_fase.toFixed(3)} kg/d` : '—'}
                              {l.n_pesagens_fase != null && l.n_pesagens_fase < 2 && l.gmd_fase != null && (
                                <div style={{ fontSize: 9, color: '#6c757d', fontWeight: 400 }}>1 pesagem</div>
                              )}
                            </td>
                            <td style={{ color: '#6c757d', fontSize: 11 }}>
                              {l.gmd_total != null ? `${l.gmd_total.toFixed(3)} kg/d` : '—'}
                            </td>
                            <td style={{ color: '#6c757d' }}>{l.ref_min != null ? `${l.ref_min} kg/d` : '-'}</td>
                            <td style={{ color: '#6c757d' }}>{l.ref_ideal != null ? `${l.ref_ideal} kg/d` : '-'}</td>
                            <td>
                              {l.pct_ideal != null ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <div style={{ flex: 1, height: 6, background: '#e9ecef', borderRadius: 3, minWidth: 40 }}>
                                    <div style={{ height: '100%', borderRadius: 3, background: pctCor, width: `${Math.min(l.pct_ideal, 100)}%` }} />
                                  </div>
                                  <span style={{ fontWeight: 600, color: pctCor, fontSize: 11 }}>{l.pct_ideal}%</span>
                                </div>
                              ) : '-'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {l.n_pesagens > 0 ? (
                                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#0d6efd' }}
                                  onClick={() => setExpandedGmd(e => ({ ...e, [l.lote_id]: !e[l.lote_id] }))}>
                                  {l.n_pesagens} ⚖️ {expandedGmd[l.lote_id] ? '▲' : '▼'}
                                </button>
                              ) : <span style={{ color: '#adb5bd' }}>—</span>}
                            </td>
                            <td><span className={`badge ${st.cls}`}>{st.icon} {st.label}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Histórico expandido de pesagens */}
                {relGmd.lotes.filter(l => expandedGmd[l.lote_id] && l.historico_pesagens?.length > 0).map(l => (
                  <div key={`hist-${l.lote_id}`} style={{ marginTop: 12, padding: '12px 14px', background: '#f8f9fa', borderRadius: 8, border: '1px solid #dee2e6' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#495057' }}>
                      📋 Histórico de pesagens — Lote {l.numero}
                      {!l.fase_desde_entrada && <span style={{ fontSize: 11, color: '#6c757d', fontWeight: 400, marginLeft: 8 }}>⚡ = pesagens usadas no GMD da fase atual</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {l.historico_pesagens.map((p, i) => {
                        const ref = relGmd.referencias[l.fase?.toLowerCase()]
                        const gmdOk = p.gmd_intervalo != null && ref ? p.gmd_intervalo >= ref.min : null
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, padding: '6px 10px', background: p.fase_atual ? '#f0fff4' : '#fff', borderRadius: 6, border: `1px solid ${p.fase_atual ? '#a3cfbb' : '#e9ecef'}` }}>
                            {!l.fase_desde_entrada && <span title={p.fase_atual ? 'Fase atual' : 'Fase anterior'} style={{ fontSize: 14 }}>{p.fase_atual ? '⚡' : '◦'}</span>}
                            <span style={{ color: '#6c757d', minWidth: 80 }}>{new Date(p.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                            <span style={{ fontWeight: 600, color: '#198754' }}>{p.peso_medio} kg</span>
                            {p.total_animais && <span style={{ color: '#6c757d' }}>{p.total_animais} animais</span>}
                            {p.gmd_intervalo != null && (
                              <span style={{ fontWeight: 700, color: gmdOk === false ? '#dc3545' : gmdOk === true ? '#198754' : '#495057' }}>
                                GMD: {p.gmd_intervalo.toFixed(3)} kg/dia
                                {p.dias_intervalo && <span style={{ fontWeight: 400, color: '#6c757d' }}> ({p.dias_intervalo}d)</span>}
                                {gmdOk === false && <span style={{ color: '#dc3545', marginLeft: 4 }}>⚠️</span>}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Lotes sem dados */}
              {relGmd.sem_dados?.length > 0 && (
                <div className="card" style={{ marginTop: 8 }}>
                  <div className="card-title" style={{ color: '#6c757d' }}>⚫ Lotes sem dados de GMD</div>
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {relGmd.sem_dados.map(l => (
                      <div key={l.lote_id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', background: '#f8f9fa', borderRadius: 6, fontSize: 13 }}>
                        <strong>Lote {l.numero}</strong>
                        <span className="badge badge-gray">{l.fase}</span>
                        <span style={{ color: '#6c757d' }}>{l.motivo}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'Animais', value: l.qtd_animais },
                  { label: 'Peso médio', value: `${fmtNum(l.peso_medio_atual)} kg` },
                  { label: 'Ganho/dia', value: `${fmtNum(l.ganho_diario_medio, 3)} kg` },
                  { label: 'Dias prod.', value: l.dias_em_producao },
                  { label: 'Peso total est.', value: `${fmtNum(l.peso_total_kg, 1)} kg` },
                  { label: 'Custo/kg', value: `${fmtMoeda(l.custo_por_kg)}/kg` },
                  { label: 'Custo total', value: fmtMoeda(l.custo_total) },
                  { label: 'Dias p/ alvo', value: l.dias_para_peso_alvo > 0 ? `~${l.dias_para_peso_alvo}d` : l.dias_para_peso_alvo === 0 ? '✅ atingido' : '—' },
                ].map((m, i) => (
                  <div key={i} style={{ background: '#f8f9fa', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: '#6c757d', textTransform: 'uppercase', fontWeight: 600 }}>{m.label}</div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#212529', marginTop: 2 }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Seção: Valor Mínimo de Venda */}
              <div style={{ background: '#f0f7ff', border: '1px solid #b6d4fe', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0d6efd', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  💰 Valor Mínimo de Venda — baseado no peso atual do lote
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                  {[
                    { label: 'Equilíbrio (0%)', sublabel: 'Só cobre os custos', price: l.preco_breakeven, receita: l.receita_breakeven, lucro: 0, color: '#6c757d', bg: '#f8f9fa' },
                    { label: 'Mínimo (15%)', sublabel: 'Margem mínima recomendada', price: l.preco_minimo_lucro, receita: l.receita_minima, lucro: l.lucro_minimo, color: '#fd7e14', bg: '#fff8f0' },
                    { label: 'Recomendado (25%)', sublabel: 'Meta de rentabilidade', price: l.preco_recomendado, receita: l.receita_recomendada, lucro: l.lucro_recomendado, color: '#198754', bg: '#f0fff4' },
                  ].map((p, i) => (
                    <div key={i} style={{ background: p.bg, border: `1px solid ${p.color}33`, borderRadius: 8, padding: '10px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: p.color, textTransform: 'uppercase', marginBottom: 4 }}>{p.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: p.color }}>{fmtMoeda(p.price)}<span style={{ fontSize: 11, fontWeight: 400 }}>/kg</span></div>
                      <div style={{ fontSize: 11, color: '#495057', marginTop: 6, borderTop: `1px solid ${p.color}22`, paddingTop: 6 }}>
                        <div>Receita: <strong>{fmtMoeda(p.receita)}</strong></div>
                        {i > 0 && <div style={{ color: '#198754', fontWeight: 600 }}>Lucro: +{fmtMoeda(p.lucro)}</div>}
                      </div>
                      <div style={{ fontSize: 10, color: '#6c757d', marginTop: 4 }}>{p.sublabel}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#6c757d', fontStyle: 'italic' }}>
                  * Cálculo baseado em {fmtNum(l.peso_total_kg, 1)} kg estimados ({l.qtd_animais} animais × {fmtNum(l.peso_medio_atual)} kg/animal). Custos considerados: ração, sanidade e aquisição.
                </div>
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
