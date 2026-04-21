import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
const fmtMoeda = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const statusBadge = { ativo: 'badge-green', descartado: 'badge-yellow', morto: 'badge-red' }
const origemLabel = { comprado: 'Comprado', nascido: 'Nascido na granja' }

const emptyForm = {
  brinco: '', tipo: 'matriz', nome: '', raca: '',
  data_nascimento: '', peso_atual: '', status: 'ativo',
  origem: 'comprado', custo_aquisicao: '', observacoes: ''
}

export default function Plantel() {
  const { canEdit, canWrite, isAdmin } = useAuth()
  const [tab, setTab] = useState('matrizes')
  const [plantel, setPlantel] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    api.get('/api/plantel').then(r => setPlantel(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const tipo = tab === 'matrizes' ? 'matriz' : 'reprodutor'
  const lista = plantel.filter(p => p.tipo === tipo)
  const ativos = lista.filter(p => p.status === 'ativo').length

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm, tipo })
    setError('')
    setShowModal(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({ ...emptyForm, ...p })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      if (editing) { await api.put(`/api/plantel/${editing.id}`, form) }
      else { await api.post('/api/plantel', form) }
      setShowModal(false)
      load()
    } catch (e) {
      setError(e.response?.data?.error || `Erro ${e.response?.status}`)
    } finally { setSaving(false) }
  }

  const handleDelete = async (p) => {
    if (!window.confirm(`Excluir ${p.tipo} ${p.brinco}?`)) return
    try { await api.delete(`/api/plantel/${p.id}`); load() }
    catch (e) { alert(e.response?.data?.error || 'Erro ao excluir') }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const totalPartos = lista.filter(p => p.tipo === 'matriz').reduce((s, p) => s + (p.total_partos || 0), 0)

  return (
    <Layout title="Plantel Reprodutivo">
      <div className="page-header">
        <div>
          <h1>🐷 Plantel Reprodutivo</h1>
          <p>Matrizes e reprodutores da granja</p>
        </div>
        {canWrite() && (
          <button className="btn btn-primary" onClick={openCreate}>
            + {tab === 'matrizes' ? 'Nova Matriz' : 'Novo Reprodutor'}
          </button>
        )}
      </div>

      {/* Resumo */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-icon purple">🐷</div>
          <div style={{ minWidth: 0 }}>
            <div className="stat-value">{plantel.filter(p => p.tipo === 'matriz' && p.status === 'ativo').length}</div>
            <div className="stat-label">Matrizes Ativas</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">🐗</div>
          <div style={{ minWidth: 0 }}>
            <div className="stat-value">{plantel.filter(p => p.tipo === 'reprodutor' && p.status === 'ativo').length}</div>
            <div className="stat-label">Reprodutores Ativos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">🍼</div>
          <div style={{ minWidth: 0 }}>
            <div className="stat-value">{plantel.reduce((s, p) => s + (p.total_partos || 0), 0)}</div>
            <div className="stat-label">Total de Partos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal">📋</div>
          <div style={{ minWidth: 0 }}>
            <div className="stat-value">{plantel.length}</div>
            <div className="stat-label">Total no Plantel</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <div className={`tab ${tab === 'matrizes' ? 'active' : ''}`} onClick={() => setTab('matrizes')}>
          🐷 Matrizes ({plantel.filter(p => p.tipo === 'matriz').length})
        </div>
        <div className={`tab ${tab === 'reprodutores' ? 'active' : ''}`} onClick={() => setTab('reprodutores')}>
          🐗 Reprodutores ({plantel.filter(p => p.tipo === 'reprodutor').length})
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <span style={{ fontSize: 13, color: '#6c757d' }}>
            {ativos} {tipo === 'matriz' ? 'matriz(es)' : 'reprodutor(es)'} ativo(s)
          </span>
        </div>

        {loading ? <div className="loading"><div className="spinner" /> Carregando...</div> : (
          <table>
            <thead>
              <tr>
                <th>Brinco</th>
                <th>Nome</th>
                <th>Raça</th>
                <th>Nascimento</th>
                <th>Idade</th>
                <th>Peso</th>
                {tipo === 'matriz' && <th>Partos</th>}
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr><td colSpan={tipo === 'matriz' ? 9 : 8} className="table-empty">
                  <span className="empty-icon">{tipo === 'matriz' ? '🐷' : '🐗'}</span>
                  Nenhum(a) {tipo} cadastrado(a)
                </td></tr>
              ) : lista.map(p => (
                <tr key={p.id}>
                  <td data-label="Brinco"><strong>{p.brinco}</strong></td>
                  <td data-label="Nome">{p.nome || '-'}</td>
                  <td data-label="Raça">{p.raca || '-'}</td>
                  <td data-label="Nascimento">{fmtData(p.data_nascimento)}</td>
                  <td data-label="Idade">{p.idade_meses != null ? `${p.idade_meses} m` : '-'}</td>
                  <td data-label="Peso">{p.peso_atual ? `${p.peso_atual} kg` : '-'}</td>
                  {tipo === 'matriz' && (
                    <td data-label="Partos">
                      <span className="badge badge-blue">{p.total_partos}</span>
                    </td>
                  )}
                  <td data-label="Status">
                    <span className={`badge ${statusBadge[p.status] || 'badge-gray'}`}>{p.status}</span>
                  </td>
                  <td data-label="">
                    <div className="actions">
                      {canWrite() && <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>✏️</button>}
                      {isAdmin() && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p)}>🗑️</button>}
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
          title={editing
            ? `Editar ${editing.tipo === 'matriz' ? 'Matriz' : 'Reprodutor'} ${editing.brinco}`
            : `${tipo === 'matriz' ? 'Nova Matriz' : 'Novo Reprodutor'}`}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          saving={saving}
        >
          {error && <div className="error-msg">{error}</div>}
          <div className="form-grid">
            <div className="form-group">
              <label>Brinco / ID *</label>
              <input value={form.brinco} onChange={e => set('brinco', e.target.value)}
                placeholder="Ex: F001, M-05..." />
            </div>
            <div className="form-group">
              <label>Tipo *</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                <option value="matriz">Matriz (fêmea)</option>
                <option value="reprodutor">Reprodutor (macho)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Nome</label>
              <input value={form.nome} onChange={e => set('nome', e.target.value)}
                placeholder="Opcional" />
            </div>
            <div className="form-group">
              <label>Raça</label>
              <input value={form.raca} onChange={e => set('raca', e.target.value)}
                placeholder="Ex: Landrace, Large White..." />
            </div>
            <div className="form-group">
              <label>Data de Nascimento</label>
              <input type="date" value={form.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Peso Atual (kg)</label>
              <input type="number" step="0.1" min="0" value={form.peso_atual}
                onChange={e => set('peso_atual', e.target.value)} placeholder="0.0" />
            </div>
            <div className="form-group">
              <label>Origem</label>
              <select value={form.origem} onChange={e => set('origem', e.target.value)}>
                <option value="comprado">Comprado</option>
                <option value="nascido">Nascido na granja</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="ativo">Ativo</option>
                <option value="descartado">Descartado</option>
                <option value="morto">Morto</option>
              </select>
            </div>
            <div className="form-group">
              <label>Custo de Aquisição (R$)</label>
              <input type="number" step="0.01" min="0" value={form.custo_aquisicao}
                onChange={e => set('custo_aquisicao', e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Observações</label>
              <input value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
                placeholder="Opcional" />
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
