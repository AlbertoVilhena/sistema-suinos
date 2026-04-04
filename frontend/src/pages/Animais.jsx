import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
const statusBadge = { ativo: 'badge-green', morto: 'badge-red', vendido: 'badge-blue', transferido: 'badge-purple' }
const sexoBadge = { macho: 'badge-blue', femea: 'badge-purple' }

const emptyForm = {
  lote_id: '', brinco: '', sexo: 'macho', raca: '', data_nascimento: '',
  peso_entrada: '', peso_atual: '', status: 'ativo', observacoes: ''
}

export default function Animais() {
  const { canEdit, canWrite } = useAuth()
  const [animais, setAnimais] = useState([])
  const [lotes, setLotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterLote, setFilterLote] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    Promise.all([
      api.get('/api/animais'),
      api.get('/api/lotes')
    ]).then(([ra, rl]) => {
      setAnimais(ra.data)
      setLotes(rl.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowModal(true) }
  const openEdit = (a) => {
    setEditing(a)
    setForm({ ...a, data_nascimento: a.data_nascimento || '' })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/api/animais/${editing.id}`, form)
      } else {
        await api.post('/api/animais', form)
      }
      setShowModal(false)
      load()
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (a) => {
    if (!window.confirm(`Excluir animal ${a.brinco || '#' + a.id}?`)) return
    try {
      await api.delete(`/api/animais/${a.id}`)
      load()
    } catch (e) { alert(e.response?.data?.error || 'Erro ao excluir') }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filtered = animais.filter(a => {
    const s = search.toLowerCase()
    const matchSearch = !s || (a.brinco || '').toLowerCase().includes(s) || (a.raca || '').toLowerCase().includes(s)
    const matchLote = !filterLote || String(a.lote_id) === filterLote
    const matchStatus = !filterStatus || a.status === filterStatus
    return matchSearch && matchLote && matchStatus
  })

  return (
    <Layout title="Animais">
      <div className="page-header">
        <div><h1>🐷 Animais</h1><p>{animais.length} animal(is) cadastrado(s)</p></div>
        {canWrite() && <button className="btn btn-primary" onClick={openCreate}>+ Novo Animal</button>}
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="filter-bar">
            <input className="search-input" placeholder="Buscar brinco ou raça..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <select value={filterLote} onChange={e => setFilterLote(e.target.value)}>
              <option value="">Todos os lotes</option>
              {lotes.map(l => <option key={l.id} value={l.id}>{l.numero}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="morto">Morto</option>
              <option value="vendido">Vendido</option>
              <option value="transferido">Transferido</option>
            </select>
          </div>
          <span style={{ fontSize: 13, color: '#6c757d' }}>{filtered.length} resultado(s)</span>
        </div>

        {loading ? <div className="loading"><div className="spinner" /> Carregando...</div> : (
          <table>
            <thead>
              <tr>
                <th>Brinco</th>
                <th>Lote</th>
                <th>Sexo</th>
                <th>Raça</th>
                <th>Nasc.</th>
                <th>Peso Entrada</th>
                <th>Peso Atual</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="table-empty">
                  <span className="empty-icon">🐷</span>Nenhum animal encontrado
                </td></tr>
              ) : filtered.map(a => (
                <tr key={a.id}>
                  <td><strong>{a.brinco || '-'}</strong></td>
                  <td>{a.lote_numero || '-'}</td>
                  <td><span className={`badge ${sexoBadge[a.sexo] || 'badge-gray'}`}>{a.sexo || '-'}</span></td>
                  <td>{a.raca || '-'}</td>
                  <td>{fmtData(a.data_nascimento)}</td>
                  <td>{a.peso_entrada ? `${a.peso_entrada} kg` : '-'}</td>
                  <td>{a.peso_atual ? `${a.peso_atual} kg` : '-'}</td>
                  <td><span className={`badge ${statusBadge[a.status] || 'badge-gray'}`}>{a.status}</span></td>
                  <td>
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

      {showModal && (
        <Modal title={editing ? 'Editar Animal' : 'Novo Animal'}
          onClose={() => setShowModal(false)} onSave={handleSave} saving={saving}>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-grid">
            <div className="form-group">
              <label>Lote</label>
              <select value={form.lote_id} onChange={e => set('lote_id', e.target.value)}>
                <option value="">Selecione o lote</option>
                {lotes.map(l => <option key={l.id} value={l.id}>{l.numero}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Brinco / Identificação</label>
              <input value={form.brinco} onChange={e => set('brinco', e.target.value)} placeholder="Ex: A001" />
            </div>
            <div className="form-group">
              <label>Sexo</label>
              <select value={form.sexo} onChange={e => set('sexo', e.target.value)}>
                <option value="macho">Macho</option>
                <option value="femea">Fêmea</option>
              </select>
            </div>
            <div className="form-group">
              <label>Raça</label>
              <input value={form.raca} onChange={e => set('raca', e.target.value)} placeholder="Ex: Large White" />
            </div>
            <div className="form-group">
              <label>Data de Nascimento</label>
              <input type="date" value={form.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="ativo">Ativo</option>
                <option value="morto">Morto</option>
                <option value="vendido">Vendido</option>
                <option value="transferido">Transferido</option>
              </select>
            </div>
            <div className="form-group">
              <label>Peso Entrada (kg)</label>
              <input type="number" step="0.1" value={form.peso_entrada} onChange={e => set('peso_entrada', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Peso Atual (kg)</label>
              <input type="number" step="0.1" value={form.peso_atual} onChange={e => set('peso_atual', e.target.value)} />
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
