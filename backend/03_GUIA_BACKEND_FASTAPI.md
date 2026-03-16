# Guia de Deploy - Passo 3: Execução e Teste do Back-end (FastAPI)

**Projeto:** Sistema de Gestão de Suínos - API FastAPI + Front-end React  
**Data:** Janeiro de 2026  
**Elaborado por:** Manus AI

---

## 📋 Visão Geral

Com o ambiente local e o banco de dados configurados, este guia mostra como **executar, testar e interagir com a API FastAPI**.

---

## ⚙️ Passo 1: Configurar Variáveis de Ambiente

A aplicação usa um arquivo `.env` para gerenciar as credenciais do banco de dados e outras configurações sensíveis.

1.  **Renomeie o arquivo de exemplo:** Na raiz do projeto, renomeie `.env.example` para `.env`.

2.  **Edite o arquivo `.env`:** Abra o arquivo `.env` e verifique se a `DATABASE_URL` corresponde à configuração do seu banco de dados. Se você usou o Docker Compose ou a instalação manual com as credenciais padrão, o valor já estará correto.

    ```ini
    # .env

    # URL de conexão com o banco de dados
    # Formato: mysql+pymysql://<user>:<password>@<host>:<port>/<database>
    DATABASE_URL="mysql+pymysql://user:password@localhost:3306/gestao_suinos"

    # Chave secreta para JWT (será usada futuramente)
    SECRET_KEY="gere_uma_chave_forte_com_openssl_rand_hex_32"
    ALGORITHM="HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES=30
    ```

**IMPORTANTE:** O arquivo `.env` **nunca** deve ser enviado para o controle de versão (Git).

---

## 🏗️ Passo 2: Criar as Tabelas no Banco de Dados

Antes de rodar a API pela primeira vez, precisamos criar a estrutura de tabelas no banco de dados `gestao_suinos`.

O projeto usa **Alembic** para gerenciar as migrações do banco de dados. (Nota: O código gerado anteriormente não incluía Alembic, mas esta é a prática recomendada para produção. Para simplificar o guia inicial, vamos criar as tabelas diretamente a partir dos modelos SQLAlchemy).

1.  **Abra o arquivo `app/main.py`**.

2.  **Descomente a linha `Base.metadata.create_all(bind=engine)`**. Isso fará com que o FastAPI crie todas as tabelas definidas em `app/models.py` ao ser iniciado.

    ```python
    # app/main.py

    # ... (imports)

    # Descomente a linha abaixo para criar as tabelas
    Base.metadata.create_all(bind=engine)

    # Criar a aplicação FastAPI
    app = FastAPI(...)
    ```

---

## 🚀 Passo 3: Executar a Aplicação

Com tudo configurado, vamos iniciar o servidor da API.

1.  **Ative o ambiente virtual** (se ainda não estiver ativo):

    ```bash
    # No macOS/Linux:
source venv/bin/activate
    ```

2.  **Inicie o servidor Uvicorn**:

    ```bash
    # A partir da raiz do projeto
uvicorn app.main:app --reload
    ```

    -   `app.main:app`: Aponta para a instância `app` no arquivo `app/main.py`.
    -   `--reload`: Reinicia o servidor automaticamente sempre que um arquivo de código é alterado. Ótimo para desenvolvimento.

**Verificação:**
O terminal deve exibir uma saída semelhante a esta:

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345]
INFO:     Started server process [12347]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

Isso significa que sua API está **rodando com sucesso**!

---

## 📖 Passo 4: Acessar a Documentação Interativa (Swagger UI)

O FastAPI gera automaticamente uma documentação interativa para todos os seus endpoints. Esta é a melhor maneira de explorar e testar a API.

1.  Abra seu navegador e acesse: **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

2.  Você verá a interface do **Swagger UI**, listando todos os endpoints disponíveis (`/animais`, `/eventos-reprodutivos`, etc.).

**Como usar:**
-   Clique em um endpoint para expandir seus detalhes.
-   Clique no botão **"Try it out"**.
-   Preencha os campos do payload JSON de exemplo.
-   Clique em **"Execute"**.

O Swagger enviará uma requisição real para a sua API local e exibirá a resposta (código de status, headers e body) logo abaixo.

![Swagger UI](https://i.imgur.com/gSjYfCg.png)

---

## 🧪 Passo 5: Executar os Testes Automatizados

O projeto vem com um conjunto de testes unitários para garantir que a lógica de negócio está funcionando corretamente. É uma boa prática executar os testes sempre que fizer alterações no código.

1.  **Certifique-se de que o banco de dados de teste está configurado** (os testes usam um banco de dados em memória ou um banco de dados de teste separado para não afetar seus dados de desenvolvimento).

2.  **Execute o Pytest** no terminal, a partir da raiz do projeto:

    ```bash
    pytest
    ```

**Verificação:**
O Pytest encontrará e executará todos os arquivos de teste (que começam com `test_`). A saída mostrará quantos testes passaram ou falharam.

```
============================= test session starts ==============================
...
collected 30 items

tests/test_animais.py ......................... [ 83%]
tests/test_eventos_reprodutivos.py .......      [100%]

============================== 30 passed in 2.15s ==============================
```

---

## ✅ Resumo da Execução

Ao final deste guia, você deve ser capaz de:

1.  ✅ Configurar as variáveis de ambiente no arquivo `.env`.
2.  ✅ Criar as tabelas no banco de dados.
3.  ✅ Iniciar o servidor da API com `uvicorn`.
4.  ✅ Acessar e usar a documentação interativa no Swagger UI (`/docs`).
5.  ✅ Executar todos os testes automatizados com `pytest`.

---

## 🚀 Próximo Passo

Com o back-end funcionando, o próximo passo é **configurar e executar o front-end React** e, em seguida, fazer o **deploy da aplicação em um servidor de produção**. Siga para o **Guia de Deploy - Passo 4**.
