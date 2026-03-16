# Frontend - Sistema de Gestão de Suínos

Interface web moderna e responsiva para o Sistema de Gestão de Suínos, desenvolvida em React com Tailwind CSS.

## 🚀 Funcionalidades

- **Dashboard:** Visão geral com KPIs principais
- **Gerenciamento de Animais:** Cadastro, edição e exclusão de animais
- **Gestão Reprodutiva:** Controle de eventos reprodutivos (cobertura, parto, desmame)
- **Nutrição:** Gestão de rações e insumos
- **Financeiro:** Controle de custos e receitas
- **Configurações:** Ajustes do sistema

## 📦 Dependências

- React 18.2.0
- React Router DOM 6.8.0
- Axios 1.3.0
- Tailwind CSS 3.2.4
- React Icons 4.7.1

## 🛠️ Instalação

1. **Instale as dependências:**
```bash
npm install
```

2. **Configure as variáveis de ambiente:**
```bash
cp .env.example .env
```

3. **Edite o arquivo `.env`** e adicione a URL da sua API:
```
REACT_APP_API_URL=https://sua-api.up.railway.app/api/v1
```

## 🚀 Executar em Desenvolvimento

```bash
npm start
```

A aplicação abrirá em `http://localhost:3000`.

## 🔨 Build para Produção

```bash
npm run build
```

Os arquivos otimizados serão criados na pasta `build/`.

## 📁 Estrutura de Pastas

```
src/
├── components/        # Componentes reutilizáveis
│   ├── Header.jsx
│   └── Sidebar.jsx
├── pages/            # Páginas/Telas principais
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Animais.jsx
│   ├── Reproducao.jsx
│   ├── Nutricao.jsx
│   ├── Financeiro.jsx
│   └── Configuracoes.jsx
├── services/         # Integração com API
│   └── api.js
├── styles/          # Estilos CSS
│   └── index.css
├── App.jsx          # Componente principal
└── index.jsx        # Ponto de entrada
```

## 🔌 Integração com API

O arquivo `src/services/api.js` configura a comunicação com o back-end FastAPI. Ele inclui:

- Interceptadores para adicionar token de autenticação
- Tratamento automático de erros 401 (não autorizado)
- Configuração da URL base da API

## 🎨 Temas e Cores

O projeto usa Tailwind CSS com a paleta de cores:

- **Verde:** Principal (botões, headers)
- **Azul:** Secundário
- **Vermelho:** Alertas e exclusões
- **Amarelo:** Avisos

## 📱 Responsividade

A interface é totalmente responsiva e funciona em:

- Desktop (1920px+)
- Tablet (768px - 1024px)
- Mobile (320px - 767px)

## 🚀 Deploy na Vercel

1. Faça push do código para o GitHub
2. Acesse [vercel.com](https://vercel.com)
3. Importe o repositório
4. Configure a variável `REACT_APP_API_URL` com a URL da sua API
5. Clique em Deploy

---

**Desenvolvido com ❤️ por Manus AI**
