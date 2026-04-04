import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'

const emptyForm = {
  lote_id: '', animal_id: '', vacina: '', data: '', dose: '', responsavel: '', observacoes: ''
}

export default function Sanidade() {
  const { canEdit, canWrite } = useAuth()
  const [vacinacoes, setVacinacoes] = useState([])
  const [lotes, setLotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterLote, setFilterLote] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    Promise.all([api.get('/api/vacinacoes'), api.get('/api/lotes')])
      .then(([rv, rl]) => { setVacinacoes(rv.data); setLotes(rl.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowModal(true) }
  const openEdit = (v) => { setEditing(v); setForm({ ...v }); setError(''); setShowModal(true) }

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/api/vacinacoes/${editing.id}`, form)
      } else {
        await api.post('/api/vacinacoes', form)
      }
      setShowModal(false)
      load()
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (v) => {
    if (!window.confirm(`Excluir registro de vacinação?`)) return
    try { await api.delete(`/api/vacinacoes/${v.id}`); load() }
    catch (e) { alert(e.response?.data?.error || 'Erro ao excluir') }
  }

  const set = (k, val) => setForm(f => ({ ...f, [k]: val }))

  const filtered = vacinacoes.filter(v => {
    const s = search.toLowerCase()
    const matchSearch = !s || v.vacina.toLowerCase().includes(s) || (v.responsavel || '').toLowerCase().includes(s) || (v.lote_numero || '').toLowerCase().includes(s)
    const matchLote = !filterLote || String(v.lote_id) === filterLote
    return matchSearch && matchLote
  })

  return (
    <Layout title="Sanidade">
      <div className="page-header">
        <div><h1>💉 Sanidade</h1><p>Controle de vacinações e tratamentos</p></div>
        {canWrite() && <button className="btn btn-primary" onClick={openCreate}>+ Registrar Vacinação</button>}
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="filter-bar">
            <input className="search-input" placeholder="Buscar vacina, responsável ou lote..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <select value={filterLote} onChange={e => setFilterLote(e.target.value)}>
              <option value="">Todos os lotes</option>
              {lotes.map(l => <option key={l.id} value={l.id}>{l.numero}</option>)}
            </select>
          </div>
          <span style={{ fontSize: 13, color: '#6c757d' }}>{filtered.length} registro(s)</span>
        </div>

        {loading ? <div className="loading"><div className="spinner" /> Carregando...</div> : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Vacina</th>
                <th>Lote</th>
                <th>Dose</th>
                <th>Responsável</th>
                <th>Observações</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="table-empty">
                  <span className="empty-icon">💉</span>Nenhuma vacinação registrada
                </td></tr>
              ) : filtered.map(v => (
                <tr key={v.id}>
                  <td>{fmtData(v.data)}</td>
                  <td><strong>{v.vacina}</strong></td>
                  <td>{v.lote_numero || '-'}</td>
                  <td>{v.dose || '-'}</td>
                  <td>{v.responsavel || '-'}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.observacoes || '-'}
                  </td>
                  <td>
                    <div className="actions">
                      {canWrite() && <button className="btn btn-outline btn-sm" onClick={() => openEdit(v)}>✏️</button>}
                      {canEdit() && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(v)}>🗑️</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? 'Editar Vacinação' : 'Registrar Vacinação'}
          onClose={() => setShowModal(false)} onSave={handleSave} saving={saving}>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-grid">
            <div className="form-group">
              <label>Lote *</label>
              <select value={form.lote_id} onChange={e => set('lote_id', e.target.value)}>
                <option value="">Selecione o lote</option>
                {lotes.map(l => <option key={l.id} value={l.id}>{l.numero}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Data *</label>
              <input type="date" value={form.data} onChange={e => set('data', e.target.value)} />
            </div>
            <div className="form-group span-2">
              <label>Vacina / Medicamento *</label>
              <input value={form.vacina} onChange={e => set('vacina', e.target.value)}
                placeholder="Ex: Circovirus, Parvovirose..." />
            </div>
            <div className="form-group">
              <label>Dose</label>
              <input value={form.dose} onChange={e => set('dose', e.target.value)}
                placeholder="Ex: 2ml, 1ª dose" />
            </div>
            <div className="form-group">
              <label>Responsável</label>
              <input value={form.responsavel} onChange={e => set('responsavel', e.target.value)}
                placeholder="Nome do responsável" />
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
