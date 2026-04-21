import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
const fmtMoeda = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const today = new Date().toISOString().split('T')[0]

const emptyForm = {
  destino_tipo: 'lote',
  lote_id: '', animal_id: '', plantel_brinco: '',
  vacina: '', data: today, dose: '', responsavel: '', custo: '', observacoes: ''
}

export default function Sanidade() {
  const { canEdit, canWrite } = useAuth()
  const [vacinacoes, setVacinacoes] = useState([])
  const [lotes, setLotes] = useState([])
  const [plantel, setPlantel] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDestino, setFilterDestino] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    Promise.all([
      api.get('/api/vacinacoes'),
      api.get('/api/lotes'),
      api.get('/api/plantel'),
    ])
      .then(([rv, rl, rp]) => {
        setVacinacoes(rv.data)
        setLotes(rl.data)
        setPlantel(rp.data.filter(p => p.status === 'ativo'))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowModal(true) }
  const openEdit = (v) => {
    setEditing(v)
    setForm({
      ...emptyForm, ...v,
      destino_tipo: v.plantel_brinco ? 'plantel' : 'lote',
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
        payload.animal_id = ''
      } else {
        payload.plantel_brinco = ''
      }
      delete payload.destino_tipo

      if (editing) {
        await api.put(`/api/vacinacoes/${editing.id}`, payload)
      } else {
        await api.post('/api/vacinacoes', payload)
      }
      setShowModal(false)
      load()
    } catch (e) {
      const msg = e.response?.data?.error || e.response?.data?.msg || (e.response ? `Erro ${e.response.status}: ${JSON.stringify(e.response.data)}` : 'Sem resposta do servidor')
      setError(msg)
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

  const totalCusto = vacinacoes.reduce((s, v) => s + (v.custo || 0), 0)

  const filtered = vacinacoes.filter(v => {
    const s = search.toLowerCase()
    const matchSearch = !s
      || v.vacina.toLowerCase().includes(s)
      || (v.responsavel || '').toLowerCase().includes(s)
      || (v.lote_numero || '').toLowerCase().includes(s)
      || (v.plantel_brinco || '').toLowerCase().includes(s)
    const matchDestino = !filterDestino
      || (filterDestino === 'plantel' && !!v.plantel_brinco)
      || String(v.lote_id) === filterDestino
    return matchSearch && matchDestino
  })

  const plantelAnimal = plantel.find(p => p.brinco === form.plantel_brinco)

  return (
    <Layout title="Sanidade">
      <div className="page-header">
        <div><h1>💉 Sanidade</h1><p>Controle de vacinações e tratamentos</p></div>
        {canWrite() && <button className="btn btn-primary" onClick={openCreate}>+ Registrar Vacinação</button>}
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="stat-card" style={{ flex: 1, minWidth: 180 }}>
          <div className="stat-icon blue">💉</div>
          <div><div className="stat-value">{vacinacoes.length}</div><div className="stat-label">Total de registros</div></div>
        </div>
        <div className="stat-card" style={{ flex: 1, minWidth: 180 }}>
          <div className="stat-icon orange">💰</div>
          <div><div className="stat-value">{fmtMoeda(totalCusto)}</div><div className="stat-label">Custo total sanitário</div></div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="filter-bar">
            <input className="search-input" placeholder="Buscar vacina, responsável, brinco..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <select value={filterDestino} onChange={e => setFilterDestino(e.target.value)}>
              <option value="">Todos</option>
              <option value="plantel">🐷 Plantel Reprodutivo</option>
              {lotes.map(l => <option key={l.id} value={String(l.id)}>{l.numero}</option>)}
            </select>
          </div>
          <span style={{ fontSize: 13, color: '#6c757d' }}>{filtered.length} registro(s)</span>
        </div>

        {loading ? <div className="loading"><div className="spinner" /> Carregando...</div> : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Vacina / Medicamento</th>
                <th>Destino</th>
                <th>Dose</th>
                <th>Responsável</th>
                <th>Custo</th>
                <th>Observações</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="table-empty">
                  <span className="empty-icon">💉</span>Nenhuma vacinação registrada
                </td></tr>
              ) : filtered.map(v => (
                <tr key={v.id}>
                  <td data-label="Data">{fmtData(v.data)}</td>
                  <td data-label="Vacina/Med."><strong>{v.vacina}</strong></td>
                  <td data-label="Destino">
                    {v.plantel_brinco
                      ? <span className="badge badge-purple">🐷 {v.plantel_brinco}</span>
                      : v.lote_numero || '-'}
                  </td>
                  <td data-label="Dose">{v.dose || '-'}</td>
                  <td data-label="Responsável">{v.responsavel || '-'}</td>
                  <td data-label="Custo">{v.custo ? fmtMoeda(v.custo) : '-'}</td>
                  <td data-label="Obs.">{v.observacoes || '-'}</td>
                  <td data-label="">
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
                  🐷 Animal do Plantel
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
                <label>Animal do Plantel *</label>
                <select value={form.plantel_brinco} onChange={e => set('plantel_brinco', e.target.value)}>
                  <option value="">Selecione o animal</option>
                  <optgroup label="Matrizes">
                    {plantel.filter(p => p.tipo === 'matriz').map(p => (
                      <option key={p.id} value={p.brinco}>
                        {p.brinco}{p.nome ? ` — ${p.nome}` : ''}{p.raca ? ` (${p.raca})` : ''}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Reprodutores">
                    {plantel.filter(p => p.tipo === 'reprodutor').map(p => (
                      <option key={p.id} value={p.brinco}>
                        {p.brinco}{p.nome ? ` — ${p.nome}` : ''}{p.raca ? ` (${p.raca})` : ''}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {plantelAnimal && (
                  <div style={{ fontSize: 12, color: '#6f42c1', marginTop: 4 }}>
                    {plantelAnimal.tipo === 'matriz' ? '🐷' : '🐗'} {plantelAnimal.tipo === 'matriz' ? 'Matriz' : 'Reprodutor'}
                    {plantelAnimal.raca ? ` · ${plantelAnimal.raca}` : ''}
                    {plantelAnimal.idade_meses ? ` · ${plantelAnimal.idade_meses} meses` : ''}
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label>Data *</label>
              <input type="date" value={form.data} onChange={e => set('data', e.target.value)} />
            </div>
            <div className="form-group span-2">
              <label>Vacina / Medicamento *</label>
              <input value={form.vacina} onChange={e => set('vacina', e.target.value)}
                placeholder="Ex: Circovirus, Parvovirose, Aftosa..." />
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
            <div className="form-group">
              <label>Custo (R$)</label>
              <input type="number" min="0" step="0.01" value={form.custo}
                onChange={e => set('custo', e.target.value)} placeholder="0,00" />
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
