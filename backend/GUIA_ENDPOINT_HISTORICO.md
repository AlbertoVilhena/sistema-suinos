# Guia de Uso - Endpoint GET /eventos-reprodutivos/matriz/{id}

**Projeto:** Sistema de Gestão de Suínos - API FastAPI  
**Data:** Janeiro de 2026  
**Elaborado por:** Manus AI

---

## 📋 Visão Geral

O endpoint `GET /eventos-reprodutivos/matriz/{id}` retorna o **histórico completo** de eventos reprodutivos de uma matriz específica, ordenados do mais recente para o mais antigo. Este endpoint é essencial para visualizar toda a vida reprodutiva de uma fêmea.

---

## 🎯 Informações do Endpoint

**URL:** `GET /api/v1/eventos-reprodutivos/matriz/{matriz_id}`

**Método HTTP:** `GET`

**Autenticação:** Obrigatória (JWT - a ser implementado)

**Parâmetros de URL:**
- `matriz_id` (integer, obrigatório) - ID da matriz cujo histórico será consultado

---

## 💻 Código de Implementação

O endpoint já está implementado em `app/routers/eventos_reprodutivos.py`:

```python
@router.get(
    "/matriz/{matriz_id}",
    response_model=List[EventoReprodutivoListItem],
    summary="Listar eventos de uma matriz",
    description="Retorna o histórico de eventos reprodutivos de uma matriz específica."
)
def listar_eventos_matriz(
    matriz_id: int,
    db: Session = Depends(get_db)
):
    """
    Lista todos os eventos reprodutivos de uma matriz, 
    ordenados do mais recente para o mais antigo.

    **Parâmetros de URL:**
    - **matriz_id**: ID da matriz cujos eventos serão listados
    """
    
    # Verificar se a matriz existe
    matriz = db.query(Animal).filter(Animal.animal_id == matriz_id).first()
    if not matriz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Matriz com ID {matriz_id} não encontrada"
        )
    
    # Buscar todos os eventos da matriz
    eventos = db.query(EventoReprodutivo).filter(
        EventoReprodutivo.matriz_id == matriz_id
    ).order_by(EventoReprodutivo.data_evento.desc()).all()
    
    return eventos
```

---

## 🔍 Características do Endpoint

### ✅ Funcionalidades

1. **Validação de existência:** Verifica se a matriz existe antes de buscar eventos
2. **Ordenação automática:** Eventos ordenados do mais recente para o mais antigo
3. **Histórico completo:** Retorna todos os eventos sem paginação
4. **Resposta estruturada:** Usa o schema `EventoReprodutivoListItem`

### 📊 Campos Retornados

Cada evento no array de resposta contém:

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `evento_id` | `integer` | ID único do evento |
| `tipo_evento` | `string` | "Cobertura", "Diagnóstico", "Parto" ou "Desmame" |
| `data_evento` | `date` | Data em que o evento ocorreu |
| `matriz_id` | `integer` | ID da matriz (sempre igual ao parâmetro da URL) |

---

## 🧪 Exemplos de Uso

### Exemplo 1: Usando cURL

```bash
curl -X GET "http://localhost:8000/api/v1/eventos-reprodutivos/matriz/102" \
  -H "Accept: application/json"
```

### Exemplo 2: Usando Python (requests)

```python
import requests

url = "http://localhost:8000/api/v1/eventos-reprodutivos/matriz/102"
response = requests.get(url)

if response.status_code == 200:
    eventos = response.json()
    print(f"Total de eventos: {len(eventos)}")
    
    for evento in eventos:
        print(f"{evento['data_evento']} - {evento['tipo_evento']}")
else:
    print(f"Erro: {response.status_code}")
    print(response.json())
```

### Exemplo 3: Usando JavaScript (fetch)

```javascript
const matrizId = 102;
const url = `http://localhost:8000/api/v1/eventos-reprodutivos/matriz/${matrizId}`;

fetch(url)
  .then(response => response.json())
  .then(eventos => {
    console.log(`Total de eventos: ${eventos.length}`);
    
    eventos.forEach(evento => {
      console.log(`${evento.data_evento} - ${evento.tipo_evento}`);
    });
  })
  .catch(error => console.error('Erro:', error));
