# Guia de Uso - Endpoint PUT /eventos-reprodutivos/{id}

**Projeto:** Sistema de Gestão de Suínos - API FastAPI  
**Data:** Janeiro de 2026  
**Elaborado por:** Manus AI

---

## 📋 Visão Geral

O endpoint `PUT /eventos-reprodutivos/{id}` atualiza os dados de um evento reprodutivo existente e **recalcula automaticamente o status reprodutivo da matriz** baseado no último evento (mais recente por data).

**✨ DIFERENCIAL:** Permite correção de dados sem perder o histórico, mantendo a integridade referencial e recalculando automaticamente o status da matriz.

---

## 🎯 Informações do Endpoint

**URL:** `PUT /api/v1/eventos-reprodutivos/{evento_id}`

**Método HTTP:** `PUT`

**Autenticação:** Obrigatória (JWT - a ser implementado)

**Parâmetros de URL:**
- `evento_id` (integer, obrigatório) - ID do evento a ser atualizado

**Código de Sucesso:** `200 OK`

**Atualização Parcial:** Apenas os campos informados no payload serão atualizados. Os demais campos permanecerão inalterados.

---

## 💻 Código de Implementação

O endpoint está implementado em `app/routers/eventos_reprodutivos.py`:

```python
@router.put(
    "/{evento_id}",
    response_model=EventoReprodutivoResponse,
    summary="Atualizar um evento reprodutivo",
    description="Atualiza os dados de um evento e recalcula o status da matriz."
)
def atualizar_evento_reprodutivo(
    evento_id: int,
    evento_data: EventoReprodutivoUpdate,
    db: Session = Depends(get_db)
):
    # Buscar evento existente
    # Validar campos conforme tipo de evento
    # Aplicar atualizações
    # Recalcular status da matriz
    return evento
```

---

## 🔄 Lógica de Recálculo Automático

Após atualizar o evento, o sistema recalcula o status reprodutivo da matriz baseado no **último evento** (mais recente por data):

| Situação | Novo Status |
| :--- | :--- |
| **Último evento: Cobertura** | `Gestante` |
| **Último evento: Parto** | `Lactante` |
| **Último evento: Desmame** | `Vazia` |
| **Último evento: Diagnóstico Positivo** | `Gestante` |
| **Último evento: Diagnóstico Negativo** | `Vazia` |

**Cenário Especial:** Se alterar a data de um evento e ele deixar de ser o mais recente, o status será recalculado baseado no novo evento mais recente.

---

## ✅ Campos Atualizáveis

| Campo | Tipo | Validações |
| :--- | :--- | :--- |
| `matriz_id` | `integer` | Matriz deve existir e ser fêmea |
| `tipo_evento` | `enum` | Cobertura/Parto/Desmame/Diagnóstico |
| `data_evento` | `date` | Qualquer data válida |
| `reprodutor_id` | `integer` | Obrigatório se tipo = Cobertura |
| `total_nascidos` | `integer` | Obrigatório se tipo = Parto |
| `nascidos_vivos` | `integer` | Obrigatório se tipo = Parto, ≤ total_nascidos |
| `resultado_diagnostico` | `enum` | Obrigatório se tipo = Diagnóstico (Positivo/Negativo) |
| `observacoes` | `string` | Texto livre (opcional) |

---

## 🧪 Exemplos de Uso

### Exemplo 1: Corrigir Número de Leitões Nascidos

**Request:**
```bash
curl -X PUT "http://localhost:8000/api/v1/eventos-reprodutivos/45" \
  -H "Content-Type: application/json" \
  -d '{
    "total_nascidos": 13,
    "nascidos_vivos": 12
  }'
```

**Response (200 OK):**
```json
{
  "evento_id": 45,
  "matriz_id": 102,
  "tipo_evento": "Parto",
  "data_evento": "2024-05-15",
  "reprodutor_id": null,
  "total_nascidos": 13,
  "nascidos_vivos": 12,
  "resultado_diagnostico": null,
  "observacoes": null,
  "created_at": "2024-05-15",
  "updated_at": "2026-01-06"
}
```

---

### Exemplo 2: Corrigir Data de um Evento

**Request:**
```bash
curl -X PUT "http://localhost:8000/api/v1/eventos-reprodutivos/46" \
  -H "Content-Type: application/json" \
  -d '{
    "data_evento": "2024-06-20"
  }'
```

