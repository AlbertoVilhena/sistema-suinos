import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'

const statusBadge = {
  gestacao: 'badge-blue',
  parto: 'badge-green',
  desmame: 'badge-teal',
  encerrado: 'badge-gray'
}

const today = new Date().toISOString().split('T')[0]

const emptyForm = {
  lote_id: '', femea_brinco: '', macho_brinco: '', data_cobertura: today,
  data_parto_previsto: '', data_parto_real: '',
  quantidade_nascidos: '', quantidade_vivos: '',
  status: 'gestacao', observacoes: ''
}

export default function Reproducao() {
  const { canEdit, canWrite } = useAuth()
  const toast = useToast()
  const [reproducoes, setReproducoes] = useState([])
  const [lotes, setLotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showCriarLoteModal, setShowCriarLoteModal] = useState(false)
  const [partoData, setPartoData] = useState(null)
  const [loteForm, setLoteForm] = useState({})
  const [savingLote, setSavingLote] = useState(false)

  const [matrizes, setMatrizes] = useState([])
  const [reprodutores, setReprodutores] = useState([])

  const load = () => {
    Promise.all([
      api.get('/api/reproducoes'),
      api.get('/api/lotes'),
      api.get('/api/plantel?tipo=matriz'),
      api.get('/api/plantel?tipo=reprodutor')
    ]).then(([rr, rl, rm, rep]) => {
      setReproducoes(rr.data)
      setLotes(rl.data)
      setMatrizes(rm.data.filter(m => m.status === 'ativo'))
      setReprodutores(rep.data.filter(r => r.status === 'ativo'))
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowModal(true) }
  const openEdit = (r) => { setEditing(r); setForm({ ...r }); setError(''); setShowModal(true) }

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      let saved
      if (editing) {
        const res = await api.put(`/api/reproducoes/${editing.id}`, form)
        saved = res.data
      } else {
        const res = await api.post('/api/reproducoes', form)
        saved = res.data
      }
      setShowModal(false)
      load()
      // If status is parto and has nascidos, offer to create a lote
      if (saved.status === 'parto' && saved.quantidade_nascidos > 0) {
        setPartoData(saved)
        setLoteForm({
          numero: `PARTO-${saved.id}`,
          data_entrada: saved.data_parto_real || today,
          quantidade_inicial: saved.quantidade_vivos || saved.quantidade_nascidos,
          fase: 'maternidade',
          observacoes: `Lote criado a partir do parto da fêmea ${saved.femea_brinco || ''}`
        })
        setShowCriarLoteModal(true)
      }
    } catch (e) {
      const msg = e.response?.data?.error || e.response?.data?.msg || (e.response ? `Erro ${e.response.status}: ${JSON.stringify(e.response.data)}` : 'Sem resposta do servidor')
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleCriarLote = async () => {
    setSavingLote(true)
    try {
      await api.post('/api/lotes', loteForm)
      setShowCriarLoteModal(false)
      load()
      toast.success(`Lote "${loteForm.numero}" criado com sucesso!`)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao criar lote')
    } finally {
      setSavingLote(false)
    }
  }

  const handleDelete = async (r) => {
    if (!window.confirm('Excluir este registro de reprodução?')) return
    try { await api.delete(`/api/reproducoes/${r.id}`); load() }
    catch (e) { toast.error(e.response?.data?.error || 'Erro ao excluir') }
  }

  const set = (k, v) => {
    setForm(f => {
      const updated = { ...f, [k]: v }
      if (k === 'data_cobertura' && v) {
        const dc = new Date(v + 'T00:00:00')
        dc.setDate(dc.getDate() + 114)
        updated.data_parto_previsto = dc.toISOString().split('T')[0]
      }
      return updated
    })
  }

  const setLF = (k, v) => setLoteForm(f => ({ ...f, [k]: v }))

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
                  <td data-label="Fêmea"><strong>{r.femea_brinco || '-'}</strong></td>
                  <td data-label="Macho">{r.macho_brinco || '-'}</td>
                  <td data-label="Lote">{r.lote_numero || '-'}</td>
                  <td data-label="Cobertura">{fmtData(r.data_cobertura)}</td>
                  <td data-label="Parto Prev.">{fmtData(r.data_parto_previsto)}</td>
                  <td data-label="Parto Real">{fmtData(r.data_parto_real)}</td>
                  <td data-label="Nasc./Vivos">{r.quantidade_nascidos != null ? `${r.quantidade_nascidos}/${r.quantidade_vivos ?? '?'}` : '-'}</td>
                  <td data-label="Status"><span className={`badge ${statusBadge[r.status] || 'badge-gray'}`}>{r.status}</span></td>
                  <td data-label="">
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
              <label>Matriz (Fêmea) *</label>
              {matrizes.length > 0 ? (
                <select value={form.femea_brinco} onChange={e => set('femea_brinco', e.target.value)}>
                  <option value="">Selecione a matriz...</option>
                  {matrizes.map(m => (
                    <option key={m.id} value={m.brinco}>
                      {m.brinco}{m.nome ? ` — ${m.nome}` : ''}{m.raca ? ` (${m.raca})` : ''} · {m.total_partos} parto(s)
                    </option>
                  ))}
                </select>
              ) : (
                <input value={form.femea_brinco} onChange={e => set('femea_brinco', e.target.value)}
                  placeholder="Brinco da fêmea (cadastre no Plantel)" />
              )}
            </div>
            <div className="form-group">
              <label>Reprodutor (Macho)</label>
              {reprodutores.length > 0 ? (
                <select value={form.macho_brinco} onChange={e => set('macho_brinco', e.target.value)}>
                  <option value="">Selecione o reprodutor...</option>
                  {reprodutores.map(r => (
                    <option key={r.id} value={r.brinco}>
                      {r.brinco}{r.nome ? ` — ${r.nome}` : ''}{r.raca ? ` (${r.raca})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input value={form.macho_brinco} onChange={e => set('macho_brinco', e.target.value)}
                  placeholder="Brinco do macho (cadastre no Plantel)" />
              )}
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

      {showCriarLoteModal && partoData && (
        <Modal
          title="🐖 Criar Lote deste Parto?"
          onClose={() => setShowCriarLoteModal(false)}
          onSave={handleCriarLote}
          saving={savingLote}
          saveLabel="✅ Criar Lote"
        >
          <div style={{ marginBottom: 12, padding: '10px 14px', background: '#d1e7dd', borderRadius: 8, fontSize: 14 }}>
            Parto registrado com <strong>{partoData.quantidade_nascidos}</strong> nascidos
            ({partoData.quantidade_vivos ?? partoData.quantidade_nascidos} vivos).
            Deseja criar um lote para esses leitões?
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Número do Lote *</label>
              <input value={loteForm.numero} onChange={e => setLF('numero', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Data de Entrada *</label>
              <input type="date" value={loteForm.data_entrada} onChange={e => setLF('data_entrada', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Quantidade Inicial *</label>
              <input type="number" min="1" value={loteForm.quantidade_inicial} onChange={e => setLF('quantidade_inicial', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Fase</label>
              <select value={loteForm.fase} onChange={e => setLF('fase', e.target.value)}>
                <option value="maternidade">Maternidade</option>
                <option value="creche">Creche</option>
                <option value="crescimento">Crescimento</option>
                <option value="terminacao">Terminação</option>
              </select>
            </div>
            <div className="form-group span-2">
              <label>Observações</label>
              <textarea value={loteForm.observacoes} onChange={e => setLF('observacoes', e.target.value)} rows={2} />
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
