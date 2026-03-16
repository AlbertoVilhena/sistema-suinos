# Documentação do Código - Endpoint POST /animais

**Projeto:** Sistema de Gestão de Suínos - API FastAPI  
**Data:** Janeiro de 2026  
**Elaborado por:** Manus AI

---

## 1. Visão Geral

Este documento descreve a implementação completa do endpoint `POST /animais` usando **FastAPI**, incluindo validação de dados com **Pydantic**, persistência com **SQLAlchemy** e tratamento robusto de erros.

---

## 2. Arquitetura do Projeto

O projeto segue uma arquitetura em camadas, separando responsabilidades de forma clara:

### Estrutura de Diretórios

```
fastapi_project/
├── app/
│   ├── __init__.py          # Inicialização do pacote
│   ├── main.py              # Aplicação principal FastAPI
│   ├── database.py          # Configuração do banco de dados
│   ├── models.py            # Modelos SQLAlchemy (ORM)
│   ├── schemas.py           # Schemas Pydantic (validação)
│   └── routers/
│       ├── __init__.py
│       └── animais.py       # Endpoints de animais
├── tests/
│   ├── __init__.py
│   └── test_animais.py      # Testes unitários
├── .env.example             # Exemplo de variáveis de ambiente
├── requirements.txt         # Dependências do projeto
└── README.md               # Instruções de uso
```

### Camadas da Aplicação

| Camada | Arquivo | Responsabilidade |
| :--- | :--- | :--- |
| **Apresentação** | `routers/animais.py` | Endpoints da API, validação de entrada, respostas HTTP |
| **Validação** | `schemas.py` | Validação de dados com Pydantic |
| **Negócio** | `routers/animais.py` | Regras de negócio e validações customizadas |
| **Persistência** | `models.py` | Modelos ORM, mapeamento objeto-relacional |
| **Infraestrutura** | `database.py` | Conexão com banco de dados |

---

## 3. Componentes Principais

### 3.1 Configuração do Banco de Dados (`database.py`)

Este arquivo configura a conexão com o banco de dados MySQL/MariaDB usando SQLAlchemy.

**Principais elementos:**

*   **`DATABASE_URL`**: String de conexão carregada do arquivo `.env`
*   **`engine`**: Motor do SQLAlchemy que gerencia conexões
*   **`SessionLocal`**: Fábrica de sessões para transações
*   **`get_db()`**: Dependency do FastAPI que fornece uma sessão de banco de dados

**Exemplo de uso:**
```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 3.2 Modelos SQLAlchemy (`models.py`)

Define a estrutura das tabelas do banco de dados usando classes Python.

**Modelo `Animal`:**

```python
class Animal(Base):
    __tablename__ = "animais"
    
    animal_id = Column(Integer, primary_key=True, autoincrement=True)
    identificacao_principal = Column(String(50), unique=True, nullable=False)
    sexo = Column(Enum(SexoEnum), nullable=False)
    data_nascimento = Column(Date, nullable=False)
    # ... outros campos
```

**Características importantes:**

*   **Enums tipados**: `SexoEnum`, `StatusVidaEnum`, `StatusReprodutivoEnum`
*   **Auto-relacionamentos**: `mae_id` e `pai_id` referenciam a própria tabela
*   **Timestamps automáticos**: `created_at` e `updated_at`
*   **Relacionamentos**: `relationship()` para navegação entre tabelas

### 3.3 Schemas Pydantic (`schemas.py`)

Define os contratos de entrada e saída da API com validação automática.

**Schema `AnimalCreate`:**

```python
class AnimalCreate(BaseModel):
    identificacao_principal: str = Field(..., min_length=1, max_length=50)
    sexo: SexoEnum
    data_nascimento: date
    peso_nascimento: Optional[Decimal] = Field(None, ge=0, le=999.99)
    # ... outros campos
    
    @field_validator('data_nascimento')
    def validar_data_nascimento(cls, v: date) -> date:
        if v > date.today():
            raise ValueError('A data de nascimento não pode ser no futuro')
        return v
```

**Validações implementadas:**

*   **Comprimento de strings**: `min_length`, `max_length`
*   **Valores numéricos**: `ge` (maior ou igual), `le` (menor ou igual)
*   **Validadores customizados**: `@field_validator`
*   **Campos opcionais**: `Optional[tipo]`

### 3.4 Endpoint POST /animais (`routers/animais.py`)

Implementa a lógica completa de criação de um animal.

**Fluxo de execução:**

1.  **Recebimento dos dados**: FastAPI deserializa o JSON e valida com Pydantic
2.  **Validação de duplicidade**: Verifica se a identificação já existe
3.  **Validação de referências**: Verifica se lote, mãe e pai existem
4.  **Validação de regras de negócio**: Mãe deve ser fêmea, pai deve ser macho
5.  **Criação do registro**: Instancia o modelo SQLAlchemy
6.  **Persistência**: Commit no banco de dados
7.  **Resposta**: Retorna o animal criado com status 201

**Código principal:**

```python
@router.post("", response_model=AnimalResponse, status_code=201)
def criar_animal(animal_data: AnimalCreate, db: Session = Depends(get_db)):
    # Validação 1: Verificar duplicidade
    animal_existente = db.query(Animal).filter(
        Animal.identificacao_principal == animal_data.identificacao_principal
    ).first()
    
    if animal_existente:
        raise HTTPException(status_code=409, detail="...")
    
    # Validações 2-4: Verificar lote, mãe e pai
    # ...
    
    # Criar e persistir
    novo_animal = Animal(**animal_data.dict())
    db.add(novo_animal)
    db.commit()
    db.refresh(novo_animal)
    
    return novo_animal
