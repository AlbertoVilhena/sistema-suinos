import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
const fmtMoeda = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const today = new Date().toISOString().split('T')[0]

const faseBadge = { maternidade: 'badge-purple', creche: 'badge-blue', crescimento: 'badge-teal', terminacao: 'badge-yellow' }
const plantelGrupoLabel = { matrizes: '🐷 Matrizes', reprodutores: '🐗 Reprodutores', geral: '🐖 Plantel Geral' }

const emptyVacForm = {
  destino_tipo: 'lote', lote_id: '', animal_id: '', plantel_brinco: '',
  vacina: '', data: today, dose: '', responsavel: '', custo: '', observacoes: ''
}
const emptyPlanoForm = { nome: '', descricao: '', tipo_destino: 'lote', fase_lote: '', ativo: true }

export default function Sanidade() {
  const { canEdit, canWrite } = useAuth()
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

  useEffect(() => { load() }, [])

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
    if (!window.confirm('Excluir registro de vacinação?')) return
    try { await api.delete(`/api/vacinacoes/${v.id}`); load() }
    catch (e) { alert(e.response?.data?.error || 'Erro') }
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
    if (!window.confirm(`Excluir plano "${p.nome}"?`)) return
    try { await api.delete(`/api/planos-vacinacao/${p.id}`); load() }
    catch (e) { alert(e.response?.data?.error || 'Erro') }
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
          {tab === 'agenda' && canWrite() && <button className="btn btn-primary" onClick={openAplicar}>+ Aplicar Plano</button>}
          {tab === 'vacinacoes' && canWrite() && <button className="btn btn-primary" onClick={() => openCreateVac()}>+ Registrar Vacinação</button>}
          {tab === 'planos' && canWrite() && <button className="btn btn-primary" onClick={openCreatePlano}>+ Novo Plano</button>}
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
                              if (!window.confirm('Remover este plano?')) return
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
                <th>Dose</th><th>Responsável</th><th>Custo</th><th>Obs.</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredVac.length === 0 ? (
                <tr><td colSpan={8} className="table-empty"><span className="empty-icon">💉</span>Nenhuma vacinação registrada</td></tr>
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
