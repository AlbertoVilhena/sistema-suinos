import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
const fmtNum = (v, d = 1) => Number(v || 0).toFixed(d)

const faseBadge = { maternidade: 'badge-purple', creche: 'badge-blue', crescimento: 'badge-teal', terminacao: 'badge-yellow' }
const statusBadge = { ativo: 'badge-green', encerrado: 'badge-gray', vendido: 'badge-blue' }

const today = new Date().toISOString().split('T')[0]

const emptyForm = {
  numero: '', data_entrada: today, quantidade_inicial: '', quantidade_atual: '',
  peso_medio_entrada: '', fase: 'creche', status: 'ativo', observacoes: ''
}

const emptyPesagem = { data: today, peso_medio: '', total_animais: '', observacoes: '' }

export default function Lotes() {
  const { canEdit, canWrite, isAdmin } = useAuth()
  const [lotes, setLotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Pesagem state
  const [showPesagemModal, setShowPesagemModal] = useState(false)
  const [pesagemLote, setPesagemLote] = useState(null)
  const [pesagens, setPesagens] = useState([])
  const [pesagemForm, setPesagemForm] = useState(emptyPesagem)
  const [pesagemError, setPesagemError] = useState('')
  const [savingPesagem, setSavingPesagem] = useState(false)
  const [loadingPesagens, setLoadingPesagens] = useState(false)

  const load = () => {
    api.get('/api/lotes').then(r => setLotes(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowModal(true) }
  const openEdit = (l) => {
    setEditing(l)
    setForm({ ...l, peso_medio_entrada: l.peso_medio_entrada || '' })
    setError('')
    setShowModal(true)
  }

  const openPesagem = async (l) => {
    setPesagemLote(l)
    setPesagemForm({ ...emptyPesagem, total_animais: l.quantidade_atual || '' })
    setPesagemError('')
    setLoadingPesagens(true)
    setShowPesagemModal(true)
    try {
      const r = await api.get(`/api/pesagens?lote_id=${l.id}`)
      setPesagens(r.data)
    } catch { setPesagens([]) } finally { setLoadingPesagens(false) }
  }

  const handleSavePesagem = async () => {
    setPesagemError('')
    if (!pesagemForm.peso_medio) { setPesagemError('Peso médio é obrigatório'); return }
    setSavingPesagem(true)
    try {
      await api.post('/api/pesagens', { ...pesagemForm, lote_id: pesagemLote.id })
      setPesagemForm({ ...emptyPesagem, total_animais: pesagemLote.quantidade_atual || '' })
      const r = await api.get(`/api/pesagens?lote_id=${pesagemLote.id}`)
      setPesagens(r.data)
    } catch (e) {
      setPesagemError(e.response?.data?.error || 'Erro ao salvar')
    } finally { setSavingPesagem(false) }
  }

  const handleDeletePesagem = async (pid) => {
    if (!window.confirm('Excluir esta pesagem?')) return
    try {
      await api.delete(`/api/pesagens/${pid}`)
      const r = await api.get(`/api/pesagens?lote_id=${pesagemLote.id}`)
      setPesagens(r.data)
    } catch (e) { alert(e.response?.data?.error || 'Erro') }
  }

  const setP = (k, v) => setPesagemForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/api/lotes/${editing.id}`, form)
      } else {
        await api.post('/api/lotes', form)
      }
      setShowModal(false)
      load()
    } catch (e) {
      const msg = e.response?.data?.error || e.response?.data?.msg || (e.response ? `Erro ${e.response.status}: ${JSON.stringify(e.response.data)}` : 'Sem resposta do servidor')
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (l) => {
    if (!window.confirm(`Excluir lote ${l.numero}? Esta ação não pode ser desfeita.`)) return
    try {
      await api.delete(`/api/lotes/${l.id}`)
      load()
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao excluir')
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filtered = lotes.filter(l => {
    const s = search.toLowerCase()
    const matchSearch = !s || l.numero.toLowerCase().includes(s) || (l.fase || '').toLowerCase().includes(s)
    const matchStatus = !filterStatus || l.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <Layout title="Lotes">
      <div className="page-header">
        <div><h1>🐖 Lotes</h1><p>{lotes.length} lote(s) cadastrado(s)</p></div>
        {canWrite() && (
          <button className="btn btn-primary" onClick={openCreate}>+ Novo Lote</button>
        )}
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="filter-bar">
            <input
              className="search-input"
              placeholder="Buscar por número ou fase..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="encerrado">Encerrado</option>
              <option value="vendido">Vendido</option>
            </select>
          </div>
          <span style={{ fontSize: 13, color: '#6c757d' }}>{filtered.length} resultado(s)</span>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /> Carregando...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>Data Entrada</th>
                <th>Qtd Inicial</th>
                <th>Qtd Atual</th>
                <th>Peso Médio (kg)</th>
                <th>Fase</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="table-empty">
                  <span className="empty-icon">🐖</span>
                  Nenhum lote encontrado
                </td></tr>
              ) : filtered.map(l => (
                <tr key={l.id}>
                  <td data-label="Número"><strong>{l.numero}</strong></td>
                  <td data-label="Data Entrada">{fmtData(l.data_entrada)}</td>
                  <td data-label="Qtd Inicial">{l.quantidade_inicial}</td>
                  <td data-label="Qtd Atual">{l.quantidade_atual}</td>
                  <td data-label="Peso Médio">{l.peso_medio_entrada ? `${l.peso_medio_entrada} kg` : '-'}</td>
                  <td data-label="Fase"><span className={`badge ${faseBadge[l.fase] || 'badge-gray'}`}>{l.fase || '-'}</span></td>
                  <td data-label="Status"><span className={`badge ${statusBadge[l.status] || 'badge-gray'}`}>{l.status}</span></td>
                  <td data-label="">
                    <div className="actions">
                      {canWrite() && l.status === 'ativo' && (
                        <button className="btn btn-outline btn-sm" onClick={() => openPesagem(l)} title="Registrar Pesagem">⚖️</button>
                      )}
                      {canEdit() && (
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(l)}>✏️</button>
                      )}
                      {isAdmin() && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(l)}>🗑️</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showPesagemModal && pesagemLote && (
        <Modal
          title={`⚖️ Pesagens — Lote ${pesagemLote.numero}`}
          onClose={() => setShowPesagemModal(false)}
          onSave={handleSavePesagem}
          saving={savingPesagem}
          saveLabel="Registrar Pesagem"
        >
          {pesagemError && <div className="error-msg">{pesagemError}</div>}

          {/* Formulário nova pesagem */}
          <div className="form-grid">
            <div className="form-group">
              <label>Data *</label>
              <input type="date" value={pesagemForm.data} onChange={e => setP('data', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Peso Médio (kg) *</label>
              <input type="number" step="0.1" min="0" value={pesagemForm.peso_medio}
                onChange={e => setP('peso_medio', e.target.value)} placeholder="Ex: 45.5" />
            </div>
            <div className="form-group">
              <label>Total de Animais</label>
              <input type="number" min="0" value={pesagemForm.total_animais}
                onChange={e => setP('total_animais', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Observações</label>
              <input value={pesagemForm.observacoes} onChange={e => setP('observacoes', e.target.value)}
                placeholder="Opcional..." />
            </div>
          </div>

          {/* Histórico de pesagens */}
          <div style={{ marginTop: 20, borderTop: '1px solid #e9ecef', paddingTop: 16 }}>
            <strong style={{ fontSize: 13, color: '#495057' }}>📋 Histórico de Pesagens</strong>
            {loadingPesagens ? (
              <div style={{ textAlign: 'center', padding: 16, color: '#6c757d' }}>Carregando...</div>
            ) : pesagens.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 16, color: '#6c757d', fontSize: 13 }}>
                Nenhuma pesagem registrada ainda.
              </div>
            ) : (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pesagens.map((p, i) => {
                  const prev = pesagens[i + 1]
                  const ganho = prev ? ((p.peso_medio - prev.peso_medio) / Math.max((new Date(p.data) - new Date(prev.data)) / 86400000, 1)) : null
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#f8f9fa', borderRadius: 6 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{fmtData(p.data)} — <span style={{ color: '#198754' }}>{fmtNum(p.peso_medio, 1)} kg</span></div>
                        <div style={{ fontSize: 11, color: '#6c757d' }}>
                          {p.total_animais ? `${p.total_animais} animais` : ''}
                          {ganho !== null ? ` · +${fmtNum(ganho, 3)} kg/dia` : ''}
                          {p.observacoes ? ` · ${p.observacoes}` : ''}
                        </div>
                      </div>
                      {canEdit() && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeletePesagem(p.id)}>🗑️</button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Modal>
      )}

      {showModal && (
        <Modal
          title={editing ? `Editar Lote ${editing.numero}` : 'Novo Lote'}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          saving={saving}
        >
          {error && <div className="error-msg">{error}</div>}
          <div className="form-grid">
            <div className="form-group">
              <label>Número do Lote *</label>
              <input value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="Ex: L2024-001" />
            </div>
            <div className="form-group">
              <label>Data de Entrada *</label>
              <input type="date" value={form.data_entrada} onChange={e => set('data_entrada', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Quantidade Inicial *</label>
              <input type="number" min="1" value={form.quantidade_inicial} onChange={e => set('quantidade_inicial', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Quantidade Atual</label>
              <input type="number" min="0" value={form.quantidade_atual} onChange={e => set('quantidade_atual', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Peso Médio Entrada (kg)</label>
              <input type="number" step="0.1" value={form.peso_medio_entrada} onChange={e => set('peso_medio_entrada', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Fase</label>
              <select value={form.fase} onChange={e => set('fase', e.target.value)}>
                <option value="">Selecione</option>
                <option value="maternidade">Maternidade</option>
                <option value="creche">Creche</option>
                <option value="crescimento">Crescimento</option>
                <option value="terminacao">Terminação</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="ativo">Ativo</option>
                <option value="encerrado">Encerrado</option>
                <option value="vendido">Vendido</option>
              </select>
            </div>
            <div className="form-group span-2">
              <label>Observações</label>
              <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
