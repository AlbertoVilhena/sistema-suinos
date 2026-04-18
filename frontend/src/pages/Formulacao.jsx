import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const fmtMoeda = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
const fmtMoeda2 = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const faseBadge = { maternidade: 'badge-purple', creche: 'badge-blue', crescimento: 'badge-teal', terminacao: 'badge-yellow' }

const emptyForm = { nome: '', descricao: '', fase: '', ativa: true }
const emptyIng = { nome: '', unidade: 'kg', estoque_kg: '', custo_por_kg: '' }

export default function Formulacao() {
  const { canEdit } = useAuth()
  const [tab, setTab] = useState('formulacoes')

  const [formulacoes, setFormulacoes] = useState([])
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingForm, setEditingForm] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [itens, setItens] = useState([])
  const [formError, setFormError] = useState('')
  const [savingForm, setSavingForm] = useState(false)

  const [ingredientes, setIngredientes] = useState([])
  const [showIngModal, setShowIngModal] = useState(false)
  const [editingIng, setEditingIng] = useState(null)
  const [ingForm, setIngForm] = useState(emptyIng)
  const [ingError, setIngError] = useState('')
  const [savingIng, setSavingIng] = useState(false)

  const [loading, setLoading] = useState(true)

  // Estoque import
  const [showImportModal, setShowImportModal] = useState(false)
  const [estoqueRacao, setEstoqueRacao] = useState([])
  const [selectedImport, setSelectedImport] = useState({})
  const [importando, setImportando] = useState(false)

  const load = () => {
    Promise.all([api.get('/api/formulacoes'), api.get('/api/ingredientes')])
      .then(([rf, ri]) => { setFormulacoes(rf.data); setIngredientes(ri.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreateForm = () => { setEditingForm(null); setForm(emptyForm); setItens([]); setFormError(''); setShowFormModal(true) }
  const openEditForm = (f) => {
    setEditingForm(f)
    setForm({ nome: f.nome, descricao: f.descricao || '', fase: f.fase || '', ativa: f.ativa })
    setItens(f.itens.map(i => ({ ingrediente_id: i.ingrediente_id, percentagem: i.percentagem })))
    setFormError(''); setShowFormModal(true)
  }

  const addItem = () => setItens(prev => [...prev, { ingrediente_id: '', percentagem: '' }])
  const removeItem = (idx) => setItens(prev => prev.filter((_, i) => i !== idx))
  const setItem = (idx, key, val) => setItens(prev => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it))

  const totalPct = itens.reduce((s, i) => s + (parseFloat(i.percentagem) || 0), 0)
  const custoPorKg = itens.reduce((s, i) => {
    const ing = ingredientes.find(x => x.id === parseInt(i.ingrediente_id))
    const pct = parseFloat(i.percentagem) || 0
    return s + (pct / 100) * (ing?.custo_por_kg || 0)
  }, 0)

  const handleSaveForm = async () => {
    setFormError('')
    if (!form.nome) { setFormError('Nome e obrigatorio'); return }
    setSavingForm(true)
    try {
      const payload = { ...form, itens: itens.map(i => ({ ingrediente_id: parseInt(i.ingrediente_id), percentagem: parseFloat(i.percentagem) || 0 })) }
      if (editingForm) { await api.put(`/api/formulacoes/${editingForm.id}`, payload) }
      else { await api.post('/api/formulacoes', payload) }
      setShowFormModal(false); load()
    } catch (e) {
      setFormError(e.response?.data?.error || e.response?.data?.msg || `Erro ${e.response?.status}`)
    } finally { setSavingForm(false) }
  }

  const handleDeleteForm = async (f) => {
    if (!window.confirm(`Excluir formulacao "${f.nome}"?`)) return
    try { await api.delete(`/api/formulacoes/${f.id}`); load() }
    catch (e) { alert(e.response?.data?.error || 'Erro ao excluir') }
  }

  const openCreateIng = () => { setEditingIng(null); setIngForm(emptyIng); setIngError(''); setShowIngModal(true) }
  const openEditIng = (i) => {
    setEditingIng(i)
    setIngForm({ nome: i.nome, unidade: i.unidade, estoque_kg: i.estoque_kg, custo_por_kg: i.custo_por_kg })
    setIngError(''); setShowIngModal(true)
  }

  const handleSaveIng = async () => {
    setIngError('')
    if (!ingForm.nome) { setIngError('Nome e obrigatorio'); return }
    setSavingIng(true)
    try {
      if (editingIng) { await api.put(`/api/ingredientes/${editingIng.id}`, ingForm) }
      else { await api.post('/api/ingredientes', ingForm) }
      setShowIngModal(false); load()
    } catch (e) {
      setIngError(e.response?.data?.error || `Erro ${e.response?.status}`)
    } finally { setSavingIng(false) }
  }

  const handleDeleteIng = async (i) => {
    if (!window.confirm(`Excluir ingrediente "${i.nome}"?`)) return
    try { await api.delete(`/api/ingredientes/${i.id}`); load() }
    catch (e) { alert(e.response?.data?.error || 'Erro ao excluir') }
  }

  const openImportEstoque = async () => {
    try {
      const res = await api.get('/api/estoque')
      const racaoItems = res.data.filter(i => i.categoria === 'racao')
      setEstoqueRacao(racaoItems)
      const sel = {}
      racaoItems.forEach(i => { sel[i.id] = false })
      setSelectedImport(sel)
      setShowImportModal(true)
    } catch (e) {
      alert('Erro ao carregar estoque')
    }
  }

  const handleImportConfirm = async () => {
    const toImport = estoqueRacao.filter(i => selectedImport[i.id])
    if (toImport.length === 0) { alert('Selecione pelo menos um item'); return }
    setImportando(true)
    try {
      for (const item of toImport) {
        const existing = ingredientes.find(ing => ing.nome.toLowerCase() === item.nome.toLowerCase())
        if (existing) {
          await api.put(`/api/ingredientes/${existing.id}`, {
            custo_por_kg: item.custo_unitario,
            estoque_kg: item.quantidade
          })
        } else {
          await api.post('/api/ingredientes', {
            nome: item.nome,
            unidade: item.unidade,
            estoque_kg: item.quantidade,
            custo_por_kg: item.custo_unitario,
            ativo: true
          })
        }
      }
      setShowImportModal(false)
      load()
      alert(`${toImport.length} ingrediente(s) importado(s) do estoque!`)
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao importar')
    } finally { setImportando(false) }
  }

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setI = (k, v) => setIngForm(f => ({ ...f, [k]: v }))

  if (loading) return <Layout title="Formulacao de Racao"><div className="loading"><div className="spinner" /> Carregando...</div></Layout>

  return (
    <Layout title="Formulacao de Racao">
      <div className="page-header">
        <div><h1>Formulacao de Racao</h1><p>Gerencie ingredientes e receitas de racao</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canEdit() && tab === 'formulacoes' && (
            <button className="btn btn-primary" onClick={openCreateForm}>+ Nova Formulacao</button>
          )}
          {canEdit() && tab === 'ingredientes' && (
            <>
              <button className="btn btn-outline" onClick={openImportEstoque}>Importar do Estoque</button>
              <button className="btn btn-primary" onClick={openCreateIng}>+ Novo Ingrediente</button>
            </>
          )}
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'formulacoes' ? 'active' : ''}`} onClick={() => setTab('formulacoes')}>Formulacoes</div>
        <div className={`tab ${tab === 'ingredientes' ? 'active' : ''}`} onClick={() => setTab('ingredientes')}>Ingredientes/Estoque</div>
      </div>

      {tab === 'formulacoes' && (
        <div>
          {formulacoes.length === 0 ? (
            <div className="table-container">
              <div className="table-empty"><span className="empty-icon">🧪</span>Nenhuma formulacao cadastrada</div>
            </div>
          ) : formulacoes.map(f => (
            <div key={f.id} className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <strong style={{ fontSize: 16 }}>{f.nome}</strong>
                    {f.fase && <span className={`badge ${faseBadge[f.fase] || 'badge-gray'}`}>{f.fase}</span>}
                    <span className={`badge ${f.ativa ? 'badge-green' : 'badge-gray'}`}>{f.ativa ? 'Ativa' : 'Inativa'}</span>
                  </div>
                  {f.descricao && <div style={{ color: '#6c757d', fontSize: 13, marginBottom: 8 }}>{f.descricao}</div>}
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontSize: 12, color: '#6c757d' }}>Custo por kg</span>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#198754' }}>{fmtMoeda(f.custo_por_kg)}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 12, color: '#6c757d' }}>Total %</span>
                      <div style={{ fontSize: 20, fontWeight: 700, color: Math.abs(f.total_percentagem - 100) < 0.01 ? '#198754' : '#dc3545' }}>
                        {f.total_percentagem}%
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: 12, color: '#6c757d' }}>Ingredientes</span>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{f.itens.length}</div>
                    </div>
                  </div>
                </div>
                {canEdit() && (
                  <div className="actions">
                    <button className="btn btn-outline btn-sm" onClick={() => openEditForm(f)}>Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteForm(f)}>🗑️</button>
                  </div>
                )}
              </div>
              {f.itens.length > 0 && (
                <div style={{ marginTop: 12, borderTop: '1px solid #e9ecef', paddingTop: 12 }}>
                  <table style={{ width: '100%', fontSize: 13 }}>
                    <thead><tr>
                      <th style={{ textAlign: 'left', padding: '4px 8px', color: '#6c757d' }}>Ingrediente</th>
                      <th style={{ textAlign: 'right', padding: '4px 8px', color: '#6c757d' }}>%</th>
                      <th style={{ textAlign: 'right', padding: '4px 8px', color: '#6c757d' }}>Custo/kg</th>
                      <th style={{ textAlign: 'right', padding: '4px 8px', color: '#6c757d' }}>Custo proporcional</th>
                      <th style={{ textAlign: 'right', padding: '4px 8px', color: '#6c757d' }}>Estoque</th>
                    </tr></thead>
                    <tbody>
                      {f.itens.map(item => (
                        <tr key={item.id}>
                          <td style={{ padding: '4px 8px' }}>{item.ingrediente_nome}</td>
                          <td style={{ textAlign: 'right', padding: '4px 8px' }}>{item.percentagem}%</td>
                          <td style={{ textAlign: 'right', padding: '4px 8px' }}>{fmtMoeda2(item.custo_unitario)}</td>
                          <td style={{ textAlign: 'right', padding: '4px 8px', color: '#198754' }}>{fmtMoeda(item.custo_proporcional)}</td>
                          <td style={{ textAlign: 'right', padding: '4px 8px' }}>
                            <span className={`badge ${item.estoque_disponivel > 0 ? 'badge-green' : 'badge-red'}`}>
                              {item.estoque_disponivel} {item.ingrediente_unidade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'ingredientes' && (
        <div className="table-container">
          <table>
            <thead><tr>
              <th>Ingrediente</th><th>Unidade</th><th>Estoque</th><th>Custo/kg</th><th>Status</th><th>Acoes</th>
            </tr></thead>
            <tbody>
              {ingredientes.length === 0 ? (
                <tr><td colSpan={6} className="table-empty"><span className="empty-icon">🌽</span>Nenhum ingrediente cadastrado</td></tr>
              ) : ingredientes.map(i => (
                <tr key={i.id}>
                  <td><strong>{i.nome}</strong></td>
                  <td>{i.unidade}</td>
                  <td><span className={`badge ${i.estoque_kg > 0 ? 'badge-green' : 'badge-red'}`}>{i.estoque_kg} {i.unidade}</span></td>
                  <td style={{ fontWeight: 600, color: '#198754' }}>{fmtMoeda2(i.custo_por_kg)}</td>
                  <td><span className={`badge ${i.ativo ? 'badge-green' : 'badge-gray'}`}>{i.ativo ? 'Ativo' : 'Inativo'}</span></td>
                  <td><div className="actions">
                    {canEdit() && <button className="btn btn-outline btn-sm" onClick={() => openEditIng(i)}>✏️</button>}
                    {canEdit() && <button className="btn btn-danger btn-sm" onClick={() => handleDeleteIng(i)}>🗑️</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showFormModal && (
        <Modal title={editingForm ? `Editar: ${editingForm.nome}` : 'Nova Formulacao de Racao'}
          onClose={() => setShowFormModal(false)} onSave={handleSaveForm} saving={savingForm}>
          {formError && <div className="error-msg">{formError}</div>}
          <div className="form-grid">
            <div className="form-group"><label>Nome da Formulacao *</label>
              <input value={form.nome} onChange={e => setF('nome', e.target.value)} placeholder="Ex: Racao Creche 20kg" />
            </div>
            <div className="form-group"><label>Fase</label>
              <select value={form.fase} onChange={e => setF('fase', e.target.value)}>
                <option value="">Todas as fases</option>
                <option value="maternidade">Maternidade</option>
                <option value="creche">Creche</option>
                <option value="crescimento">Crescimento</option>
                <option value="terminacao">Terminacao</option>
              </select>
            </div>
            <div className="form-group span-2"><label>Descricao</label>
              <textarea value={form.descricao} onChange={e => setF('descricao', e.target.value)} rows={2} />
            </div>
            <div className="form-group"><label>Status</label>
              <select value={form.ativa ? 'true' : 'false'} onChange={e => setF('ativa', e.target.value === 'true')}>
                <option value="true">Ativa</option><option value="false">Inativa</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 20, borderTop: '1px solid #e9ecef', paddingTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <strong>Ingredientes</strong>
              <button className="btn btn-outline btn-sm" type="button" onClick={addItem}>+ Adicionar</button>
            </div>
            {itens.map((item, idx) => {
              const ing = ingredientes.find(x => x.id === parseInt(item.ingrediente_id))
              const pct = parseFloat(item.percentagem) || 0
              const custo = pct > 0 && ing ? (pct / 100) * ing.custo_por_kg : 0
              return (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                  <div><label style={{ fontSize: 12 }}>Ingrediente</label>
                    <select value={item.ingrediente_id} onChange={e => setItem(idx, 'ingrediente_id', e.target.value)}>
                      <option value="">Selecione...</option>
                      {ingredientes.filter(i => i.ativo).map(i => (
                        <option key={i.id} value={i.id}>{i.nome} — R${i.custo_por_kg}/kg (est: {i.estoque_kg}{i.unidade})</option>
                      ))}
                    </select>
                  </div>
                  <div><label style={{ fontSize: 12 }}>% na racao {custo > 0 && <span style={{ color: '#198754' }}>= R${custo.toFixed(4)}/kg</span>}</label>
                    <input type="number" min="0" max="100" step="0.01" value={item.percentagem}
                      onChange={e => setItem(idx, 'percentagem', e.target.value)} placeholder="0.00" />
                  </div>
                  <button className="btn btn-danger btn-sm" type="button" onClick={() => removeItem(idx)} style={{ marginBottom: 0 }}>x</button>
                </div>
              )
            })}
            {itens.length > 0 && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: '#f8f9fa', borderRadius: 8, display: 'flex', gap: 24 }}>
                <div>
                  <span style={{ fontSize: 12, color: '#6c757d' }}>Total %: </span>
                  <strong style={{ color: Math.abs(totalPct - 100) < 0.01 ? '#198754' : '#dc3545' }}>{totalPct.toFixed(2)}%</strong>
                  {Math.abs(totalPct - 100) >= 0.01 && <span style={{ fontSize: 11, color: '#dc3545', marginLeft: 4 }}>(deve ser 100%)</span>}
                </div>
                <div>
                  <span style={{ fontSize: 12, color: '#6c757d' }}>Custo/kg calculado: </span>
                  <strong style={{ color: '#198754', fontSize: 15 }}>{fmtMoeda(custoPorKg)}</strong>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {showIngModal && (
        <Modal title={editingIng ? `Editar: ${editingIng.nome}` : 'Novo Ingrediente'}
          onClose={() => setShowIngModal(false)} onSave={handleSaveIng} saving={savingIng}>
          {ingError && <div className="error-msg">{ingError}</div>}
          <div className="form-grid">
            <div className="form-group span-2"><label>Nome *</label>
              <input value={ingForm.nome} onChange={e => setI('nome', e.target.value)} placeholder="Ex: Milho grao, Farelo de soja..." />
            </div>
            <div className="form-group"><label>Unidade</label>
              <select value={ingForm.unidade} onChange={e => setI('unidade', e.target.value)}>
                <option value="kg">kg</option><option value="g">g</option>
                <option value="L">L</option><option value="un">un</option>
              </select>
            </div>
            <div className="form-group"><label>Estoque ({ingForm.unidade})</label>
              <input type="number" min="0" step="0.01" value={ingForm.estoque_kg} onChange={e => setI('estoque_kg', e.target.value)} placeholder="0" />
            </div>
            <div className="form-group"><label>Custo por {ingForm.unidade} (R$)</label>
              <input type="number" min="0" step="0.0001" value={ingForm.custo_por_kg} onChange={e => setI('custo_por_kg', e.target.value)} placeholder="0.0000" />
            </div>
          </div>
        </Modal>
      )}

      {showImportModal && (
        <Modal title="Importar Ingredientes do Estoque (Racao)"
          onClose={() => setShowImportModal(false)}
          onSave={handleImportConfirm}
          saving={importando}
          saveLabel="Importar Selecionados">
          {estoqueRacao.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#6c757d' }}>
              Nenhum item de estoque com categoria "Racao" encontrado.
              <br />Cadastre itens no Estoque com categoria Racao primeiro.
            </div>
          ) : (
            <div>
              <p style={{ color: '#6c757d', fontSize: 13, marginBottom: 12 }}>
                Selecione os itens do estoque para importar como ingredientes.
                Se o ingrediente ja existir (mesmo nome), seu custo e estoque serao atualizados.
              </p>
              {estoqueRacao.map(item => {
                const existing = ingredientes.find(ing => ing.nome.toLowerCase() === item.nome.toLowerCase())
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <input type="checkbox" id={`imp-${item.id}`}
                      checked={!!selectedImport[item.id]}
                      onChange={e => setSelectedImport(s => ({ ...s, [item.id]: e.target.checked }))}
                      style={{ marginTop: 3, flexShrink: 0 }} />
                    <label htmlFor={`imp-${item.id}`} style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.nome}</div>
                      <div style={{ color: '#6c757d', fontSize: 12, marginTop: 2 }}>
                        Estoque: {Number(item.quantidade).toFixed(2)} {item.unidade} · Custo: R$ {Number(item.custo_unitario).toFixed(4)}/{item.unidade}
                      </div>
                      {existing && <span className="badge badge-blue" style={{ fontSize: 11, marginTop: 4, display: 'inline-block' }}>já existe — será atualizado</span>}
                    </label>
                  </div>
                )
              })}
            </div>
          )}
        </Modal>
      )}
    </Layout>
  )
}
