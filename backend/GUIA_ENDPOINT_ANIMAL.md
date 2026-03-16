# Guia de Uso - Endpoint GET /animais/{id}

**Projeto:** Sistema de Gestão de Suínos - API FastAPI  
**Data:** Janeiro de 2026  
**Elaborado por:** Manus AI

---

## 📋 Visão Geral

O endpoint `GET /animais/{id}` retorna **todos os dados completos** de um animal específico, incluindo informações zootécnicas, genealógicas e status reprodutivo (para fêmeas).

---

## 🎯 Informações do Endpoint

**URL:** `GET /api/v1/animais/{animal_id}`

**Método HTTP:** `GET`

**Autenticação:** Obrigatória (JWT - a ser implementado)

**Parâmetros de URL:**
- `animal_id` (integer, obrigatório) - ID único do animal

---

## 💻 Código de Implementação

O endpoint está implementado em `app/routers/animais.py` (linhas 214-235):

```python
@router.get(
    "/{animal_id}",
    response_model=AnimalResponse,
    summary="Obter um animal específico",
    description="Retorna os detalhes completos de um animal pelo ID."
)
def obter_animal(animal_id: int, db: Session = Depends(get_db)):
    """
    Retorna os dados completos de um animal específico.

    **Parâmetros de URL:**
    - **animal_id**: ID do animal a ser recuperado
    """
    animal = db.query(Animal).filter(Animal.animal_id == animal_id).first()

    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Animal com ID {animal_id} não encontrado"
        )

    return animal
```

---

## 📊 Campos Retornados

O endpoint retorna o schema `AnimalResponse` com os seguintes campos:

### Campos de Identificação

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `animal_id` | `integer` | ID único do animal (chave primária) |
| `identificacao_principal` | `string` | Identificação visual (brinco, RFID, tatuagem) |

### Campos Zootécnicos

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `sexo` | `enum` | "Macho" ou "Fêmea" |
| `data_nascimento` | `date` | Data de nascimento |
| `peso_nascimento` | `decimal` | Peso ao nascer em kg (opcional) |
| `raca` | `string` | Raça do animal (opcional) |

### Campos de Gestão

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `lote_id` | `integer` | ID do lote ao qual pertence (opcional) |
| `status_vida` | `enum` | "Ativo", "Vendido" ou "Morto" |

### Campos Reprodutivos (Fêmeas)

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `status_reprodutivo` | `enum` | "Gestante", "Lactante", "Cio", "Vazia" ou "Não Aplicável" |

### Campos de Genealogia

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `mae_id` | `integer` | ID da mãe (opcional) |
| `pai_id` | `integer` | ID do pai (opcional) |

### Campos de Auditoria

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `created_at` | `datetime` | Data/hora de criação do registro |
| `updated_at` | `datetime` | Data/hora da última atualização |

---

## 🧪 Exemplos de Uso

### Exemplo 1: Usando cURL

```bash
curl -X GET "http://localhost:8000/api/v1/animais/102" \
  -H "Accept: application/json"
```

### Exemplo 2: Usando Python (requests)

```python
import requests

animal_id = 102
url = f"http://localhost:8000/api/v1/animais/{animal_id}"

response = requests.get(url)

if response.status_code == 200:
    animal = response.json()
    print(f"Animal: {animal['identificacao_principal']}")
    print(f"Sexo: {animal['sexo']}")
    print(f"Status Reprodutivo: {animal['status_reprodutivo']}")
else:
    print(f"Erro: {response.status_code}")
    print(response.json())
```

### Exemplo 3: Usando JavaScript (fetch)

```javascript
const animalId = 102;
const url = `http://localhost:8000/api/v1/animais/${animalId}`;

fetch(url)
  .then(response => {
    if (!response.ok) throw new Error('Animal não encontrado');
    return response.json();
  })
  .then(animal => {
    console.log(`Animal: ${animal.identificacao_principal}`);
    console.log(`Status: ${animal.status_reprodutivo}`);
  })
  .catch(error => console.error('Erro:', error));
