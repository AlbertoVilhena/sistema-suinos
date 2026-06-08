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
          <button className="btn btn-outline" onClick={toggleConsumo}>
            {showConsumo ? '📋 Ocultar Consumo' : '📊 Consumo por Animal'}
          </button>
          {canWrite() && <button className="btn btn-primary" onClick={openCreate}>+ Registrar Alimentação</button>}
        </div>
      </div>

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
