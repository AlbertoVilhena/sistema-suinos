# Guia de Uso - Endpoint PUT /animais/{id}

**Projeto:** Sistema de Gestão de Suínos - API FastAPI  
**Data:** Janeiro de 2026  
**Elaborado por:** Manus AI

---

## 📋 Visão Geral

O endpoint `PUT /animais/{id}` permite atualizar os dados de um animal existente de forma parcial ou completa. Apenas os campos informados no payload serão atualizados, mantendo os demais valores inalterados.

---

## 🎯 Informações do Endpoint

**URL:** `PUT /api/v1/animais/{animal_id}`

**Método HTTP:** `PUT`

**Autenticação:** Obrigatória (JWT - a ser implementado)

**Parâmetros de URL:**
- `animal_id` (integer, obrigatório) - ID do animal a ser atualizado

---

## 💻 Código de Implementação

O endpoint está implementado em `app/routers/animais.py`:

```python
@router.put(
    "/{animal_id}",
    response_model=AnimalResponse,
    summary="Atualizar um animal",
    description="Atualiza os dados de um animal existente."
)
def atualizar_animal(
    animal_id: int,
    animal_data: AnimalUpdate,
    db: Session = Depends(get_db)
):
    # Buscar o animal existente
    animal = db.query(Animal).filter(Animal.animal_id == animal_id).first()
    
    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Animal com ID {animal_id} não encontrado"
        )
    
    # Validações...
    # Atualizar campos...
    
    db.commit()
    db.refresh(animal)
    return animal
```

---

## 📊 Campos Atualizáveis

### ✅ Campos que PODEM ser atualizados

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `identificacao_principal` | `string` | Identificação visual (deve ser única) |
| `data_nascimento` | `date` | Data de nascimento (não pode ser futura) |
| `peso_nascimento` | `decimal` | Peso ao nascer em kg (0.5 - 5.0) |
| `raca` | `string` | Raça do animal |
| `lote_id` | `integer` | ID do lote (deve existir) |
| `status_vida` | `enum` | "Ativo", "Vendido" ou "Morto" |
| `status_reprodutivo` | `enum` | Apenas para fêmeas (ver restrições) |
| `mae_id` | `integer` | ID da mãe (deve existir e ser fêmea) |
| `pai_id` | `integer` | ID do pai (deve existir e ser macho) |

### ❌ Campos que NÃO PODEM ser atualizados

| Campo | Motivo |
| :--- | :--- |
| `animal_id` | Chave primária (imutável) |
| `sexo` | Não pode ser alterado após criação |
| `created_at` | Timestamp de criação (automático) |
| `updated_at` | Timestamp de atualização (automático) |

---

## ✅ Validações Implementadas

### 1. Validações Automáticas (Pydantic)

Executadas automaticamente pelo schema `AnimalUpdate`:

- **Tipos de dados:** Todos os campos devem ter o tipo correto
- **Data de nascimento:** Não pode ser futura
- **Peso de nascimento:** Deve estar entre 0.5kg e 5.0kg
- **Enums:** `status_vida` e `status_reprodutivo` devem ter valores válidos

### 2. Validações de Negócio (Endpoint)

| Validação | Código de Status | Mensagem de Erro |
| :--- | :--- | :--- |
| Animal não encontrado | `404 Not Found` | "Animal com ID X não encontrado" |
| Identificação duplicada | `409 Conflict` | "Já existe um animal com a identificação 'X'" |
| Mãe não encontrada | `404 Not Found` | "Mãe com ID X não encontrada" |
| Mãe não é fêmea | `422 Unprocessable Entity` | "A mãe deve ser do sexo feminino" |
| Pai não encontrado | `404 Not Found` | "Pai com ID X não encontrado" |
| Pai não é macho | `422 Unprocessable Entity` | "O pai deve ser do sexo masculino" |
| Lote não encontrado | `404 Not Found` | "Lote com ID X não encontrado" |
| Status reprodutivo em macho | `422 Unprocessable Entity` | "Status reprodutivo só pode ser definido para fêmeas" |

---

## 🧪 Exemplos de Uso

### Exemplo 1: Atualizar Identificação e Raça

