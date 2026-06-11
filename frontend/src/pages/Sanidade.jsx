import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../components/ConfirmDialog'

const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
const fmtMoeda = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const today = new Date().toISOString().split('T')[0]

const faseBadge = { maternidade: 'badge-purple', creche: 'badge-blue', crescimento: 'badge-teal', terminacao: 'badge-yellow' }
const plantelGrupoLabel = { matrizes: '🐷 Matrizes', reprodutores: '🐗 Reprodutores', geral: '🐖 Plantel Geral' }

const emptyVacForm = {
  destino_tipo: 'lote', lote_id: '', animal_id: '', plantel_brinco: '',
  vacina: '', data: today, dose: '', marca_fabricante: '', lote_vacina: '',
  responsavel: '', custo: '', observacoes: ''
}
const emptyPlanoForm = { nome: '', descricao: '', tipo_destino: 'lote', fase_lote: '', ativo: true }

export default function Sanidade() {
  const { canEdit, canWrite } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [tab, setTab] = useState('agenda')

  // Vacinações
  const [vacinacoes, setVacinacoes] = useState([])
  const [lotes, setLotes] = useState([])
  const [plantel, setPlantel] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDestino, setFilterDestino] = useState('')
  const [showVacModal, setShowVacModal] = useState(false)
  const [editingVac, setEditingVac] = useState(null)
  const [vacForm, setVacForm] = useState(emptyVacForm)
  const [vacError, setVacError] = useState('')
  const [savingVac, setSavingVac] = useState(false)

  // Relatório
  const [relatorio, setRelatorio] = useState(null)
  const [loadingRel, setLoadingRel] = useState(false)

  // Planos
  const [planos, setPlanos] = useState([])
  const [showPlanoModal, setShowPlanoModal] = useState(false)
  const [editingPlano, setEditingPlano] = useState(null)
  const [planoForm, setPlanoForm] = useState(emptyPlanoForm)
  const [planoItens, setPlanoItens] = useState([])
  const [planoError, setPlanoError] = useState('')
  const [savingPlano, setSavingPlano] = useState(false)

  // Aplicações
  const [aplicacoes, setAplicacoes] = useState([])
  const [showAplicarModal, setShowAplicarModal] = useState(false)
  const [aplicarForm, setAplicarForm] = useState({ plano_id: '', destino_tipo: 'lote', lote_id: '', plantel_grupo: '', data_inicio: today })
  const [savingAplicar, setSavingAplicar] = useState(false)
  const [aplicarError, setAplicarError] = useState('')

  // Agenda
  const [agenda, setAgenda] = useState([])

  const load = () => {
    Promise.all([
      api.get('/api/vacinacoes'),
      api.get('/api/lotes'),
      api.get('/api/plantel'),
      api.get('/api/planos-vacinacao'),
      api.get('/api/aplicacoes-plano'),
      api.get('/api/agenda-vacinacao'),
    ]).then(([rv, rl, rp, rpl, rap, rag]) => {
      setVacinacoes(rv.data)
      setLotes(rl.data)
      setPlantel(rp.data.filter(p => p.status === 'ativo'))
      setPlanos(rpl.data)
      setAplicacoes(rap.data)
      setAgenda(rag.data)
    }).finally(() => setLoading(false))
  }

  const loadRelatorio = () => {
    setLoadingRel(true)
    api.get('/api/relatorio-vacinacao')
      .then(r => setRelatorio(r.data))
      .finally(() => setLoadingRel(false))
  }

  useEffect(() => { if (tab === 'relatorio' && !relatorio) loadRelatorio() }, [tab])

  useEffect(() => { load() }, [])  // eslint-disable-line

  // ---- PDF Agenda ----
  const gerarPDFAgenda = async () => {
    // Abre a janela ANTES do await — browsers bloqueiam window.open() após chamadas assíncronas
    const win = window.open('', '_blank')
    if (!win) {
      toast.warning('Pop-up bloqueado pelo navegador. Permita pop-ups para este site e tente novamente.')
      return
    }
    win.document.write('<html><body style="font-family:Arial;padding:40px;text-align:center;color:#555"><p style="font-size:18px">⏳ Gerando agenda de vacinação...</p></body></html>')

    try {
      const res = await api.get('/api/agenda-vacinacao?completa=true')
      const agendaCompleta = res.data

      const plantelGrupoLabelMap = { matrizes: 'Matrizes', reprodutores: 'Reprodutores', geral: 'Plantel Geral' }

      const hoje = new Date().toLocaleDateString('pt-BR')
      const nAtrasadas = agendaCompleta.filter(a => a.status === 'atrasada').length
      const nProximas  = agendaCompleta.filter(a => a.status === 'proxima').length
      const nFuturas   = agendaCompleta.filter(a => a.status === 'futura').length

      const fmtDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')

      const linhasHTML = (itens, cor) => itens.map((a, i) => {
        const destino = a.plantel_grupo
          ? plantelGrupoLabelMap[a.plantel_grupo] || a.plantel_grupo
          : (a.lote_numero ? `Lote ${a.lote_numero}` : '-')
        const diasAbs = Math.abs(a.dias_diff)
        const situacao = a.dias_diff < 0
          ? `<span style="color:#c0392b;font-weight:700">${diasAbs} dia${diasAbs > 1 ? 's' : ''} em atraso</span>`
          : a.dias_diff === 0
            ? `<span style="color:#d68910;font-weight:700">Hoje</span>`
            : `<span style="color:#1a5276">Em ${a.dias_diff} dia${a.dias_diff > 1 ? 's' : ''}</span>`
        return `<tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'}">
          <td style="padding:9px 10px;border-bottom:1px solid #eee;white-space:nowrap">${fmtDate(a.data_prevista)}</td>
          <td style="padding:9px 10px;border-bottom:1px solid #eee;font-weight:600">${a.vacina}</td>
          <td style="padding:9px 10px;border-bottom:1px solid #eee;white-space:nowrap">${a.dose || '-'}</td>
          <td style="padding:9px 10px;border-bottom:1px solid #eee">${destino}</td>
          <td style="padding:9px 10px;border-bottom:1px solid #eee;color:#555">${a.plano_nome}</td>
          <td style="padding:9px 10px;border-bottom:1px solid #eee">${situacao}</td>
          <td style="padding:9px 10px;border-bottom:1px solid #eee;text-align:center">
            <span style="display:inline-block;width:18px;height:18px;border:2px solid #aaa;border-radius:3px"></span>
          </td>
        </tr>`
      }).join('')

      const secaoHTML = (status, titulo, corFundo, corBorda, corTexto) => {
        const itens = agendaCompleta.filter(a => a.status === status)
        if (itens.length === 0) return ''
        return `
        <tr>
          <td colspan="7" style="padding:14px 12px 8px 12px;background:${corFundo};border-left:5px solid ${corBorda};border-top:12px solid #fff">
            <span style="font-weight:700;font-size:13px;color:${corTexto}">${titulo}</span>
            <span style="margin-left:8px;background:${corBorda};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">${itens.length}</span>
          </td>
        </tr>
        ${linhasHTML(itens, corBorda)}`
      }

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Agenda de Vacinação — GranjaApp ${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size:12px; color:#222; padding:28px 32px; }
    @media print {
      body { padding:0; }
      button { display:none !important; }
      @page { margin:15mm 15mm 20mm; size:A4; }
    }
  </style>
</head>
<body>

  <!-- CABEÇALHO -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:3px solid #1b5e20">
    <div>
      <div style="font-size:22px;font-weight:700;color:#1b5e20;margin-bottom:3px">Agenda de Vacinacao — GranjaApp</div>
      <div style="font-size:11px;color:#666">Gerado em: <strong>${hoje}</strong></div>
    </div>
    <button onclick="window.print()" style="padding:9px 20px;background:#1b5e20;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">
      Imprimir / Salvar PDF
    </button>
  </div>

  <!-- RESUMO -->
  <div style="display:flex;gap:14px;margin-bottom:24px">
    <div style="flex:1;border:1px solid #e0e0e0;border-radius:8px;padding:12px 16px;border-top:4px solid #e74c3c">
      <div style="font-size:28px;font-weight:700;color:#c0392b">${nAtrasadas}</div>
      <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-top:2px">Atrasadas</div>
    </div>
    <div style="flex:1;border:1px solid #e0e0e0;border-radius:8px;padding:12px 16px;border-top:4px solid #f39c12">
      <div style="font-size:28px;font-weight:700;color:#d68910">${nProximas}</div>
      <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-top:2px">Esta semana</div>
    </div>
    <div style="flex:1;border:1px solid #e0e0e0;border-radius:8px;padding:12px 16px;border-top:4px solid #2980b9">
      <div style="font-size:28px;font-weight:700;color:#1a5276">${nFuturas}</div>
      <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-top:2px">Programadas</div>
    </div>
    <div style="flex:1;border:1px solid #e0e0e0;border-radius:8px;padding:12px 16px;border-top:4px solid #1b5e20">
      <div style="font-size:28px;font-weight:700;color:#1b5e20">${agendaCompleta.length}</div>
      <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-top:2px">Total</div>
    </div>
  </div>

  ${agendaCompleta.length === 0
    ? `<div style="text-align:center;padding:60px;color:#888;border:2px dashed #ddd;border-radius:8px">
        Nenhuma vacinacao programada no momento.
       </div>`
    : `
  <!-- TABELA -->
  <table style="width:100%;border-collapse:collapse">
    <thead>
      <tr style="background:#1b5e20;color:#fff">
        <th style="padding:10px 10px;font-size:11px;font-weight:700;text-align:left;width:10%">Data</th>
        <th style="padding:10px 10px;font-size:11px;font-weight:700;text-align:left;width:24%">Vacina / Medicamento</th>
        <th style="padding:10px 10px;font-size:11px;font-weight:700;text-align:left;width:8%">Dose</th>
        <th style="padding:10px 10px;font-size:11px;font-weight:700;text-align:left;width:16%">Destino</th>
        <th style="padding:10px 10px;font-size:11px;font-weight:700;text-align:left;width:22%">Plano Vacinacional</th>
        <th style="padding:10px 10px;font-size:11px;font-weight:700;text-align:left;width:14%">Situacao</th>
        <th style="padding:10px 10px;font-size:11px;font-weight:700;text-align:center;width:6%">Feita</th>
      </tr>
    </thead>
    <tbody>
      ${secaoHTML('atrasada', 'ATRASADAS', '#fff5f5', '#c0392b', '#c0392b')}
      ${secaoHTML('proxima',  'ESTA SEMANA', '#fffbf0', '#f39c12', '#d68910')}
      ${secaoHTML('futura',   'PROGRAMADAS', '#f0f6ff', '#2980b9', '#1a5276')}
    </tbody>
  </table>

  <!-- ASSINATURAS -->
  <div style="margin-top:44px;display:flex;gap:28px">
    <div style="flex:1">
      <div style="border-top:1px solid #555;margin-bottom:6px"></div>
      <div style="font-size:11px;color:#555">Responsavel tecnico / Veterinario</div>
    </div>
    <div style="flex:1">
      <div style="border-top:1px solid #555;margin-bottom:6px"></div>
      <div style="font-size:11px;color:#555">Responsavel pela aplicacao</div>
    </div>
    <div style="flex:1">
      <div style="border-top:1px solid #555;margin-bottom:6px"></div>
      <div style="font-size:11px;color:#555">Data de conferencia</div>
    </div>
  </div>
  `}

</body>
</html>`

      win.document.open()
      win.document.write(html)
      win.document.close()
      setTimeout(() => win.print(), 600)
    } catch (e) {
      win.close()
      toast.error('Erro ao gerar PDF da agenda: ' + (e.response?.data?.error || e.message || 'Tente novamente'))
    }
  }

  // ---- PDF Relatório ----
  const gerarPDFRelatorio = () => {
    if (!relatorio) { toast.error('Carregue o relatório antes de gerar o PDF'); return }
    const win = window.open('', '_blank')
    if (!win) { toast.warning('Pop-up bloqueado pelo navegador. Permita pop-ups para este site e tente novamente.'); return }

    const hoje = new Date().toLocaleDateString('pt-BR')
    const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
    const fmtR = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

    const secaoAtrasadas = relatorio.pendentes_atrasadas.length === 0 ? '' : `
      <h3 style="font-size:13px;font-weight:700;color:#c0392b;margin:24px 0 8px">🔴 Vacinações Atrasadas (${relatorio.pendentes_atrasadas.length})</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
        <thead><tr style="background:#c0392b;color:#fff">
          <th style="padding:8px 10px;text-align:left;font-size:11px">Vacina</th>
          <th style="padding:8px 10px;text-align:left;font-size:11px">Destino</th>
          <th style="padding:8px 10px;text-align:left;font-size:11px">Plano</th>
          <th style="padding:8px 10px;text-align:left;font-size:11px">Data Prevista</th>
          <th style="padding:8px 10px;text-align:center;font-size:11px">Atraso</th>
        </tr></thead>
        <tbody>
          ${relatorio.pendentes_atrasadas.map((p, i) => `
            <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'}">
              <td style="padding:8px 10px;border-bottom:1px solid #eee;font-weight:600">${p.vacina}${p.dose ? ` <span style="color:#666;font-weight:400">· ${p.dose}</span>` : ''}</td>
              <td style="padding:8px 10px;border-bottom:1px solid #eee">${p.plantel_grupo ? p.plantel_grupo : (p.lote_numero || '-')}</td>
              <td style="padding:8px 10px;border-bottom:1px solid #eee">${p.plano_nome}</td>
              <td style="padding:8px 10px;border-bottom:1px solid #eee">${fmtDate(p.data_prevista)}</td>
              <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center;color:#c0392b;font-weight:700">${p.dias_atraso} dia(s)</td>
            </tr>`).join('')}
        </tbody>
      </table>`

    const secaoVacinas = `
      <h3 style="font-size:13px;font-weight:700;margin:24px 0 8px">💉 Resumo por Vacina</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
        <thead><tr style="background:#1b5e20;color:#fff">
          <th style="padding:8px 10px;text-align:left;font-size:11px">Vacina / Medicamento</th>
          <th style="padding:8px 10px;text-align:center;font-size:11px">Doses Aplicadas</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px">Custo Total</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px">Custo Médio / Dose</th>
        </tr></thead>
        <tbody>
          ${relatorio.por_vacina.map((v, i) => `
            <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'}">
              <td style="padding:8px 10px;border-bottom:1px solid #eee;font-weight:600">${v.vacina}</td>
              <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">${v.total_doses}</td>
              <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;color:#1b5e20;font-weight:600">${fmtR(v.custo_total)}</td>
              <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right">${fmtR(v.total_doses ? v.custo_total / v.total_doses : 0)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`

    const secaoLotes = relatorio.por_lote.length === 0 ? '' : `
      <h3 style="font-size:13px;font-weight:700;margin:24px 0 8px">🐖 Vacinações por Lote</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
        <thead><tr style="background:#0d3b66;color:#fff">
          <th style="padding:8px 10px;text-align:left;font-size:11px">Lote</th>
          <th style="padding:8px 10px;text-align:center;font-size:11px">Doses</th>
          <th style="padding:8px 10px;text-align:left;font-size:11px">Vacinas</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px">Custo Total</th>
        </tr></thead>
        <tbody>
          ${relatorio.por_lote.map((l, i) => `
            <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'}">
              <td style="padding:8px 10px;border-bottom:1px solid #eee;font-weight:600">${l.lote_numero}</td>
              <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">${l.total_doses}</td>
              <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:11px;color:#555">${l.vacinas.join(', ')}</td>
              <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${fmtR(l.custo_total)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`

    const secaoPlantel = relatorio.por_plantel.length === 0 ? '' : `
      <h3 style="font-size:13px;font-weight:700;margin:24px 0 8px">🐷 Vacinações do Plantel</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
        <thead><tr style="background:#4a0e8f;color:#fff">
          <th style="padding:8px 10px;text-align:left;font-size:11px">Animal (Brinco)</th>
          <th style="padding:8px 10px;text-align:center;font-size:11px">Doses</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px">Custo Total</th>
        </tr></thead>
        <tbody>
          ${relatorio.por_plantel.map((p, i) => `
            <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'}">
              <td style="padding:8px 10px;border-bottom:1px solid #eee;font-weight:600">🐷 ${p.brinco}</td>
              <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">${p.total_doses}</td>
              <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${fmtR(p.custo_total)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`

    const secaoHistorico = `
      <h3 style="font-size:13px;font-weight:700;margin:24px 0 8px">📋 Histórico Completo</h3>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#343a40;color:#fff">
          <th style="padding:7px 8px;text-align:left;font-size:10px">Data</th>
          <th style="padding:7px 8px;text-align:left;font-size:10px">Vacina / Medicamento</th>
          <th style="padding:7px 8px;text-align:left;font-size:10px">Destino</th>
          <th style="padding:7px 8px;text-align:left;font-size:10px">Dose</th>
          <th style="padding:7px 8px;text-align:left;font-size:10px">Marca</th>
          <th style="padding:7px 8px;text-align:left;font-size:10px">Lote Vacina</th>
          <th style="padding:7px 8px;text-align:left;font-size:10px">Responsável</th>
          <th style="padding:7px 8px;text-align:right;font-size:10px">Custo</th>
        </tr></thead>
        <tbody>
          ${relatorio.historico.length === 0
            ? '<tr><td colspan="8" style="padding:20px;text-align:center;color:#888">Nenhum registro</td></tr>'
            : relatorio.historico.map((v, i) => `
              <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'}">
                <td style="padding:6px 8px;border-bottom:1px solid #eee;white-space:nowrap">${fmtDate(v.data)}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #eee;font-weight:600">${v.vacina}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #eee">${v.plantel_brinco ? `🐷 ${v.plantel_brinco}` : (v.lote_numero || '-')}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #eee">${v.dose || '-'}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px">${v.marca_fabricante || '-'}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px">${v.lote_vacina || '-'}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #eee">${v.responsavel || '-'}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${v.custo ? fmtR(v.custo) : '-'}</td>
              </tr>`).join('')}
        </tbody>
      </table>`

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Sanidade — GranjaApp ${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size:12px; color:#222; padding:28px 32px; }
    @media print {
      body { padding:0; }
      button { display:none !important; }
      @page { margin:15mm 15mm 20mm; size:A4; }
    }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:3px solid #1b5e20">
    <div>
      <div style="font-size:22px;font-weight:700;color:#1b5e20;margin-bottom:3px">Relatório de Sanidade — GranjaApp</div>
      <div style="font-size:11px;color:#666">Gerado em: <strong>${hoje}</strong></div>
    </div>
    <button onclick="window.print()" style="padding:9px 20px;background:#1b5e20;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">
      Imprimir / Salvar PDF
    </button>
  </div>

  <div style="display:flex;gap:14px;margin-bottom:24px">
    <div style="flex:1;border:1px solid #e0e0e0;border-radius:8px;padding:12px 16px;border-top:4px solid #0d6efd">
      <div style="font-size:28px;font-weight:700;color:#0d6efd">${relatorio.total_doses}</div>
      <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-top:2px">Total de Doses</div>
    </div>
    <div style="flex:1;border:1px solid #e0e0e0;border-radius:8px;padding:12px 16px;border-top:4px solid #1b5e20">
      <div style="font-size:22px;font-weight:700;color:#1b5e20">${fmtR(relatorio.custo_total)}</div>
      <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-top:2px">Custo Total</div>
    </div>
    <div style="flex:1;border:1px solid #e0e0e0;border-radius:8px;padding:12px 16px;border-top:4px solid #c0392b">
      <div style="font-size:28px;font-weight:700;color:#c0392b">${relatorio.pendentes_atrasadas.length}</div>
      <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-top:2px">Atrasadas</div>
    </div>
    <div style="flex:1;border:1px solid #e0e0e0;border-radius:8px;padding:12px 16px;border-top:4px solid #6c757d">
      <div style="font-size:28px;font-weight:700;color:#6c757d">${relatorio.por_vacina.length}</div>
      <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-top:2px">Vacinas Distintas</div>
    </div>
  </div>

  ${secaoAtrasadas}
  ${secaoVacinas}
  ${secaoLotes}
  ${secaoPlantel}
  ${secaoHistorico}

  <div style="margin-top:44px;display:flex;gap:28px">
    <div style="flex:1"><div style="border-top:1px solid #555;margin-bottom:6px"></div><div style="font-size:11px;color:#555">Responsável técnico / Veterinário</div></div>
    <div style="flex:1"><div style="border-top:1px solid #555;margin-bottom:6px"></div><div style="font-size:11px;color:#555">Gerente / Responsável</div></div>
    <div style="flex:1"><div style="border-top:1px solid #555;margin-bottom:6px"></div><div style="font-size:11px;color:#555">Data de conferência</div></div>
  </div>
</body>
</html>`

    win.document.open()
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  // ---- Vacinação handlers ----
  const openCreateVac = (prefill = {}) => {
    setEditingVac(null)
    setVacForm({ ...emptyVacForm, ...prefill })
    setVacError('')
    setShowVacModal(true)
  }
  const openEditVac = (v) => {
    setEditingVac(v)
    setVacForm({ ...emptyVacForm, ...v, destino_tipo: v.plantel_brinco ? 'plantel' : 'lote' })
    setVacError('')
    setShowVacModal(true)
  }
  const handleSaveVac = async () => {
    setVacError('')
    setSavingVac(true)
    try {
      const payload = { ...vacForm }
      if (payload.destino_tipo === 'plantel') { payload.lote_id = ''; payload.animal_id = '' }
      else { payload.plantel_brinco = '' }
      delete payload.destino_tipo
      if (editingVac) await api.put(`/api/vacinacoes/${editingVac.id}`, payload)
      else await api.post('/api/vacinacoes', payload)
      setShowVacModal(false)
      load()
    } catch (e) {
      setVacError(e.response?.data?.error || e.response?.data?.msg || 'Erro ao salvar')
    } finally { setSavingVac(false) }
  }
  const handleDeleteVac = async (v) => {
    if (!await confirm('Excluir registro de vacinação?')) return
    try { await api.delete(`/api/vacinacoes/${v.id}`); load() }
    catch (e) { toast.error(e.response?.data?.error || 'Erro ao excluir') }
  }
  const setVF = (k, v) => setVacForm(f => ({ ...f, [k]: v }))

  // ---- Plano handlers ----
  const openCreatePlano = () => {
    setEditingPlano(null); setPlanoForm(emptyPlanoForm); setPlanoItens([]); setPlanoError(''); setShowPlanoModal(true)
  }
  const openEditPlano = (p) => {
    setEditingPlano(p)
    setPlanoForm({ nome: p.nome, descricao: p.descricao || '', tipo_destino: p.tipo_destino, fase_lote: p.fase_lote || '', ativo: p.ativo })
    setPlanoItens(p.itens.map(i => ({ vacina: i.vacina, dias_apos_entrada: i.dias_apos_entrada, dose: i.dose || '', observacoes: i.observacoes || '' })))
    setPlanoError(''); setShowPlanoModal(true)
  }
  const handleSavePlano = async () => {
    setPlanoError('')
    if (!planoForm.nome) { setPlanoError('Nome é obrigatório'); return }
    if (planoItens.length === 0) { setPlanoError('Adicione pelo menos uma vacina ao plano'); return }
    setSavingPlano(true)
    try {
      const payload = { ...planoForm, itens: planoItens }
      if (editingPlano) await api.put(`/api/planos-vacinacao/${editingPlano.id}`, payload)
      else await api.post('/api/planos-vacinacao', payload)
      setShowPlanoModal(false); load()
    } catch (e) {
      setPlanoError(e.response?.data?.error || 'Erro ao salvar')
    } finally { setSavingPlano(false) }
  }
  const handleDeletePlano = async (p) => {
    if (!await confirm(`Excluir plano "${p.nome}"?`)) return
    try { await api.delete(`/api/planos-vacinacao/${p.id}`); load() }
    catch (e) { toast.error(e.response?.data?.error || 'Erro ao excluir') }
  }
  const setPF = (k, v) => setPlanoForm(f => ({ ...f, [k]: v }))
  const addPlanoItem = () => setPlanoItens(prev => [...prev, { vacina: '', dias_apos_entrada: '', dose: '', observacoes: '' }])
  const removePlanoItem = (idx) => setPlanoItens(prev => prev.filter((_, i) => i !== idx))
  const setPlanoItem = (idx, k, v) => setPlanoItens(prev => prev.map((it, i) => i === idx ? { ...it, [k]: v } : it))

  // ---- Aplicar plano handlers ----
  const openAplicar = () => {
    setAplicarForm({ plano_id: '', destino_tipo: 'lote', lote_id: '', plantel_grupo: '', data_inicio: today })
    setAplicarError('')
    setShowAplicarModal(true)
  }
  const handleAplicar = async () => {
    setSavingAplicar(true)
    setAplicarError('')
    try {
      const payload = { ...aplicarForm }
      if (payload.destino_tipo === 'plantel') payload.lote_id = ''
      else payload.plantel_grupo = ''
      delete payload.destino_tipo
      await api.post('/api/aplicacoes-plano', payload)
      setShowAplicarModal(false); load()
    } catch (e) {
      setAplicarError(e.response?.data?.error || 'Erro')
    } finally { setSavingAplicar(false) }
  }
  const setAF = (k, v) => setAplicarForm(f => ({ ...f, [k]: v }))

  // ---- Filtered vacinações ----
  const totalCusto = vacinacoes.reduce((s, v) => s + (v.custo || 0), 0)
  const filteredVac = vacinacoes.filter(v => {
    const s = search.toLowerCase()
    const matchSearch = !s || v.vacina.toLowerCase().includes(s) || (v.responsavel || '').toLowerCase().includes(s) || (v.lote_numero || '').toLowerCase().includes(s) || (v.plantel_brinco || '').toLowerCase().includes(s)
    const matchDestino = !filterDestino || (filterDestino === 'plantel' && !!v.plantel_brinco) || String(v.lote_id) === filterDestino
    return matchSearch && matchDestino
  })

  const plantelAnimal = plantel.find(p => p.brinco === vacForm.plantel_brinco)

  const atrasadas = agenda.filter(a => a.status === 'atrasada').length
  const proximas = agenda.filter(a => a.status === 'proxima').length

  if (loading) return <Layout title="Sanidade"><div className="loading"><div className="spinner" /> Carregando...</div></Layout>

  return (
    <Layout title="Sanidade">
      <div className="page-header">
        <div>
          <h1>💉 Sanidade</h1>
          <p>Vacinações, tratamentos e plano vacinacional</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {tab === 'agenda' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" onClick={gerarPDFAgenda}>📄 Gerar PDF</button>
              {canWrite() && <button className="btn btn-primary" onClick={openAplicar}>+ Aplicar Plano</button>}
            </div>
          )}
          {tab === 'vacinacoes' && canWrite() && <button className="btn btn-primary" onClick={() => openCreateVac()}>+ Registrar Vacinação</button>}
          {tab === 'planos' && canWrite() && <button className="btn btn-primary" onClick={openCreatePlano}>+ Novo Plano</button>}
          {tab === 'relatorio' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" onClick={loadRelatorio}>🔄 Atualizar</button>
              <button className="btn btn-outline" onClick={gerarPDFRelatorio} disabled={!relatorio}>📄 Gerar PDF</button>
            </div>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="stat-card" style={{ flex: 1, minWidth: 150 }}>
          <div className="stat-icon red">🔴</div>
          <div><div className="stat-value">{atrasadas}</div><div className="stat-label">Atrasadas</div></div>
        </div>
        <div className="stat-card" style={{ flex: 1, minWidth: 150 }}>
          <div className="stat-icon orange">🟡</div>
          <div><div className="stat-value">{proximas}</div><div className="stat-label">Esta semana</div></div>
        </div>
        <div className="stat-card" style={{ flex: 1, minWidth: 150 }}>
          <div className="stat-icon blue">💉</div>
          <div><div className="stat-value">{vacinacoes.length}</div><div className="stat-label">Registros</div></div>
        </div>
        <div className="stat-card" style={{ flex: 1, minWidth: 150 }}>
          <div className="stat-icon orange">💰</div>
          <div><div className="stat-value" style={{ fontSize: 14 }}>{fmtMoeda(totalCusto)}</div><div className="stat-label">Custo total</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <div className={`tab ${tab === 'agenda' ? 'active' : ''}`} onClick={() => setTab('agenda')}>
          📋 Agenda {atrasadas > 0 && <span className="badge badge-red" style={{ marginLeft: 4 }}>{atrasadas}</span>}
        </div>
        <div className={`tab ${tab === 'vacinacoes' ? 'active' : ''}`} onClick={() => setTab('vacinacoes')}>
          💉 Vacinações ({vacinacoes.length})
        </div>
        <div className={`tab ${tab === 'planos' ? 'active' : ''}`} onClick={() => setTab('planos')}>
          📄 Planos ({planos.length})
        </div>
        <div className={`tab ${tab === 'relatorio' ? 'active' : ''}`} onClick={() => setTab('relatorio')}>
          📊 Relatório
        </div>
      </div>

      {/* ===== ABA AGENDA ===== */}
      {tab === 'agenda' && (
        <div>
          {agenda.length === 0 ? (
            <div className="table-container">
              <div className="table-empty">
                <span className="empty-icon">📋</span>
                Nenhuma vacinação pendente.
                <div style={{ fontSize: 13, color: '#6c757d', marginTop: 8 }}>
                  Crie um plano vacinacional e aplique-o a um lote ou grupo do plantel.
                </div>
              </div>
            </div>
          ) : (
            <>
              {atrasadas > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#dc3545', textTransform: 'uppercase', marginBottom: 8 }}>
                    🔴 Atrasadas ({atrasadas})
                  </div>
                  {agenda.filter(a => a.status === 'atrasada').map(a => (
                    <AgendaCard key={`${a.aplicacao_id}-${a.item_id}`} item={a} onAplicar={() => openCreateVac({
                      vacina: a.vacina, dose: a.dose || '',
                      lote_id: a.lote_id || '', plantel_brinco: '',
                      destino_tipo: a.plantel_grupo ? 'plantel' : 'lote',
                      data: today,
                    })} plantelGrupoLabel={plantelGrupoLabel} />
                  ))}
                </div>
              )}
              {proximas > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fd7e14', textTransform: 'uppercase', marginBottom: 8 }}>
                    🟡 Esta semana ({proximas})
                  </div>
                  {agenda.filter(a => a.status === 'proxima').map(a => (
                    <AgendaCard key={`${a.aplicacao_id}-${a.item_id}`} item={a} onAplicar={() => openCreateVac({
                      vacina: a.vacina, dose: a.dose || '',
                      lote_id: a.lote_id || '', plantel_brinco: '',
                      destino_tipo: a.plantel_grupo ? 'plantel' : 'lote',
                      data: today,
                    })} plantelGrupoLabel={plantelGrupoLabel} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Planos aplicados */}
          {aplicacoes.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 10 }}>Planos em andamento</div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Plano</th><th>Destino</th><th>Início</th><th>Ações</th></tr>
                  </thead>
                  <tbody>
                    {aplicacoes.map(ap => (
                      <tr key={ap.id}>
                        <td data-label="Plano"><strong>{ap.plano_nome}</strong></td>
                        <td data-label="Destino">
                          {ap.plantel_grupo
                            ? <span className="badge badge-purple">{plantelGrupoLabel[ap.plantel_grupo] || ap.plantel_grupo}</span>
                            : ap.lote_numero || '-'}
                        </td>
                        <td data-label="Início">{fmtData(ap.data_inicio)}</td>
                        <td data-label="">
                          {canEdit() && (
                            <button className="btn btn-danger btn-sm" onClick={async () => {
                              if (!await confirm('Remover este plano do lote?')) return
                              await api.delete(`/api/aplicacoes-plano/${ap.id}`)
                              load()
                            }}>🗑️</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== ABA VACINAÇÕES ===== */}
      {tab === 'vacinacoes' && (
        <div className="table-container">
          <div className="table-toolbar">
            <div className="filter-bar">
              <input className="search-input" placeholder="Buscar vacina, responsável, brinco..."
                value={search} onChange={e => setSearch(e.target.value)} />
              <select value={filterDestino} onChange={e => setFilterDestino(e.target.value)}>
                <option value="">Todos</option>
                <option value="plantel">🐷 Plantel</option>
                {lotes.map(l => <option key={l.id} value={String(l.id)}>{l.numero}</option>)}
              </select>
            </div>
            <span style={{ fontSize: 13, color: '#6c757d' }}>{filteredVac.length} registro(s)</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Data</th><th>Vacina / Medicamento</th><th>Destino</th>
                <th>Dose</th><th>Marca</th><th>Lote Vac.</th><th>Responsável</th><th>Custo</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredVac.length === 0 ? (
                <tr><td colSpan={10} className="table-empty"><span className="empty-icon">💉</span>Nenhuma vacinação registrada</td></tr>
              ) : filteredVac.map(v => (
                <tr key={v.id}>
                  <td data-label="Data">{fmtData(v.data)}</td>
                  <td data-label="Vacina"><strong>{v.vacina}</strong></td>
                  <td data-label="Destino">
                    {v.plantel_brinco
                      ? <span className="badge badge-purple">🐷 {v.plantel_brinco}</span>
                      : v.lote_numero || '-'}
                  </td>
                  <td data-label="Dose">{v.dose || '-'}</td>
                  <td data-label="Marca">{v.marca_fabricante || '-'}</td>
                  <td data-label="Lote Vac.">{v.lote_vacina || '-'}</td>
                  <td data-label="Responsável">{v.responsavel || '-'}</td>
                  <td data-label="Custo">{v.custo ? fmtMoeda(v.custo) : '-'}</td>
                  <td data-label="Obs.">{v.observacoes || '-'}</td>
                  <td data-label="">
                    <div className="actions">
                      {canWrite() && <button className="btn btn-outline btn-sm" onClick={() => openEditVac(v)}>✏️</button>}
                      {canEdit() && <button className="btn btn-danger btn-sm" onClick={() => handleDeleteVac(v)}>🗑️</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== ABA PLANOS ===== */}
      {tab === 'planos' && (
        <div>
          {planos.length === 0 ? (
            <div className="table-container">
              <div className="table-empty">
                <span className="empty-icon">📄</span>Nenhum plano vacinacional cadastrado
              </div>
            </div>
          ) : planos.map(p => (
            <div key={p.id} className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 15 }}>{p.nome}</strong>
                    <span className={`badge ${p.tipo_destino === 'plantel' ? 'badge-purple' : 'badge-blue'}`}>
                      {p.tipo_destino === 'plantel' ? '🐷 Plantel' : '🐖 Lote'}
                    </span>
                    {p.fase_lote && <span className={`badge ${faseBadge[p.fase_lote] || 'badge-gray'}`}>{p.fase_lote}</span>}
                    <span className={`badge ${p.ativo ? 'badge-green' : 'badge-gray'}`}>{p.ativo ? 'Ativo' : 'Inativo'}</span>
                  </div>
                  {p.descricao && <div style={{ color: '#6c757d', fontSize: 13, marginBottom: 8 }}>{p.descricao}</div>}
                  <div style={{ fontSize: 12, color: '#6c757d' }}>{p.itens.length} vacinação(ões) no protocolo</div>
                </div>
                <div className="actions">
                  {canWrite() && (
                    <button className="btn btn-primary btn-sm" onClick={() => {
                      setAplicarForm({ plano_id: p.id, destino_tipo: p.tipo_destino === 'plantel' ? 'plantel' : 'lote', lote_id: '', plantel_grupo: '', data_inicio: today })
                      setAplicarError('')
                      setShowAplicarModal(true)
                    }}>▶ Aplicar</button>
                  )}
                  {canWrite() && <button className="btn btn-outline btn-sm" onClick={() => openEditPlano(p)}>✏️</button>}
                  {canEdit() && <button className="btn btn-danger btn-sm" onClick={() => handleDeletePlano(p)}>🗑️</button>}
                </div>
              </div>
              {p.itens.length > 0 && (
                <div style={{ marginTop: 12, borderTop: '1px solid #e9ecef', paddingTop: 8 }}>
                  {p.itens.map(item => (
                    <div key={item.id} style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid #f8f9fa', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ width: 60, flexShrink: 0, textAlign: 'center' }}>
                        <span className="badge badge-blue">Dia {item.dias_apos_entrada}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 120, fontWeight: 600, fontSize: 14 }}>{item.vacina}</div>
                      {item.dose && <div style={{ fontSize: 12, color: '#6c757d' }}>💊 {item.dose}</div>}
                      {item.observacoes && <div style={{ fontSize: 12, color: '#6c757d' }}>{item.observacoes}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===== ABA RELATÓRIO ===== */}
      {tab === 'relatorio' && (
        <div>
          {loadingRel ? (
            <div className="loading"><div className="spinner" /> Carregando relatório...</div>
          ) : !relatorio ? (
            <div className="table-container">
              <div className="table-empty"><span className="empty-icon">📊</span>Clique em Atualizar para gerar o relatório</div>
            </div>
          ) : (
            <>
              {/* Resumo geral */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div className="stat-card" style={{ flex: 1, minWidth: 140 }}>
                  <div className="stat-icon blue">💉</div>
                  <div><div className="stat-value">{relatorio.total_doses}</div><div className="stat-label">Total de doses</div></div>
                </div>
                <div className="stat-card" style={{ flex: 1, minWidth: 140 }}>
                  <div className="stat-icon orange">💰</div>
                  <div><div className="stat-value" style={{ fontSize: 14 }}>{fmtMoeda(relatorio.custo_total)}</div><div className="stat-label">Custo total</div></div>
                </div>
                <div className="stat-card" style={{ flex: 1, minWidth: 140 }}>
                  <div className="stat-icon red">⚠️</div>
                  <div><div className="stat-value">{relatorio.pendentes_atrasadas.length}</div><div className="stat-label">Atrasadas</div></div>
                </div>
              </div>

              {/* Pendentes/atrasadas */}
              {relatorio.pendentes_atrasadas.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#dc3545', marginBottom: 10 }}>🔴 Vacinações Atrasadas</h3>
                  <div className="table-container">
                    <table>
                      <thead><tr><th>Vacina</th><th>Destino</th><th>Plano</th><th>Data Prevista</th><th>Atraso</th></tr></thead>
                      <tbody>
                        {relatorio.pendentes_atrasadas.map((p, i) => (
                          <tr key={i}>
                            <td data-label="Vacina"><strong>{p.vacina}</strong>{p.dose && <span style={{ fontSize: 12, color: '#6c757d' }}> · {p.dose}</span>}</td>
                            <td data-label="Destino">{p.plantel_grupo ? <span className="badge badge-purple">{plantelGrupoLabel[p.plantel_grupo]}</span> : p.lote_numero}</td>
                            <td data-label="Plano">{p.plano_nome}</td>
                            <td data-label="Prevista">{fmtData(p.data_prevista)}</td>
                            <td data-label="Atraso"><span className="badge badge-red">{p.dias_atraso} dia(s)</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Por vacina */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>💉 Resumo por Vacina</h3>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Vacina</th><th>Doses Aplicadas</th><th>Custo Total</th><th>Custo Médio/Dose</th></tr></thead>
                    <tbody>
                      {relatorio.por_vacina.map((v, i) => (
                        <tr key={i}>
                          <td data-label="Vacina"><strong>{v.vacina}</strong></td>
                          <td data-label="Doses">{v.total_doses}</td>
                          <td data-label="Custo Total">{fmtMoeda(v.custo_total)}</td>
                          <td data-label="Custo Médio">{fmtMoeda(v.total_doses ? v.custo_total / v.total_doses : 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Por lote */}
              {relatorio.por_lote.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🐖 Vacinações por Lote</h3>
                  <div className="table-container">
                    <table>
                      <thead><tr><th>Lote</th><th>Doses</th><th>Vacinas</th><th>Custo Total</th></tr></thead>
                      <tbody>
                        {relatorio.por_lote.map((l, i) => (
                          <tr key={i}>
                            <td data-label="Lote"><strong>{l.lote_numero}</strong></td>
                            <td data-label="Doses">{l.total_doses}</td>
                            <td data-label="Vacinas" style={{ fontSize: 12 }}>{l.vacinas.join(', ')}</td>
                            <td data-label="Custo">{fmtMoeda(l.custo_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Por plantel */}
              {relatorio.por_plantel.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🐷 Vacinações do Plantel</h3>
                  <div className="table-container">
                    <table>
                      <thead><tr><th>Animal (Brinco)</th><th>Doses</th><th>Custo Total</th></tr></thead>
                      <tbody>
                        {relatorio.por_plantel.map((p, i) => (
                          <tr key={i}>
                            <td data-label="Animal"><strong>🐷 {p.brinco}</strong></td>
                            <td data-label="Doses">{p.total_doses}</td>
                            <td data-label="Custo">{fmtMoeda(p.custo_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Histórico completo */}
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>📋 Histórico Completo</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr><th>Data</th><th>Vacina</th><th>Destino</th><th>Dose</th><th>Marca</th><th>Lote Vacina</th><th>Responsável</th><th>Custo</th></tr>
                    </thead>
                    <tbody>
                      {relatorio.historico.length === 0 ? (
                        <tr><td colSpan={8} className="table-empty">Nenhum registro</td></tr>
                      ) : relatorio.historico.map(v => (
                        <tr key={v.id}>
                          <td data-label="Data">{fmtData(v.data)}</td>
                          <td data-label="Vacina"><strong>{v.vacina}</strong></td>
                          <td data-label="Destino">
                            {v.plantel_brinco ? <span className="badge badge-purple">🐷 {v.plantel_brinco}</span> : v.lote_numero || '-'}
                          </td>
                          <td data-label="Dose">{v.dose || '-'}</td>
                          <td data-label="Marca">{v.marca_fabricante || '-'}</td>
                          <td data-label="Lote Vac.">{v.lote_vacina || '-'}</td>
                          <td data-label="Responsável">{v.responsavel || '-'}</td>
                          <td data-label="Custo">{v.custo ? fmtMoeda(v.custo) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== MODAL VACINAÇÃO ===== */}
      {showVacModal && (
        <Modal title={editingVac ? 'Editar Vacinação' : 'Registrar Vacinação'}
          onClose={() => setShowVacModal(false)} onSave={handleSaveVac} saving={savingVac}>
          {vacError && <div className="error-msg">{vacError}</div>}
          <div className="form-grid">
            <div className="form-group span-2">
              <label>Destino *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className={`btn btn-sm ${vacForm.destino_tipo === 'lote' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setVF('destino_tipo', 'lote')}>🐖 Lote Comercial</button>
                <button type="button" className={`btn btn-sm ${vacForm.destino_tipo === 'plantel' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setVF('destino_tipo', 'plantel')}>🐷 Animal do Plantel</button>
              </div>
            </div>
            {vacForm.destino_tipo === 'lote' ? (
              <div className="form-group">
                <label>Lote *</label>
                <select value={vacForm.lote_id} onChange={e => setVF('lote_id', e.target.value)}>
                  <option value="">Selecione o lote</option>
                  {lotes.map(l => <option key={l.id} value={l.id}>{l.numero}</option>)}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label>Animal do Plantel *</label>
                <select value={vacForm.plantel_brinco} onChange={e => setVF('plantel_brinco', e.target.value)}>
                  <option value="">Selecione o animal</option>
                  <optgroup label="Matrizes">
                    {plantel.filter(p => p.tipo === 'matriz').map(p => (
                      <option key={p.id} value={p.brinco}>{p.brinco}{p.nome ? ` — ${p.nome}` : ''}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Reprodutores">
                    {plantel.filter(p => p.tipo === 'reprodutor').map(p => (
                      <option key={p.id} value={p.brinco}>{p.brinco}{p.nome ? ` — ${p.nome}` : ''}</option>
                    ))}
                  </optgroup>
                </select>
                {plantelAnimal && (
                  <div style={{ fontSize: 12, color: '#6f42c1', marginTop: 4 }}>
                    {plantelAnimal.tipo === 'matriz' ? '🐷' : '🐗'} {plantelAnimal.tipo === 'matriz' ? 'Matriz' : 'Reprodutor'}
                    {plantelAnimal.raca ? ` · ${plantelAnimal.raca}` : ''}
                    {plantelAnimal.idade_meses ? ` · ${plantelAnimal.idade_meses} meses` : ''}
                  </div>
                )}
              </div>
            )}
            <div className="form-group">
              <label>Data *</label>
              <input type="date" value={vacForm.data} onChange={e => setVF('data', e.target.value)} />
            </div>
            <div className="form-group span-2">
              <label>Vacina / Medicamento *</label>
              <input value={vacForm.vacina} onChange={e => setVF('vacina', e.target.value)}
                placeholder="Ex: Circovirus, Parvovirose, Aftosa..." />
            </div>
            <div className="form-group">
              <label>Dose</label>
              <input value={vacForm.dose} onChange={e => setVF('dose', e.target.value)} placeholder="Ex: 2ml, 1ª dose" />
            </div>
            <div className="form-group">
              <label>Marca / Fabricante</label>
              <input value={vacForm.marca_fabricante} onChange={e => setVF('marca_fabricante', e.target.value)}
                placeholder="Ex: Zoetis, MSD, Boehringer..." />
            </div>
            <div className="form-group">
              <label>Lote da Vacina</label>
              <input value={vacForm.lote_vacina} onChange={e => setVF('lote_vacina', e.target.value)}
                placeholder="Nº do lote da embalagem" />
            </div>
            <div className="form-group">
              <label>Responsável</label>
              <input value={vacForm.responsavel} onChange={e => setVF('responsavel', e.target.value)} placeholder="Nome do responsável" />
            </div>
            <div className="form-group">
              <label>Custo (R$)</label>
              <input type="number" min="0" step="0.01" value={vacForm.custo}
                onChange={e => setVF('custo', e.target.value)} placeholder="0,00" />
            </div>
            <div className="form-group span-2">
              <label>Observações</label>
              <textarea value={vacForm.observacoes} onChange={e => setVF('observacoes', e.target.value)} />
            </div>
          </div>
        </Modal>
      )}

      {/* ===== MODAL PLANO ===== */}
      {showPlanoModal && (
        <Modal title={editingPlano ? `Editar: ${editingPlano.nome}` : 'Novo Plano Vacinacional'}
          onClose={() => setShowPlanoModal(false)} onSave={handleSavePlano} saving={savingPlano}>
          {planoError && <div className="error-msg">{planoError}</div>}
          <div className="form-grid">
            <div className="form-group span-2">
              <label>Nome do Plano *</label>
              <input value={planoForm.nome} onChange={e => setPF('nome', e.target.value)}
                placeholder="Ex: Protocolo Maternidade, Vacinação Creche..." />
            </div>
            <div className="form-group">
              <label>Tipo de Destino</label>
              <select value={planoForm.tipo_destino} onChange={e => setPF('tipo_destino', e.target.value)}>
                <option value="lote">🐖 Lote Comercial</option>
                <option value="plantel">🐷 Plantel Reprodutivo</option>
              </select>
            </div>
            {planoForm.tipo_destino === 'lote' && (
              <div className="form-group">
                <label>Fase do Lote (opcional)</label>
                <select value={planoForm.fase_lote} onChange={e => setPF('fase_lote', e.target.value)}>
                  <option value="">Todas as fases</option>
                  <option value="maternidade">Maternidade</option>
                  <option value="creche">Creche</option>
                  <option value="crescimento">Crescimento</option>
                  <option value="terminacao">Terminação</option>
                </select>
              </div>
            )}
            <div className="form-group span-2">
              <label>Descrição</label>
              <textarea value={planoForm.descricao} onChange={e => setPF('descricao', e.target.value)} rows={2}
                placeholder="Protocolo recomendado pelo veterinário..." />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={planoForm.ativo ? 'true' : 'false'} onChange={e => setPF('ativo', e.target.value === 'true')}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 20, borderTop: '1px solid #e9ecef', paddingTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <strong>Vacinas no protocolo</strong>
              <button className="btn btn-outline btn-sm" type="button" onClick={addPlanoItem}>+ Adicionar vacina</button>
            </div>
            {planoItens.length === 0 && (
              <div style={{ color: '#6c757d', fontSize: 13, padding: '12px 0' }}>Nenhuma vacina adicionada ainda.</div>
            )}
            {planoItens.map((item, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: 12 }}>Vacina / Medicamento *</label>
                  <input value={item.vacina} onChange={e => setPlanoItem(idx, 'vacina', e.target.value)}
                    placeholder="Ex: Circovirus, Parvovirose..." />
                </div>
                <div>
                  <label style={{ fontSize: 12 }}>Dia *</label>
                  <input type="number" min="0" value={item.dias_apos_entrada}
                    onChange={e => setPlanoItem(idx, 'dias_apos_entrada', e.target.value)}
                    placeholder="0" />
                </div>
                <div>
                  <label style={{ fontSize: 12 }}>Dose</label>
                  <input value={item.dose} onChange={e => setPlanoItem(idx, 'dose', e.target.value)}
                    placeholder="Ex: 2ml, 1ª dose" />
                </div>
                <button className="btn btn-danger btn-sm" type="button" onClick={() => removePlanoItem(idx)}>×</button>
              </div>
            ))}
            {planoItens.length > 0 && (
              <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>
                💡 "Dia 0" = data de entrada do lote. "Dia 7" = 7 dias após a entrada, etc.
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ===== MODAL APLICAR PLANO ===== */}
      {showAplicarModal && (
        <Modal title="▶ Aplicar Plano Vacinacional"
          onClose={() => setShowAplicarModal(false)} onSave={handleAplicar} saving={savingAplicar}
          saveLabel="▶ Aplicar">
          {aplicarError && <div className="error-msg">{aplicarError}</div>}
          <div className="form-grid">
            <div className="form-group span-2">
              <label>Plano *</label>
              <select value={aplicarForm.plano_id} onChange={e => setAF('plano_id', e.target.value)}>
                <option value="">Selecione o plano...</option>
                {planos.filter(p => p.ativo).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome}{p.fase_lote ? ` (${p.fase_lote})` : ''} — {p.itens.length} vacinação(ões)
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group span-2">
              <label>Destino *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className={`btn btn-sm ${aplicarForm.destino_tipo === 'lote' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setAF('destino_tipo', 'lote')}>🐖 Lote</button>
                <button type="button" className={`btn btn-sm ${aplicarForm.destino_tipo === 'plantel' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setAF('destino_tipo', 'plantel')}>🐷 Plantel</button>
              </div>
            </div>
            {aplicarForm.destino_tipo === 'lote' ? (
              <div className="form-group">
                <label>Lote *</label>
                <select value={aplicarForm.lote_id} onChange={e => setAF('lote_id', e.target.value)}>
                  <option value="">Selecione o lote</option>
                  {lotes.map(l => <option key={l.id} value={l.id}>{l.numero}{l.fase ? ` (${l.fase})` : ''}</option>)}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label>Grupo *</label>
                <select value={aplicarForm.plantel_grupo} onChange={e => setAF('plantel_grupo', e.target.value)}>
                  <option value="">Selecione o grupo</option>
                  <option value="matrizes">🐷 Matrizes</option>
                  <option value="reprodutores">🐗 Reprodutores</option>
                  <option value="geral">🐖 Plantel Geral</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Data de início (Dia 0) *</label>
              <input type="date" value={aplicarForm.data_inicio} onChange={e => setAF('data_inicio', e.target.value)} />
              <div style={{ fontSize: 11, color: '#6c757d', marginTop: 4 }}>
                Normalmente a data de entrada do lote
              </div>
            </div>
          </div>
          {aplicarForm.plano_id && (() => {
            const planoSel = planos.find(p => String(p.id) === String(aplicarForm.plano_id))
            if (!planoSel || !aplicarForm.data_inicio) return null
            return (
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6c757d', marginBottom: 8 }}>Datas calculadas:</div>
                {planoSel.itens.map((item, i) => {
                  const d = new Date(aplicarForm.data_inicio + 'T00:00:00')
                  d.setDate(d.getDate() + item.dias_apos_entrada)
                  return (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '4px 0', fontSize: 13 }}>
                      <span style={{ width: 90, color: '#0d6efd', fontWeight: 600 }}>{d.toLocaleDateString('pt-BR')}</span>
                      <span>{item.vacina}</span>
                      {item.dose && <span style={{ color: '#6c757d' }}>({item.dose})</span>}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </Modal>
      )}
    </Layout>
  )
}

// Componente card de item da agenda
function AgendaCard({ item, onAplicar, plantelGrupoLabel }) {
  const isAtrasada = item.status === 'atrasada'
  const diasTexto = isAtrasada
    ? `${Math.abs(item.dias_diff)} dia(s) atrasada`
    : item.dias_diff === 0 ? 'Hoje!' : `em ${item.dias_diff} dia(s)`

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', marginBottom: 8,
      background: isAtrasada ? '#fff5f5' : '#fffbf0',
      border: `1px solid ${isAtrasada ? '#f5c6cb' : '#fde68a'}`,
      borderRadius: 10, flexWrap: 'wrap'
    }}>
      <div style={{ fontSize: 22 }}>{isAtrasada ? '🔴' : '🟡'}</div>
      <div style={{ flex: 1, minWidth: 150 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{item.vacina}</div>
        <div style={{ fontSize: 12, color: '#6c757d', marginTop: 2 }}>
          {item.plano_nome}
          {item.dose && <span> · {item.dose}</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right', minWidth: 110 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: isAtrasada ? '#dc3545' : '#856404' }}>{diasTexto}</div>
        <div style={{ fontSize: 12, color: '#6c757d' }}>
          {new Date(item.data_prevista + 'T00:00:00').toLocaleDateString('pt-BR')}
        </div>
      </div>
      <div style={{ fontSize: 12, minWidth: 100 }}>
        {item.plantel_grupo
          ? <span className="badge badge-purple">{plantelGrupoLabel[item.plantel_grupo] || item.plantel_grupo}</span>
          : <span className="badge badge-blue">🐖 {item.lote_numero}</span>}
      </div>
      <button className="btn btn-primary btn-sm" onClick={onAplicar}>✅ Aplicar</button>
    </div>
  )
}
