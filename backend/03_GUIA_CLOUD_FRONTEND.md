# Guia de Deploy Cloud-Only — Passo 3: Front-end React na Nuvem

**Projeto:** Sistema de Gestão de Suínos — Deploy 100% na Nuvem  
**Plataforma:** Vercel  
**Data:** Janeiro de 2026  
**Elaborado por:** Manus AI

---

## 📋 Visão Geral

Este guia mostra como fazer o **deploy do front-end React** na **Vercel**, a plataforma ideal para aplicações front-end modernas. O processo é totalmente automatizado a partir do seu repositório no GitHub.

**Objetivo:** Ter a interface do usuário (React) online, acessível publicamente e conectada à nossa API no Railway.

---

## 🛠️ Pré-requisitos

1.  **Código no GitHub:** O código-fonte do front-end React deve estar em um repositório no seu GitHub (pode ser o mesmo repositório do back-end, em uma pasta separada como `frontend/`).
2.  **Conta na Vercel:** Crie uma conta gratuita em [vercel.com](https://vercel.com) usando sua conta do GitHub.
3.  **API Online:** Você deve ter concluído o **Passo 2** e ter a API FastAPI rodando no Railway com uma URL pública.

---

## 🚀 Passo a Passo: Deploy do Front-end na Vercel

### 1. Crie um Novo Projeto

-   Acesse seu dashboard na Vercel: [vercel.com/dashboard](https://vercel.com/dashboard)
-   Clique em **"Add New..."** e selecione **"Project"**.

    ![Vercel New Project](https://i.imgur.com/5g6h7i8.png)

-   Na tela **"Import Git Repository"**, selecione o repositório do seu projeto. A Vercel irá analisar o código e detectar automaticamente que é um projeto React (`Create React App`).

### 2. Configure o Projeto

A Vercel preenche a maioria das configurações automaticamente. Você só precisa configurar as variáveis de ambiente.

-   **Framework Preset:** Deve ser detectado como `Create React App`. Se não, selecione-o.
-   **Root Directory:** Se o seu código React está em uma subpasta (ex: `frontend/`), clique em **"Edit"** ao lado do nome do diretório e selecione a pasta correta.

    ![Vercel Root Directory](https://i.imgur.com/j9k2l3m.png)

-   **Build and Output Settings:** Deixe os padrões, a Vercel já sabe como compilar um projeto React.

### 3. Configure as Variáveis de Ambiente

Esta é a etapa que conecta o front-end ao back-end.

-   Expanda a seção **"Environment Variables"**.
-   Adicione a seguinte variável:

    | Nome da Variável | Valor |
    | :--- | :--- |
    | `REACT_APP_API_URL` | Cole aqui a URL completa da sua API no Railway (ex: `https://sua-api-123.up.railway.app/api/v1`) |

    ![Vercel Environment Variables](https://i.imgur.com/p4f8g9h.png)

    **IMPORTANTE:** O nome da variável (`REACT_APP_...`) deve começar com `REACT_APP_` para que o Create React App a injete no código do front-end.

### 4. Faça o Deploy

-   Clique no botão **"Deploy"**.
-   A Vercel irá buscar seu código no GitHub, instalar as dependências (`npm install`), compilar o projeto (`npm run build`) e fazer o deploy.

    ![Vercel Deploying](https://i.imgur.com/w7x5y6z.png)

-   Após alguns minutos, você verá uma tela de parabéns com screenshots da sua aplicação e o link para acessá-la.

---

## ✅ Verificação e Teste

1.  **Acesse a Aplicação:** Clique no link gerado pela Vercel (ex: `seu-projeto.vercel.app`). Você deve ver a tela inicial da sua aplicação.

2.  **Teste a Integração com a API:** Tente executar uma ação que dependa do back-end, como fazer login ou cadastrar um novo animal. Abra o console do navegador (F12) e verifique na aba "Network" se as requisições para a sua API no Railway estão sendo feitas com sucesso (status 200 ou 201).

3.  **Deploy Automático:** Faça uma pequena alteração no código do front-end (ex: mude um texto) e faça um `git push` para o seu repositório. A Vercel irá detectar a alteração e iniciar um novo deploy automaticamente. Em poucos minutos, sua alteração estará no ar.

---

## ✅ Resumo da Configuração

Ao final deste guia, você deve ter:

1.  ✅ A aplicação React fazendo deploy automaticamente a cada `git push`.
2.  ✅ A variável de ambiente configurada, conectando o front-end à API no Railway.
3.  ✅ Um domínio público para acessar sua interface de usuário de qualquer lugar.
4.  ✅ Integração completa entre front-end e back-end, ambos na nuvem.

---

## 🚀 Próximo Passo

Com todos os componentes do sistema online, o próximo e último passo é **consolidar toda a documentação** em um guia único e fácil de seguir, além de configurar um domínio personalizado.