```

---

## 📤 Respostas do Endpoint

### Resposta de Sucesso (200 OK) - Matriz

Exemplo de resposta para uma **fêmea (matriz)**:

```json
{
  "animal_id": 102,
  "identificacao_principal": "MT-034",
  "lote_id": 1,
  "sexo": "Fêmea",
  "data_nascimento": "2024-05-10",
  "peso_nascimento": 1.50,
  "raca": "Duroc",
  "mae_id": 88,
  "pai_id": 42,
  "status_vida": "Ativo",
  "status_reprodutivo": "Gestante",
  "created_at": "2024-05-15T11:30:00Z",
  "updated_at": "2026-01-18T09:00:00Z"
}
```

**Observação:** O campo `status_reprodutivo` é atualizado automaticamente pelos eventos reprodutivos.

### Resposta de Sucesso (200 OK) - Macho

Exemplo de resposta para um **macho (reprodutor)**:

```json
{
  "animal_id": 55,
  "identificacao_principal": "RP-012",
  "lote_id": null,
  "sexo": "Macho",
  "data_nascimento": "2023-08-15",
  "peso_nascimento": 1.65,
  "raca": "Pietrain",
  "mae_id": null,
  "pai_id": null,
  "status_vida": "Ativo",
  "status_reprodutivo": "Não Aplicável",
  "created_at": "2023-08-20T10:00:00Z",
  "updated_at": "2023-08-20T10:00:00Z"
}
```

**Observação:** Para machos, o `status_reprodutivo` é sempre "Não Aplicável".

### Resposta de Erro - Animal não encontrado (404 Not Found)

```json
{
  "detail": "Animal com ID 999 não encontrado"
}
```

---

## 🎨 Casos de Uso

### Caso 1: Exibir Ficha Completa do Animal

```python
def exibir_ficha_animal(animal_id: int):
    """Exibe a ficha completa de um animal."""
    url = f"http://localhost:8000/api/v1/animais/{animal_id}"
    response = requests.get(url)
    
    if response.status_code != 200:
        print(f"❌ Animal não encontrado")
        return
    
    animal = response.json()
    
    print(f"\n{'='*60}")
    print(f"FICHA DO ANIMAL - ID: {animal_id}")
    print(f"{'='*60}\n")
    
    print(f"🏷️  Identificação: {animal['identificacao_principal']}")
    print(f"🐷 Sexo: {animal['sexo']}")
    print(f"📅 Data de Nascimento: {animal['data_nascimento']}")
    print(f"⚖️  Peso ao Nascer: {animal.get('peso_nascimento', 'N/A')} kg")
    print(f"🧬 Raça: {animal.get('raca', 'Não informada')}")
    print(f"📊 Status de Vida: {animal['status_vida']}")
    
    if animal['sexo'] == 'Fêmea':
        print(f"🔄 Status Reprodutivo: {animal['status_reprodutivo']}")
    
    if animal.get('mae_id'):
        print(f"👩 Mãe: ID {animal['mae_id']}")
    if animal.get('pai_id'):
        print(f"👨 Pai: ID {animal['pai_id']}")
    
    print(f"\n{'='*60}\n")
```

### Caso 2: Verificar Status Reprodutivo de uma Matriz

```python
def verificar_status_matriz(matriz_id: int) -> str:
    """Retorna o status reprodutivo atual de uma matriz."""
    url = f"http://localhost:8000/api/v1/animais/{matriz_id}"
    response = requests.get(url)
    
    if response.status_code != 200:
        return "Animal não encontrado"
    
    animal = response.json()
    
    if animal['sexo'] != 'Fêmea':
        return "Animal não é uma fêmea"
    
    return animal['status_reprodutivo']