**Response (200 OK):**
```json
{
  "evento_id": 46,
  "matriz_id": 102,
  "tipo_evento": "Desmame",
  "data_evento": "2024-06-20",
  "observacoes": null
}
```

---

### Exemplo 3: Alterar Resultado de Diagnóstico

**Request:**
```bash
curl -X PUT "http://localhost:8000/api/v1/eventos-reprodutivos/47" \
  -H "Content-Type: application/json" \
  -d '{
    "resultado_diagnostico": "Negativo"
  }'
```

**Response (200 OK):**
```json
{
  "evento_id": 47,
  "matriz_id": 102,
  "tipo_evento": "Diagnóstico",
  "data_evento": "2024-02-10",
  "resultado_diagnostico": "Negativo"
}
```

**Efeito:** Status da matriz muda de `Gestante` para `Vazia` automaticamente.

---

### Exemplo 4: Adicionar Observações

**Request:**
```bash
curl -X PUT "http://localhost:8000/api/v1/eventos-reprodutivos/48" \
  -H "Content-Type: application/json" \
  -d '{
    "observacoes": "Leitões desmamados com excelente peso médio de 7.2kg"
  }'
```

**Response (200 OK):**
```json
{
  "evento_id": 48,
  "matriz_id": 102,
  "tipo_evento": "Desmame",
  "data_evento": "2024-06-15",
  "observacoes": "Leitões desmamados com excelente peso médio de 7.2kg"
}
```

---

### Exemplo 5: Alterar Tipo de Evento

**Request:**
```bash
curl -X PUT "http://localhost:8000/api/v1/eventos-reprodutivos/49" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo_evento": "Cobertura",
    "reprodutor_id": 55
  }'
```

**Response (200 OK):**
```json
{
  "evento_id": 49,
  "matriz_id": 102,
  "tipo_evento": "Cobertura",
  "data_evento": "2024-01-15",
  "reprodutor_id": 55
}
```

**Efeito:** Status da matriz muda para `Gestante` automaticamente.

---

## 🎨 Exemplos em Python

### Exemplo 1: Corrigir Dados de um Parto

```python
import requests

def corrigir_dados_parto(evento_id: int, total_nascidos: int, nascidos_vivos: int):
    """
    Corrige os dados de um evento de parto.
    """
    url = f"http://localhost:8000/api/v1/eventos-reprodutivos/{evento_id}"
    
    payload = {
        "total_nascidos": total_nascidos,
        "nascidos_vivos": nascidos_vivos
    }
    
    response = requests.put(url, json=payload)
    
    if response.status_code == 200:
        evento = response.json()
        print(f"✅ Evento atualizado:")
        print(f"   Total nascidos: {evento['total_nascidos']}")
        print(f"   Nascidos vivos: {evento['nascidos_vivos']}")
        return True
    elif response.status_code == 404:
        print(f"❌ Evento não encontrado")
        return False
    elif response.status_code == 422:
        print(f"❌ Erro de validação: {response.json()['detail']}")
        return False
    else:
        print(f"❌ Erro HTTP {response.status_code}")
        return False

# Uso
corrigir_dados_parto(evento_id=45, total_nascidos=13, nascidos_vivos=12)
```

---

### Exemplo 2: Corrigir Data com Verificação de Recálculo

```python
def corrigir_data_evento(evento_id: int, matriz_id: int, nova_data: str):
    """
    Corrige a data de um evento e verifica se o status da matriz foi recalculado.
    """
    # Verificar status ANTES
    response_antes = requests.get(f"http://localhost:8000/api/v1/animais/{matriz_id}")
    status_antes = response_antes.json()['status_reprodutivo']
    
    print(f"Status ANTES: {status_antes}")
    
    # Atualizar data
    payload = {"data_evento": nova_data}
    response = requests.put(
        f"http://localhost:8000/api/v1/eventos-reprodutivos/{evento_id}",
        json=payload
    )
    
    if response.status_code != 200:
        print(f"❌ Erro ao atualizar: {response.json()['detail']}")
        return
    
    print(f"✅ Data atualizada para: {nova_data}")
    
    # Verificar status DEPOIS
    response_depois = requests.get(f"http://localhost:8000/api/v1/animais/{matriz_id}")
    status_depois = response_depois.json()['status_reprodutivo']
    
    print(f"Status DEPOIS: {status_depois}")
    
    if status_antes != status_depois:
        print(f"⚠️  Status recalculado: {status_antes} → {status_depois}")
    else:
        print(f"ℹ️  Status permaneceu: {status_depois}")

# Uso
corrigir_data_evento(evento_id=46, matriz_id=102, nova_data="2024-06-20")
```

