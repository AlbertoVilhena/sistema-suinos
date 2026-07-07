import React, { useEffect, useState, useRef } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../components/ConfirmDialog'

const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
const fmtMoeda = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const today = new Date().toISOString().split('T')[0]

const KG_LABEL = {
  maternidade: '2,5 kg/animal', creche: '0,8 kg/animal',
  crescimento: '1,8 kg/animal', terminacao: '2,8 kg/animal',
  matrizes: '2,5 kg/animal', reprodutores: '3,0 kg/animal',
  matrizes_lactacao: '5,5 kg/animal', matrizes_pre_parto: '3,0 kg/animal',
  matrizes_gestacao: '2,2 kg/animal', matrizes_vazia: '2,0 kg/animal',
}

const FASE_COR = {
  maternidade: '#9c27b0', creche: '#1976d2',
  crescimento: '#009688', terminacao: '#f57c00',
  matrizes: '#e91e63', reprodutores: '#3f51b5',
  matrizes_lactacao: '#198754', matrizes_pre_parto: '#dc3545',
  matrizes_gestacao: '#0d6efd', matrizes_vazia: '#6c757d',
}

const FASE_BADGE_LABEL = {
  maternidade: 'maternidade', creche: 'creche',
  crescimento: 'crescimento', terminacao: 'terminação',
  matrizes: 'matrizes', reprodutores: 'reprodutores',
  matrizes_lactacao: 'lactação', matrizes_pre_parto: 'pré-parto',
  matrizes_gestacao: 'gestação', matrizes_vazia: 'vazia',
}

const plantelGrupoLabel = {
  matrizes: '🐷 Matrizes',
  reprodutores: '🐗 Reprodutores',
  geral: '🐖 Plantel Geral',
}

const faseLabel = {
  gestacao:  { label: 'Gestação',  color: '#0d6efd', bg: '#e7f1ff' },
  pre_parto: { label: 'Pré-Parto', color: '#dc3545', bg: '#ffe7e7' },
  lactacao:  { label: 'Lactação',  color: '#198754', bg: '#e6f9ee' },
  vazia:     { label: 'Vazia',     color: '#6c757d', bg: '#f0f0f0' },
}

const emptyForm = {
  destino_tipo: 'lote',
  plantel_modo: 'grupo',           // 'grupo' | 'individual'
  lote_id: '', plantel_grupo: '', plantel_brinco: '',
  data: today, formulacao_id: '', racao_tipo: '',
  quantidade_kg: '', custo_unitario: '', observacoes: ''
}