# Uso
status = verificar_status_matriz(102)
print(f"Status atual: {status}")  # Ex: "Gestante"
```

### Caso 3: Obter Dados para Dashboard

```python
def obter_dados_dashboard(animal_id: int) -> dict:
    """Obtém dados resumidos para exibição em dashboard."""
    url = f"http://localhost:8000/api/v1/animais/{animal_id}"
    response = requests.get(url)
    
    if response.status_code != 200:
        return None
    
    animal = response.json()
    
    # Calcular idade em dias
    from datetime import datetime
    nascimento = datetime.strptime(animal['data_nascimento'], '%Y-%m-%d')
    idade_dias = (datetime.now() - nascimento).days
    
    return {
        'id': animal['animal_id'],
        'identificacao': animal['identificacao_principal'],
        'sexo': animal['sexo'],
        'idade_dias': idade_dias,
        'status': animal['status_vida'],
        'status_reprodutivo': animal.get('status_reprodutivo')
    }
```

### Caso 4: Validar Antes de Criar Evento Reprodutivo

```python
def pode_criar_evento_reprodutivo(matriz_id: int) -> tuple[bool, str]:
    """
    Verifica se um animal pode ter eventos reprodutivos.
    
    Returns:
        (pode_criar, mensagem)
    """
    url = f"http://localhost:8000/api/v1/animais/{matriz_id}"
    response = requests.get(url)
    
    if response.status_code != 200:
        return False, "Animal não encontrado"
    
    animal = response.json()
    
    if animal['sexo'] != 'Fêmea':
        return False, "Apenas fêmeas podem ter eventos reprodutivos"
    
    if animal['status_vida'] != 'Ativo':
        return False, f"Animal está com status '{animal['status_vida']}'"
    
    return True, "OK"

# Uso
pode, mensagem = pode_criar_evento_reprodutivo(102)
if pode:
    print("✅ Pode criar evento")
else:
    print(f"❌ {mensagem}")
```

### Caso 5: Obter Genealogia Completa

```python
def obter_genealogia(animal_id: int, nivel: int = 2) -> dict:
    """
    Obtém a árvore genealógica de um animal.
    
    Args:
        animal_id: ID do animal
        nivel: Quantos níveis de ancestrais buscar (1=pais, 2=avós, etc)
    """
    url = f"http://localhost:8000/api/v1/animais/{animal_id}"
    response = requests.get(url)
    
    if response.status_code != 200:
        return None
    
    animal = response.json()
    genealogia = {
        'animal': animal,
        'mae': None,
        'pai': None
    }
    
    # Buscar mãe
    if animal.get('mae_id') and nivel > 0:
        genealogia['mae'] = obter_genealogia(animal['mae_id'], nivel - 1)
    
    # Buscar pai
    if animal.get('pai_id') and nivel > 0:
        genealogia['pai'] = obter_genealogia(animal['pai_id'], nivel - 1)
    
    return genealogia
```

---

## 📊 Integração com Front-end

### Componente React - Ficha do Animal

```jsx
import React, { useState, useEffect } from 'react';