```bash
curl -X PUT "http://localhost:8000/api/v1/animais/102" \
  -H "Content-Type: application/json" \
  -d '{
    "identificacao_principal": "MT-034-NOVO",
    "raca": "Duroc"
  }'
```

**Resposta (200 OK):**
```json
{
  "animal_id": 102,
  "identificacao_principal": "MT-034-NOVO",
  "sexo": "Fêmea",
  "data_nascimento": "2024-05-10",
  "peso_nascimento": 1.50,
  "raca": "Duroc",
  "status_vida": "Ativo",
  "status_reprodutivo": "Gestante",
  "updated_at": "2026-01-20T14:30:00Z"
}
```

**Observação:** Apenas os campos `identificacao_principal` e `raca` foram alterados. Os demais permaneceram iguais.

---

### Exemplo 2: Atualizar Status de Vida

```bash
curl -X PUT "http://localhost:8000/api/v1/animais/55" \
  -H "Content-Type: application/json" \
  -d '{
    "status_vida": "Vendido"
  }'
```

**Resposta (200 OK):**
```json
{
  "animal_id": 55,
  "identificacao_principal": "RP-012",
  "sexo": "Macho",
  "status_vida": "Vendido",
  "updated_at": "2026-01-20T14:35:00Z"
}
```

---

### Exemplo 3: Atualizar Status Reprodutivo (Fêmea)

```bash
curl -X PUT "http://localhost:8000/api/v1/animais/102" \
  -H "Content-Type: application/json" \
  -d '{
    "status_reprodutivo": "Vazia"
  }'
```

**Resposta (200 OK):**
```json
{
  "animal_id": 102,
  "identificacao_principal": "MT-034",
  "sexo": "Fêmea",
  "status_reprodutivo": "Vazia",
  "updated_at": "2026-01-20T14:40:00Z"
}
```

**⚠️ ATENÇÃO:** Alterar o status reprodutivo manualmente pode causar inconsistências com o histórico de eventos. O ideal é que o status seja atualizado automaticamente via eventos reprodutivos. Use esta opção apenas para correções.

---

### Exemplo 4: Adicionar Genealogia

```bash
curl -X PUT "http://localhost:8000/api/v1/animais/150" \
  -H "Content-Type: application/json" \
  -d '{
    "mae_id": 102,
    "pai_id": 55
  }'
```

**Resposta (200 OK):**
```json
{
  "animal_id": 150,
  "identificacao_principal": "LT-2026-001",
  "mae_id": 102,
  "pai_id": 55,
  "updated_at": "2026-01-20T14:45:00Z"
}
```

---

### Exemplo 5: Atualizar Múltiplos Campos

```bash
curl -X PUT "http://localhost:8000/api/v1/animais/102" \
  -H "Content-Type: application/json" \
  -d '{
    "identificacao_principal": "MT-034-V2",
    "raca": "Duroc",
    "peso_nascimento": 1.65,
    "lote_id": 5
  }'
```

---

## 🎨 Exemplos em Python

### Exemplo 1: Atualizar um Campo

```python
import requests

animal_id = 102
payload = {
    "raca": "Duroc"
}

response = requests.put(
    f"http://localhost:8000/api/v1/animais/{animal_id}",
    json=payload
)

if response.status_code == 200:
    animal = response.json()
    print(f"✅ Animal atualizado: {animal['identificacao_principal']}")
    print(f"   Nova raça: {animal['raca']}")
else:
    print(f"❌ Erro: {response.status_code}")
    print(response.json())
```

### Exemplo 2: Corrigir Status Reprodutivo

```python
def corrigir_status_reprodutivo(matriz_id: int, novo_status: str):
    """
    Corrige manualmente o status reprodutivo de uma matriz.
    
    ATENÇÃO: Use apenas para correções. O status deve ser atualizado
    automaticamente via eventos reprodutivos.
    """
    payload = {
        "status_reprodutivo": novo_status
    }
    
    response = requests.put(
        f"http://localhost:8000/api/v1/animais/{matriz_id}",
        json=payload
    )
    
    if response.status_code == 200:
        print(f"✅ Status atualizado para: {novo_status}")
    elif response.status_code == 422:
        print(f"❌ Erro: Animal não é uma fêmea")
    else:
        print(f"❌ Erro: {response.json()['detail']}")

# Uso
corrigir_status_reprodutivo(102, "Vazia")
```