---

### Exemplo 3: Alterar Resultado de Diagnóstico

```python
def alterar_resultado_diagnostico(evento_id: int, matriz_id: int, novo_resultado: str):
    """
    Altera o resultado de um diagnóstico (Positivo/Negativo).
    """
    print(f"\n{'='*60}")
    print(f"ALTERAR RESULTADO DE DIAGNÓSTICO")
    print(f"{'='*60}\n")
    
    # Status atual
    response_matriz = requests.get(f"http://localhost:8000/api/v1/animais/{matriz_id}")
    status_atual = response_matriz.json()['status_reprodutivo']
    print(f"Status atual: {status_atual}\n")
    
    # Atualizar resultado
    payload = {"resultado_diagnostico": novo_resultado}
    response = requests.put(
        f"http://localhost:8000/api/v1/eventos-reprodutivos/{evento_id}",
        json=payload
    )
    
    if response.status_code == 200:
        print(f"✅ Resultado alterado para: {novo_resultado}\n")
        
        # Novo status
        response_matriz = requests.get(f"http://localhost:8000/api/v1/animais/{matriz_id}")
        novo_status = response_matriz.json()['status_reprodutivo']
        print(f"Novo status: {novo_status}\n")
        
        # Resumo
        if novo_resultado == "Positivo":
            print(f"📊 Diagnóstico Positivo → Status: Gestante")
        else:
            print(f"📊 Diagnóstico Negativo → Status: Vazia")
    else:
        print(f"❌ Erro: {response.json()['detail']}\n")
    
    print(f"{'='*60}\n")

# Uso
alterar_resultado_diagnostico(evento_id=47, matriz_id=102, novo_resultado="Negativo")
```

---

### Exemplo 4: Adicionar ou Atualizar Observações

```python
def adicionar_observacoes(evento_id: int, observacoes: str):
    """
    Adiciona ou atualiza as observações de um evento.
    """
    payload = {"observacoes": observacoes}
    
    response = requests.put(
        f"http://localhost:8000/api/v1/eventos-reprodutivos/{evento_id}",
        json=payload
    )
    
    if response.status_code == 200:
        print(f"✅ Observações adicionadas:")
        print(f"   \"{observacoes}\"")
        return True
    else:
        print(f"❌ Erro ao adicionar observações")
        return False

# Uso
adicionar_observacoes(
    evento_id=48,
    observacoes="Leitões desmamados com peso médio de 7.2kg. Excelente resultado."
)
```

---

### Exemplo 5: Atualizar Múltiplos Campos

```python
def atualizar_evento_completo(evento_id: int, **campos):
    """
    Atualiza múltiplos campos de um evento simultaneamente.
    """
    print(f"\n{'='*60}")
    print(f"ATUALIZAR EVENTO - ID: {evento_id}")
    print(f"{'='*60}\n")
    
    print(f"Campos a atualizar:")
    for campo, valor in campos.items():
        print(f"  • {campo}: {valor}")
    print()
    
    response = requests.put(
        f"http://localhost:8000/api/v1/eventos-reprodutivos/{evento_id}",
        json=campos
    )
    
    if response.status_code == 200:
        evento = response.json()
        print(f"✅ Evento atualizado com sucesso!\n")
        print(f"Dados atualizados:")
        for campo in campos.keys():
            print(f"  • {campo}: {evento.get(campo)}")
    else:
        print(f"❌ Erro: {response.json()['detail']}")
    
    print(f"\n{'='*60}\n")

# Uso
atualizar_evento_completo(
    evento_id=45,
    total_nascidos=14,
    nascidos_vivos=13,
    observacoes="Parto assistido. Todos os leitões saudáveis."
)
```

---

## 📊 Integração com Front-end

### Componente React - Formulário de Edição