function FichaAnimal({ animalId }) {
  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:8000/api/v1/animais/${animalId}`)
      .then(response => {
        if (!response.ok) throw new Error('Animal não encontrado');
        return response.json();
      })
      .then(data => {
        setAnimal(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [animalId]);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div className="ficha-animal">
      <h2>{animal.identificacao_principal}</h2>
      
      <div className="info-basica">
        <p><strong>Sexo:</strong> {animal.sexo}</p>
        <p><strong>Data de Nascimento:</strong> {animal.data_nascimento}</p>
        <p><strong>Raça:</strong> {animal.raca || 'Não informada'}</p>
        <p><strong>Status:</strong> {animal.status_vida}</p>
      </div>
      
      {animal.sexo === 'Fêmea' && (
        <div className="info-reprodutiva">
          <h3>Informações Reprodutivas</h3>
          <p>
            <strong>Status:</strong> 
            <span className={`status ${animal.status_reprodutivo.toLowerCase()}`}>
              {animal.status_reprodutivo}
            </span>
          </p>
        </div>
      )}
      
      {(animal.mae_id || animal.pai_id) && (
        <div className="genealogia">
          <h3>Genealogia</h3>
          {animal.mae_id && <p>Mãe: ID {animal.mae_id}</p>}
          {animal.pai_id && <p>Pai: ID {animal.pai_id}</p>}
        </div>
      )}
    </div>
  );
}

export default FichaAnimal;
```

### Badge de Status Reprodutivo

```jsx
function StatusReprodutivoBadge({ status }) {
  const cores = {
    'Gestante': 'bg-blue-500',
    'Lactante': 'bg-green-500',
    'Vazia': 'bg-gray-500',
    'Cio': 'bg-red-500',
    'Não Aplicável': 'bg-gray-300'
  };
  
  const icones = {
    'Gestante': '🤰',
    'Lactante': '🍼',
    'Vazia': '⭕',
    'Cio': '🔥',
    'Não Aplicável': '➖'
  };
  
  return (
    <span className={`badge ${cores[status]} text-white px-3 py-1 rounded`}>
      {icones[status]} {status}
    </span>
  );
}
```

---

## 🔄 Combinando com Outros Endpoints

### Ficha Completa: Animal + Histórico Reprodutivo

```python
def obter_ficha_completa(animal_id: int) -> dict:
    """Obtém dados do animal + histórico reprodutivo."""
    
    # Buscar dados do animal
    animal_response = requests.get(
        f"http://localhost:8000/api/v1/animais/{animal_id}"
    )
    
    if animal_response.status_code != 200:
        return None
    
    animal = animal_response.json()
    
    # Se for fêmea, buscar histórico reprodutivo
    if animal['sexo'] == 'Fêmea':
        eventos_response = requests.get(
            f"http://localhost:8000/api/v1/eventos-reprodutivos/matriz/{animal_id}"
        )
        
        if eventos_response.status_code == 200:
            animal['eventos_reprodutivos'] = eventos_response.json()
        else:
            animal['eventos_reprodutivos'] = []
    
    return animal
```

---

## 🔒 Códigos de Status HTTP

| Código | Situação | Descrição |
| :--- | :--- | :--- |
| `200 OK` | Sucesso | Animal encontrado e retornado |
| `404 Not Found` | Animal não existe | Nenhum animal com o ID informado |
| `401 Unauthorized` | Não autenticado | Token JWT inválido (quando implementado) |
| `500 Internal Server Error` | Erro no servidor | Erro inesperado |

---

## 💡 Dicas de Uso

### 1. Cache de Dados

Para melhorar performance, considere cachear os dados do animal:

```python
from functools import lru_cache
from datetime import datetime, timedelta

cache_timeout = {}

@lru_cache(maxsize=100)
def obter_animal_cached(animal_id: int, timestamp: int):
    """Versão com cache do endpoint."""
    url = f"http://localhost:8000/api/v1/animais/{animal_id}"
    return requests.get(url).json()

def obter_animal_com_cache(animal_id: int, ttl_seconds: int = 300):
    """Obtém animal com cache de 5 minutos."""
    timestamp = int(datetime.now().timestamp() / ttl_seconds)
    return obter_animal_cached(animal_id, timestamp)
```

### 2. Validação de Dados

Sempre valide o status code antes de usar os dados:

```python
response = requests.get(f"/api/v1/animais/{animal_id}")

if response.status_code == 200:
    animal = response.json()
    # Processar dados
elif response.status_code == 404:
    print("Animal não encontrado")
else:
    print(f"Erro inesperado: {response.status_code}")
```

### 3. Tratamento de Campos Opcionais

Alguns campos podem ser `null`, sempre use `.get()` ou verifique:

```python
animal = response.json()

raca = animal.get('raca', 'Não informada')
peso = animal.get('peso_nascimento', 0.0)
lote_id = animal.get('lote_id')  # Pode ser None
```

---

## 📝 Observações Importantes

1. **Status Reprodutivo Automático:** O campo `status_reprodutivo` é atualizado automaticamente quando eventos reprodutivos são criados
2. **Campos Opcionais:** `peso_nascimento`, `raca`, `lote_id`, `mae_id` e `pai_id` podem ser `null`
3. **Timestamps:** `created_at` e `updated_at` estão em formato ISO 8601 UTC
4. **Machos:** Para animais machos, `status_reprodutivo` sempre será "Não Aplicável"

---

**Elaborado por:** Manus AI  
**Data:** Janeiro de 2026
