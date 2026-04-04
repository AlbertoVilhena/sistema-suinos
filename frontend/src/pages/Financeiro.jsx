import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
const fmtMoeda = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const catReceitas = ['Venda de Animais', 'Venda de Leitões', 'Subsídio', 'Outros']
const catDespesas = ['Ração', 'Medicamentos', 'Mão de Obra', 'Energia', 'Água', 'Manutenção', 'Equipamentos', 'Transporte', 'Outros']

const emptyForm = {
  tipo: 'despesa', categoria: '', descricao: '', valor: '', data: '', lote_id: '', observacoes: ''
}

export default function Financeiro() {
  const { canEdit, canWrite } = useAuth()
  const [registros, setRegistros] = useState([])
  const [lotes, setLotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTipo, setFilterTipo] = useState('')
  const [filterLote, setFilterLote] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    Promise.all([api.get('/api/financeiro'), api.get('/api/lotes')])
      .then(([rf, rl]) => { setRegistros(rf.data); setLotes(rl.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = (tipo = 'despesa') => {
    setEditing(null)
    setForm({ ...emptyForm, tipo })
    setError('')
    setShowModal(true)
  }
  const openEdit = (r) => { setEditing(r); setForm({ ...r }); setError(''); setShowModal(true) }

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/api/financeiro/${editing.id}`, form)
      } else {
        await api.post('/api/financeiro', form)
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
    if (!window.confirm('Excluir este registro financeiro?')) return
    try { await api.delete(`/api/financeiro/${r.id}`); load() }
    catch (e) { alert(e.response?.data?.error || 'Erro') }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filtered = registros.filter(r => {
    const matchTipo = !filterTipo || r.tipo === filterTipo
    const matchLote = !filterLote || String(r.lote_id) === filterLote
    return matchTipo && matchLote
  })

  const totalReceitas = filtered.filter(r => r.tipo === 'receita').reduce((s, r) => s + r.valor, 0)
  const totalDespesas = filtered.filter(r => r.tipo === 'despesa').reduce((s, r) => s + r.valor, 0)
  const saldo = totalReceitas - totalDespesas

  const cats = form.tipo === 'receita' ? catReceitas : catDespesas

  return (
    <Layout title="Financeiro">
      <div className="page-header">
        <div><h1>💰 Financeiro</h1><p>Receitas e despesas da granja</p></div>
        {canWrite() && (
          <div className="actions">
            <button className="btn btn-outline" onClick={() => openCreate('receita')}>+ Receita</button>
            <button className="btn btn-primary" onClick={() => openCreate('despesa')}>+ Despesa</button>
          </div>
        )}
      </div>

      <div className="fin-summary">
        <div className="fin-card receita">
          <div className="fin-label">📈 Receitas</div>
          <div className="fin-value">{fmtMoeda(totalReceitas)}</div>
        </div>
        <div className="fin-card despesa">
          <div className="fin-label">📉 Despesas</div>
          <div className="fin-value">{fmtMoeda(totalDespesas)}</div>
        </div>
        <div className="fin-card saldo">
          <div className="fin-label">💼 Saldo</div>
          <div className="fin-value" style={{ color: saldo >= 0 ? '#198754' : '#dc3545' }}>
            {fmtMoeda(saldo)}
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="filter-bar">
            <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
              <option value="">Receitas e Despesas</option>
              <option value="receita">Apenas Receitas</option>
              <option value="despesa">Apenas Despesas</option>
            </select>
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
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th>Lote</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="table-empty">
                  <span className="empty-icon">💰</span>Nenhum registro financeiro
                </td></tr>
              ) : filtered.map(r => (
                <tr key={r.id}>
                  <td>{fmtData(r.data)}</td>
                  <td>
                    <span className={`badge ${r.tipo === 'receita' ? 'badge-green' : 'badge-red'}`}>
                      {r.tipo === 'receita' ? '📈 Receita' : '📉 Despesa'}
                    </span>
                  </td>
                  <td>{r.categoria || '-'}</td>
                  <td>{r.descricao}</td>
                  <td>{r.lote_numero || '-'}</td>
                  <td>
                    <strong style={{ color: r.tipo === 'receita' ? '#198754' : '#dc3545' }}>
                      {r.tipo === 'receita' ? '+' : '-'}{fmtMoeda(r.valor)}
                    </strong>
                  </td>
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
        <Modal title={editing ? 'Editar Registro' : `Novo Registro — ${form.tipo === 'receita' ? 'Receita' : 'Despesa'}`}
          onClose={() => setShowModal(false)} onSave={handleSave} saving={saving}>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-grid">
            <div className="form-group">
              <label>Tipo *</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
            </div>
            <div className="form-group">
              <label>Categoria</label>
              <select value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                <option value="">Selecione</option>
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group span-2">
              <label>Descrição *</label>
              <input value={form.descricao} onChange={e => set('descricao', e.target.value)}
                placeholder="Descreva o registro..." />
            </div>
            <div className="form-group">
              <label>Valor (R$) *</label>
              <input type="number" step="0.01" min="0" value={form.valor}
                onChange={e => set('valor', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Data *</label>
              <input type="date" value={form.data} onChange={e => set('data', e.target.value)} />
            </div>
            <div className="form-group span-2">
              <label>Lote (opcional)</label>
              <select value={form.lote_id} onChange={e => set('lote_id', e.target.value)}>
                <option value="">Sem lote específico</option>
                {lotes.map(l => <option key={l.id} value={l.id}>{l.numero}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