```jsx
import React, { useState, useEffect } from 'react';

function FormularioEditarEvento({ eventoId, onSuccess }) {
  const [evento, setEvento] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    // Carregar dados do evento
    fetch(`/api/v1/eventos-reprodutivos/${eventoId}`)
      .then(res => res.json())
      .then(data => {
        setEvento(data);
        setFormData(data);
      });
  }, [eventoId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/v1/eventos-reprodutivos/${eventoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const eventoAtualizado = await response.json();
        alert('Evento atualizado com sucesso!');
        onSuccess(eventoAtualizado);
      } else {
        const error = await response.json();
        alert(`Erro: ${error.detail}`);
      }
    } catch (error) {
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!evento) return <div>Carregando...</div>;

  return (
    <form onSubmit={handleSubmit} className="form-editar-evento">
      <h3>Editar Evento #{eventoId}</h3>

      <div className="form-group">
        <label>Tipo de Evento:</label>
        <select
          value={formData.tipo_evento}
          onChange={(e) => handleChange('tipo_evento', e.target.value)}
        >
          <option value="Cobertura">Cobertura</option>
          <option value="Parto">Parto</option>
          <option value="Desmame">Desmame</option>
          <option value="Diagnóstico">Diagnóstico</option>
        </select>
      </div>

      <div className="form-group">
        <label>Data do Evento:</label>
        <input
          type="date"
          value={formData.data_evento}
          onChange={(e) => handleChange('data_evento', e.target.value)}
        />
      </div>

      {formData.tipo_evento === 'Parto' && (
        <>
          <div className="form-group">
            <label>Total Nascidos:</label>
            <input
              type="number"
              value={formData.total_nascidos || ''}
              onChange={(e) => handleChange('total_nascidos', parseInt(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Nascidos Vivos:</label>
            <input
              type="number"
              value={formData.nascidos_vivos || ''}
              onChange={(e) => handleChange('nascidos_vivos', parseInt(e.target.value))}
            />
          </div>
        </>
      )}

      {formData.tipo_evento === 'Diagnóstico' && (
        <div className="form-group">
          <label>Resultado:</label>
          <select
            value={formData.resultado_diagnostico || ''}
            onChange={(e) => handleChange('resultado_diagnostico', e.target.value)}
          >
            <option value="Positivo">Positivo</option>
            <option value="Negativo">Negativo</option>
          </select>
        </div>
      )}

      <div className="form-group">
        <label>Observações:</label>
        <textarea
          value={formData.observacoes || ''}
          onChange={(e) => handleChange('observacoes', e.target.value)}
          rows={3}
        />
      </div>

      <div className="form-actions">
        <button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </form>
  );
}

export default FormularioEditarEvento;
```

---

## 🔄 Cenários de Recálculo

### Cenário 1: Alterar Número de Leitões

**Situação:**
- Evento: Parto (01/05) com 10 nascidos
- Status: `Lactante`

**Ação:** Corrigir para 13 nascidos

**Resultado:**
- Status: `Lactante` (permanece, pois o tipo não mudou)

---

### Cenário 2: Alterar Resultado de Diagnóstico

**Situação:**
- Evento: Diagnóstico Positivo (02/01)
- Status: `Gestante`

**Ação:** Alterar para Negativo

**Resultado:**
- Status: `Vazia` ✅ (recalculado)

---

### Cenário 3: Alterar Data e Ordem dos Eventos

**Situação:**
- Eventos: Parto (05/01) → Desmame (06/15)
- Último evento: Desmame
- Status: `Vazia`

**Ação:** Alterar data do Desmame para 04/01

**Resultado:**
- Eventos: Desmame (04/01) → Parto (05/01)
- Último evento: Parto
- Status: `Lactante` ✅ (recalculado)

---

### Cenário 4: Alterar Tipo de Evento

**Situação:**
- Evento: Desmame (06/01)
- Status: `Vazia`

**Ação:** Alterar para Cobertura (com reprodutor)

**Resultado:**
- Status: `Gestante` ✅ (recalculado)

---

## ❌ Exemplos de Erro

### Erro 1: Evento Não Encontrado (404)

**Request:**
```bash
curl -X PUT "http://localhost:8000/api/v1/eventos-reprodutivos/99999" \
  -H "Content-Type: application/json" \
  -d '{"data_evento": "2024-06-01"}'
```

**Response:**
```json
{
  "detail": "Evento reprodutivo com ID 99999 não encontrado"
}
```

---

### Erro 2: Nascidos Vivos Maior que Total (422)

**Request:**
```bash
curl -X PUT "http://localhost:8000/api/v1/eventos-reprodutivos/45" \
  -H "Content-Type: application/json" \
  -d '{
    "nascidos_vivos": 15
  }'
```

**Response:**
```json
{
  "detail": "Nascidos vivos (15) não pode ser maior que total nascidos (10)"
}
```

---

### Erro 3: Alterar para Cobertura sem Reprodutor (400)

