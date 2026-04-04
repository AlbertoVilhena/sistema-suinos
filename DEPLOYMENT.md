# Plano de Publicação — GranjaApp

## Visão Geral

O app tem duas partes:
- **Backend**: Flask API (Python) → hospedado no **Render.com**
- **Frontend**: React (Vite) → hospedado no **Vercel**

---

## 1. BACKEND — Render.com

### Passo a Passo

1. **Acesse** https://render.com e faça login (ou crie conta)

2. **Novo serviço Web:**
   - Clique em **New → Web Service**
   - Conecte seu repositório GitHub
   - Selecione a pasta `backend/`

3. **Configurações:**
   | Campo | Valor |
   |-------|-------|
   | Name | `suinocultura-backend` |
   | Runtime | `Python 3` |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `gunicorn app:app` |
   | Plan | Free (para começar) |

4. **Variáveis de Ambiente:**
   | Variável | Valor |
   |----------|-------|
   | `JWT_SECRET_KEY` | (gere um valor aleatório longo) |
   | `FLASK_DEBUG` | `false` |
   | `DATABASE_URL` | (se usar PostgreSQL, coloque a URL aqui) |

5. **Banco de Dados:**
   - Se quiser banco persistente: **New → PostgreSQL** no Render
   - Copie a **Internal Connection String** para `DATABASE_URL`
   - Sem configuração, usa SQLite (arquivo local — reseta se o serviço reiniciar)

6. **Deploy** → Clique em **Create Web Service**
   - Aguarde o build (~2-3 min)
   - Copie a URL: `https://suinocultura-backend.onrender.com`

7. **Inicializar banco:**
   - No shell do Render (ou via API), o banco é criado automaticamente no primeiro request
   - Usuário padrão: `admin@granja.com` / `admin123`

---

## 2. FRONTEND — Vercel

### Passo a Passo

1. **Acesse** https://vercel.com e faça login

2. **Novo projeto:**
   - Clique em **Add New → Project**
   - Conecte seu repositório GitHub
   - Selecione a pasta `frontend/` como **Root Directory**

3. **Configurações:**
   | Campo | Valor |
   |-------|-------|
   | Framework Preset | `Vite` |
   | Root Directory | `frontend` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |

4. **Variáveis de Ambiente:**
   | Variável | Valor |
   |----------|-------|
   | `VITE_API_URL` | `https://suinocultura-backend.onrender.com` |

5. **Deploy** → Clique em **Deploy**
   - Aguarde o build (~1-2 min)
   - URL final: `https://suinocultura.vercel.app` (ou nome customizado)

---

## 3. Configuração de Domínio Personalizado (Opcional)

### No Vercel:
1. Vá em **Settings → Domains**
2. Adicione seu domínio: `granja.seudominio.com.br`
3. Configure o DNS conforme instruções do Vercel (CNAME)

### No Render (Backend):
1. Vá em **Settings → Custom Domain**
2. Adicione: `api.seudominio.com.br`

---

## 4. Checklist Pré-Deploy

- [ ] Backend deployado e respondendo em `/health`
- [ ] URL do backend copiada para `VITE_API_URL` no Vercel
- [ ] Frontend deployado e abrindo a tela de login
- [ ] Login com `admin@granja.com` / `admin123` funcionando
- [ ] **TROCAR A SENHA do admin** após primeiro acesso
- [ ] Criar usuários reais com perfis corretos
- [ ] Testar CRUD completo: Lotes, Animais, Financeiro

---

## 5. Perfis de Usuário

| Perfil | Criar | Editar | Excluir | Usuários |
|--------|-------|--------|---------|----------|
| **Admin** | ✅ | ✅ | ✅ | ✅ |
| **Gerente** | ✅ | ✅ | ❌ | ❌ |
| **Operador** | ✅ | ✅ | ❌ | ❌ |
| **Visualizador** | ❌ | ❌ | ❌ | ❌ |

**Sugestão de configuração inicial:**
- 1 Admin (dono da granja / TI)
- 1-2 Gerentes (supervisores)
- 2-5 Operadores (funcionários que registram dados)
- Visualizadores (veterinários, contabilidade)

---

## 6. Funcionalidades do App

| Módulo | Descrição |
|--------|-----------|
| **Dashboard** | Visão geral com KPIs, saldo, lotes recentes |
| **Lotes** | Cadastro e gestão de lotes de produção |
| **Animais** | Registro individual de animais com peso e status |
| **Alimentação** | Controle de ração com custo por kg |
| **Sanidade** | Vacinas, medicamentos, responsáveis |
| **Reprodução** | Coberturas, gestações, partos (auto-calcula 114 dias) |
| **Financeiro** | Receitas e despesas com categorias e lotes |
| **Relatórios** | Mortalidade, custos, análise financeira |
| **Usuários** | CRUD de usuários com 4 níveis de acesso |

---

## 7. Atualização Futura

Para atualizar o app após mudanças no código:
1. Faça push para o repositório GitHub
2. Render e Vercel fazem **deploy automático**

---

## 8. Suporte e Manutenção

- **Logs do backend**: Painel do Render → Logs
- **Logs do frontend**: Painel do Vercel → Deployments
- **Backup do banco**: Se usar SQLite no Render, faça backup manual. Para PostgreSQL, o Render tem backup automático nos planos pagos.
