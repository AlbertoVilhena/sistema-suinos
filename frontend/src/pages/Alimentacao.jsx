import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
const fmtMoeda = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const today = new Date().toISOString().split('T')[0]

const plantelGrupoLabel = {
  matrizes: '🐷 Matrizes',
  reprodutores: '🐗 Reprodutores',
  geral: '🐖 Plantel Geral',
}

const emptyForm = {
  destino_tipo: 'lote',
  lote_id: '', plantel_grupo: '',
  data: today, formulacao_id: '', racao_tipo: '',
  quantidade_kg: '', custo_unitario: '', observacoes: ''
}

export default function Alimentacao() {
  const { canEdit, canWrite } = useAuth()
  const [alims, setAlims] = useState([])
  const [lotes, setLotes] = useState([])
  const [formulacoes, setFormulacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDestino, setFilterDestino] = useState('')
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
  const openEdit = (a) => {
    setEditing(a)
    setForm({
      ...emptyForm, ...a,
      formulacao_id: a.formulacao_id || '',
      destino_tipo: a.plantel_grupo ? 'plantel' : 'lote',
    })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      const payload = { ...form }
      if (payload.destino_tipo === 'plantel') {
        payload.lote_id = ''
      } else {
        payload.plantel_grupo = ''
      }
      delete payload.destino_tipo

      if (editing) { await api.put(`/api/alimentacoes/${editing.id}`, payload) }
      else { await api.post('/api/alimentacoes', payload) }
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

  const handleFormulacaoChange = (fid) => {
    const f = formulacoes.find(f => String(f.id) === String(fid))
    setForm(prev => ({
      ...prev,
      formulacao_id: fid,
      racao_tipo: f ? f.nome : prev.racao_tipo,
      custo_unitario: f ? String(f.custo_por_kg) : prev.custo_unitario,
    }))
  }

  const filtered = alims.filter(a => {
    if (!filterDestino) return true
    if (filterDestino === 'plantel') return !!a.plantel_grupo
    if (filterDestino.startsWith('pg:')) return a.plantel_grupo === filterDestino.slice(3)
    return String(a.lote_id) === filterDestino
  })

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
            <select value={filterDestino} onChange={e => setFilterDestino(e.target.value)}>
              <option value="">Todos</option>
              <optgroup label="Plantel Reprodutivo">
                <option value="plantel">🐖 Todo o Plantel</option>
                <option value="pg:matrizes">🐷 Matrizes</option>
                <option value="pg:reprodutores">🐗 Reprodutores</option>
                <option value="pg:geral">Plantel Geral</option>
              </optgroup>
              <optgroup label="Lotes Comerciais">
                {lotes.map(l => <option key={l.id} value={String(l.id)}>{l.numero}</option>)}
              </optgroup>
            </select>
          </div>
          <span style={{ fontSize: 13, color: '#6c757d' }}>{filtered.length} registro(s)</span>
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
                    {a.plantel_grupo
                      ? <span className="badge badge-purple">{plantelGrupoLabel[a.plantel_grupo] || a.plantel_grupo}</span>
                      : a.lote_numero || '-'}
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

      {showModal && (
        <Modal title={editing ? 'Editar Alimentação' : 'Registrar Alimentação'}
          onClose={() => setShowModal(false)} onSave={handleSave} saving={saving}>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-grid">
            {/* Destino */}
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
              <div className="form-group">
                <label>Grupo do Plantel *</label>
                <select value={form.plantel_grupo} onChange={e => set('plantel_grupo', e.target.value)}>
                  <option value="">Selecione o grupo</option>
                  <option value="matrizes">🐷 Matrizes</option>
                  <option value="reprodutores">🐗 Reprodutores</option>
                  <option value="geral">🐖 Plantel Geral</option>
                </select>
              </div>
            )}

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