```

---

## 📤 Respostas do Endpoint

### Resposta de Sucesso (200 OK)

Retorna um array de eventos ordenados cronologicamente (mais recente primeiro).

**Exemplo de resposta:**

```json
[
  {
    "evento_id": 515,
    "tipo_evento": "Desmame",
    "data_evento": "2026-06-18",
    "matriz_id": 102
  },
  {
    "evento_id": 514,
    "tipo_evento": "Parto",
    "data_evento": "2026-05-14",
    "matriz_id": 102
  },
  {
    "evento_id": 513,
    "tipo_evento": "Diagnóstico",
    "data_evento": "2026-02-10",
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

### Resposta quando não há eventos (200 OK)

Se a matriz existe mas não tem eventos, retorna um array vazio:

```json
[]
```

### Resposta de Erro - Matriz não encontrada (404 Not Found)

```json
{
  "detail": "Matriz com ID 999 não encontrada"
}
```

---

## 🎨 Casos de Uso

### Caso 1: Exibir Ficha Reprodutiva Completa

Use este endpoint para exibir a ficha reprodutiva completa de uma matriz na interface do usuário:

```python
def exibir_ficha_reprodutiva(matriz_id: int):
    # Buscar dados da matriz
    matriz = requests.get(f"http://localhost:8000/api/v1/animais/{matriz_id}").json()
    
    # Buscar histórico de eventos
    eventos = requests.get(
        f"http://localhost:8000/api/v1/eventos-reprodutivos/matriz/{matriz_id}"
    ).json()
    
    print(f"Matriz: {matriz['identificacao_principal']}")
    print(f"Status atual: {matriz['status_reprodutivo']}")
    print(f"\nHistórico de eventos ({len(eventos)} eventos):")
    
    for evento in eventos:
        print(f"  - {evento['data_evento']}: {evento['tipo_evento']}")
```

### Caso 2: Calcular Métricas de Produtividade

Use o histórico para calcular métricas como intervalo entre partos:

```python
def calcular_intervalo_partos(matriz_id: int):
    eventos = requests.get(
        f"http://localhost:8000/api/v1/eventos-reprodutivos/matriz/{matriz_id}"
    ).json()
    
    # Filtrar apenas eventos de parto
    partos = [e for e in eventos if e['tipo_evento'] == 'Parto']
    
    if len(partos) < 2:
        return None
    
    # Calcular intervalo médio entre partos
    from datetime import datetime
    
    intervalos = []
    for i in range(len(partos) - 1):
        data1 = datetime.strptime(partos[i]['data_evento'], '%Y-%m-%d')
        data2 = datetime.strptime(partos[i+1]['data_evento'], '%Y-%m-%d')
        intervalo_dias = abs((data1 - data2).days)
        intervalos.append(intervalo_dias)
    
    intervalo_medio = sum(intervalos) / len(intervalos)
    return intervalo_medio
```

### Caso 3: Validar Sequência de Eventos

Verificar se a sequência de eventos está correta:

```python
def validar_sequencia_eventos(matriz_id: int):
    eventos = requests.get(
        f"http://localhost:8000/api/v1/eventos-reprodutivos/matriz/{matriz_id}"
    ).json()
    
    # Reverter para ordem cronológica (mais antigo primeiro)
    eventos.reverse()
    
    sequencia_esperada = {
        'Cobertura': ['Diagnóstico', 'Parto'],
        'Diagnóstico': ['Parto', 'Cobertura'],
        'Parto': ['Desmame'],
        'Desmame': ['Cobertura']
    }
    
    for i in range(len(eventos) - 1):
        tipo_atual = eventos[i]['tipo_evento']
        tipo_proximo = eventos[i+1]['tipo_evento']
        
        if tipo_proximo not in sequencia_esperada.get(tipo_atual, []):
            print(f"⚠️ Sequência incomum: {tipo_atual} → {tipo_proximo}")
```

---

## 📊 Integração com Front-end

### Exemplo de Componente React

```jsx
import React, { useState, useEffect } from 'react';

function HistoricoReprodutivo({ matrizId }) {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:8000/api/v1/eventos-reprodutivos/matriz/${matrizId}`)
      .then(response => {
        if (!response.ok) throw new Error('Matriz não encontrada');
        return response.json();
      })
      .then(data => {
        setEventos(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [matrizId]);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div className="historico-reprodutivo">
      <h2>Histórico Reprodutivo</h2>
      {eventos.length === 0 ? (
        <p>Nenhum evento registrado para esta matriz.</p>
      ) : (
        <ul>
          {eventos.map(evento => (
            <li key={evento.evento_id}>
              <strong>{evento.data_evento}</strong> - {evento.tipo_evento}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default HistoricoReprodutivo;
```

---

## 🔒 Códigos de Status HTTP

| Código | Situação | Descrição |
| :--- | :--- | :--- |
| `200 OK` | Sucesso | Histórico retornado com sucesso (pode ser array vazio) |
| `404 Not Found` | Matriz não existe | A matriz com o ID informado não foi encontrada |
| `401 Unauthorized` | Não autenticado | Token JWT inválido ou ausente (quando implementado) |
| `500 Internal Server Error` | Erro no servidor | Erro inesperado no servidor |

---

## ⚡ Performance

### Otimizações Implementadas

1. **Query única:** Busca todos os eventos em uma única consulta ao banco
2. **Ordenação no banco:** `ORDER BY data_evento DESC` executado no MySQL
3. **Sem paginação:** Adequado pois uma matriz raramente tem mais de 50 eventos

### Recomendações para Produção

Se uma matriz tiver centenas de eventos (improvável), considere:

```python
@router.get("/matriz/{matriz_id}")
def listar_eventos_matriz(
    matriz_id: int,
    limit: int = 50,  # Limitar a 50 eventos mais recentes
    db: Session = Depends(get_db)
):
    eventos = db.query(EventoReprodutivo).filter(
        EventoReprodutivo.matriz_id == matriz_id
    ).order_by(EventoReprodutivo.data_evento.desc()).limit(limit).all()
    
    return eventos
```

---

## 🧪 Testando o Endpoint

### Teste Manual via Swagger UI

1. Inicie o servidor: `uvicorn app.main:app --reload`
2. Acesse: http://localhost:8000/docs
3. Localize o endpoint `GET /eventos-reprodutivos/matriz/{matriz_id}`
4. Clique em "Try it out"
5. Insira um `matriz_id` válido
6. Clique em "Execute"

### Teste Automatizado

O teste já está implementado em `tests/test_eventos_reprodutivos.py`:

```python
def test_listar_eventos_matriz(criar_matriz, criar_reprodutor):
    matriz_id = criar_matriz["animal_id"]
    reprodutor_id = criar_reprodutor["animal_id"]
    
    # Criar múltiplos eventos
    eventos = [
        {
            "matriz_id": matriz_id,
            "tipo_evento": "Cobertura",
            "data_evento": "2025-06-01",
            "reprodutor_id": reprodutor_id
        },
        {
            "matriz_id": matriz_id,
            "tipo_evento": "Parto",
            "data_evento": "2025-09-15",
            "total_nascidos": 14,
            "nascidos_vivos": 12
        }
    ]
    
    for evento in eventos:
        client.post("/api/v1/eventos-reprodutivos", json=evento)
    
    # Listar eventos
    response = client.get(f"/api/v1/eventos-reprodutivos/matriz/{matriz_id}")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    assert isinstance(data, list)
```

Execute: `pytest tests/test_eventos_reprodutivos.py::test_listar_eventos_matriz -v`

---

## 📝 Observações Importantes

1. **Ordenação:** Os eventos são retornados do mais recente para o mais antigo, ideal para exibir o último status primeiro
2. **Array vazio:** Se a matriz existe mas não tem eventos, retorna `[]` com status 200
3. **Validação:** O endpoint valida se a matriz existe antes de buscar eventos
4. **Sem paginação:** Retorna todos os eventos de uma vez (adequado para o caso de uso)

---

**Elaborado por:** Manus AI  
**Data:** Janeiro de 2026
