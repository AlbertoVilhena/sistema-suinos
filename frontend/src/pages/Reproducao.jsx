import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'

const statusBadge = {
  gestacao: 'badge-blue',
  parto: 'badge-green',
  desmame: 'badge-teal',
  encerrado: 'badge-gray'
}

const emptyForm = {
  lote_id: '', femea_brinco: '', macho_brinco: '', data_cobertura: '',
  data_parto_previsto: '', data_parto_real: '',
  quantidade_nascidos: '', quantidade_vivos: '',
  status: 'gestacao', observacoes: ''
}

export default function Reproducao() {
  const { canEdit, canWrite } = useAuth()
  const [reproducoes, setReproducoes] = useState([])
  const [lotes, setLotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    Promise.all([api.get('/api/reproducoes'), api.get('/api/lotes')])
      .then(([rr, rl]) => { setReproducoes(rr.data); setLotes(rl.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowModal(true) }
  const openEdit = (r) => { setEditing(r); setForm({ ...r }); setError(''); setShowModal(true) }

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/api/reproducoes/${editing.id}`, form)
      } else {
        await api.post('/api/reproducoes', form)
      }
      setShowModal(false)
      load()
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (r) => {
    if (!window.confirm('Excluir este registro de reprodução?')) return
    try { await api.delete(`/api/reproducoes/${r.id}`); load() }
    catch (e) { alert(e.response?.data?.error || 'Erro ao excluir') }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filtered = reproducoes.filter(r => !filterStatus || r.status === filterStatus)

  return (
    <Layout title="Reprodução">
      <div className="page-header">
        <div><h1>🫀 Reprodução</h1><p>Gestação, partos e desmame</p></div>
        {canWrite() && <button className="btn btn-primary" onClick={openCreate}>+ Novo Registro</button>}
      </div>

      {/* Summary badges */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {['gestacao', 'parto', 'desmame', 'encerrado'].map(s => {
          const count = reproducoes.filter(r => r.status === s).length
          return (
            <div key={s} className="card" style={{ padding: '10px 18px', display: 'flex', gap: 8, alignItems: 'center', minWidth: 120 }}>
              <span className={`badge ${statusBadge[s]}`}>{s}</span>
              <strong>{count}</strong>
            </div>
          )
        })}
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="filter-bar">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Todos os status</option>
              <option value="gestacao">Gestação</option>
              <option value="parto">Parto</option>
              <option value="desmame">Desmame</option>
              <option value="encerrado">Encerrado</option>
            </select>
          </div>
          <span style={{ fontSize: 13, color: '#6c757d' }}>{filtered.length} registro(s)</span>
        </div>

        {loading ? <div className="loading"><div className="spinner" /> Carregando...</div> : (
          <table>
            <thead>
              <tr>
                <th>Fêmea</th>
                <th>Macho</th>
                <th>Lote</th>
                <th>Cobertura</th>
                <th>Parto Previsto</th>
                <th>Parto Real</th>
                <th>Nascidos/Vivos</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="table-empty">
                  <span className="empty-icon">🫀</span>Nenhum registro de reprodução
                </td></tr>
              ) : filtered.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.femea_brinco || '-'}</strong></td>
                  <td>{r.macho_brinco || '-'}</td>
                  <td>{r.lote_numero || '-'}</td>
                  <td>{fmtData(r.data_cobertura)}</td>
                  <td>{fmtData(r.data_parto_previsto)}</td>
                  <td>{fmtData(r.data_parto_real)}</td>
                  <td>{r.quantidade_nascidos != null ? `${r.quantidade_nascidos}/${r.quantidade_vivos ?? '?'}` : '-'}</td>
                  <td><span className={`badge ${statusBadge[r.status] || 'badge-gray'}`}>{r.status}</span></td>
                  <td>
                    <div className="actions">
                      {canWrite() && <button className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>✏️</button>}
                      {canEdit() && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r)}>🗑️</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? 'Editar Reprodução' : 'Novo Registro de Reprodução'}
          onClose={() => setShowModal(false)} onSave={handleSave} saving={saving}>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-grid">
            <div className="form-group">
              <label>Fêmea (Brinco)</label>
              <input value={form.femea_brinco} onChange={e => set('femea_brinco', e.target.value)} placeholder="Ex: F001" />
            </div>
            <div className="form-group">
              <label>Macho (Brinco)</label>
              <input value={form.macho_brinco} onChange={e => set('macho_brinco', e.target.value)} placeholder="Ex: M001" />
            </div>
            <div className="form-group">
              <label>Lote</label>
              <select value={form.lote_id} onChange={e => set('lote_id', e.target.value)}>
                <option value="">Selecione</option>
                {lotes.map(l => <option key={l.id} value={l.id}>{l.numero}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="gestacao">Gestação</option>
                <option value="parto">Parto</option>
                <option value="desmame">Desmame</option>
                <option value="encerrado">Encerrado</option>
              </select>
            </div>
            <div className="form-group">
              <label>Data da Cobertura</label>
              <input type="date" value={form.data_cobertura} onChange={e => set('data_cobertura', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Parto Previsto <small>(auto: +114 dias)</small></label>
              <input type="date" value={form.data_parto_previsto} onChange={e => set('data_parto_previsto', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Parto Real</label>
              <input type="date" value={form.data_parto_real} onChange={e => set('data_parto_real', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Qtd. Nascidos</label>
              <input type="number" min="0" value={form.quantidade_nascidos} onChange={e => set('quantidade_nascidos', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Qtd. Vivos</label>
              <input type="number" min="0" value={form.quantidade_vivos} onChange={e => set('quantidade_vivos', e.target.value)} />
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
