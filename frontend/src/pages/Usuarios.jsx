import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-'

const roleLabel = {
  admin: { label: 'Administrador', badge: 'badge-red' },
  gerente: { label: 'Gerente', badge: 'badge-purple' },
  operador: { label: 'Operador', badge: 'badge-blue' },
  visualizador: { label: 'Visualizador', badge: 'badge-gray' }
}

const roleDescricao = {
  admin: 'Acesso total: criar/editar/excluir tudo, incluindo usuários',
  gerente: 'Pode criar e editar todos os dados, mas não gerencia usuários',
  operador: 'Pode registrar e visualizar dados, mas não pode excluir',
  visualizador: 'Apenas visualização — sem permissão de escrita'
}

const emptyForm = { nome: '', email: '', senha: '', role: 'operador', ativo: true }

export default function Usuarios() {
  const { usuario: currentUser } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    api.get('/api/usuarios').then(r => setUsuarios(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowModal(true) }
  const openEdit = (u) => {
    setEditing(u)
    setForm({ nome: u.nome, email: u.email, senha: '', role: u.role, ativo: u.ativo })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setError('')
    if (!form.nome || !form.email) { setError('Nome e email são obrigatórios'); return }
    if (!editing && !form.senha) { setError('Senha é obrigatória para novos usuários'); return }
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/api/usuarios/${editing.id}`, form)
      } else {
        await api.post('/api/usuarios', form)
      }
      setShowModal(false)
      load()
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (u) => {
    if (u.id === currentUser.id) { alert('Você não pode desativar sua própria conta'); return }
    if (!window.confirm(`Desativar usuário ${u.nome}?`)) return
    try { await api.delete(`/api/usuarios/${u.id}`); load() }
    catch (e) { alert(e.response?.data?.error || 'Erro ao desativar') }
  }

  const handleReativar = async (u) => {
    try {
      await api.put(`/api/usuarios/${u.id}`, { ativo: true })
      load()
    } catch (e) { alert('Erro ao reativar') }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Layout title="Usuários">
      <div className="page-header">
        <div>
          <h1>👥 Usuários</h1>
          <p>Gerenciamento de acesso e permissões</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Novo Usuário</button>
      </div>

      {/* Role info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        {Object.entries(roleLabel).map(([role, { label, badge }]) => (
          <div className="card" key={role} style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className={`badge ${badge}`}>{label}</span>
              <span style={{ fontSize: 12, color: '#6c757d' }}>
                ({usuarios.filter(u => u.role === role && u.ativo).length})
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#6c757d', lineHeight: 1.4 }}>{roleDescricao[role]}</p>
          </div>
        ))}
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <strong>Usuários do sistema</strong>
          <span style={{ fontSize: 13, color: '#6c757d' }}>{usuarios.length} usuário(s)</span>
        </div>

        {loading ? <div className="loading"><div className="spinner" /> Carregando...</div> : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Cadastro</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr><td colSpan={6} className="table-empty">
                  <span className="empty-icon">👥</span>Nenhum usuário encontrado
                </td></tr>
              ) : usuarios.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                        {u.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <strong>{u.nome}</strong>
                      {u.id === currentUser.id && (
                        <span className="badge badge-teal" style={{ fontSize: 10 }}>você</span>
                      )}
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${roleLabel[u.role]?.badge || 'badge-gray'}`}>
                      {roleLabel[u.role]?.label || u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.ativo ? 'badge-green' : 'badge-red'}`}>
                      {u.ativo ? '✅ Ativo' : '❌ Inativo'}
                    </span>
                  </td>
                  <td>{fmtData(u.criado_em)}</td>
                  <td>
                    <div className="actions">
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(u)}>✏️ Editar</button>
                      {u.ativo ? (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u)}
                          disabled={u.id === currentUser.id}>
                          🔒 Desativar
                        </button>
                      ) : (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleReativar(u)}>
                          🔓 Reativar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal
          title={editing ? `Editar Usuário — ${editing.nome}` : 'Novo Usuário'}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          saving={saving}
        >
          {error && <div className="error-msg">{error}</div>}
          <div className="form-grid">
            <div className="form-group span-2">
              <label>Nome Completo *</label>
              <input value={form.nome} onChange={e => set('nome', e.target.value)}
                placeholder="Nome do usuário" />
            </div>
            <div className="form-group span-2">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="email@exemplo.com" />
            </div>
            <div className="form-group span-2">
              <label>{editing ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}</label>
              <input type="password" value={form.senha} onChange={e => set('senha', e.target.value)}
                placeholder={editing ? '(manter senha atual)' : 'Mínimo 6 caracteres'} />
            </div>
            <div className="form-group">
              <label>Perfil de Acesso *</label>
              <select value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="visualizador">Visualizador</option>
                <option value="operador">Operador</option>
                <option value="gerente">Gerente</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.ativo ? 'true' : 'false'} onChange={e => set('ativo', e.target.value === 'true')}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 14, padding: 12, background: '#f8f9fa', borderRadius: 6, fontSize: 12 }}>
            <strong>Permissões do perfil selecionado:</strong><br />
            <span style={{ color: '#6c757d' }}>{roleDescricao[form.role]}</span>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
