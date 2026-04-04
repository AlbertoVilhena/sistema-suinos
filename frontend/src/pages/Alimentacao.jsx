import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
const fmtMoeda = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const emptyForm = {
  lote_id: '', data: '', racao_tipo: '', quantidade_kg: '', custo_unitario: '', observacoes: ''
}

export default function Alimentacao() {
  const { canEdit, canWrite } = useAuth()
  const [alims, setAlims] = useState([])
  const [lotes, setLotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterLote, setFilterLote] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    Promise.all([api.get('/api/alimentacoes'), api.get('/api/lotes')])
      .then(([ra, rl]) => { setAlims(ra.data); setLotes(rl.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowModal(true) }
  const openEdit = (a) => { setEditing(a); setForm({ ...a }); setError(''); setShowModal(true) }

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/api/alimentacoes/${editing.id}`, form)
      } else {
        await api.post('/api/alimentacoes', form)
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
    if (!window.confirm('Excluir este registro de alimentação?')) return
    try { await api.delete(`/api/alimentacoes/${a.id}`); load() }
    catch (e) { alert(e.response?.data?.error || 'Erro') }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filtered = alims.filter(a => !filterLote || String(a.lote_id) === filterLote)

  const totalKg = filtered.reduce((s, a) => s + (a.quantidade_kg || 0), 0)
  const totalCusto = filtered.reduce((s, a) => s + (a.custo_total || 0), 0)

  return (
    <Layout title="Alimentação">
      <div className="page-header">
        <div><h1>🌽 Alimentação</h1><p>Controle de ração e nutrição</p></div>
        {canWrite() && <button className="btn btn-primary" onClick={openCreate}>+ Registrar Alimentação</button>}
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="stat-card" style={{ flex: 1, minWidth: 180 }}>
          <div className="stat-icon green">🌽</div>
          <div>
            <div className="stat-value">{totalKg.toFixed(1)} kg</div>
            <div className="stat-label">Total de ração (filtrado)</div>
          </div>
        </div>
        <div className="stat-card" style={{ flex: 1, minWidth: 180 }}>
          <div className="stat-icon orange">💰</div>
          <div>
            <div className="stat-value">{fmtMoeda(totalCusto)}</div>
            <div className="stat-label">Custo total (filtrado)</div>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="filter-bar">
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
                <th>Lote</th>
                <th>Tipo de Ração</th>
                <th>Quantidade (kg)</th>
                <th>Custo/kg</th>
                <th>Custo Total</th>
                <th>Observações</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="table-empty">
                  <span className="empty-icon">🌽</span>Nenhum registro de alimentação
                </td></tr>
              ) : filtered.map(a => (
                <tr key={a.id}>
                  <td>{fmtData(a.data)}</td>
                  <td>{a.lote_numero || '-'}</td>
                  <td>{a.racao_tipo || '-'}</td>
                  <td>{a.quantidade_kg} kg</td>
                  <td>{a.custo_unitario ? fmtMoeda(a.custo_unitario) : '-'}</td>
                  <td><strong>{a.custo_total ? fmtMoeda(a.custo_total) : '-'}</strong></td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.observacoes || '-'}
                  </td>
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
        <Modal title={editing ? 'Editar Alimentação' : 'Registrar Alimentação'}
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
              <label>Tipo de Ração</label>
              <input value={form.racao_tipo} onChange={e => set('racao_tipo', e.target.value)}
                placeholder="Ex: Ração Inicial, Ração de Crescimento..." />
            </div>
            <div className="form-group">
              <label>Quantidade (kg) *</label>
              <input type="number" step="0.1" min="0" value={form.quantidade_kg}
                onChange={e => set('quantidade_kg', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Custo por kg (R$)</label>
              <input type="number" step="0.01" min="0" value={form.custo_unitario}
                onChange={e => set('custo_unitario', e.target.value)} />
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
