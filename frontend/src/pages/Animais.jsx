import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
const statusBadge = { ativo: 'badge-green', morto: 'badge-red', vendido: 'badge-blue', transferido: 'badge-purple' }
const sexoBadge = { macho: 'badge-blue', femea: 'badge-purple' }

const emptyForm = {
  lote_id: '', brinco: '', sexo: 'macho', raca: '', data_nascimento: '',
  peso_entrada: '', peso_atual: '', status: 'ativo',
  origem: 'comprado', custo_aquisicao: '', observacoes: ''
}

const emptyBatch = {
  lote_id: '', quantidade: '', sexo: 'macho', raca: '', peso_entrada: '',
  origem: 'nascido', custo_aquisicao: '', prefixo_brinco: '', numero_inicial: '1'
}

export default function Animais() {
  const { canEdit, canWrite } = useAuth()
  const toast = useToast()
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
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchForm, setBatchForm] = useState(emptyBatch)
  const [batchError, setBatchError] = useState('')
  const [batchResult, setBatchResult] = useState(null)

  const load = () => {
    Promise.all([api.get('/api/animais'), api.get('/api/lotes')])
      .then(([ra, rl]) => { setAnimais(ra.data); setLotes(rl.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowModal(true) }
  const openEdit = (a) => { setEditing(a); setForm({ ...a, data_nascimento: a.data_nascimento || '' }); setError(''); setShowModal(true) }

  const handleSave = async () => {
    setError(''); setSaving(true)
    try {
      if (editing) { await api.put(`/api/animais/${editing.id}`, form) }
      else { await api.post('/api/animais', form) }
      setShowModal(false); load()
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.msg || `Erro ${e.response?.status}`)
    } finally { setSaving(false) }
  }

  const handleDelete = async (a) => {
    if (!window.confirm(`Excluir animal ${a.brinco || '#' + a.id}?`)) return
    try { await api.delete(`/api/animais/${a.id}`); load() }
    catch (e) { toast.error(e.response?.data?.error || 'Erro ao excluir animal') }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setBatch = (k, v) => setBatchForm(f => {
    const u = { ...f, [k]: v }
    if (k === 'lote_id' && v) u.prefixo_brinco = `L${v}-`
    return u
  })

  const handleBatchSave = async () => {
    setBatchError(''); setBatchResult(null)
    if (!batchForm.lote_id) { setBatchError('Selecione o lote'); return }
    if (!batchForm.quantidade || Number(batchForm.quantidade) <= 0) { setBatchError('Informe a quantidade'); return }
    setSaving(true)
    try {
      const res = await api.post(`/api/lotes/${batchForm.lote_id}/criar-animais`, batchForm)
      setBatchResult(res.data); load()
    } catch (e) {
      setBatchError(e.response?.data?.error || 'Erro ao criar animais em lote')
    } finally { setSaving(false) }
  }

  const filtered = animais.filter(a => {
    const s = search.toLowerCase()
    const matchSearch = !s || (a.brinco || '').toLowerCase().includes(s) || (a.raca || '').toLowerCase().includes(s)
    const matchLote = !filterLote || String(a.lote_id) === filterLote
    const matchStatus = !filterStatus || a.status === filterStatus
    return matchSearch && matchLote && matchStatus
  })

  const previewPfx = batchForm.prefixo_brinco || (batchForm.lote_id ? `L${batchForm.lote_id}-` : 'L-')
  const previewIni = Number(batchForm.numero_inicial) || 1
  const previewFim = previewIni + (Number(batchForm.quantidade) || 0) - 1

  return (
    <Layout title="Animais">
      <div className="page-header">
        <div><h1>Animais</h1><p>{animais.length} animal(is) cadastrado(s)</p></div>
        <div className="actions">
          {canWrite() && <button className="btn btn-outline" onClick={() => { setBatchForm(emptyBatch); setBatchError(''); setBatchResult(null); setShowBatchModal(true) }}>Criar em Lote</button>}
          {canWrite() && <button className="btn btn-primary" onClick={openCreate}>+ Novo Animal</button>}
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="filter-bar">
            <input className="search-input" placeholder="Buscar brinco ou raca..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <select value={filterLote} onChange={e => setFilterLote(e.target.value)}>
              <option value="">Todos os lotes</option>
              {lotes.map(l => <option key={l.id} value={l.id}>{l.numero}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Todos os status</option>
              <option value="ativo">Ativo</option><option value="morto">Morto</option>
              <option value="vendido">Vendido</option><option value="transferido">Transferido</option>
            </select>
          </div>
          <span style={{ fontSize: 13, color: '#6c757d' }}>{filtered.length} resultado(s)</span>
        </div>

        {loading ? <div className="loading"><div className="spinner" /> Carregando...</div> : (
          <table>
            <thead><tr>
              <th>Brinco</th><th>Lote</th><th>Sexo</th><th>Raca</th>
              <th>Nasc.</th><th>Peso Entrada</th><th>Peso Atual</th><th>Status</th><th>Acoes</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="table-empty"><span className="empty-icon">🐷</span>Nenhum animal encontrado</td></tr>
              ) : filtered.map(a => (
                <tr key={a.id}>
                  <td data-label="Brinco"><strong>{a.brinco || '-'}</strong></td>
                  <td data-label="Lote">{a.lote_numero || '-'}</td>
                  <td data-label="Sexo"><span className={`badge ${sexoBadge[a.sexo] || 'badge-gray'}`}>{a.sexo || '-'}</span></td>
                  <td data-label="Raça">{a.raca || '-'}</td>
                  <td data-label="Nascimento">{fmtData(a.data_nascimento)}</td>
                  <td data-label="Peso Entrada">{a.peso_entrada ? `${a.peso_entrada} kg` : '-'}</td>
                  <td data-label="Peso Atual">{a.peso_atual ? `${a.peso_atual} kg` : '-'}</td>
                  <td data-label="Status"><span className={`badge ${statusBadge[a.status] || 'badge-gray'}`}>{a.status}</span></td>
                  <td data-label=""><div className="actions">
                    {canWrite() && <button className="btn btn-outline btn-sm" onClick={() => openEdit(a)}>✏️</button>}
                    {canEdit() && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a)}>🗑️</button>}
                  </div></td>
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
            <div className="form-group"><label>Brinco</label>
              <input value={form.brinco} onChange={e => set('brinco', e.target.value)} placeholder="Ex: A001" />
            </div>
            <div className="form-group"><label>Sexo</label>
              <select value={form.sexo} onChange={e => set('sexo', e.target.value)}>
                <option value="macho">Macho</option><option value="femea">Femea</option>
              </select>
            </div>
            <div className="form-group"><label>Raca</label>
              <input value={form.raca} onChange={e => set('raca', e.target.value)} placeholder="Ex: Large White" />
            </div>
            <div className="form-group"><label>Data de Nascimento</label>
              <input type="date" value={form.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} />
            </div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="ativo">Ativo</option><option value="morto">Morto</option>
                <option value="vendido">Vendido</option><option value="transferido">Transferido</option>
              </select>
            </div>
            <div className="form-group"><label>Origem</label>
              <select value={form.origem} onChange={e => set('origem', e.target.value)}>
                <option value="comprado">Comprado (leitao)</option>
                <option value="nascido">Nascido na granja</option>
              </select>
            </div>
            <div className="form-group"><label>Custo de Aquisicao (R$)</label>
              <input type="number" step="0.01" min="0" value={form.custo_aquisicao}
                onChange={e => set('custo_aquisicao', e.target.value)}
                disabled={form.origem === 'nascido'} />
            </div>
            <div className="form-group"><label>Peso Entrada (kg)</label>
              <input type="number" step="0.1" value={form.peso_entrada} onChange={e => set('peso_entrada', e.target.value)} />
            </div>
            <div className="form-group"><label>Peso Atual (kg)</label>
              <input type="number" step="0.1" value={form.peso_atual} onChange={e => set('peso_atual', e.target.value)} />
            </div>
            <div className="form-group span-2"><label>Observacoes</label>
              <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
            </div>
          </div>
        </Modal>
      )}

      {showBatchModal && (
        <Modal title="Criar Animais em Lote"
          onClose={() => setShowBatchModal(false)}
          onSave={batchResult ? null : handleBatchSave}
          saving={saving} saveLabel="Criar Animais">
          {batchError && <div className="error-msg">{batchError}</div>}
          {batchResult ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#198754', marginBottom: 8 }}>
                {batchResult.criados} animais criados com sucesso!
              </div>
              {batchResult.brincos && <div style={{ fontSize: 13, color: '#6c757d' }}>
                Primeiros brincos: {batchResult.brincos.join(', ')}
              </div>}
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowBatchModal(false)}>Fechar</button>
            </div>
          ) : (
            <div className="form-grid">
              <div className="form-group"><label>Lote *</label>
                <select value={batchForm.lote_id} onChange={e => setBatch('lote_id', e.target.value)}>
                  <option value="">Selecione o lote</option>
                  {lotes.map(l => <option key={l.id} value={l.id}>{l.numero}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Quantidade *</label>
                <input type="number" min="1" max="500" value={batchForm.quantidade}
                  onChange={e => setBatch('quantidade', e.target.value)} placeholder="Ex: 20" />
              </div>
              <div className="form-group"><label>Sexo</label>
                <select value={batchForm.sexo} onChange={e => setBatch('sexo', e.target.value)}>
                  <option value="macho">Macho</option><option value="femea">Femea</option>
                </select>
              </div>
              <div className="form-group"><label>Raca</label>
                <input value={batchForm.raca} onChange={e => setBatch('raca', e.target.value)} />
              </div>
              <div className="form-group"><label>Peso de Entrada (kg)</label>
                <input type="number" step="0.1" min="0" value={batchForm.peso_entrada}
                  onChange={e => setBatch('peso_entrada', e.target.value)} />
              </div>
              <div className="form-group"><label>Origem</label>
                <select value={batchForm.origem} onChange={e => setBatch('origem', e.target.value)}>
                  <option value="nascido">Nascido na granja</option>
                  <option value="comprado">Comprado</option>
                </select>
              </div>
              <div className="form-group"><label>Prefixo do Brinco</label>
                <input value={batchForm.prefixo_brinco} onChange={e => setBatch('prefixo_brinco', e.target.value)}
                  placeholder={batchForm.lote_id ? `L${batchForm.lote_id}-` : 'Ex: L1-'} />
              </div>
              <div className="form-group"><label>Numero Inicial</label>
                <input type="number" min="1" value={batchForm.numero_inicial}
                  onChange={e => setBatch('numero_inicial', e.target.value)} />
              </div>
              {batchForm.quantidade && batchForm.lote_id && (
                <div className="form-group span-2" style={{ padding: '8px 12px', background: '#f8f9fa', borderRadius: 6, fontSize: 13 }}>
                  Serao criados {batchForm.quantidade} animais:
                  {' '}<strong>{previewPfx + String(previewIni).padStart(3, '0')}</strong>
                  {' '}ate{' '}
                  <strong>{previewPfx + String(previewFim).padStart(3, '0')}</strong>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </Layout>
  )
}