export default function Alimentacao() {
  const { canEdit, canWrite } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()

  // Tab principal
  const [tab, setTab] = useState('diaria')

  // ===== ABA DIÁRIA =====
  const [diariaDate, setDiariaDate] = useState(today)
  const [diariaData, setDiariaData] = useState(null)
  const [diariaLoading, setDiariaLoading] = useState(false)
  const [diariaInputs, setDiariaInputs] = useState({})   // key→{kg, formulacao_id}
  const [diariaSaving, setDiariaSaving] = useState(false)
  const [diariaEditando, setDiariaEditando] = useState({}) // key→true quando em modo edição

  const loadDiaria = (dt) => {
    setDiariaLoading(true)
    api.get(`/api/alimentacao/diaria?data=${dt}`)
      .then(r => {
        setDiariaData(r.data)
        const inputs = {}
        r.data.destinos.forEach(d => {
          const key = d.tipo === 'lote' ? `lote-${d.id}` : `plantel-${d.id}`
          inputs[key] = {
            kg: d.alimentado_hoje ? String(d.total_kg_hoje) : String(d.kg_sugerido),
            formulacao_id: String(d.formulacao_sugerida_id || ''),
          }
        })
        setDiariaInputs(inputs)
      })
      .catch(console.error)
      .finally(() => setDiariaLoading(false))
  }

  useEffect(() => { if (tab === 'diaria') loadDiaria(diariaDate) }, [tab, diariaDate])

  const setDiariaInput = (key, field, value) =>
    setDiariaInputs(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }))

  const entrarEdicao = (key, d) => {
    const reg = d.registros_hoje?.[0]
    setDiariaInputs(prev => ({
      ...prev,
      [key]: {
        kg: String(d.total_kg_hoje || d.kg_sugerido),
        formulacao_id: String(reg?.formulacao_id || ''),
      }
    }))
    setDiariaEditando(prev => ({ ...prev, [key]: true }))
  }

  const cancelarEdicao = (key) => {
    setDiariaEditando(prev => ({ ...prev, [key]: false }))
  }

  const salvarEdicao = async (key, d) => {
    const inp = diariaInputs[key] || {}
    const kg = parseFloat(inp.kg)
    if (!kg || kg <= 0) { toast.warning('Informe a quantidade de kg'); return }
    setDiariaSaving(true)
    try {
      // Apaga registros anteriores do dia para este destino
      for (const reg of d.registros_hoje) {
        await api.delete(`/api/alimentacoes/${reg.id}`)
      }
      // Cria novo registro com valores corrigidos
      const fid = inp.formulacao_id ? parseInt(inp.formulacao_id) : null
      const fobj = diariaData.formulacoes.find(f => f.id === fid)
      const payload = { data: diariaDate, quantidade_kg: kg, formulacao_id: fid || null, racao_tipo: fobj?.nome || null }
      if (d.tipo === 'lote') payload.lote_id = d.id
      else payload.plantel_grupo = d.id
      await api.post('/api/alimentacao/bulk', { registros: [payload] })
      toast.success('✅ Alimentação corrigida com sucesso!')
      setDiariaEditando(prev => ({ ...prev, [key]: false }))
      loadDiaria(diariaDate)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao editar')
    } finally { setDiariaSaving(false) }
  }

  const handleSalvarDiaria = async () => {
    if (!diariaData) return
    setDiariaSaving(true)
    const registros = []
    diariaData.destinos.forEach(d => {
      if (d.alimentado_hoje && !diariaEditando[d.tipo === 'lote' ? `lote-${d.id}` : `plantel-${d.id}`]) return
      const key = d.tipo === 'lote' ? `lote-${d.id}` : `plantel-${d.id}`
      const inp = diariaInputs[key] || {}
      const kg = parseFloat(inp.kg)
      if (!kg || kg <= 0) return
      const fid = inp.formulacao_id ? parseInt(inp.formulacao_id) : null
      const fobj = diariaData.formulacoes.find(f => f.id === fid)
      const reg = { data: diariaDate, quantidade_kg: kg, formulacao_id: fid || null, racao_tipo: fobj?.nome || null }
      if (d.tipo === 'lote') reg.lote_id = d.id
      else reg.plantel_grupo = d.id
      registros.push(reg)
    })
    if (!registros.length) { toast.warning('Todos os lotes já foram alimentados hoje.'); setDiariaSaving(false); return }
    try {
      await api.post('/api/alimentacao/bulk', { registros })
      toast.success(`✅ ${registros.length} registro(s) de alimentação salvos!`)
      loadDiaria(diariaDate)
      reloadAlims()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao salvar')
    } finally { setDiariaSaving(false) }
  }

  const navDia = (delta) => {
    const d = new Date(diariaDate + 'T00:00:00')
    d.setDate(d.getDate() + delta)
    setDiariaDate(d.toISOString().split('T')[0])
  }

  // ===== ABA HISTÓRICO =====
  const [alims, setAlims] = useState([])
  const [totalAlims, setTotalAlims] = useState(0)
  const [lotes, setLotes] = useState([])
  const [formulacoes, setFormulacoes] = useState([])
  const [plantelAnimais, setPlantelAnimais] = useState([])
  const [consumoIndividual, setConsumoIndividual] = useState([])
  const [showConsumo, setShowConsumo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filterDestino, setFilterDestino] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingModal, setLoadingModal] = useState(false)
  const modalDataLoaded = useRef(false)

  // Carrega apenas tabela + lotes no mount (rápido)
  const load = () => {
    Promise.all([
      api.get('/api/alimentacoes'),
      api.get('/api/lotes'),
    ]).then(([ra, rl]) => {
      setAlims(ra.data)
      setTotalAlims(parseInt(ra.headers?.['x-total-count'] || ra.data.length))
      setLotes(rl.data)
    }).finally(() => setLoading(false))
  }

  // Recarrega somente os registros de alimentação (sem lotes)
  const reloadAlims = () => {
    api.get('/api/alimentacoes').then(ra => {
      setAlims(ra.data)
      setTotalAlims(parseInt(ra.headers?.['x-total-count'] || ra.data.length))
    })
  }

  // Carrega formulações e plantel apenas quando o modal é aberto pela primeira vez
  const loadModalData = async () => {
    if (modalDataLoaded.current) return
    setLoadingModal(true)
    try {
      const [rf, rp] = await Promise.all([
        api.get('/api/formulacoes'),
        api.get('/api/plantel'),
      ])
      setFormulacoes(rf.data.filter(f => f.ativa))
      setPlantelAnimais(rp.data.filter(p => p.status === 'ativo'))
      modalDataLoaded.current = true
    } finally {
      setLoadingModal(false)
    }
  }

  const loadConsumo = () => {
    api.get('/api/alimentacoes/consumo-individual').then(r => setConsumoIndividual(r.data))
  }

  useEffect(() => { load() }, [])

  const openCreate = async () => {
    setEditing(null); setForm(emptyForm); setError(''); setShowModal(true)
    await loadModalData()
  }
  const openEdit = async (a) => {
    setEditing(a)
    const isPlantel = !!(a.plantel_grupo || a.plantel_brinco)
    const modoIndividual = !!a.plantel_brinco
    setForm({
      ...emptyForm, ...a,
      formulacao_id: a.formulacao_id || '',
      destino_tipo: isPlantel ? 'plantel' : 'lote',
      plantel_modo: modoIndividual ? 'individual' : 'grupo',
    })
    setError('')
    setShowModal(true)
    await loadModalData()
  }

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      const payload = { ...form }
      if (payload.destino_tipo === 'plantel') {
        payload.lote_id = ''
        if (payload.plantel_modo === 'individual') {
          payload.plantel_grupo = ''
        } else {
          payload.plantel_brinco = ''
        }
      } else {
        payload.plantel_grupo = ''
        payload.plantel_brinco = ''
      }
      delete payload.destino_tipo
      delete payload.plantel_modo

      if (editing) { await api.put(`/api/alimentacoes/${editing.id}`, payload) }
      else { await api.post('/api/alimentacoes', payload) }
      setShowModal(false)
      reloadAlims()
      if (showConsumo) loadConsumo()
      toast.success(editing ? 'Registro atualizado!' : 'Alimentação registrada!')
    } catch (e) {
      const msg = e.response?.data?.error || e.response?.data?.msg || (e.response ? `Erro ${e.response.status}: ${JSON.stringify(e.response.data)}` : 'Sem resposta do servidor')
      setError(msg)
    } finally { setSaving(false) }
  }

  const handleDelete = async (a) => {
    if (!await confirm('Excluir este registro de alimentação?')) return
    try { await api.delete(`/api/alimentacoes/${a.id}`); reloadAlims(); if (showConsumo) loadConsumo() }
    catch (e) { toast.error(e.response?.data?.error || 'Erro ao excluir registro') }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFormulacaoChange = (fid) => {
    const f = formulacoes.find(f => String(f.id) === String(fid))
    setForm(prev => ({
      ...prev,
      formulacao_id: fid,
      racao_tipo: f ? f.nome : prev.racao_tipo,
      custo_unitario: f ? String(f.custo_por_kg) : prev.custo_unitario,
    }))
  }

  const toggleConsumo = () => {
    if (!showConsumo) loadConsumo()
    setShowConsumo(v => !v)
  }

  const filtered = alims.filter(a => {
    if (!filterDestino) return true
    if (filterDestino === 'plantel') return !!(a.plantel_grupo || a.plantel_brinco)
    if (filterDestino === 'individual') return !!a.plantel_brinco
    if (filterDestino.startsWith('pg:')) return a.plantel_grupo === filterDestino.slice(3)
    if (filterDestino.startsWith('pb:')) return a.plantel_brinco === filterDestino.slice(3)
    return String(a.lote_id) === filterDestino
  })

  const totalKg = filtered.reduce((s, a) => s + (a.quantidade_kg || 0), 0)
  const totalCusto = filtered.reduce((s, a) => s + (a.custo_total || 0), 0)

  const selectedForm = formulacoes.find(f => String(f.id) === String(form.formulacao_id))

  // Matrizes para seleção individual (com info de fase vinda do consumoIndividual ou só brinco)
  const matrizes = plantelAnimais.filter(p => p.tipo === 'matriz')
  const reprodutores = plantelAnimais.filter(p => p.tipo === 'reprodutor')

  const animalSelecionado = form.plantel_brinco
    ? consumoIndividual.find(c => c.brinco === form.plantel_brinco)
    : null

  return (
    <Layout title="Alimentação">
      <div className="page-header">
        <div><h1>🌽 Alimentação</h1><p>Controle de ração e nutrição</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {tab === 'historico' && (
            <>
              <button className="btn btn-outline" onClick={toggleConsumo}>
                {showConsumo ? '📋 Ocultar Consumo' : '📊 Consumo/Animal'}
              </button>
              {canWrite() && <button className="btn btn-primary" onClick={openCreate}>+ Registrar</button>}
            </>
          )}
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'diaria' ? 'active' : ''}`} onClick={() => setTab('diaria')}>📅 Diária</div>
        <div className={`tab ${tab === 'historico' ? 'active' : ''}`} onClick={() => setTab('historico')}>📋 Histórico</div>
      </div>

      {/* ===== ABA DIÁRIA ===== */}
      {tab === 'diaria' && (
        <div>
          {/* Navegação de data */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={() => navDia(-1)}>‹ Anterior</button>
            <input type="date" value={diariaDate} onChange={e => setDiariaDate(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: 6, fontSize: 13, width: 'auto', flexShrink: 0 }} />
            <button className="btn btn-outline btn-sm" onClick={() => navDia(1)}>Próximo ›</button>
            {diariaDate !== today && (
              <button className="btn btn-outline btn-sm" onClick={() => setDiariaDate(today)}>Hoje</button>
            )}
            {diariaData && (
              <div style={{ display: 'flex', gap: 8, marginLeft: 4, flexWrap: 'wrap' }}>
                <span style={{ background: '#d8f3dc', color: '#1b5e20', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                  ✅ {diariaData.alimentados} alimentados
                </span>
                {diariaData.pendentes > 0 && (
                  <span style={{ background: '#fff3cd', color: '#664d03', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                    ⏳ {diariaData.pendentes} pendentes
                  </span>
                )}
              </div>
            )}
          </div>

          {diariaLoading && <div className="loading"><div className="spinner" />Carregando...</div>}

          {diariaData && !diariaLoading && (
            <>
              {diariaData.destinos.length === 0 ? (
                <div className="card"><div className="table-empty"><span className="empty-icon">🐖</span>Nenhum lote ativo cadastrado.</div></div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table style={{ fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '20%' }}>Destino</th>
                        <th style={{ width: '10%' }}>Fase</th>
                        <th style={{ width: '8%', textAlign: 'center' }}>Animais</th>
                        <th style={{ width: '10%', textAlign: 'right' }}>Sugerido</th>
                        <th style={{ width: '14%' }}>Kg fornecido</th>
                        <th style={{ width: '26%' }}>Formulação</th>
                        <th style={{ width: '12%', textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diariaData.destinos.map(d => {
                        const key = d.tipo === 'lote' ? `lote-${d.id}` : `plantel-${d.id}`
                        const inp = diariaInputs[key] || {}
                        const cor = FASE_COR[d.fase?.toLowerCase()] || '#6c757d'
                        const editando = !!diariaEditando[key]
                        const alimentadoHoje = d.alimentado_hoje && !editando
                        const rowBg = alimentadoHoje ? '#f0fff4' : editando ? '#fffbea' : 'inherit'
                        const formulacaoNome = d.registros_hoje?.[0]?.formulacao_nome || null
                        return (
                          <tr key={key} style={{ background: rowBg }}>
                            <td data-label="Destino">
                              <strong style={{ fontSize: 13 }}>{d.nome}</strong>
                            </td>
                            <td data-label="Fase">
                              {d.fase && (
                                <span style={{ background: cor + '22', color: cor, border: `1px solid ${cor}55`, borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                  {FASE_BADGE_LABEL[d.fase?.toLowerCase()] || d.fase}
                                </span>
                              )}
                            </td>
                            <td data-label="Animais" style={{ textAlign: 'center', fontWeight: 600 }}>
                              {d.quantidade_animais}
                            </td>
                            <td data-label="Sugerido" style={{ textAlign: 'right', color: '#6c757d', fontSize: 12 }}>
                              {d.kg_sugerido} kg
                              <div style={{ fontSize: 10, color: '#adb5bd' }}>{KG_LABEL[d.fase?.toLowerCase()] || ''}</div>
                            </td>
                            <td data-label="Kg fornecido">
                              {alimentadoHoje ? (
                                <span style={{ fontWeight: 700, color: '#198754' }}>{d.total_kg_hoje} kg</span>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <input
                                    type="number" step="0.1" min="0"
                                    value={inp.kg || ''}
                                    onChange={e => setDiariaInput(key, 'kg', e.target.value)}
                                    style={{ width: 70, padding: '4px 6px', border: '1px solid #ced4da', borderRadius: 5, fontSize: 13, textAlign: 'right' }}
                                  />
                                  <span style={{ fontSize: 11, color: '#6c757d' }}>kg</span>
                                </div>
                              )}
                            </td>
                            <td data-label="Formulação">
                              {alimentadoHoje ? (
                                <span style={{ fontSize: 12, color: formulacaoNome ? '#212529' : '#adb5bd', fontStyle: formulacaoNome ? 'normal' : 'italic' }}>
                                  {formulacaoNome || 'Sem formulação'}
                                </span>
                              ) : (
                                <select
                                  value={inp.formulacao_id || ''}
                                  onChange={e => setDiariaInput(key, 'formulacao_id', e.target.value)}
                                  style={{ width: '100%', padding: '4px 6px', border: '1px solid #ced4da', borderRadius: 5, fontSize: 12 }}
                                >
                                  <option value="">— Sem formulação —</option>
                                  {diariaData.formulacoes.map(f => (
                                    <option key={f.id} value={f.id}>{f.nome}</option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td data-label="Status" style={{ textAlign: 'center' }}>
                              {alimentadoHoje ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                  <span style={{ background: '#d8f3dc', color: '#1b5e20', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>✅ OK</span>
                                  {canWrite() && (
                                    <button onClick={() => entrarEdicao(key, d)} style={{ background: 'none', border: 'none', color: '#6c757d', fontSize: 11, cursor: 'pointer', padding: '2px 6px', textDecoration: 'underline' }}>
                                      ✏️ Corrigir
                                    </button>
                                  )}
                                </div>
                              ) : editando ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  <button onClick={() => salvarEdicao(key, d)} disabled={diariaSaving} style={{ background: '#198754', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                    💾 Salvar
                                  </button>
                                  <button onClick={() => cancelarEdicao(key)} style={{ background: 'none', border: 'none', color: '#6c757d', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <span style={{ background: '#fff3cd', color: '#664d03', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>⏳ Pendente</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {canWrite() && diariaData.pendentes > 0 && (
                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={handleSalvarDiaria} disabled={diariaSaving} style={{ minWidth: 180 }}>
                    {diariaSaving ? '⏳ Salvando...' : `✅ Registrar Alimentação (${diariaData.pendentes} lote${diariaData.pendentes > 1 ? 's' : ''})`}
                  </button>
                </div>
              )}

              {diariaData.pendentes === 0 && diariaData.total > 0 && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#d8f3dc', border: '1px solid #a3d9b1', borderRadius: 8, color: '#1b5e20', fontWeight: 600, fontSize: 13 }}>
                  ✅ Todos os lotes foram alimentados neste dia!
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===== ABA HISTÓRICO ===== */}
      {tab === 'historico' && (
      <>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="stat-card" style={{ flex: 1, minWidth: 180 }}>
          <div className="stat-icon green">🌽</div>
          <div><div className="stat-value">{totalKg.toFixed(1)} kg</div><div className="stat-label">Total de ração (filtrado)</div></div>
        </div>
        <div className="stat-card" style={{ flex: 1, minWidth: 180 }}>
          <div className="stat-icon orange">💰</div>
          <div><div className="stat-value">{fmtMoeda(totalCusto)}</div><div className="stat-label">Custo total (filtrado)</div></div>
        </div>
      </div>

      {/* ===== RESUMO DE CONSUMO INDIVIDUAL ===== */}
      {showConsumo && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">📊 Consumo de Ração por Animal Individual</div>
          {consumoIndividual.length === 0 ? (
            <div className="table-empty" style={{ marginTop: 12 }}>
              <span className="empty-icon">🐷</span>
              Nenhum registro individual ainda. Registre alimentações selecionando um animal específico.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', marginTop: 12 }}>
              <table style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Animal</th><th>Fase Atual</th><th>Registros</th>
                    <th>Total (kg)</th><th>Custo Total</th><th>Último Registro</th><th>Filtrar</th>
                  </tr>
                </thead>
                <tbody>
                  {consumoIndividual.map(c => {
                    const fase = faseLabel[c.fase] || faseLabel.vazia
                    return (
                      <tr key={c.brinco}>
                        <td>
                          <strong>{c.brinco}</strong>
                          {c.nome && <div style={{ fontSize: 11, color: '#6c757d' }}>{c.nome}</div>}
                        </td>
                        <td>
                          {c.fase ? (
                            <span style={{ background: fase.bg, color: fase.color, borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>
                              {fase.label}
                            </span>
                          ) : '-'}
                        </td>
                        <td style={{ textAlign: 'center' }}>{c.registros}</td>
                        <td><strong>{c.total_kg.toFixed(1)} kg</strong></td>
                        <td>{fmtMoeda(c.custo_total)}</td>
                        <td>{fmtData(c.ultimo_registro)}</td>
                        <td>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => { setFilterDestino(`pb:${c.brinco}`); setShowConsumo(false) }}
                          >
                            🔍
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== TABELA PRINCIPAL ===== */}
      <div className="table-container">
        <div className="table-toolbar">
          <div className="filter-bar">
            <select value={filterDestino} onChange={e => setFilterDestino(e.target.value)}>
              <option value="">Todos</option>
              <optgroup label="Plantel Reprodutivo">
                <option value="plantel">🐖 Todo o Plantel</option>
                <option value="individual">👤 Individuais</option>
                <option value="pg:matrizes">🐷 Matrizes (grupo)</option>
                <option value="pg:reprodutores">🐗 Reprodutores (grupo)</option>
                <option value="pg:geral">Plantel Geral</option>
                {matrizes.map(m => <option key={m.brinco} value={`pb:${m.brinco}`}>👤 {m.brinco}{m.nome ? ` — ${m.nome}` : ''}</option>)}
              </optgroup>
              <optgroup label="Lotes Comerciais">
                {lotes.map(l => <option key={l.id} value={String(l.id)}>{l.numero}</option>)}
              </optgroup>
            </select>
          </div>
          <span style={{ fontSize: 13, color: '#6c757d' }}>
            {filtered.length} registro(s)
            {totalAlims > alims.length && (
              <span style={{ color: '#fd7e14', marginLeft: 6 }}>
                (mostrando {alims.length} de {totalAlims} —{' '}
                <button
                  className="btn-link"
                  style={{ color: '#fd7e14', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit', textDecoration: 'underline' }}
                  onClick={() => api.get('/api/alimentacoes?limit=2000').then(r => { setAlims(r.data); setTotalAlims(r.data.length) })}
                >
                  carregar todos
                </button>)
              </span>
            )}
          </span>
        </div>

        {loading ? <div className="loading"><div className="spinner" />Carregando...</div> : (
          <table>
            <thead>
              <tr>
                <th>Data</th><th>Destino</th><th>Formulação / Tipo</th><th>Quantidade (kg)</th>
                <th>Custo/kg</th><th>Custo Total</th><th>Observações</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="table-empty"><span className="empty-icon">🌽</span>Nenhum registro de alimentação</td></tr>
              ) : filtered.map(a => (
                <tr key={a.id}>
                  <td data-label="Data">{fmtData(a.data)}</td>
                  <td data-label="Destino">
                    {a.plantel_brinco ? (
                      <div>
                        <span className="badge badge-purple">👤 {a.plantel_brinco}</span>
                      </div>
                    ) : a.plantel_grupo ? (
                      <span className="badge badge-purple">{plantelGrupoLabel[a.plantel_grupo] || a.plantel_grupo}</span>
                    ) : (
                      a.lote_numero || '-'
                    )}
                  </td>
                  <td data-label="Ração">
                    {a.formulacao_nome && <div style={{ fontSize: 11, color: '#0d6efd', fontWeight: 600 }}>🌾 {a.formulacao_nome}</div>}
                    {a.racao_tipo || '-'}
                  </td>
                  <td data-label="Quantidade">{a.quantidade_kg} kg</td>
                  <td data-label="Custo/kg">{a.custo_unitario ? fmtMoeda(a.custo_unitario) : '-'}</td>
                  <td data-label="Custo Total"><strong>{a.custo_total ? fmtMoeda(a.custo_total) : '-'}</strong></td>
                  <td data-label="Obs.">{a.observacoes || '-'}</td>
                  <td data-label="">
                    <div className="actions">
                      {canWrite() && <button className="btn btn-outline btn-sm" onClick={() => openEdit(a)}>✏️</button>}
                      {canEdit() && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a)}>🗑️</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </>
      )}

      {/* ===== MODAL ===== */}
      {showModal && (
        <Modal title={editing ? 'Editar Alimentação' : 'Registrar Alimentação'}
          onClose={() => setShowModal(false)} onSave={handleSave} saving={saving}>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-grid">
            {/* Destino: Lote ou Plantel */}
            <div className="form-group span-2">
              <label>Destino *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${form.destino_tipo === 'lote' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => set('destino_tipo', 'lote')}
                >
                  🐖 Lote Comercial
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${form.destino_tipo === 'plantel' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => set('destino_tipo', 'plantel')}
                >
                  🐷 Plantel Reprodutivo
                </button>
              </div>
            </div>

            {form.destino_tipo === 'lote' ? (
              <div className="form-group">
                <label>Lote *</label>
                <select value={form.lote_id} onChange={e => set('lote_id', e.target.value)}>
                  <option value="">Selecione o lote</option>
                  {lotes.map(l => <option key={l.id} value={l.id}>{l.numero}</option>)}
                </select>
              </div>
            ) : (
              <>
                {/* Modo: Grupo ou Individual */}
                <div className="form-group span-2">
                  <label>Tipo de registro</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${form.plantel_modo === 'grupo' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setForm(f => ({ ...f, plantel_modo: 'grupo', plantel_brinco: '' }))}
                    >
                      👥 Grupo
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${form.plantel_modo === 'individual' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setForm(f => ({ ...f, plantel_modo: 'individual', plantel_grupo: '' }))}
                    >
                      👤 Animal Individual
                    </button>
                  </div>
                </div>

                {form.plantel_modo === 'grupo' ? (
                  <div className="form-group">
                    <label>Grupo do Plantel *</label>
                    <select value={form.plantel_grupo} onChange={e => set('plantel_grupo', e.target.value)}>
                      <option value="">Selecione o grupo</option>
                      <option value="matrizes">🐷 Matrizes</option>
                      <option value="reprodutores">🐗 Reprodutores</option>
                      <option value="geral">🐖 Plantel Geral</option>
                    </select>
                  </div>
                ) : (
                  <div className="form-group span-2">
                    <label>Animal (Brinco) *</label>
                    <select value={form.plantel_brinco} onChange={e => set('plantel_brinco', e.target.value)}>
                      <option value="">— Selecione o animal —</option>
                      {matrizes.length > 0 && (
                        <optgroup label="🐷 Matrizes">
                          {matrizes.map(m => (
                            <option key={m.brinco} value={m.brinco}>
                              {m.brinco}{m.nome ? ` — ${m.nome}` : ''}{m.total_partos > 0 ? ` (${m.total_partos} partos)` : ''}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {reprodutores.length > 0 && (
                        <optgroup label="🐗 Reprodutores">
                          {reprodutores.map(m => (
                            <option key={m.brinco} value={m.brinco}>
                              {m.brinco}{m.nome ? ` — ${m.nome}` : ''}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    {/* Info da fase do animal selecionado (se estiver no consumoIndividual) */}
                    {form.plantel_brinco && animalSelecionado?.fase && (() => {
                      const fase = faseLabel[animalSelecionado.fase] || faseLabel.vazia
                      return (
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                          <span style={{ background: fase.bg, color: fase.color, borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>
                            {fase.label}
                          </span>
                          <span style={{ color: '#6c757d' }}>
                            Consumo acumulado: {animalSelecionado.total_kg.toFixed(1)} kg ({fmtMoeda(animalSelecionado.custo_total)})
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </>
            )}

            <div className="form-group">
              <label>Data *</label>
              <input type="date" value={form.data} onChange={e => set('data', e.target.value)} />
            </div>

            <div className="form-group span-2">
              <label>Formulação de Ração</label>
              <select value={form.formulacao_id} onChange={e => handleFormulacaoChange(e.target.value)} disabled={loadingModal}>
                <option value="">{loadingModal ? '⏳ Carregando formulações...' : '— Selecionar formulação cadastrada —'}</option>
                {formulacoes.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.nome} {f.fase ? `(${f.fase})` : ''} — R$ {Number(f.custo_por_kg || 0).toFixed(4)}/kg
                  </option>
                ))}
              </select>
              {selectedForm && (
                <div style={{ fontSize: 12, color: '#0d6efd', marginTop: 4 }}>
                  ✓ {selectedForm.nome} — Custo: R$ {Number(selectedForm.custo_por_kg || 0).toFixed(4)}/kg | {selectedForm.itens?.length || 0} ingredientes
                </div>
              )}
            </div>
            <div className="form-group span-2">
              <label>Tipo de Ração (descrição livre)</label>
              <input value={form.racao_tipo} onChange={e => set('racao_tipo', e.target.value)}
                placeholder="Ex: Ração Gestante, Lactação, Crescimento..." />
            </div>
            <div className="form-group">
              <label>Quantidade (kg) *</label>
              <input type="number" step="0.1" min="0" value={form.quantidade_kg}
                onChange={e => set('quantidade_kg', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Custo por kg (R$)</label>
              <input type="number" step="0.0001" min="0" value={form.custo_unitario}
                onChange={e => set('custo_unitario', e.target.value)}
                placeholder={selectedForm ? `Pré-preenchido: ${selectedForm.custo_por_kg}` : ''} />
            </div>
            {form.quantidade_kg && form.custo_unitario && (
              <div className="form-group span-2">
                <div style={{ background: '#f0fff4', border: '1px solid #c3e6cb', borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>
                  💰 Custo total desta alimentação: <strong>{fmtMoeda(Number(form.quantidade_kg) * Number(form.custo_unitario))}</strong>
                </div>
              </div>
            )}
            <div className="form-group span-2">
              <label>Observações</label>
              <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2} />
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
