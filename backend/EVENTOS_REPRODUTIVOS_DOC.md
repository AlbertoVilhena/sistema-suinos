# Documentação - Endpoint POST /eventos-reprodutivos

**Projeto:** Sistema de Gestão de Suínos - API FastAPI  
**Data:** Janeiro de 2026  
**Elaborado por:** Manus AI

---

## 1. Visão Geral

Este documento descreve a implementação completa do endpoint `POST /eventos-reprodutivos`, incluindo validações condicionais, lógica de atualização automática de status da matriz e tratamento de erros.

---

## 2. Endpoint Principal

### POST /eventos-reprodutivos

Cria um novo evento reprodutivo e atualiza automaticamente o status da matriz.

**URL:** `POST /api/v1/eventos-reprodutivos`

**Autenticação:** Obrigatória (JWT - a ser implementado)

---

## 3. Tipos de Eventos

O sistema suporta 4 tipos de eventos reprodutivos:

| Tipo | Descrição | Campos Obrigatórios | Atualização de Status |
| :--- | :--- | :--- | :--- |
| **Cobertura** | Inseminação ou monta natural | `reprodutor_id` | Matriz → `Gestante` |
| **Diagnóstico** | Confirmação de gestação | `resultado_diagnostico` | Positivo → `Gestante`<br>Negativo → `Vazia` |
| **Parto** | Nascimento dos leitões | `total_nascidos`, `nascidos_vivos` | Matriz → `Lactante` |
| **Desmame** | Separação dos leitões | Nenhum adicional | Matriz → `Vazia` |

---

## 4. Payloads de Exemplo

### 4.1 Evento de Cobertura

```json
POST /api/v1/eventos-reprodutivos

{
  "matriz_id": 102,
  "tipo_evento": "Cobertura",
  "data_evento": "2026-01-20",
  "reprodutor_id": 55
}
```

**Resposta (201 Created):**
```json
{
  "evento_id": 512,
  "matriz_id": 102,
  "tipo_evento": "Cobertura",
  "data_evento": "2026-01-20",
  "reprodutor_id": 55,
  "resultado_diagnostico": null,
  "total_nascidos": null,
  "nascidos_vivos": null,
  "created_at": "2026-01-20T15:00:00Z"
}
```

**Efeito:** Status da matriz atualizado para `Gestante`.

---

### 4.2 Evento de Diagnóstico (Positivo)

```json
{
  "matriz_id": 102,
  "tipo_evento": "Diagnóstico",
  "data_evento": "2026-02-10",
  "resultado_diagnostico": "Positivo"
}
```

**Efeito:** Status da matriz confirmado como `Gestante`.

---

### 4.3 Evento de Parto

```json
{
  "matriz_id": 102,
  "tipo_evento": "Parto",
  "data_evento": "2026-05-14",
  "total_nascidos": 14,
  "nascidos_vivos": 12
}
```

**Efeito:** Status da matriz atualizado para `Lactante`.

---

### 4.4 Evento de Desmame

```json
{
  "matriz_id": 102,
  "tipo_evento": "Desmame",
  "data_evento": "2026-06-18"
}
```

**Efeito:** Status da matriz atualizado para `Vazia`.

---

## 5. Validações Implementadas

### 5.1 Validações Automáticas (Pydantic)

Executadas antes de entrar na função do endpoint:

*   **Tipos de dados:** `tipo_evento` deve ser um enum válido
*   **Data do evento:** Deve ser uma data válida e não futura
*   **Campos numéricos:** `total_nascidos` e `nascidos_vivos` devem ser >= 0
*   **Nascidos vivos:** Não pode ser maior que total nascidos

### 5.2 Validações de Negócio (Endpoint)

| Validação | Código de Status | Mensagem de Erro |
| :--- | :--- | :--- |
| Matriz não encontrada | `404 Not Found` | "Matriz com ID X não encontrada" |
| Matriz não é fêmea | `422 Unprocessable Entity` | "A matriz deve ser do sexo feminino" |
| Reprodutor ausente (Cobertura) | `400 Bad Request` | "O campo 'reprodutor_id' é obrigatório..." |
| Reprodutor não encontrado | `404 Not Found` | "Reprodutor com ID X não encontrado" |
| Reprodutor não é macho | `422 Unprocessable Entity` | "O reprodutor deve ser do sexo masculino" |
| Resultado ausente (Diagnóstico) | `400 Bad Request` | "O campo 'resultado_diagnostico' é obrigatório..." |
| Dados de parto ausentes | `400 Bad Request` | "Os campos 'total_nascidos' e 'nascidos_vivos' são obrigatórios..." |
| Nascidos vivos > Total | `422 Unprocessable Entity` | "Nascidos vivos não pode ser maior que total" |

---

## 6. Lógica de Atualização de Status

A função `atualizar_status_matriz()` implementa as regras de negócio:

```python
def atualizar_status_matriz(db, matriz_id, tipo_evento, resultado_diagnostico):
    matriz = db.query(Animal).filter(Animal.animal_id == matriz_id).first()
    
    if tipo_evento == "Cobertura":
        matriz.status_reprodutivo = "Gestante"
    
    elif tipo_evento == "Parto":
        matriz.status_reprodutivo = "Lactante"
    
    elif tipo_evento == "Desmame":
        matriz.status_reprodutivo = "Vazia"
    
    elif tipo_evento == "Diagnóstico":
        if resultado_diagnostico == "Positivo":
            matriz.status_reprodutivo = "Gestante"
        elif resultado_diagnostico == "Negativo":
            matriz.status_reprodutivo = "Vazia"
    
    db.commit()
```

---

## 7. Fluxo de Execução

### Criação de um Evento

