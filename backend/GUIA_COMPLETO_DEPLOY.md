# Guia Completo de Deploy — Sistema de Gestão de Suínos

**Projeto:** Sistema de Gestão de Suínos  
**Stack:** Python · FastAPI · SQLAlchemy · MySQL · React · Nginx · Docker  
**Data:** Janeiro de 2026  
**Elaborado por:** Manus AI

---

## Sumário

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Pré-requisitos de Software](#2-pré-requisitos-de-software)
3. [Configuração do Ambiente Local](#3-configuração-do-ambiente-local)
4. [Configuração do Banco de Dados (MySQL)](#4-configuração-do-banco-de-dados-mysql)
5. [Configuração e Execução do Back-end (FastAPI)](#5-configuração-e-execução-do-back-end-fastapi)
6. [Configuração e Execução do Front-end (React)](#6-configuração-e-execução-do-front-end-react)
7. [Deploy em Produção (VPS + Nginx + SSL)](#7-deploy-em-produção-vps--nginx--ssl)
8. [Manutenção e Monitoramento](#8-manutenção-e-monitoramento)
9. [Solução de Problemas Comuns](#9-solução-de-problemas-comuns)
10. [Checklist Final](#10-checklist-final)

---

## 1. Visão Geral da Arquitetura

O sistema é composto por três camadas principais que se comunicam entre si. Compreender essa arquitetura é fundamental para executar e manter o sistema corretamente.

| Camada | Tecnologia | Responsabilidade |
| :--- | :--- | :--- |
| **Front-end** | React + Tailwind CSS | Interface visual acessada pelo usuário no navegador |
| **Back-end** | Python + FastAPI | Regras de negócio, validações e comunicação com o banco |
| **Banco de Dados** | MySQL 8.0 | Armazenamento persistente de todos os dados da granja |

**Fluxo de uma requisição em produção:**

```
Usuário (Navegador)
      |
      v
  HTTPS (Porta 443)
      |
      v
   NGINX (Proxy Reverso)
      |
      +---> /api/* --------> Gunicorn + FastAPI (Porta 8000)
      |                              |
      +---> /* (front-end)           v
            |                    MySQL (Porta 3306)
            v
      Arquivos Estáticos React
```

---

## 2. Pré-requisitos de Software

Antes de iniciar, certifique-se de que os seguintes softwares estão instalados em sua máquina de desenvolvimento.

| Software | Versão Mínima | Verificação | Link para Download |
| :--- | :--- | :--- | :--- |
| **Git** | 2.20+ | `git --version` | [git-scm.com](https://git-scm.com/downloads) |
| **Python** | 3.11+ | `python3 --version` | [python.org](https://www.python.org/downloads/) |
| **Node.js** | 18.0+ | `node --version` | [nodejs.org](https://nodejs.org/) |
| **npm** | 9.0+ | `npm --version` | Incluído com o Node.js |
| **Docker** | 20.0+ | `docker --version` | [docker.com](https://www.docker.com/products/docker-desktop/) |

---

## 3. Configuração do Ambiente Local

### 3.1 Obter o Código-Fonte

```bash
# Clone o repositório do projeto
git clone https://github.com/seu-usuario/sistema-gestao-suinos.git

# Entre no diretório do projeto
cd sistema-gestao-suinos
```

### 3.2 Configurar o Ambiente Virtual Python

É obrigatório usar um ambiente virtual para isolar as dependências do projeto.

```bash
# Crie o ambiente virtual
python3 -m venv venv

# Ative o ambiente virtual
# No macOS/Linux:
source venv/bin/activate

# No Windows (PowerShell):
.\venv\Scripts\Activate.ps1
```

Após a ativação, o prompt do terminal exibirá `(venv)` no início.

### 3.3 Instalar Dependências do Back-end

```bash
# Atualize o pip
pip install --upgrade pip

# Instale todas as dependências
pip install -r requirements.txt
```

### 3.4 Instalar Dependências do Front-end

```bash
# Navegue até a pasta do front-end
cd frontend

# Instale as dependências
npm install

# Volte para a raiz do projeto
cd ..
```

---

## 4. Configuração do Banco de Dados (MySQL)

### 4.1 Opção A — Docker (Recomendado)

Esta é a abordagem mais rápida. O projeto já inclui um arquivo `docker-compose.yml` pronto para uso.

```bash
# Na raiz do projeto, inicie o contêiner do banco de dados
docker-compose up -d
```

O Docker criará um contêiner MySQL com as seguintes credenciais padrão:

| Parâmetro | Valor |
| :--- | :--- |
| **Host** | `localhost` |
| **Porta** | `3306` |
| **Banco de Dados** | `gestao_suinos` |
| **Usuário** | `user` |
| **Senha** | `password` |

Para verificar se o contêiner está rodando: `docker ps`

### 4.2 Opção B — Instalação Manual do MySQL

Se preferir não usar Docker, instale o MySQL Server diretamente:

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y mysql-server

# macOS (Homebrew)
brew install mysql
```

Em seguida, conecte-se ao MySQL como root e crie o banco de dados:

```sql
-- Conecte-se: mysql -u root -p

CREATE DATABASE gestao_suinos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'user'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON gestao_suinos.* TO 'user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 5. Configuração e Execução do Back-end (FastAPI)

### 5.1 Configurar Variáveis de Ambiente

Crie o arquivo `.env` a partir do arquivo de exemplo:

```bash
# Copie o arquivo de exemplo
cp .env.example .env
```

Abra o arquivo `.env` e confirme os valores:

```ini
# .env

# URL de conexão com o banco de dados
DATABASE_URL="mysql+pymysql://user:password@localhost:3306/gestao_suinos"

# Chave secreta para JWT (gere uma com: openssl rand -hex 32)
SECRET_KEY="cole_aqui_uma_chave_forte_e_aleatoria"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

> **ATENÇÃO:** Nunca envie o arquivo `.env` para o Git. Ele já está incluído no `.gitignore`.

### 5.2 Criar as Tabelas no Banco de Dados

Na primeira execução, é preciso criar a estrutura de tabelas. Abra o arquivo `app/main.py` e **descomente** a seguinte linha:

```python
# app/main.py (linha ~11)

# Descomente a linha abaixo para criar as tabelas automaticamente
Base.metadata.create_all(bind=engine)
```

> **Nota:** Em produção, recomenda-se usar o **Alembic** para gerenciar migrações de banco de dados de forma controlada. Para o ambiente de desenvolvimento inicial, a criação automática é suficiente.

### 5.3 Iniciar o Servidor da API

```bash
# Certifique-se de que o ambiente virtual está ativo: source venv/bin/activate
# A partir da raiz do projeto:
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Verificação:** Acesse `http://localhost:8000` no navegador. Você deve ver:

```json
{
  "message": "API - Sistema de Gestão de Suínos",
  "version": "1.0.0",
  "docs": "/docs"
}
```

### 5.4 Acessar a Documentação Interativa (Swagger UI)

Com o servidor rodando, acesse a documentação automática:

-   **Swagger UI (interativo):** [http://localhost:8000/docs](http://localhost:8000/docs)
-   **ReDoc (leitura):** [http://localhost:8000/redoc](http://localhost:8000/redoc)

A interface Swagger permite testar todos os endpoints diretamente no navegador, sem precisar de nenhuma ferramenta externa.

### 5.5 Executar os Testes Automatizados

```bash
# Execute todos os testes
pytest

# Execute com saída detalhada
pytest -v

# Execute apenas os testes de animais
pytest tests/test_animais.py -v
```

---

## 6. Configuração e Execução do Front-end (React)

### 6.1 Iniciar o Servidor de Desenvolvimento

```bash
# Entre na pasta do front-end
cd frontend

# Inicie o servidor de desenvolvimento
npm start
```

O front-end estará disponível em `http://localhost:3000` e se comunicará com a API em `http://localhost:8000`.

### 6.2 Configurar a URL da API no Front-end

No arquivo de configuração do front-end (geralmente `.env` ou `src/config.js`), defina a URL base da API:

```ini
# frontend/.env

REACT_APP_API_URL=http://localhost:8000/api/v1
```

Em produção, este valor será alterado para a URL do seu domínio.

---

## 7. Deploy em Produção (VPS + Nginx + SSL)

Esta seção descreve como publicar a aplicação em um servidor na internet para que ela possa ser acessada de qualquer lugar.

### 7.1 Preparar o Servidor (VPS)

Escolha um provedor de cloud (DigitalOcean, Vultr, AWS, Contabo) e crie uma VPS com **Ubuntu 22.04 LTS** e pelo menos **1 GB de RAM**.

```bash
# 1. Acesse o servidor via SSH
ssh root@SEU_IP_DO_SERVIDOR

# 2. Crie um usuário não-root para maior segurança
adduser deploy
usermod -aG sudo deploy
su - deploy

# 3. Atualize o sistema
sudo apt update && sudo apt upgrade -y

# 4. Instale as dependências necessárias
sudo apt install -y python3-pip python3-venv nginx git mysql-server
```

### 7.2 Configurar o MySQL no Servidor

```bash
# Inicie o serviço do MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Configure o banco de dados de produção
sudo mysql -u root
```

```sql
-- No console do MySQL:
CREATE DATABASE gestao_suinos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'user'@'localhost' IDENTIFIED BY 'SUA_SENHA_FORTE_DE_PRODUCAO';
GRANT ALL PRIVILEGES ON gestao_suinos.* TO 'user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 7.3 Fazer o Deploy do Back-end

```bash
# 1. Clone o projeto no servidor
cd /home/deploy
git clone https://github.com/seu-usuario/sistema-gestao-suinos.git
cd sistema-gestao-suinos

# 2. Configure o ambiente Python
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn

# 3. Configure o arquivo .env de produção
cp .env.example .env
nano .env
```

No arquivo `.env` de produção, use as credenciais reais:

```ini
DATABASE_URL="mysql+pymysql://user:SUA_SENHA_FORTE@localhost:3306/gestao_suinos"
SECRET_KEY="gere_uma_chave_com_openssl_rand_hex_32"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

```bash
# 4. Crie o serviço systemd para o Gunicorn
sudo nano /etc/systemd/system/suinos-api.service
```

Cole o seguinte conteúdo no arquivo:

```ini
[Unit]
Description=Gunicorn para a API de Gestão de Suínos
After=network.target

[Service]
User=deploy
Group=www-data
WorkingDirectory=/home/deploy/sistema-gestao-suinos
Environment="PATH=/home/deploy/sistema-gestao-suinos/venv/bin"
ExecStart=/home/deploy/sistema-gestao-suinos/venv/bin/gunicorn \
          -w 4 \
          -k uvicorn.workers.UvicornWorker \
          --bind unix:/home/deploy/sistema-gestao-suinos/suinos.sock \
          app.main:app
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# 5. Inicie e habilite o serviço
sudo systemctl daemon-reload
sudo systemctl start suinos-api
sudo systemctl enable suinos-api

# 6. Verifique o status
sudo systemctl status suinos-api
```

### 7.4 Fazer o Deploy do Front-end

```bash
# 1. Instale o Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Entre na pasta do front-end
cd /home/deploy/sistema-gestao-suinos/frontend

# 3. Configure a URL da API de produção
echo "REACT_APP_API_URL=https://seu_dominio/api/v1" > .env.production

# 4. Instale as dependências e faça o build
npm install
npm run build
```

O comando `npm run build` criará uma pasta `build` com os arquivos estáticos otimizados.

### 7.5 Configurar o Nginx como Proxy Reverso

```bash
# Crie o arquivo de configuração do Nginx
sudo nano /etc/nginx/sites-available/suinos
```

Cole a seguinte configuração:

```nginx
server {
    listen 80;
    server_name seu_dominio www.seu_dominio;

    # Rota para a API (proxy reverso para o Gunicorn via socket Unix)
    location /api {
        include proxy_params;
        proxy_pass http://unix:/home/deploy/sistema-gestao-suinos/suinos.sock;
    }

    # Rota para a documentação da API
    location /docs {
        include proxy_params;
        proxy_pass http://unix:/home/deploy/sistema-gestao-suinos/suinos.sock;
    }

    # Rota para servir o front-end React
    location / {
        root /home/deploy/sistema-gestao-suinos/frontend/build;
        try_files $uri /index.html;
    }
}
```

```bash
# Habilite o site
sudo ln -s /etc/nginx/sites-available/suinos /etc/nginx/sites-enabled

# Teste a configuração do Nginx
sudo nginx -t

# Reinicie o Nginx
sudo systemctl restart nginx
```

### 7.6 Configurar HTTPS com Let's Encrypt

```bash
# 1. Instale o Certbot
sudo apt install -y certbot python3-certbot-nginx

# 2. Obtenha o certificado SSL gratuito
sudo certbot --nginx -d seu_dominio -d www.seu_dominio
```

O Certbot configurará automaticamente o HTTPS e o redirecionamento de HTTP para HTTPS. Os certificados são renovados automaticamente a cada 90 dias.

---

## 8. Manutenção e Monitoramento

### Atualizar a Aplicação

Sempre que houver uma nova versão do código, siga estes passos no servidor:

```bash
# 1. Acesse o servidor e o diretório do projeto
cd /home/deploy/sistema-gestao-suinos

# 2. Baixe as últimas alterações do Git
git pull origin main

# 3. Ative o ambiente virtual e atualize as dependências
source venv/bin/activate
pip install -r requirements.txt

# 4. Reconstrua o front-end
cd frontend && npm install && npm run build && cd ..

# 5. Reinicie o serviço da API
sudo systemctl restart suinos-api
```

### Comandos de Monitoramento

| Objetivo | Comando |
| :--- | :--- |
| Ver status da API | `sudo systemctl status suinos-api` |
| Ver logs da API em tempo real | `sudo journalctl -u suinos-api -f` |
| Ver status do Nginx | `sudo systemctl status nginx` |
| Ver logs do Nginx | `sudo tail -f /var/log/nginx/error.log` |
| Ver uso de memória e CPU | `htop` |
| Verificar espaço em disco | `df -h` |

### Backup do Banco de Dados

Execute este comando regularmente para fazer backup do banco de dados:

```bash
# Cria um arquivo .sql com todos os dados
mysqldump -u user -p gestao_suinos > backup_$(date +%Y%m%d).sql
```

Recomenda-se configurar um **cron job** para automatizar os backups diários:

```bash
# Abra o crontab
crontab -e

# Adicione esta linha para backup diário às 2h da manhã
0 2 * * * mysqldump -u user -pSUA_SENHA gestao_suinos > /home/deploy/backups/backup_$(date +\%Y\%m\%d).sql
```

---

## 9. Solução de Problemas Comuns

| Problema | Causa Provável | Solução |
| :--- | :--- | :--- |
| API não inicia | Erro no `.env` ou banco de dados offline | Verifique `journalctl -u suinos-api -f` e confirme que o MySQL está rodando |
| `502 Bad Gateway` no Nginx | Gunicorn não está rodando | Execute `sudo systemctl restart suinos-api` |
| Erro de conexão com o banco | Credenciais incorretas no `.env` | Verifique a `DATABASE_URL` no arquivo `.env` |
| Certificado SSL não renova | Porta 80 bloqueada | Verifique o firewall: `sudo ufw status` |
| `npm run build` falha | Variável de ambiente ausente | Confirme que o arquivo `frontend/.env.production` existe e está correto |
| Testes falham | Banco de dados de teste não configurado | Os testes usam um banco SQLite em memória; verifique o arquivo `conftest.py` |

---

## 10. Checklist Final

Use esta lista para verificar se todos os passos foram concluídos com sucesso.

**Ambiente Local:**
- [ ] Python 3.11+ instalado
- [ ] Node.js 18+ instalado
- [ ] Docker instalado (se usar a opção Docker)
- [ ] Ambiente virtual Python criado e ativado
- [ ] Dependências do back-end instaladas (`pip install -r requirements.txt`)
- [ ] Dependências do front-end instaladas (`npm install`)

**Banco de Dados:**
- [ ] MySQL rodando (via Docker ou instalação manual)
- [ ] Banco de dados `gestao_suinos` criado
- [ ] Usuário `user` com as permissões corretas criado

**Back-end:**
- [ ] Arquivo `.env` criado e configurado
- [ ] Tabelas criadas no banco de dados
- [ ] Servidor Uvicorn iniciado com sucesso
- [ ] Swagger UI acessível em `http://localhost:8000/docs`
- [ ] Todos os testes passando (`pytest`)

**Front-end:**
- [ ] Servidor de desenvolvimento iniciado (`npm start`)
- [ ] Front-end acessível em `http://localhost:3000`
- [ ] Comunicação com a API funcionando

**Produção:**
- [ ] VPS provisionada e acessível via SSH
- [ ] Banco de dados de produção configurado com senha forte
- [ ] Serviço `suinos-api` (Gunicorn) rodando e habilitado
- [ ] Build do front-end gerado (`npm run build`)
- [ ] Nginx configurado como proxy reverso
- [ ] Certificado SSL instalado (HTTPS ativo)
- [ ] Backup automático do banco de dados configurado

---

*Guia elaborado por **Manus AI** — Sistema de Gestão de Suínos, Janeiro de 2026.*