### Exemplo 3: Atualizar Animal com Validação

```python
def atualizar_animal_seguro(animal_id: int, updates: dict):
    """
    Atualiza um animal com tratamento de erros completo.
    """
    response = requests.put(
        f"http://localhost:8000/api/v1/animais/{animal_id}",
        json=updates
    )
    
    if response.status_code == 200:
        return True, response.json()
    elif response.status_code == 404:
        return False, "Animal não encontrado"
    elif response.status_code == 409:
        return False, "Identificação duplicada"
    elif response.status_code == 422:
        return False, f"Validação falhou: {response.json()['detail']}"
    else:
        return False, "Erro desconhecido"

# Uso
sucesso, resultado = atualizar_animal_seguro(102, {
    "raca": "Duroc",
    "peso_nascimento": 1.7
})

if sucesso:
    print(f"✅ Animal atualizado: {resultado['identificacao_principal']}")
else:
    print(f"❌ Falha: {resultado}")
```

### Exemplo 4: Atualizar Status de Vida em Lote

```python
def marcar_animais_como_vendidos(animal_ids: list):
    """
    Marca múltiplos animais como vendidos.
    """
    resultados = {
        'sucesso': [],
        'falha': []
    }
    
    for animal_id in animal_ids:
        response = requests.put(
            f"http://localhost:8000/api/v1/animais/{animal_id}",
            json={"status_vida": "Vendido"}
        )
        
        if response.status_code == 200:
            resultados['sucesso'].append(animal_id)
        else:
            resultados['falha'].append({
                'id': animal_id,
                'erro': response.json()['detail']
            })
    
    return resultados

# Uso
resultado = marcar_animais_como_vendidos([101, 102, 103, 104])
print(f"✅ Sucesso: {len(resultado['sucesso'])} animais")
print(f"❌ Falha: {len(resultado['falha'])} animais")
```

---

## 📊 Integração com Front-end

### Componente React - Formulário de Edição

```jsx
import React, { useState, useEffect } from 'react';

function FormularioEditarAnimal({ animalId, onSuccess }) {
  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    // Carregar dados atuais do animal
    fetch(`/api/v1/animais/${animalId}`)
      .then(res => res.json())
      .then(data => {
        setAnimal(data);
        setFormData({
          identificacao_principal: data.identificacao_principal,
          raca: data.raca || '',
          peso_nascimento: data.peso_nascimento || '',
          status_vida: data.status_vida
        });
        setLoading(false);
      });
  }, [animalId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Enviar apenas campos alterados
    const updates = {};
    Object.keys(formData).forEach(key => {
      if (formData[key] !== animal[key]) {
        updates[key] = formData[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      alert('Nenhum campo foi alterado');
      return;
    }

    const response = await fetch(`/api/v1/animais/${animalId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (response.ok) {
      alert('Animal atualizado com sucesso!');
      onSuccess();
    } else {
      const error = await response.json();
      alert(`Erro: ${error.detail}`);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Identificação:</label>
        <input
          type="text"
          value={formData.identificacao_principal}
          onChange={e => setFormData({
            ...formData,
            identificacao_principal: e.target.value
          })}
        />
      </div>

      <div>
        <label>Raça:</label>
        <input
          type="text"
          value={formData.raca}
          onChange={e => setFormData({
            ...formData,
            raca: e.target.value
          })}
        />
      </div>

      <div>
        <label>Status de Vida:</label>
        <select
          value={formData.status_vida}
          onChange={e => setFormData({
            ...formData,
            status_vida: e.target.value
          })}
        >
          <option value="Ativo">Ativo</option>
          <option value="Vendido">Vendido</option>
          <option value="Morto">Morto</option>
        </select>
      </div>

      <button type="submit">Salvar Alterações</button>
    </form>
  );
}

