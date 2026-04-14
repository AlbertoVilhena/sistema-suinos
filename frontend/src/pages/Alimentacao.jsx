import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
const fmtMoeda = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const today = new Date().toISOString().split('T')[0]

const emptyForm = {
  lote_id: '', data: today, formulacao_id: '', racao_tipo: '', quantidade_kg: '', custo_unitario: '', observacoes: ''
}

export default function Alimentacao() {
  const { canEdit, canWrite } = useAuth()
  const [alims, setAlims] = useState([])
  const [lotes, setLotes] = useState([])
  const [formulacoes, setFormulacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterLote, setFilterLote] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    Promise.all([
      api.get('/api/alimentacoes'),
      api.get('/api/lotes'),
      api.get('/api/formulacoes'),
    ]).then(([ra, rl, rf]) => {
      setAlims(ra.data)
      setLotes(rl.data)
      setFormulacoes(rf.data.filter(f => f.ativa))
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowModal(true) }
  const openEdit = (a) => { setEditing(a); setForm({ ...emptyForm, ...a, formulacao_id: a.formulacao_id || '' }); setError(''); setShowModal(true) }

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      if (editing) { await api.put(`/api/alimentacoes/${editing.id}`, form) }
      else { await api.post('/api/alimentacoes', form) }
      setShowModal(false)
      load()
    } catch (e) {
      const msg = e.response?.data?.error || e.response?.data?.msg || (e.response ? `Erro ${e.response.status}: ${JSON.stringify(e.response.data)}` : 'Sem resposta do servidor')
      setError(msg)
    } finally { setSaving(false) }
  }

  const handleDelete = async (a) => {
    if (!window.confirm('Excluir este registro de alimentação?')) return
    try { await api.delete(`/api/alimentacoes/${a.id}`); load() }
    catch (e) { alert(e.response?.data?.error || 'Erro') }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Ao selecionar formulação, auto-preenche tipo e custo
  const handleFormulacaoChange = (fid) => {
    const f = formulacoes.find(f => String(f.id) === String(fid))
    setForm(prev => ({
      ...prev,
      formulacao_id: fid,
      racao_tipo: f ? f.nome : prev.racao_tipo,
      custo_unitario: f ? String(f.custo_por_kg) : prev.custo_unitario,
    }))
  }

  const filtered = alims.filter(a => !filterLote || String(a.lote_id) === filterLote)
  const totalKg = filtered.reduce((s, a) => s + (a.quantidade_kg || 0), 0)
  const totalCusto = filtered.reduce((s, a) => s + (a.custo_total || 0), 0)

  const selectedForm = formulacoes.find(f => String(f.id) === String(form.formulacao_id))

  return (
    <Layout title="Alimentação">
      <div className="page-header">
        <div><h1>🌽 Alimentação</h1><p>Controle de ração e nutrição</p></div>
        {canWrite() && <button className="btn btn-primary" onClick={openCreate}>+ Registrar Alimentação</button>}
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

        {loading ? <div className="loading"><div className="spinner" />Carregando...</div> : (
          <table>
            <thead>
              <tr>
                <th>Data</th><th>Lote</th><th>Formulação / Tipo</th><th>Quantidade (kg)</th>
                <th>Custo/kg</th><th>Custo Total</th><th>Observações</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="table-empty"><span className="empty-icon">🌽</span>Nenhum registro de alimentação</td></tr>
              ) : filtered.map(a => (
                <tr key={a.id}>
                  <td>{fmtData(a.data)}</td>
                  <td>{a.lote_numero || '-'}</td>
                  <td>
                    {a.formulacao_nome && <div style={{ fontSize: 11, color: '#0d6efd', fontWeight: 600 }}>🌾 {a.formulacao_nome}</div>}
                    {a.racao_tipo || '-'}
                  </td>
                  <td>{a.quantidade_kg} kg</td>
                  <td>{a.custo_unitario ? fmtMoeda(a.custo_unitario) : '-'}</td>
                  <td><strong>{a.custo_total ? fmtMoeda(a.custo_total) : '-'}</strong></td>
                  <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.observacoes || '-'}</td>
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
              <label>Formulação de Ração</label>
              <select value={form.formulacao_id} onChange={e => handleFormulacaoChange(e.target.value)}>
                <option value="">— Selecionar formulação cadastrada —</option>
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
                placeholder="Ex: Ração Inicial, Crescimento..." />
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
