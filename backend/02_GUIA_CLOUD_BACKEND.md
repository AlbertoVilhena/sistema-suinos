# Guia de Deploy Cloud-Only — Passo 2: Back-end FastAPI na Nuvem

**Projeto:** Sistema de Gestão de Suínos — Deploy 100% na Nuvem  
**Plataforma:** Railway  
**Data:** Janeiro de 2026  
**Elaborado por:** Manus AI

---

## 📋 Visão Geral

Este guia mostra como fazer o **deploy do back-end FastAPI** no Railway e conectá-lo ao banco de dados MySQL que criamos no passo anterior. O processo é totalmente automatizado a partir do seu repositório no GitHub.

**Objetivo:** Ter a API FastAPI online, acessível publicamente e conectada ao banco de dados.

---

## 🛠️ Pré-requisitos

1.  **Código no GitHub:** O código-fonte completo do projeto `fastapi_project` deve estar em um repositório no seu GitHub.
2.  **Banco de Dados no Railway:** Você deve ter concluído o **Passo 1** e ter um banco de dados MySQL rodando no Railway.

---

## 🚀 Passo a Passo: Deploy da API no Railway

### 1. Adicione um Novo Serviço ao Projeto

-   Volte para o seu projeto no dashboard do Railway.
-   Clique em **"New"** para adicionar um novo serviço.
-   Selecione a opção **"GitHub Repo"**.

    ![GitHub Repo](https://i.imgur.com/L5g3g6h.png)

-   Escolha o repositório do seu projeto FastAPI na lista.
-   O Railway irá analisar seu código e começar o processo de deploy automaticamente.

### 2. Configure as Variáveis de Ambiente

Esta é a etapa mais importante: conectar a API ao banco de dados.

-   No seu novo serviço FastAPI, vá para a aba **"Variables"**.
-   Clique em **"New Variable"** e adicione as seguintes variáveis:

    | Nome da Variável | Valor |
    | :--- | :--- |
    | `DATABASE_URL` | Cole aqui a URL de conexão do seu banco de dados MySQL (do Passo 1) |
    | `SECRET_KEY` | Gere uma chave forte com `openssl rand -hex 32` e cole aqui |
    | `ALGORITHM` | `HS256` |
    | `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` |

    ![Railway Variables](https://i.imgur.com/C7p4f8j.png)

    **Dica:** O Railway detecta automaticamente as variáveis do banco de dados. Você pode clicar no ícone de referência ao lado do campo de valor para preencher a `DATABASE_URL` sem precisar copiar e colar.

### 3. Configure os Comandos de Build e Start

-   Vá para a aba **"Settings"** do seu serviço FastAPI.
-   Na seção **"Deploy"**, configure os seguintes comandos:

    | Configuração | Comando |
    | :--- | :--- |
    | **Build Command** | `pip install -r requirements.txt` |
    | **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

    ![Railway Settings](https://i.imgur.com/k9W2g3f.png)

    -   `$PORT`: O Railway injeta automaticamente a variável de ambiente `$PORT`, que é a porta na qual sua aplicação deve escutar.

### 4. Crie as Tabelas no Banco de Dados

-   No seu código, certifique-se de que a linha `Base.metadata.create_all(bind=engine)` em `app/main.py` está **descomentada** para a primeira execução. Isso criará as tabelas automaticamente.
-   Após o primeiro deploy bem-sucedido, você pode **comentar essa linha novamente** e fazer um novo push para o GitHub. Isso evita que a aplicação tente recriar as tabelas a cada deploy.

### 5. Gere um Domínio Público

-   Ainda na aba **"Settings"**, role para baixo até a seção **"Networking"**.
-   Clique em **"Generate Domain"**.

    ![Generate Domain](https://i.imgur.com/n6g7h8k.png)

-   O Railway irá gerar uma URL pública para sua API, algo como `sua-api-123.up.railway.app`.

---

## ✅ Verificação e Teste

1.  **Verifique os Logs:** Na aba **"Deployments"**, clique no último deploy para ver os logs em tempo real. Verifique se não há erros e se o Uvicorn iniciou corretamente.

2.  **Acesse a API:** Abra a URL gerada pelo Railway em seu navegador. Você deve ver a mensagem de boas-vindas da API.

3.  **Acesse a Documentação Interativa:** Adicione `/docs` ao final da sua URL (ex: `https://sua-api-123.up.railway.app/docs`).

4.  **Teste um Endpoint:** Use a interface do Swagger para testar o endpoint `POST /api/v1/animais`. Se a requisição retornar um `201 Created`, sua API está funcionando e conectada ao banco de dados!

---

## ✅ Resumo da Configuração

Ao final deste guia, você deve ter:

1.  ✅ A API FastAPI fazendo deploy automaticamente a cada `git push`.
2.  ✅ As variáveis de ambiente configuradas, conectando a API ao banco de dados.
3.  ✅ Um domínio público para acessar sua API de qualquer lugar.
4.  ✅ As tabelas do banco de dados criadas e prontas para uso.

---

## 🚀 Próximo Passo

Com o back-end e o banco de dados online, o próximo passo é **fazer o deploy do front-end React** na Vercel e conectá-lo à nossa nova API. Siga para o **Guia de Deploy Cloud-Only — Passo 3**.
