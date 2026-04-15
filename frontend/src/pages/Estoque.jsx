import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const categoriaBadge = { racao: 'badge-green', medicamento: 'badge-blue', vacina: 'badge-purple', outro: 'badge-gray' }
const categoriaLabel = { racao: 'Ração', medicamento: 'Medicamento', vacina: 'Vacina', outro: 'Outro' }
const fmtMoeda = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const emptyForm = { nome: '', categoria: 'racao', unidade: 'kg', quantidade: '', custo_unitario: '', estoque_minimo: '', observacoes: '' }

export default function Estoque() {
  const { canEdit, canWrite } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterCat, setFilterCat] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showEntradaModal, setShowEntradaModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [entradaForm, setEntradaForm] = useState({ quantidade: '', custo_unitario: '' })
  const [selectedItem, setSelectedItem] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => api.get('/api/estoque').then(r => setItems(r.data)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowModal(true) }
  const openEdit = (i) => { setEditing(i); setForm({ nome: i.nome, categoria: i.categoria, unidade: i.unidade, quantidade: i.quantidade, custo_unitario: i.custo_unitario, estoque_minimo: i.estoque_minimo, observacoes: i.observacoes || '' }); setError(''); setShowModal(true) }

  const handleSave = async () => {
    setError('')
    if (!form.nome) { setError('Nome é obrigatório'); return }
    setSaving(true)
    try {
      if (editing) { await api.put(`/api/estoque/${editing.id}`, form) }
      else { await api.post('/api/estoque', form) }
      setShowModal(false); load()
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.msg || `Erro ${e.response?.status}`)
    } finally { setSaving(false) }
  }

  const openEntrada = (item) => { setSelectedItem(item); setEntradaForm({ quantidade: '', custo_unitario: item.custo_unitario || '' }); setShowEntradaModal(true) }

  const handleEntrada = async () => {
    if (!entradaForm.quantidade) { alert('Informe a quantidade'); return }
    setSaving(true)
    try { await api.post(`/api/estoque/${selectedItem.id}/entrada`, entradaForm); setShowEntradaModal(false); load() }
    catch (e) { alert(e.response?.data?.error || 'Erro ao registrar entrada') }
    finally { setSaving(false) }
  }

  const handleDelete = async (i) => {
    if (!window.confirm(`Excluir "${i.nome}" do estoque?`)) return
    try { await api.delete(`/api/estoque/${i.id}`); load() }
    catch (e) { alert(e.response?.data?.error || 'Erro') }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const filtered = items.filter(i => !filterCat || i.categoria === filterCat)
  const totalValor = filtered.reduce((s, i) => s + (i.custo_total || 0), 0)
  const alertas = filtered.filter(i => i.abaixo_minimo && i.estoque_minimo > 0).length

  return (
    <Layout title="Estoque">
      <div className="page-header">
        <div><h1>📦 Estoque</h1><p>Controle de insumos e materiais</p></div>
        {canWrite() && <button className="btn btn-primary" onClick={openCreate}>+ Novo Item</button>}
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="stat-card" style={{ flex: 1, minWidth: 160 }}>
          <div className="stat-icon blue">📦</div>
          <div><div className="stat-value">{items.length}</div><div className="stat-label">Itens no estoque</div></div>
        </div>
        <div className="stat-card" style={{ flex: 1, minWidth: 180 }}>
          <div className="stat-icon green">💰</div>
          <div><div className="stat-value" style={{ fontSize: 18 }}>{fmtMoeda(totalValor)}</div><div className="stat-label">Valor em estoque</div></div>
        </div>
        {alertas > 0 && (
          <div className="stat-card" style={{ flex: 1, minWidth: 160, borderLeft: '4px solid #dc3545' }}>
            <div className="stat-icon">⚠️</div>
            <div><div className="stat-value" style={{ color: '#dc3545' }}>{alertas}</div><div className="stat-label">Abaixo do mínimo</div></div>
          </div>
        )}
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="filter-bar">
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="">Todas categorias</option>
              <option value="racao">Ração</option>
              <option value="medicamento">Medicamento</option>
              <option value="vacina">Vacina</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <span style={{ fontSize: 13, color: '#6c757d' }}>{filtered.length} item(s)</span>
        </div>

        {loading ? <div className="loading"><div className="spinner" />Carregando...</div> : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Quantidade</th>
                <th>Custo Unitário</th>
                <th>Valor Total</th>
                <th>Est. Mínimo</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="table-empty"><span className="empty-icon">📦</span>Nenhum item no estoque</td></tr>
              ) : filtered.map(i => (
                <tr key={i.id} style={i.abaixo_minimo && i.estoque_minimo > 0 ? { background: '#fff5f5' } : {}}>
                  <td data-label="Nome"><strong>{i.nome}</strong>{i.observacoes && <div style={{ fontSize: 12, color: '#6c757d' }}>{i.observacoes}</div>}</td>
                  <td data-label="Categoria"><span className={`badge ${categoriaBadge[i.categoria] || 'badge-gray'}`}>{categoriaLabel[i.categoria] || i.categoria}</span></td>
                  <td data-label="Quantidade" style={{ fontWeight: 600, color: i.abaixo_minimo && i.estoque_minimo > 0 ? '#dc3545' : 'inherit' }}>
                    {Number(i.quantidade || 0).toFixed(2)} {i.unidade}
                  </td>
                  <td data-label="Custo Unit.">{fmtMoeda(i.custo_unitario)}/{i.unidade}</td>
                  <td data-label="Valor Total" style={{ color: '#198754', fontWeight: 600 }}>{fmtMoeda(i.custo_total)}</td>
                  <td data-label="Est. Mínimo">{i.estoque_minimo > 0 ? `${Number(i.estoque_minimo).toFixed(2)} ${i.unidade}` : '-'}</td>
                  <td data-label="Situação">
                    {i.estoque_minimo > 0
                      ? <span className={`badge ${i.abaixo_minimo ? 'badge-red' : 'badge-green'}`}>{i.abaixo_minimo ? '⚠️ Baixo' : '✅ OK'}</span>
                      : <span className="badge badge-gray">-</span>}
                  </td>
                  <td data-label="">
                    <div className="actions">
                      {canWrite() && <button className="btn btn-outline btn-sm" style={{ color: '#198754', borderColor: '#198754' }} onClick={() => openEntrada(i)}>+ Entrada</button>}
                      {canEdit() && <button className="btn btn-outline btn-sm" onClick={() => openEdit(i)}>✏️</button>}
                      {canEdit() && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(i)}>🗑️</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? `Editar: ${editing.nome}` : 'Novo Item de Estoque'} onClose={() => setShowModal(false)} onSave={handleSave} saving={saving}>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-grid">
            <div className="form-group span-2">
              <label>Nome *</label>
              <input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Milho, Amoxicilina..." autoFocus />
            </div>
            <div className="form-group">
              <label>Categoria</label>
              <select value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                <option value="racao">Ração</option>
                <option value="medicamento">Medicamento</option>
                <option value="vacina">Vacina</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="form-group">
              <label>Unidade</label>
              <select value={form.unidade} onChange={e => set('unidade', e.target.value)}>
                <option value="kg">kg</option>
                <option value="L">Litros (L)</option>
                <option value="un">Unidades</option>
                <option value="doses">Doses</option>
                <option value="g">gramas (g)</option>
                <option value="ml">ml</option>
              </select>
            </div>
            <div className="form-group">
              <label>Quantidade atual</label>
              <input type="number" step="0.01" min="0" value={form.quantidade} onChange={e => set('quantidade', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Custo unitário (R$/{form.unidade || 'un'})</label>
              <input type="number" step="0.01" min="0" value={form.custo_unitario} onChange={e => set('custo_unitario', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Estoque mínimo ({form.unidade || 'un'})</label>
              <input type="number" step="0.01" min="0" value={form.estoque_minimo} onChange={e => set('estoque_minimo', e.target.value)} placeholder="0 = sem alerta" />
            </div>
            <div className="form-group span-2">
              <label>Observações</label>
              <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2} />
            </div>
          </div>
        </Modal>
      )}

      {showEntradaModal && selectedItem && (
        <Modal title={`Entrada de Estoque: ${selectedItem.nome}`} onClose={() => setShowEntradaModal(false)} onSave={handleEntrada} saving={saving}>
          <div className="form-grid">
            <div className="form-group">
              <label>Quantidade ({selectedItem.unidade}) *</label>
              <input type="number" step="0.01" min="0.01" value={entradaForm.quantidade}
                onChange={e => setEntradaForm(f => ({ ...f, quantidade: e.target.value }))} autoFocus />
            </div>
            <div className="form-group">
              <label>Custo unitário (R$/{selectedItem.unidade})</label>
              <input type="number" step="0.01" min="0" value={entradaForm.custo_unitario}
                onChange={e => setEntradaForm(f => ({ ...f, custo_unitario: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginTop: 8, padding: '8px 12px', background: '#f8f9fa', borderRadius: 6, fontSize: 13, color: '#495057' }}>
            Estoque atual: <strong>{Number(selectedItem.quantidade || 0).toFixed(2)} {selectedItem.unidade}</strong>
            {entradaForm.quantidade && Number(entradaForm.quantidade) > 0 && (
              <> → após entrada: <strong style={{ color: '#198754' }}>{(Number(selectedItem.quantidade || 0) + Number(entradaForm.quantidade)).toFixed(2)} {selectedItem.unidade}</strong></>
            )}
          </div>
        </Modal>
      )}
    </Layout>
  )
}
