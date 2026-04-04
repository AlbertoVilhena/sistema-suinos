import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'

const faseBadge = { maternidade: 'badge-purple', creche: 'badge-blue', crescimento: 'badge-teal', terminacao: 'badge-yellow' }
const statusBadge = { ativo: 'badge-green', encerrado: 'badge-gray', vendido: 'badge-blue' }

const emptyForm = {
  numero: '', data_entrada: '', quantidade_inicial: '', quantidade_atual: '',
  peso_medio_entrada: '', fase: 'creche', status: 'ativo', observacoes: ''
}

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
      setError(e.response?.data?.error || 'Erro ao salvar')
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
                  <td><strong>{l.numero}</strong></td>
                  <td>{fmtData(l.data_entrada)}</td>
                  <td>{l.quantidade_inicial}</td>
                  <td>{l.quantidade_atual}</td>
                  <td>{l.peso_medio_entrada ? `${l.peso_medio_entrada} kg` : '-'}</td>
                  <td><span className={`badge ${faseBadge[l.fase] || 'badge-gray'}`}>{l.fase || '-'}</span></td>
                  <td><span className={`badge ${statusBadge[l.status] || 'badge-gray'}`}>{l.status}</span></td>
                  <td>
                    <div className="actions">
                      {canEdit() && (
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(l)}>✏️ Editar</button>
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
