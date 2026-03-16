# Guia de Deploy Cloud-Only — Passo 1: Banco de Dados na Nuvem

**Projeto:** Sistema de Gestão de Suínos — Deploy 100% na Nuvem  
**Plataforma:** Railway  
**Data:** Janeiro de 2026  
**Elaborado por:** Manus AI

---

## 📋 Visão Geral

Este guia mostra como criar e configurar um banco de dados **MySQL 100% na nuvem** usando a plataforma **Railway**. Você não precisará instalar nada no seu Mac.

**Objetivo:** Ter um banco de dados MySQL online, pronto para ser acessado pela nossa API FastAPI.

---

## 🛠️ Pré-requisitos

1.  **Conta no GitHub:** Se ainda não tiver, crie uma em [github.com](https://github.com).
2.  **Conta no Railway:** Crie uma conta gratuita em [railway.app](https://railway.app) usando sua conta do GitHub.

---

## 🚀 Passo a Passo: Criando o Banco de Dados no Railway

### 1. Crie um Novo Projeto

-   Acesse seu dashboard no Railway: [railway.app/dashboard](https://railway.app/dashboard)
-   Clique em **"New Project"**.
-   Selecione a opção **"Provision MySQL"**.

    ![Provision MySQL](https://i.imgur.com/8aZzX9k.png)

    O Railway irá provisionar instantaneamente um novo banco de dados MySQL para você. O processo leva menos de 30 segundos.

### 2. Acesse as Credenciais de Conexão

-   Dentro do seu novo projeto, você verá um card chamado **"MySQL"**. Clique nele.
-   Navegue até a aba **"Connect"**.

    ![Railway Connect Tab](https://i.imgur.com/Y4b1g8t.png)

-   Nesta aba, você encontrará todas as informações necessárias para se conectar ao banco de dados. A mais importante é a **"Database URL"** (URL de Conexão).

    | Variável | Exemplo de Valor |
    | :--- | :--- |
    | `MYSQLHOST` | `containers-us-west-78.railway.app` |
    | `MYSQLPORT` | `7383` |
    | `MYSQLUSER` | `root` |
    | `MYSQLPASSWORD` | `aBcDeFgHiJkLmNoP` |
    | `MYSQLDATABASE` | `railway` |
    | **`DATABASE_URL`** | `mysql://root:aBcDeFgHiJkLmNoP@containers-us-west-78.railway.app:7383/railway` |

    **Esta `DATABASE_URL` é a informação mais importante.** Nós vamos usá-la para configurar o back-end FastAPI no próximo passo.

### 3. (Opcional) Acesse a Aba "Data"

-   Na aba **"Data"**, você pode visualizar as tabelas e executar queries SQL diretamente no navegador, sem precisar de um cliente de banco de dados externo.
-   No início, esta aba estará vazia, pois ainda não criamos nenhuma tabela.

    ![Railway Data Tab](https://i.imgur.com/sW3oH7j.png)

---

## ✅ Resumo da Configuração

Ao final deste guia, você deve ter:

1.  ✅ Uma conta gratuita no Railway.
2.  ✅ Um projeto no Railway com um banco de dados MySQL provisionado.
3.  ✅ A **URL de Conexão (`DATABASE_URL`)** do seu banco de dados em mãos.

---

## 🚀 Próximo Passo

Com o banco de dados online e pronto, o próximo passo é **fazer o deploy do back-end FastAPI** e conectá-lo a este banco de dados. Siga para o **Guia de Deploy Cloud-Only — Passo 2**.