export default FormularioEditarAnimal;
```

---

## ⚠️ Casos Especiais

### 1. Status Reprodutivo

**Recomendação:** O status reprodutivo deve ser atualizado automaticamente via eventos reprodutivos. Atualizações manuais devem ser usadas apenas para correções.

**Por quê?** Atualizar manualmente pode criar inconsistências entre o histórico de eventos e o status atual.

**Exemplo de inconsistência:**
```
Histórico: Cobertura → Parto → Desmame
Status manual: "Gestante" ❌ (inconsistente com o último evento "Desmame")
```

### 2. Alteração de Identificação

**Cuidado:** Alterar a identificação principal pode dificultar o rastreamento histórico do animal.

**Recomendação:** Se possível, mantenha a identificação original e use campos adicionais para novas identificações.

### 3. Alteração de Genealogia

**Cuidado:** Alterar `mae_id` ou `pai_id` após a criação pode afetar relatórios de genealogia e cálculos de consanguinidade.

**Recomendação:** Valide cuidadosamente antes de alterar dados de genealogia.

---

## 🔒 Códigos de Status HTTP

| Código | Situação | Descrição |
| :--- | :--- | :--- |
| `200 OK` | Sucesso | Animal atualizado com sucesso |
| `400 Bad Request` | Payload inválido | Dados mal formatados ou tipos incorretos |
| `404 Not Found` | Recurso não encontrado | Animal, mãe, pai ou lote não encontrado |
| `409 Conflict` | Conflito | Identificação duplicada |
| `422 Unprocessable Entity` | Regra de negócio violada | Validações de negócio falharam |
| `500 Internal Server Error` | Erro no servidor | Erro inesperado |

---

## 🧪 Testes Unitários

O arquivo `tests/test_animais.py` contém 8 testes para o endpoint PUT:

| Teste | Cenário |
| :--- | :--- |
| `test_atualizar_animal_sucesso` | Atualização com dados válidos |
| `test_atualizar_animal_inexistente` | Animal não encontrado |
| `test_atualizar_identificacao_duplicada` | Identificação duplicada |
| `test_atualizar_status_reprodutivo_femea` | Atualizar status de fêmea |
| `test_atualizar_status_reprodutivo_macho` | Tentar atualizar status de macho (deve falhar) |
| `test_atualizar_status_vida` | Alterar status de vida |
| `test_atualizar_apenas_um_campo` | Atualização parcial |

**Executar os testes:**
```bash
pytest tests/test_animais.py -k "atualizar" -v
```

---

## 💡 Boas Práticas

### 1. Atualizações Parciais

Sempre envie apenas os campos que deseja atualizar:

```python
# ✅ Bom: Atualizar apenas o necessário
payload = {"raca": "Duroc"}

# ❌ Ruim: Enviar todos os campos mesmo sem alteração
payload = {
    "identificacao_principal": "MT-034",
    "data_nascimento": "2024-05-10",
    "peso_nascimento": 1.50,
    "raca": "Duroc",  # Único campo alterado
    "status_vida": "Ativo"
}
```

### 2. Validação Antes de Enviar

Valide os dados no front-end antes de enviar:

```javascript
function validarAtualizacao(updates) {
  if (updates.peso_nascimento) {
    if (updates.peso_nascimento < 0.5 || updates.peso_nascimento > 5.0) {
      return { valid: false, error: 'Peso deve estar entre 0.5kg e 5.0kg' };
    }
  }
  
  if (updates.data_nascimento) {
    const data = new Date(updates.data_nascimento);
    if (data > new Date()) {
      return { valid: false, error: 'Data não pode ser futura' };
    }
  }
  
  return { valid: true };
}
```

### 3. Tratamento de Erros

Sempre trate os diferentes códigos de status:

```python
response = requests.put(url, json=payload)

if response.status_code == 200:
    print("✅ Sucesso")
elif response.status_code == 404:
    print("❌ Animal não encontrado")
elif response.status_code == 409:
    print("❌ Identificação duplicada")
elif response.status_code == 422:
    print(f"❌ Validação: {response.json()['detail']}")
else:
    print(f"❌ Erro desconhecido: {response.status_code}")
```

---

## 📝 Observações Finais

1. **Atualização Parcial:** Apenas os campos informados serão atualizados
2. **Campos Imutáveis:** `animal_id`, `sexo` e `created_at` não podem ser alterados
3. **Status Reprodutivo:** Preferir atualização automática via eventos
4. **Validações:** Todas as validações do POST também se aplicam ao PUT
5. **Timestamp:** O campo `updated_at` é atualizado automaticamente

---

**Elaborado por:** Manus AI  
**Data:** Janeiro de 2026
