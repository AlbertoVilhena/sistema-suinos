# API FastAPI - Sistema de Gestão de Suínos

API RESTful desenvolvida com **FastAPI** para o gerenciamento completo de uma granja de suínos.

## 🚀 Tecnologias Utilizadas

- **FastAPI** - Framework web moderno e rápido
- **SQLAlchemy** - ORM para Python
- **Pydantic** - Validação de dados
- **PyMySQL** - Driver para MySQL/MariaDB
- **Uvicorn** - Servidor ASGI

## 📋 Pré-requisitos

- Python 3.11+
- MySQL 8.0+ ou MariaDB 10.5+
- pip (gerenciador de pacotes Python)

## 🔧 Instalação

### 1. Clone o repositório (ou copie os arquivos)

```bash
cd fastapi_project
```

### 2. Crie um ambiente virtual

```bash
python3 -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate
```

### 3. Instale as dependências

```bash
pip install -r requirements.txt
```

### 4. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e ajuste as configurações:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais do banco de dados:

```env
DATABASE_URL=mysql+pymysql://seu_usuario:sua_senha@localhost:3306/gestao_suinos
```

### 5. Crie o banco de dados

Execute o script SQL fornecido anteriormente para criar as tabelas:

```bash
mysql -u seu_usuario -p gestao_suinos < create_tables.sql
```

## ▶️ Executando a Aplicação

### Modo de Desenvolvimento

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

A API estará disponível em: `http://localhost:8000`

### Modo de Produção

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 📚 Documentação da API

Após iniciar a aplicação, acesse:

- **Swagger UI (interativa):** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## 🧪 Testando os Endpoints

### Endpoint POST /animais

### Usando cURL

```bash
curl -X POST "http://localhost:8000/api/v1/animais" \
  -H "Content-Type: application/json" \
  -d '{
    "identificacao_principal": "BR-2026-001",
    "sexo": "Fêmea",
    "data_nascimento": "2026-01-15",
    "peso_nascimento": 1.45,
    "raca": "Landrace",
    "status_vida": "Ativo"
  }'
```

### Usando Python (requests)

```python
import requests

url = "http://localhost:8000/api/v1/animais"
payload = {
    "identificacao_principal": "BR-2026-002",
    "sexo": "Macho",
    "data_nascimento": "2026-01-16",
    "peso_nascimento": 1.50,
    "raca": "Duroc",
    "status_vida": "Ativo"
}

response = requests.post(url, json=payload)
print(response.status_code)
print(response.json())
```

### Resposta de Sucesso (201 Created)

```json
{
  "animal_id": 1,
  "identificacao_principal": "BR-2026-001",
  "sexo": "Fêmea",
  "data_nascimento": "2026-01-15",
  "peso_nascimento": 1.45,
  "raca": "Landrace",
  "lote_id": null,
  "mae_id": null,
  "pai_id": null,
  "status_vida": "Ativo",
  "status_reprodutivo": "Não Aplicável",
  "created_at": "2026-01-20T10:00:00"
}
```

## 📁 Estrutura do Projeto

```
fastapi_project/
├── app/
│   ├── __init__.py
│   ├── main.py              # Aplicação principal
│   ├── database.py          # Configuração do banco de dados
│   ├── models.py            # Modelos SQLAlchemy
│   ├── schemas.py           # Schemas Pydantic
│   └── routers/
│       ├── __init__.py
│       └── animais.py       # Endpoints de animais
├── .env.example             # Exemplo de variáveis de ambiente
├── requirements.txt         # Dependências do projeto
└── README.md               # Este arquivo
```

## ✅ Validações Implementadas

O endpoint `POST /animais` realiza as seguintes validações:

1. **Identificação única:** Não permite duplicatas
2. **Data de nascimento:** Não pode ser futura
3. **Peso de nascimento:** Deve estar entre 0.5kg e 5.0kg
4. **Lote:** Deve existir no banco (se informado)
5. **Mãe:** Deve existir e ser do sexo feminino (se informada)
6. **Pai:** Deve existir e ser do sexo masculino (se informado)

## 🔒 Segurança

**Importante:** Esta versão ainda não implementa autenticação JWT. Para uso em produção, é necessário:

1. Implementar autenticação com JWT
2. Adicionar middleware de autorização
3. Configurar CORS adequadamente
4. Usar HTTPS

### Endpoint POST /eventos-reprodutivos

```bash
curl -X POST "http://localhost:8000/api/v1/eventos-reprodutivos" \
  -H "Content-Type: application/json" \
  -d '{
    "matriz_id": 1,
    "tipo_evento": "Parto",
    "data_evento": "2026-05-14",
    "total_nascidos": 14,
    "nascidos_vivos": 12
  }'
```

**Resposta de Sucesso (201 Created):**
```json
{
  "evento_id": 1,
  "matriz_id": 1,
  "tipo_evento": "Parto",
  "data_evento": "2026-05-14",
  "total_nascidos": 14,
  "nascidos_vivos": 12,
  "created_at": "2026-01-20T10:00:00Z"
}
```

## 🚀 Próximos Passos

- [ ] Implementar autenticação JWT
- [x] Adicionar endpoints DELETE ✅
- [x] Adicionar endpoints PUT para atualização ✅
- [x] Criar endpoints para eventos reprodutivos ✅
- [x] Implementar testes automatizados ✅
- [ ] Configurar migrations com Alembic
- [ ] Adicionar logging estruturado

## 📝 Licença

Este projeto é de uso interno.
