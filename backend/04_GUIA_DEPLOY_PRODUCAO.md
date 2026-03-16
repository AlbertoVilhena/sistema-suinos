# Guia de Deploy - Passo 4: Deploy em Produção

**Projeto:** Sistema de Gestão de Suínos - API FastAPI + Front-end React  
**Data:** Janeiro de 2026  
**Elaborado por:** Manus AI

---

## 📋 Visão Geral

Este guia aborda o processo de **deploy da aplicação em um ambiente de produção**. Vamos usar uma arquitetura comum e robusta:

-   **Servidor:** Uma Virtual Private Server (VPS) rodando Ubuntu 22.04 (ex: DigitalOcean, Vultr, AWS EC2).
-   **Banco de Dados:** MySQL rodando no mesmo servidor (ou um serviço de banco de dados gerenciado).
-   **Servidor Web:** Nginx como proxy reverso para a API e para servir o front-end.
-   **Process Manager:** Gunicorn para rodar a aplicação FastAPI.
-   **Segurança:** Certificado SSL gratuito da Let's Encrypt para habilitar HTTPS.

**Arquitetura Final:**

```
Usuário -> HTTPS -> Nginx (Porta 443)
 | 
 +--> (Requisição para /api/*) -> Proxy Reverso -> Gunicorn (Rodando FastAPI na porta 8000)
 | 
 +--> (Outras requisições) -> Servir arquivos estáticos do Front-end React
```

---

## 🛠️ Passo 1: Preparar o Servidor

1.  **Crie uma VPS:** Escolha um provedor de cloud e crie uma nova VPS com Ubuntu 22.04. Recomenda-se pelo menos 1 GB de RAM.

2.  **Acesse o servidor via SSH:**

    ```bash
    ssh root@SEU_ENDERECO_DE_IP
    ```

3.  **Crie um usuário não-root:**

    ```bash
    adduser seu_usuario
usermod -aG sudo seu_usuario
su - seu_usuario
    ```

4.  **Atualize o sistema:**

    ```bash
    sudo apt update && sudo apt upgrade -y
    ```

5.  **Instale as dependências:**

    ```bash
    sudo apt install -y python3-pip python3-venv nginx git
    ```

---

## 📂 Passo 2: Deploy do Back-end (FastAPI)

1.  **Clone o projeto:**

    ```bash
    git clone https://github.com/seu-usuario/sistema-gestao-suinos.git
cd sistema-gestao-suinos
    ```

2.  **Configure o ambiente Python:**

    ```bash
    python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
    ```

3.  **Instale o Gunicorn:**

    ```bash
    pip install gunicorn
    ```

4.  **Configure o banco de dados:** Siga o **Guia de Deploy - Passo 2** para instalar e configurar o MySQL no servidor.

5.  **Configure o arquivo `.env`:** Crie e edite o arquivo `.env` com as credenciais do banco de dados de produção.

6.  **Teste o Gunicorn:**

    ```bash
    gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app
    ```

    -   `-w 4`: Inicia 4 processos "workers". A recomendação é `(2 * NÚMERO_DE_CORES_CPU) + 1`.
    -   `-k uvicorn.workers.UvicornWorker`: Usa a classe de worker do Uvicorn, que é assíncrona.

    Acesse `http://SEU_ENDERECO_DE_IP:8000` no navegador. Você deve ver a mensagem da API. Pressione `CTRL+C` para parar.

7.  **Crie um serviço com `systemd` para o Gunicorn:** Isso garantirá que sua API inicie automaticamente com o servidor e reinicie em caso de falha.

    Crie o arquivo de serviço:

    ```bash
    sudo nano /etc/systemd/system/suinos-api.service
    ```

    Cole o seguinte conteúdo (ajuste os caminhos se necessário):

    ```ini
    [Unit]
    Description=Gunicorn instance to serve a API de Gestão de Suínos
    After=network.target

    [Service]
    User=seu_usuario
    Group=www-data
    WorkingDirectory=/home/seu_usuario/sistema-gestao-suinos
    Environment="PATH=/home/seu_usuario/sistema-gestao-suinos/venv/bin"
    ExecStart=/home/seu_usuario/sistema-gestao-suinos/venv/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app

    [Install]
    WantedBy=multi-user.target
    ```

    Inicie e habilite o serviço:

    ```bash
    sudo systemctl start suinos-api
    sudo systemctl enable suinos-api
    ```

    Verifique o status:

    ```bash
    sudo systemctl status suinos-api
    ```

---

## ⚛️ Passo 3: Deploy do Front-end (React)

1.  **Instale Node.js e npm:**

    ```bash
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
    ```

2.  **Faça o build da aplicação React:**

    ```bash
    cd /home/seu_usuario/sistema-gestao-suinos/frontend
npm install
npm run build
    ```

    Este comando criará uma pasta `build` (ou `dist`) com os arquivos estáticos otimizados para produção.

---

## 🌐 Passo 4: Configurar o Nginx como Proxy Reverso

1.  **Crie um arquivo de configuração para o seu site:**

    ```bash
    sudo nano /etc/nginx/sites-available/seu_dominio
    ```

2.  **Cole a seguinte configuração:** (Substitua `seu_dominio` e os caminhos)

    ```nginx
    server {
        listen 80;
        server_name seu_dominio www.seu_dominio;

        # Redireciona HTTP para HTTPS (após configurar SSL)
        # return 301 https://$host$request_uri;

        # Rota para a API (proxy reverso)
        location /api {
            proxy_pass http://127.0.0.1:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # Rota para servir o front-end React
        location / {
            root /home/seu_usuario/sistema-gestao-suinos/frontend/build;
            try_files $uri /index.html;
        }
    }
    ```

3.  **Habilite o site e teste a configuração do Nginx:**

    ```bash
    sudo ln -s /etc/nginx/sites-available/seu_dominio /etc/nginx/sites-enabled
sudo nginx -t
    ```

    Se o teste for bem-sucedido, reinicie o Nginx:

    ```bash
    sudo systemctl restart nginx
    ```

    Neste ponto, ao acessar `http://seu_dominio`, você deve ver sua aplicação React, e as chamadas para `/api` devem funcionar.

---

## 🔒 Passo 5: Configurar HTTPS com Let's Encrypt

1.  **Instale o Certbot:**

    ```bash
    sudo apt install -y certbot python3-certbot-nginx
    ```

2.  **Obtenha o certificado SSL:**

    ```bash
    sudo certbot --nginx -d seu_dominio -d www.seu_dominio
    ```

    -   O Certbot irá editar automaticamente sua configuração do Nginx para adicionar as configurações de SSL e configurar o redirecionamento de HTTP para HTTPS.

3.  **Verifique a renovação automática:**

    ```bash
    sudo systemctl status certbot.timer
    ```

---

## ✅ Resumo do Deploy

1.  ✅ **Servidor Preparado:** VPS com Ubuntu, Python, Nginx e Git instalados.
2.  ✅ **Back-end Rodando:** Gunicorn executa a API FastAPI como um serviço `systemd`.
3.  ✅ **Front-end Compilado:** Aplicação React compilada para produção.
4.  ✅ **Nginx Configurado:** Atua como proxy reverso para a API e serve os arquivos do front-end.
5.  ✅ **HTTPS Ativado:** Certbot configurou SSL para tráfego seguro.

Sua aplicação está agora **online e em produção**!

---

## 🚀 Próximo Passo

O próximo e último passo é **consolidar toda a documentação** em um guia único e fácil de seguir.