```

---

## 4. Validações Implementadas

O endpoint implementa múltiplas camadas de validação:

### 4.1 Validações Automáticas (Pydantic)

Executadas antes mesmo de entrar na função do endpoint:

*   **Tipos de dados**: Garante que `sexo` é um enum válido, `data_nascimento` é uma data, etc.
*   **Campos obrigatórios**: Retorna erro 422 se campos obrigatórios estiverem ausentes
*   **Limites numéricos**: `peso_nascimento` deve estar entre 0 e 999.99
*   **Comprimento de strings**: `identificacao_principal` deve ter entre 1 e 50 caracteres

### 4.2 Validações Customizadas (Pydantic Validators)

Implementadas com `@field_validator`:

*   **Data de nascimento**: Não pode ser futura
*   **Peso de nascimento**: Deve estar entre 0.5kg e 5.0kg (validação de domínio)

### 4.3 Validações de Negócio (Endpoint)

Implementadas dentro da função do endpoint:

| Validação | Código de Status | Mensagem de Erro |
| :--- | :--- | :--- |
| Identificação duplicada | `409 Conflict` | "Já existe um animal com a identificação..." |
| Lote não encontrado | `404 Not Found` | "Lote com ID X não encontrado" |
| Mãe não encontrada | `404 Not Found` | "Mãe com ID X não encontrada" |
| Mãe não é fêmea | `422 Unprocessable Entity` | "A mãe deve ser do sexo feminino" |
| Pai não encontrado | `404 Not Found` | "Pai com ID X não encontrado" |
| Pai não é macho | `422 Unprocessable Entity` | "O pai deve ser do sexo masculino" |

---

## 5. Tratamento de Erros

O endpoint implementa tratamento robusto de erros em três níveis:

### 5.1 Erros de Validação (Pydantic)

Retornam automaticamente `422 Unprocessable Entity` com detalhes do erro:

```json
{
  "detail": [
    {
      "loc": ["body", "data_nascimento"],
      "msg": "A data de nascimento não pode ser no futuro",
      "type": "value_error"
    }
  ]
}
```

### 5.2 Erros de Negócio (HTTPException)

Lançados explicitamente no código:

```python
raise HTTPException(
    status_code=status.HTTP_409_CONFLICT,
    detail="Já existe um animal com esta identificação"
)
```

### 5.3 Erros de Banco de Dados

Capturados com `try-except`:

```python
try:
    db.commit()
except IntegrityError:
    db.rollback()
    raise HTTPException(status_code=409, detail="Erro de integridade...")
except Exception as e:
    db.rollback()
    raise HTTPException(status_code=500, detail=f"Erro ao criar animal: {str(e)}")
```

---

## 6. Testes Unitários

O arquivo `tests/test_animais.py` contém testes para os principais cenários:

| Teste | Cenário | Resultado Esperado |
| :--- | :--- | :--- |
| `test_criar_animal_sucesso` | Dados válidos | `201 Created` |
| `test_criar_animal_duplicado` | Identificação duplicada | `409 Conflict` |
| `test_criar_animal_data_futura` | Data de nascimento futura | `422 Unprocessable Entity` |
| `test_criar_animal_peso_invalido` | Peso fora do intervalo | `422 Unprocessable Entity` |
| `test_listar_animais` | Listagem com paginação | `200 OK` |
| `test_obter_animal_existente` | Buscar animal por ID | `200 OK` |
| `test_obter_animal_inexistente` | Buscar ID inexistente | `404 Not Found` |

**Executar os testes:**

```bash
pytest tests/ -v
```

---

## 7. Como Executar

### Passo 1: Instalar Dependências

```bash
pip install -r requirements.txt
```

### Passo 2: Configurar Banco de Dados

Edite o arquivo `.env`:

```env
DATABASE_URL=mysql+pymysql://usuario:senha@localhost:3306/gestao_suinos
```

### Passo 3: Executar a Aplicação

```bash
uvicorn app.main:app --reload
```

### Passo 4: Acessar a Documentação

Abra o navegador em: http://localhost:8000/docs

---

## 8. Próximas Implementações

- [ ] Implementar autenticação JWT
- [ ] Adicionar endpoints `PUT /animais/{id}` e `DELETE /animais/{id}`
- [ ] Implementar endpoints de eventos reprodutivos
- [ ] Adicionar logging estruturado
- [ ] Configurar migrations com Alembic
- [ ] Implementar rate limiting
- [ ] Adicionar cache com Redis

---

**Elaborado por:** Manus AI  
**Data:** Janeiro de 2026
