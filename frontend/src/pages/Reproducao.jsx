import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../components/ConfirmDialog'

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
  status: 'gestacao', observacoes: '',
  numero_montas: '', data_retorno_cio: '', vacinas: '',
  quantidade_natimortos: '', quantidade_mumificados: '', peso_medio_nascimento: '', quantidade_transferidos: '',
  quantidade_mortos_desmame: '', quantidade_desmamados: '', peso_medio_desmame: '', idade_desmame: '',
}

export default function Reproducao() {
  const { canEdit, canWrite } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [tab, setTab] = useState('lista')

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

  // ===== ABA RELATÓRIO GERAL =====
  const [relatorio, setRelatorio] = useState(null)
  const [relatorioLoading, setRelatorioLoading] = useState(false)

  // ===== ABA FICHA POR MATRIZ =====
  const [fichaBrinco, setFichaBrinco] = useState('')
  const [ficha, setFicha] = useState(null)
  const [fichaLoading, setFichaLoading] = useState(false)

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

  useEffect(() => {
    if (tab === 'relatorio' && !relatorio) {
      setRelatorioLoading(true)
      api.get('/api/relatorios/reproducao').then(r => setRelatorio(r.data)).finally(() => setRelatorioLoading(false))
    }
  }, [tab])

  const carregarFicha = (brinco) => {
    setFichaBrinco(brinco)
    if (!brinco) { setFicha(null); return }
    setFichaLoading(true)
    api.get(`/api/reproducoes/ficha/${encodeURIComponent(brinco)}`)
      .then(r => setFicha(r.data))
      .catch(() => { toast.error('Erro ao carregar ficha'); setFicha(null) })
      .finally(() => setFichaLoading(false))
  }

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowModal(true) }
  const openEdit = (r) => {
    setEditing(r)
    setForm({
      ...emptyForm, ...r,
      numero_montas: r.numero_montas ?? '', data_retorno_cio: r.data_retorno_cio || '', vacinas: r.vacinas || '',
      quantidade_natimortos: r.quantidade_natimortos ?? '', quantidade_mumificados: r.quantidade_mumificados ?? '',
      peso_medio_nascimento: r.peso_medio_nascimento ?? '', quantidade_transferidos: r.quantidade_transferidos ?? '',
      quantidade_mortos_desmame: r.quantidade_mortos_desmame ?? '', quantidade_desmamados: r.quantidade_desmamados ?? '',
      peso_medio_desmame: r.peso_medio_desmame ?? '', idade_desmame: r.idade_desmame ?? '',
    })
    setError('')
    setShowModal(true)
  }

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
      setRelatorio(null)
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
    if (!await confirm('Excluir este registro de reprodução?')) return
    try { await api.delete(`/api/reproducoes/${r.id}`); load(); setRelatorio(null) }
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
  const mostraCamposParto = form.status === 'parto' || form.status === 'desmame' || form.status === 'encerrado'
  const mostraCamposDesmame = form.status === 'desmame' || form.status === 'encerrado'

  return (
    <Layout title="Reprodução">
      <div className="page-header no-print">
        <div><h1>🫀 Reprodução</h1><p>Gestação, partos e desmame</p></div>
        {tab === 'lista' && canWrite() && <button className="btn btn-primary" onClick={openCreate}>+ Novo Registro</button>}
        {tab === 'relatorio' && <button className="btn btn-outline" onClick={() => window.print()}>🖨️ PDF</button>}
        {tab === 'ficha' && ficha && <button className="btn btn-outline" onClick={() => window.print()}>🖨️ PDF</button>}
      </div>

      <div className="tabs no-print">
        <div className={`tab ${tab === 'lista' ? 'active' : ''}`} onClick={() => setTab('lista')}>📋 Lista</div>
        <div className={`tab ${tab === 'relatorio' ? 'active' : ''}`} onClick={() => setTab('relatorio')}>📊 Relatório Geral</div>
        <div className={`tab ${tab === 'ficha' ? 'active' : ''}`} onClick={() => setTab('ficha')}>🐷 Ficha por Matriz</div>
      </div>

      {/* ===== ABA LISTA ===== */}
      {tab === 'lista' && (
      <>
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
                      {r.femea_brinco && (
                        <button className="btn btn-outline btn-sm" title="Ver ficha desta matriz"
                          onClick={() => { setTab('ficha'); carregarFicha(r.femea_brinco) }}>🐷</button>
                      )}
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
      </>
      )}

      {/* ===== ABA RELATÓRIO GERAL ===== */}
      {tab === 'relatorio' && (
        <div>
          <div className="print-only print-header">
            <h2>🫀 Relatório Geral de Reprodução</h2>
            <p>Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
          </div>

          {relatorioLoading ? <div className="loading"><div className="spinner" /> Carregando...</div> : !relatorio ? null : (
            <>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <div className="stat-card" style={{ flex: 1, minWidth: 160 }}>
                  <div className="stat-icon blue">🤰</div>
                  <div><div className="stat-value">{relatorio.resumo.matrizes_gestantes}</div><div className="stat-label">Matrizes gestantes</div></div>
                </div>
                <div className="stat-card" style={{ flex: 1, minWidth: 160 }}>
                  <div className="stat-icon green">📅</div>
                  <div><div className="stat-value">{relatorio.resumo.partos_previstos_30dias}</div><div className="stat-label">Partos previstos (30d)</div></div>
                </div>
                <div className="stat-card" style={{ flex: 1, minWidth: 160 }}>
                  <div className="stat-icon orange">⏰</div>
                  <div><div className="stat-value">{relatorio.resumo.partos_atrasados}</div><div className="stat-label">Partos atrasados</div></div>
                </div>
                <div className="stat-card" style={{ flex: 1, minWidth: 160 }}>
                  <div className="stat-icon purple">🐖</div>
                  <div><div className="stat-value">{relatorio.resumo.media_nascidos_por_parto}</div><div className="stat-label">Média nascidos/parto</div></div>
                </div>
                <div className="stat-card" style={{ flex: 1, minWidth: 160 }}>
                  <div className="stat-icon teal">💚</div>
                  <div><div className="stat-value">{relatorio.resumo.media_vivos_por_parto}</div><div className="stat-label">Média vivos/parto</div></div>
                </div>
                <div className="stat-card" style={{ flex: 1, minWidth: 160 }}>
                  <div className="stat-icon red">📉</div>
                  <div><div className="stat-value">{relatorio.resumo.taxa_mortalidade_nascimento}%</div><div className="stat-label">Mortalidade ao nascer</div></div>
                </div>
                <div className="stat-card" style={{ flex: 1, minWidth: 160 }}>
                  <div className="stat-icon green">🐷</div>
                  <div><div className="stat-value">{relatorio.resumo.media_desmamados_por_parto}</div><div className="stat-label">Média desmamados/parto</div></div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">Histórico completo ({relatorio.resumo.total_ciclos} ciclos)</div>
                <div style={{ overflowX: 'auto', marginTop: 12 }}>
                  <table style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>Fêmea</th><th>Macho</th><th>Cobertura</th><th>Parto Previsto</th><th>Parto Real</th>
                        <th>Nasc./Vivos</th><th>Natim./Mumif.</th><th>Desmamados</th><th>Peso Desmame</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorio.registros.map(r => (
                        <tr key={r.id}>
                          <td>{r.femea_brinco || '-'}</td>
                          <td>{r.macho_brinco || '-'}</td>
                          <td>{fmtData(r.data_cobertura)}</td>
                          <td>{fmtData(r.data_parto_previsto)}</td>
                          <td>{fmtData(r.data_parto_real)}</td>
                          <td>{r.quantidade_nascidos != null ? `${r.quantidade_nascidos}/${r.quantidade_vivos ?? '?'}` : '-'}</td>
                          <td>{r.quantidade_natimortos ?? '-'}/{r.quantidade_mumificados ?? '-'}</td>
                          <td>{r.quantidade_desmamados ?? '-'}</td>
                          <td>{r.peso_medio_desmame ? `${r.peso_medio_desmame} kg` : '-'}</td>
                          <td><span className={`badge ${statusBadge[r.status] || 'badge-gray'}`}>{r.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== ABA FICHA POR MATRIZ ===== */}
      {tab === 'ficha' && (
        <div>
          <div className="form-group no-print" style={{ maxWidth: 360, marginBottom: 16 }}>
            <label>Selecione a matriz</label>
            <select value={fichaBrinco} onChange={e => carregarFicha(e.target.value)}>
              <option value="">— Selecione —</option>
              {matrizes.map(m => (
                <option key={m.brinco} value={m.brinco}>{m.brinco}{m.nome ? ` — ${m.nome}` : ''}</option>
              ))}
            </select>
          </div>

          {fichaLoading && <div className="loading"><div className="spinner" /> Carregando...</div>}

          {!fichaLoading && ficha && (
            <div className="card">
              <div className="print-only print-header">
                <h2>🐷 Ficha de Matriz</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
                <div><strong>Matriz:</strong> {ficha.matriz.brinco}</div>
                <div><strong>Nome:</strong> {ficha.matriz.nome || '-'}</div>
                <div><strong>Raça:</strong> {ficha.matriz.raca || '-'}</div>
                <div><strong>Mossa:</strong> {ficha.matriz.mossa || '-'}</div>
                <div><strong>Nascimento:</strong> {fmtData(ficha.matriz.data_nascimento)}</div>
                <div><strong>Status:</strong> {ficha.matriz.status}</div>
                <div><strong>Total de partos:</strong> {ficha.matriz.total_partos}</div>
              </div>

              <div className="card-title">Coberturas</div>
              <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                <table style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Data Cobertura</th><th>Nº Macho</th><th>Nº Montas</th>
                      <th>Retorno do Cio</th><th>Parto Previsto</th><th>Vacinas</th><th>Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ficha.ciclos.length === 0 ? (
                      <tr><td colSpan={7} className="table-empty">Nenhuma cobertura registrada</td></tr>
                    ) : ficha.ciclos.map(c => (
                      <tr key={c.id}>
                        <td>{fmtData(c.data_cobertura)}</td>
                        <td>{c.macho_brinco || '-'}</td>
                        <td>{c.numero_montas ?? '-'}</td>
                        <td>{fmtData(c.data_retorno_cio)}</td>
                        <td>{fmtData(c.data_parto_previsto)}</td>
                        <td>{c.vacinas || '-'}</td>
                        <td>{c.observacoes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card-title">Partos</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Nº Parto</th><th>Data</th><th>Vivos</th><th>Natim.</th><th>Mumif.</th><th>Total</th>
                      <th>Peso Nascim.</th><th>Trans.</th><th>Mortos Desm.</th><th>Desmamados</th>
                      <th>Peso Desmame</th><th>Idade Desmame</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ficha.ciclos.filter(c => c.numero_parto).length === 0 ? (
                      <tr><td colSpan={12} className="table-empty">Nenhum parto registrado</td></tr>
                    ) : ficha.ciclos.filter(c => c.numero_parto).map(c => (
                      <tr key={c.id}>
                        <td>{c.numero_parto}</td>
                        <td>{fmtData(c.data_parto_real)}</td>
                        <td>{c.quantidade_vivos ?? '-'}</td>
                        <td>{c.quantidade_natimortos ?? '-'}</td>
                        <td>{c.quantidade_mumificados ?? '-'}</td>
                        <td>{c.quantidade_nascidos ?? '-'}</td>
                        <td>{c.peso_medio_nascimento ? `${c.peso_medio_nascimento} kg` : '-'}</td>
                        <td>{c.quantidade_transferidos ?? '-'}</td>
                        <td>{c.quantidade_mortos_desmame ?? '-'}</td>
                        <td>{c.quantidade_desmamados ?? '-'}</td>
                        <td>{c.peso_medio_desmame ? `${c.peso_medio_desmame} kg` : '-'}</td>
                        <td>{c.idade_desmame != null ? `${c.idade_desmame}d` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!fichaLoading && !ficha && fichaBrinco === '' && (
            <div className="card"><div className="table-empty"><span className="empty-icon">🐷</span>Selecione uma matriz para ver a ficha.</div></div>
          )}
        </div>
      )}

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

            <div className="form-group span-2" style={{ marginTop: 6 }}>
              <label style={{ fontWeight: 700, color: '#0d6efd' }}>📅 Cobertura</label>
            </div>
            <div className="form-group">
              <label>Data da Cobertura</label>
              <input type="date" value={form.data_cobertura} onChange={e => set('data_cobertura', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Nº de Montas</label>
              <input type="number" min="0" value={form.numero_montas} onChange={e => set('numero_montas', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Data Retorno do Cio</label>
              <input type="date" value={form.data_retorno_cio} onChange={e => set('data_retorno_cio', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Parto Previsto <small>(auto: +114 dias)</small></label>
              <input type="date" value={form.data_parto_previsto} onChange={e => set('data_parto_previsto', e.target.value)} />
            </div>
            <div className="form-group span-2">
              <label>Vacinas aplicadas</label>
              <input value={form.vacinas} onChange={e => set('vacinas', e.target.value)} placeholder="Ex: Parvovirose, Erisipela..." />
            </div>

            {mostraCamposParto && (
              <>
                <div className="form-group span-2" style={{ marginTop: 6 }}>
                  <label style={{ fontWeight: 700, color: '#198754' }}>🐖 Parto</label>
                </div>
                <div className="form-group">
                  <label>Parto Real</label>
                  <input type="date" value={form.data_parto_real} onChange={e => set('data_parto_real', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Qtd. Nascidos (total)</label>
                  <input type="number" min="0" value={form.quantidade_nascidos} onChange={e => set('quantidade_nascidos', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Qtd. Vivos</label>
                  <input type="number" min="0" value={form.quantidade_vivos} onChange={e => set('quantidade_vivos', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Natimortos</label>
                  <input type="number" min="0" value={form.quantidade_natimortos} onChange={e => set('quantidade_natimortos', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Mumificados</label>
                  <input type="number" min="0" value={form.quantidade_mumificados} onChange={e => set('quantidade_mumificados', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Peso médio nascimento (kg)</label>
                  <input type="number" step="0.01" min="0" value={form.peso_medio_nascimento} onChange={e => set('peso_medio_nascimento', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Transferência de leitões</label>
                  <input type="number" value={form.quantidade_transferidos} onChange={e => set('quantidade_transferidos', e.target.value)}
                    placeholder="+ recebidos / - cedidos" />
                </div>
              </>
            )}

            {mostraCamposDesmame && (
              <>
                <div className="form-group span-2" style={{ marginTop: 6 }}>
                  <label style={{ fontWeight: 700, color: '#fd7e14' }}>🍼 Desmame</label>
                </div>
                <div className="form-group">
                  <label>Leitões mortos (nasc. → desmame)</label>
                  <input type="number" min="0" value={form.quantidade_mortos_desmame} onChange={e => set('quantidade_mortos_desmame', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Leitões desmamados</label>
                  <input type="number" min="0" value={form.quantidade_desmamados} onChange={e => set('quantidade_desmamados', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Peso médio do desmame (kg)</label>
                  <input type="number" step="0.01" min="0" value={form.peso_medio_desmame} onChange={e => set('peso_medio_desmame', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Idade do desmame (dias)</label>
                  <input type="number" min="0" value={form.idade_desmame} onChange={e => set('idade_desmame', e.target.value)} />
                </div>
              </>
            )}

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
