# Guia de Deploy - Passo 2: Configuração do Banco de Dados MySQL

**Projeto:** Sistema de Gestão de Suínos - API FastAPI + Front-end React  
**Data:** Janeiro de 2026  
**Elaborado por:** Manus AI

---

## 📋 Visão Geral

Este guia detalha como configurar o banco de dados **MySQL** para a aplicação. A maneira mais simples e recomendada é usar **Docker**, que isola o banco de dados em um contêiner e simplifica a configuração.

---

## 🐳 Opção 1: Usando Docker (Recomendado)

Esta é a abordagem mais fácil e rápida. Você só precisa ter o Docker e o Docker Compose instalados.

### 1. Arquivo `docker-compose.yml`

O projeto já inclui um arquivo `docker-compose.yml` na raiz, pronto para uso:

```yaml
# docker-compose.yml

version: '3.8'

services:
  db:
    image: mysql:8.0
    container_name: gestao_suinos_db
    restart: always
    environment:
      MYSQL_DATABASE: gestao_suinos
      MYSQL_USER: user
      MYSQL_PASSWORD: password
      MYSQL_ROOT_PASSWORD: root_password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
```

### 2. Iniciar o Banco de Dados

Navegue até a raiz do projeto no terminal e execute o seguinte comando:

```bash
# Inicia o contêiner do banco de dados em background (-d)
docker-compose up -d
```

**Verificação:**
- O Docker fará o download da imagem do MySQL (na primeira vez) e iniciará o contêiner.
- Para confirmar que está rodando, execute `docker ps`. Você deve ver um contêiner chamado `gestao_suinos_db`.

### 3. Conectar ao Banco de Dados (Opcional)

Você pode usar qualquer cliente de banco de dados (DBeaver, DataGrip, MySQL Workbench) para se conectar com as seguintes credenciais:

| Parâmetro | Valor |
| :--- | :--- |
| **Host** | `localhost` |
| **Porta** | `3306` |
| **Usuário** | `user` |
| **Senha** | `password` |
| **Database** | `gestao_suinos` |

---

## 💻 Opção 2: Instalação Manual do MySQL

Se você prefere não usar o Docker, pode instalar o MySQL Server diretamente em sua máquina.

### 1. Instalar o MySQL Server

- **Windows:** Baixe o instalador em [dev.mysql.com/downloads/installer/](https://dev.mysql.com/downloads/installer/).
- **macOS (usando Homebrew):** `brew install mysql`
- **Linux (Ubuntu):** `sudo apt update && sudo apt install mysql-server`

### 2. Configurar o Banco de Dados e Usuário

Após a instalação, conecte-se ao MySQL como root e execute os seguintes comandos SQL para criar o banco de dados e o usuário para a aplicação:

```sql
-- Conecte-se ao MySQL com o usuário root
-- mysql -u root -p

-- 1. Crie o banco de dados
CREATE DATABASE gestao_suinos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Crie o usuário para a aplicação
CREATE USER 'user'@'localhost' IDENTIFIED BY 'password';

-- 3. Dê todas as permissões ao usuário no banco de dados criado
GRANT ALL PRIVILEGES ON gestao_suinos.* TO 'user'@'localhost';

-- 4. Aplique as alterações
FLUSH PRIVILEGES;

-- 5. Saia do MySQL
EXIT;
```

---

## ✅ Resumo da Configuração

Ao final deste guia, você deve ter:

1.  ✅ Um servidor de banco de dados MySQL em execução (via Docker ou localmente).
2.  ✅ Um banco de dados chamado `gestao_suinos` criado.
3.  ✅ Um usuário (`user`) com senha (`password`) que tem acesso total ao banco `gestao_suinos`.

---

## 🚀 Próximo Passo

Com o banco de dados pronto, o próximo passo é **configurar e executar o back-end FastAPI**. Siga para o **Guia de Deploy - Passo 3**.