1.  **Recebimento dos dados:** FastAPI deserializa o JSON
2.  **Validação Pydantic:** Verifica tipos, formatos e constraints
3.  **Validação da matriz:** Verifica se existe e é fêmea
4.  **Validações condicionais:** Baseadas no tipo de evento
5.  **Criação do registro:** Instancia o modelo SQLAlchemy
6.  **Persistência:** Commit no banco de dados
7.  **Atualização de status:** Chama `atualizar_status_matriz()`
8.  **Resposta:** Retorna o evento criado com status 201

---

## 8. Endpoints Adicionais

### GET /eventos-reprodutivos/matriz/{matriz_id}

Lista todos os eventos de uma matriz específica, ordenados do mais recente para o mais antigo.

**Exemplo:**
```bash
GET /api/v1/eventos-reprodutivos/matriz/102
```

**Resposta (200 OK):**
```json
[
  {
    "evento_id": 513,
    "tipo_evento": "Parto",
    "data_evento": "2026-05-14",
    "matriz_id": 102
  },
  {
    "evento_id": 512,
    "tipo_evento": "Cobertura",
    "data_evento": "2026-01-20",
    "matriz_id": 102
  }
]
```

---

### GET /eventos-reprodutivos/{evento_id}

Retorna os detalhes completos de um evento específico.

---

### DELETE /eventos-reprodutivos/{evento_id}

Deleta um evento e recalcula o status da matriz baseado no evento anterior.

**Lógica de recálculo:**
1.  Deleta o evento
2.  Busca o evento anterior mais recente da mesma matriz
3.  Aplica as regras de status baseadas no evento anterior
4.  Se não há eventos anteriores, define status como `Vazia`

---

## 9. Testes Unitários

O arquivo `tests/test_eventos_reprodutivos.py` contém 13 testes:

| Teste | Cenário | Resultado Esperado |
| :--- | :--- | :--- |
| `test_criar_evento_cobertura_sucesso` | Cobertura com dados válidos | `201 Created`, status → `Gestante` |
| `test_criar_evento_cobertura_sem_reprodutor` | Cobertura sem reprodutor | `400 Bad Request` |
| `test_criar_evento_parto_sucesso` | Parto com dados válidos | `201 Created`, status → `Lactante` |
| `test_criar_evento_parto_nascidos_vivos_maior` | Nascidos vivos > total | `422 Unprocessable Entity` |
| `test_criar_evento_diagnostico_positivo` | Diagnóstico positivo | Status → `Gestante` |
| `test_criar_evento_diagnostico_negativo` | Diagnóstico negativo | Status → `Vazia` |
| `test_criar_evento_desmame_sucesso` | Desmame válido | Status → `Vazia` |
| `test_criar_evento_matriz_inexistente` | Matriz não existe | `404 Not Found` |
| `test_criar_evento_matriz_macho` | Matriz é macho | `422 Unprocessable Entity` |
| `test_listar_eventos_matriz` | Listagem de eventos | `200 OK` |
| `test_deletar_evento_recalcula_status` | Deletar evento | Status recalculado corretamente |

**Executar os testes:**
```bash
pytest tests/test_eventos_reprodutivos.py -v
```

---

## 10. Exemplo de Ciclo Completo

### Ciclo Reprodutivo de uma Matriz

```python
# 1. Criar a matriz
POST /api/v1/animais
{
  "identificacao_principal": "MT-2026-A01",
  "sexo": "Fêmea",
  "data_nascimento": "2025-06-10",
  "status_vida": "Ativo"
}
# Status inicial: "Não Aplicável"

# 2. Registrar cobertura
POST /api/v1/eventos-reprodutivos
{
  "matriz_id": 301,
  "tipo_evento": "Cobertura",
  "data_evento": "2026-02-01",
  "reprodutor_id": 55
}
# Status atualizado: "Gestante"

# 3. Confirmar diagnóstico
POST /api/v1/eventos-reprodutivos
{
  "matriz_id": 301,
  "tipo_evento": "Diagnóstico",
  "data_evento": "2026-02-21",
  "resultado_diagnostico": "Positivo"
}
# Status mantido: "Gestante"

# 4. Registrar parto
POST /api/v1/eventos-reprodutivos
{
  "matriz_id": 301,
  "tipo_evento": "Parto",
  "data_evento": "2026-05-26",
  "total_nascidos": 14,
  "nascidos_vivos": 12
}
# Status atualizado: "Lactante"

# 5. Registrar desmame
POST /api/v1/eventos-reprodutivos
{
  "matriz_id": 301,
  "tipo_evento": "Desmame",
  "data_evento": "2026-06-16"
}
# Status atualizado: "Vazia"

# 6. Consultar histórico completo
GET /api/v1/eventos-reprodutivos/matriz/301
# Retorna todos os 5 eventos em ordem cronológica decrescente
```

---

## 11. Códigos de Status HTTP

| Código | Situação |
| :--- | :--- |
| `201 Created` | Evento criado com sucesso |
| `200 OK` | Listagem ou consulta bem-sucedida |
| `204 No Content` | Evento deletado com sucesso |
| `400 Bad Request` | Campos obrigatórios ausentes |
| `404 Not Found` | Matriz ou reprodutor não encontrado |
| `422 Unprocessable Entity` | Regras de negócio violadas |
| `500 Internal Server Error` | Erro no servidor |

---

## 12. Próximas Implementações

- [ ] Implementar endpoint `PUT /eventos-reprodutivos/{id}` para correções
- [ ] Adicionar validação de sequência lógica de eventos
- [ ] Implementar cálculo automático de intervalo entre partos
- [ ] Adicionar relatórios de produtividade por matriz
- [ ] Implementar notificações para eventos importantes

---

**Elaborado por:** Manus AI  
**Data:** Janeiro de 2026