**Request:**
```bash
curl -X PUT "http://localhost:8000/api/v1/eventos-reprodutivos/46" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo_evento": "Cobertura"
  }'
```

**Response:**
```json
{
  "detail": "Campo 'reprodutor_id' é obrigatório para eventos de Cobertura"
}
```

---

## 🔒 Códigos de Status HTTP

| Código | Situação | Descrição |
| :--- | :--- | :--- |
| `200 OK` | Sucesso | Evento atualizado e status recalculado |
| `404 Not Found` | Não encontrado | Evento, matriz ou reprodutor não existe |
| `400 Bad Request` | Campos obrigatórios | Campos obrigatórios ausentes |
| `422 Unprocessable Entity` | Regras de negócio | Validações violadas |
| `500 Internal Server Error` | Erro no servidor | Erro inesperado |

---

## 🧪 Testes Unitários

O arquivo `tests/test_eventos_reprodutivos.py` contém 11 testes para o endpoint PUT:

| Teste | Cenário |
| :--- | :--- |
| `test_atualizar_evento_sucesso` | Atualização bem-sucedida |
| `test_atualizar_evento_inexistente` | Evento não encontrado (404) |
| `test_atualizar_data_evento` | Alterar data |
| `test_atualizar_tipo_evento_recalcula_status` | Recálculo ao alterar tipo |
| `test_atualizar_parto_nascidos_vivos_maior_que_total` | Validação de nascidos |
| `test_atualizar_para_cobertura_sem_reprodutor` | Reprodutor obrigatório |
| `test_atualizar_diagnostico_resultado` | Alterar resultado diagnóstico |
| `test_atualizar_observacoes` | Adicionar observações |
| `test_atualizar_multiplos_campos` | Atualização múltipla |
| `test_atualizar_evento_mais_recente_recalcula_status` | Recálculo por ordem |

**Executar os testes:**
```bash
pytest tests/test_eventos_reprodutivos.py -k "atualizar" -v
```

---

## 💡 Casos de Uso Práticos

### 1. Corrigir Erro de Digitação

```python
# Corrigir número de leitões nascidos
corrigir_dados_parto(evento_id=45, total_nascidos=13, nascidos_vivos=12)
```

### 2. Ajustar Data Lançada Incorretamente

```python
# Corrigir data do evento
corrigir_data_evento(evento_id=46, matriz_id=102, nova_data="2024-06-20")
```

### 3. Reverter Diagnóstico Incorreto

```python
# Alterar resultado de Positivo para Negativo
alterar_resultado_diagnostico(evento_id=47, matriz_id=102, novo_resultado="Negativo")
```

### 4. Adicionar Informações Complementares

```python
# Adicionar observações posteriormente
adicionar_observacoes(
    evento_id=48,
    observacoes="Desmame realizado com sucesso. Peso médio: 7.2kg"
)
```

---

## ⚠️ Boas Práticas

### 1. Validar Antes de Atualizar

```python
# Buscar evento antes de atualizar
response = requests.get(f"/api/v1/eventos-reprodutivos/{evento_id}")
if response.status_code != 200:
    print("❌ Evento não encontrado")
    return
```

### 2. Mostrar Feedback de Recálculo

```python
# Informar ao usuário sobre recálculo de status
if status_antes != status_depois:
    print(f"⚠️  Status recalculado: {status_antes} → {status_depois}")
```

### 3. Registrar Logs de Auditoria

```python
import logging

logging.info(
    f"ATUALIZAÇÃO: Evento {evento_id} atualizado. "
    f"Campos: {list(campos.keys())}"
)
```

### 4. Confirmar Alterações Críticas

```javascript
// Confirmar antes de alterar tipo de evento
if (campo === 'tipo_evento') {
  const confirmacao = confirm(
    'Alterar o tipo de evento pode recalcular o status da matriz. Continuar?'
  );
  if (!confirmacao) return;
}
```

---

## 📝 Observações Finais

1. **Atualização Parcial:** Apenas campos informados são atualizados
2. **Recálculo Automático:** Status da matriz sempre recalculado após atualização
3. **Baseado no Último Evento:** Recálculo usa o evento mais recente por data
4. **Validações Condicionais:** Campos obrigatórios variam conforme tipo de evento
5. **Integridade Garantida:** Todas as validações são aplicadas
6. **Histórico Preservado:** Não perde rastreabilidade (diferente de DELETE + CREATE)

---

**Elaborado por:** Manus AI  
**Data:** Janeiro de 2026
