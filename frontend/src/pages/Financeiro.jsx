import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
const fmtMoeda = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const catReceitas = ['Venda de Animais', 'Venda de Leitoes', 'Subsidio', 'Outros']
const catDespesas = ['Racao', 'Medicamentos', 'Mao de Obra', 'Energia', 'Agua', 'Manutencao', 'Equipamentos', 'Transporte', 'Outros']

const today = new Date().toISOString().split('T')[0]

const emptyForm = {
  tipo: 'despesa', categoria: '', descricao: '', valor: '', data: today,
  lote_id: '', observacoes: '', insumo_id: '', insumo_quantidade: ''
}

export default function Financeiro() {
  const { canEdit, canWrite } = useAuth()
  const [registros, setRegistros] = useState([])
  const [lotes, setLotes] = useState([])
  const [estoqueItems, setEstoqueItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTipo, setFilterTipo] = useState('')
  const [filterLote, setFilterLote] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    Promise.all([
      api.get('/api/financeiro'),
      api.get('/api/lotes'),
      api.get('/api/estoque')
    ]).then(([rf, rl, re]) => {
      setRegistros(rf.data)
      setLotes(rl.data)
      setEstoqueItems(re.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = (tipo = 'despesa') => {
    setEditing(null); setForm({ ...emptyForm, tipo }); setError(''); setShowModal(true)
  }
  const openEdit = (r) => { setEditing(r); setForm({ ...emptyForm, ...r }); setError(''); setShowModal(true) }

  const handleSave = async () => {
    setError(''); setSaving(true)
    try {
      if (editing) { await api.put(`/api/financeiro/${editing.id}`, form) }
      else { await api.post('/api/financeiro', form) }
      setShowModal(false); load()
    } catch (e) {
      const msg = e.response?.data?.error || e.response?.data?.msg || `Erro ${e.response?.status}`
      setError(msg)
    } finally { setSaving(false) }
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

  const selectedEstoque = estoqueItems.find(i => String(i.id) === String(form.insumo_id))

  return (
    <Layout title="Financeiro">
      <div className="page-header">
        <div><h1>Financeiro</h1><p>Receitas e despesas da granja</p></div>
        {canWrite() && (
          <div className="actions">
            <button className="btn btn-outline" onClick={() => openCreate('receita')}>+ Receita</button>
            <button className="btn btn-primary" onClick={() => openCreate('despesa')}>+ Despesa</button>
          </div>
        )}
      </div>

      <div className="fin-summary">
        <div className="fin-card receita">
          <div className="fin-label">Receitas</div>
          <div className="fin-value">{fmtMoeda(totalReceitas)}</div>
        </div>
        <div className="fin-card despesa">
          <div className="fin-label">Despesas</div>
          <div className="fin-value">{fmtMoeda(totalDespesas)}</div>
        </div>
        <div className="fin-card saldo">
          <div className="fin-label">Saldo</div>
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
            <thead><tr>
              <th>Data</th><th>Tipo</th><th>Categoria</th><th>Descricao</th><th>Lote</th><th>Valor</th><th>Acoes</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="table-empty"><span className="empty-icon">💰</span>Nenhum registro financeiro</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id}>
                  <td data-label="Data">{fmtData(r.data)}</td>
                  <td data-label="Tipo"><span className={`badge ${r.tipo === 'receita' ? 'badge-green' : 'badge-red'}`}>
                    {r.tipo === 'receita' ? 'Receita' : 'Despesa'}
                  </span></td>
                  <td data-label="Categoria">{r.categoria || '-'}</td>
                  <td data-label="Descrição">{r.descricao}</td>
                  <td data-label="Lote">{r.lote_numero || '-'}</td>
                  <td data-label="Valor"><strong style={{ color: r.tipo === 'receita' ? '#198754' : '#dc3545' }}>
                    {r.tipo === 'receita' ? '+' : '-'}{fmtMoeda(r.valor)}
                  </strong></td>
                  <td data-label=""><div className="actions">
                    {canWrite() && <button className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>✏️</button>}
                    {canEdit() && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r)}>🗑️</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? 'Editar Registro' : `Novo Registro - ${form.tipo === 'receita' ? 'Receita' : 'Despesa'}`}
          onClose={() => setShowModal(false)} onSave={handleSave} saving={saving}>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-grid">
            <div className="form-group"><label>Tipo *</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
            </div>
            <div className="form-group"><label>Categoria</label>
              <select value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                <option value="">Selecione</option>
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group span-2"><label>Descricao *</label>
              <input value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Descreva o registro..." />
            </div>
            <div className="form-group"><label>Valor (R$) *</label>
              <input type="number" step="0.01" min="0" value={form.valor} onChange={e => set('valor', e.target.value)} />
            </div>
            <div className="form-group"><label>Data *</label>
              <input type="date" value={form.data} onChange={e => set('data', e.target.value)} />
            </div>
            <div className="form-group span-2"><label>Lote (opcional)</label>
              <select value={form.lote_id} onChange={e => set('lote_id', e.target.value)}>
                <option value="">Sem lote especifico</option>
                {lotes.map(l => <option key={l.id} value={l.id}>{l.numero}</option>)}
              </select>
            </div>
            {form.tipo === 'despesa' && (
              <div className="form-group span-2" style={{ borderTop: '1px solid #e9ecef', paddingTop: 12, marginTop: 4 }}>
                <label>Vincular ao Estoque (opcional)</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <select style={{ flex: 2 }} value={form.insumo_id} onChange={e => set('insumo_id', e.target.value)}>
                    <option value="">Nenhum</option>
                    {estoqueItems.map(i => (
                      <option key={i.id} value={i.id}>{i.nome} ({Number(i.quantidade).toFixed(2)} {i.unidade})</option>
                    ))}
                  </select>
                  {form.insumo_id && (
                    <input type="number" step="0.01" min="0" style={{ flex: 1, minWidth: 100 }}
                      placeholder={`Qtd (${selectedEstoque?.unidade || ''})`}
                      value={form.insumo_quantidade} onChange={e => set('insumo_quantidade', e.target.value)} />
                  )}
                </div>
                {form.insumo_id && selectedEstoque && (
                  <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span>Estoque atual: <strong>{Number(selectedEstoque.quantidade).toFixed(2)} {selectedEstoque.unidade}</strong></span>
                    <span>Custo atual: <strong>R$ {Number(selectedEstoque.custo_unitario).toFixed(4)}/{selectedEstoque.unidade}</strong></span>
                    {form.insumo_quantidade && form.valor && (
                      <span style={{ color: '#0d6efd' }}>Novo custo: <strong>R$ {(Number(form.valor) / Number(form.insumo_quantidade)).toFixed(4)}/{selectedEstoque.unidade}</strong></span>
                    )}
                    {form.insumo_quantidade && (
                      <span style={{ color: '#198754' }}>Após entrada: <strong>{(Number(selectedEstoque.quantidade) + Number(form.insumo_quantidade)).toFixed(2)} {selectedEstoque.unidade}</strong></span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </Layout>
  )
}
