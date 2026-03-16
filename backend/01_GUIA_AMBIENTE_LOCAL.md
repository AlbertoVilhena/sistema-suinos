# Guia de Deploy - Passo 1: Configuração do Ambiente Local

**Projeto:** Sistema de Gestão de Suínos - API FastAPI + Front-end React  
**Data:** Janeiro de 2026  
**Elaborado por:** Manus AI

---

## 📋 Visão Geral

Este documento detalha o primeiro passo para executar o sistema: a **configuração completa do seu ambiente de desenvolvimento local**. 

Seguindo estas etapas, você terá todas as ferramentas e dependências necessárias para rodar tanto o **back-end (API FastAPI)** quanto o **front-end (React)** em sua máquina.

---

## 🛠️ Pré-requisitos de Software

Antes de começar, certifique-se de que os seguintes softwares estão instalados em seu sistema operacional (Windows, macOS ou Linux).

| Software | Versão Mínima | Comando de Verificação | Notas |
| :--- | :--- | :--- | :--- |
| **Git** | 2.20+ | `git --version` | Essencial para controle de versão |
| **Python** | 3.11+ | `python --version` ou `python3 --version` | Linguagem do back-end |
| **Node.js** | 18.0+ | `node --version` | Ambiente de execução do front-end |
| **npm** | 9.0+ | `npm --version` | Gerenciador de pacotes do Node.js |
| **Docker** | 20.0+ | `docker --version` | **Opcional, mas recomendado** para o banco de dados |

### 📥 Links para Instalação

- **Git:** [git-scm.com](https://git-scm.com/downloads)
- **Python:** [python.org](https://www.python.org/downloads/)
- **Node.js (inclui npm):** [nodejs.org](https://nodejs.org/)
- **Docker:** [docker.com](https://www.docker.com/products/docker-desktop/)

---

## 📂 Passo 1: Obter o Código-Fonte

Se você ainda não tem o projeto, o primeiro passo é clonar o repositório Git (ou baixar o arquivo ZIP).

```bash
# 1. Navegue até o diretório onde deseja salvar o projeto
cd /caminho/para/seus/projetos

# 2. Clone o repositório (substitua pela URL correta)
git clone https://github.com/seu-usuario/sistema-gestao-suinos.git

# 3. Entre no diretório do projeto
cd sistema-gestao-suinos
```

**Observação:** No ambiente do Manus, o projeto já está localizado em `/home/ubuntu/fastapi_project`.

---

## 🐍 Passo 2: Configurar o Back-end (API FastAPI)

Vamos configurar o ambiente Python para a API.

### 1. Criar e Ativar um Ambiente Virtual

É uma boa prática isolar as dependências do projeto em um ambiente virtual (`venv`).

```bash
# 1. Crie o ambiente virtual (dentro da pasta do projeto)
# No Windows:
python -m venv venv

# No macOS/Linux:
python3 -m venv venv

# 2. Ative o ambiente virtual
# No Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# No Windows (CMD):
venv\Scripts\activate.bat

# No macOS/Linux:
source venv/bin/activate
```

**Dica:** Após a ativação, seu terminal deve exibir `(venv)` no início da linha.

### 2. Instalar as Dependências Python

Com o ambiente virtual ativado, instale todas as bibliotecas necessárias listadas no arquivo `requirements.txt`.

```bash
# Garanta que o pip está atualizado
pip install --upgrade pip

# Instale todas as dependências do projeto
pip install -r requirements.txt
```

**Verificação:** Se o comando for executado sem erros, todas as dependências do back-end (FastAPI, SQLAlchemy, etc.) foram instaladas com sucesso.

---

## ⚛️ Passo 3: Configurar o Front-end (React)

Agora, vamos configurar o ambiente Node.js para a aplicação React.

**Observação:** O código do front-end ainda não foi gerado. Este é um guia preparatório. Assumimos que o código do front-end estará em uma pasta chamada `frontend` dentro do projeto.

### 1. Navegar até a Pasta do Front-end

```bash
# A partir da raiz do projeto
cd frontend
```

### 2. Instalar as Dependências Node.js

Use o `npm` para instalar as bibliotecas do front-end (React, Tailwind CSS, etc.) listadas no arquivo `package.json`.

```bash
# Instale todas as dependências do projeto
npm install
```

**Verificação:** Este comando criará uma pasta `node_modules` com todas as dependências do front-end. Se não houver erros, a configuração está pronta.

---

## ✅ Resumo da Configuração

Ao final deste guia, você deve ter:

1.  ✅ Todos os pré-requisitos de software instalados.
2.  ✅ O código-fonte do projeto em sua máquina.
3.  ✅ Um ambiente virtual Python (`venv`) criado e ativado.
4.  ✅ Todas as dependências do **back-end** instaladas.
5.  ✅ Todas as dependências do **front-end** instaladas (quando o código estiver disponível).

---

## 🚀 Próximo Passo

O próximo passo é **configurar e iniciar o banco de dados MySQL**. Siga para o **Guia de Deploy - Passo 2**.
