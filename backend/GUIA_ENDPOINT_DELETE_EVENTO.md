# Guia de Uso - Endpoint DELETE /eventos-reprodutivos/{id}

**Projeto:** Sistema de Gestão de Suínos - API FastAPI  
**Data:** Janeiro de 2026  
**Elaborado por:** Manus AI

---

## 📋 Visão Geral

O endpoint `DELETE /eventos-reprodutivos/{id}` remove permanentemente um evento reprodutivo do sistema e **recalcula automaticamente o status reprodutivo da matriz** baseado no último evento restante.

**✨ DIFERENCIAL:** Este endpoint possui lógica inteligente de recálculo automático de status, garantindo que a matriz sempre reflita corretamente seu estado reprodutivo após a exclusão de um evento.

---

## 🎯 Informações do Endpoint

**URL:** `DELETE /api/v1/eventos-reprodutivos/{evento_id}`

**Método HTTP:** `DELETE`

**Autenticação:** Obrigatória (JWT - a ser implementado)

**Parâmetros de URL:**
- `evento_id` (integer, obrigatório) - ID do evento a ser deletado

**Código de Sucesso:** `204 No Content` (sem body na resposta)

---

## 💻 Código de Implementação

O endpoint está implementado em `app/routers/eventos_reprodutivos.py`:

```python
@router.delete(
    "/{evento_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deletar um evento reprodutivo",
    description="Remove um evento reprodutivo e recalcula o status da matriz."
)
def deletar_evento_reprodutivo(evento_id: int, db: Session = Depends(get_db)):
    # Buscar o evento
    evento = db.query(EventoReprodutivo).filter(
        EventoReprodutivo.evento_id == evento_id
    ).first()
    
    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    
    # Guardar o ID da matriz
    matriz_id = evento.matriz_id
    
    # Deletar o evento
    db.delete(evento)
    db.commit()
    
    # Recalcular o status da matriz
    recalcular_status_matriz(db, matriz_id)
    
    return None
```

---

## 🔄 Lógica de Recálculo Automático

Após deletar o evento, o sistema busca o **último evento restante** da matriz (mais recente por data) e atualiza o status reprodutivo baseado nele:

| Situação | Novo Status |
| :--- | :--- |
| **Sem eventos restantes** | `Vazia` |
| **Último evento: Cobertura** | `Gestante` |
| **Último evento: Parto** | `Lactante` |
| **Último evento: Desmame** | `Vazia` |
| **Último evento: Diagnóstico Positivo** | `Gestante` |
| **Último evento: Diagnóstico Negativo** | `Vazia` |

### Exemplo de Recálculo

**Cenário:**
1. Matriz possui 3 eventos: Cobertura (01/01) → Parto (01/05) → Desmame (01/06)
2. Status atual: `Vazia` (baseado no Desmame)
3. **Deletar o evento de Desmame**
4. Último evento restante: Parto (01/05)
5. **Novo status: `Lactante`** ✅

---

## 🧪 Exemplos de Uso

### Exemplo 1: Deletar Evento com Sucesso

```bash
curl -X DELETE "http://localhost:8000/api/v1/eventos-reprodutivos/45"
```

**Resposta (204 No Content):**
```
(sem body)
```

**Observação:** O código 204 indica sucesso, mas não retorna conteúdo no body.

---

### Exemplo 2: Tentar Deletar Evento Inexistente

```bash
curl -X DELETE "http://localhost:8000/api/v1/eventos-reprodutivos/99999"
```

**Resposta (404 Not Found):**
```json
{
  "detail": "Evento reprodutivo com ID 99999 não encontrado"
}
```

---

### Exemplo 3: Deletar e Verificar Recálculo de Status

**Passo 1: Verificar status atual da matriz**
```bash
curl -X GET "http://localhost:8000/api/v1/animais/102"
```

**Resposta:**
```json
{
  "animal_id": 102,
  "identificacao_principal": "MT-034",
  "status_reprodutivo": "Vazia"
}
```

**Passo 2: Deletar o último evento (Desmame)**
```bash
curl -X DELETE "http://localhost:8000/api/v1/eventos-reprodutivos/45"
```

**Resposta:** `204 No Content`

**Passo 3: Verificar novo status (recalculado)**
```bash
curl -X GET "http://localhost:8000/api/v1/animais/102"
```

**Resposta:**
```json
{
  "animal_id": 102,
  "identificacao_principal": "MT-034",
  "status_reprodutivo": "Lactante"
}
```

**Explicação:** O status mudou de "Vazia" para "Lactante" porque o último evento restante é um Parto.

---

## 🎨 Exemplos em Python

### Exemplo 1: Deletar Evento com Tratamento de Erros

```python
import requests

def deletar_evento(evento_id: int) -> tuple[bool, str]:
    """
    Deleta um evento reprodutivo com tratamento completo de erros.
    
    Returns:
        (sucesso, mensagem)
    """
    url = f"http://localhost:8000/api/v1/eventos-reprodutivos/{evento_id}"
    
    try:
        response = requests.delete(url)
        
        if response.status_code == 204:
            return True, "Evento deletado e status recalculado com sucesso"
        elif response.status_code == 404:
            return False, "Evento não encontrado"
        else:
            return False, f"Erro HTTP {response.status_code}"
    
    except requests.exceptions.RequestException as e:
        return False, f"Erro de conexão: {e}"

# Uso
sucesso, mensagem = deletar_evento(45)
print(f"{'✅' if sucesso else '❌'} {mensagem}")
```

---

### Exemplo 2: Deletar e Verificar Recálculo Automático

```python
def deletar_e_verificar_status(evento_id: int, matriz_id: int):
    """
    Deleta um evento e mostra o status antes e depois.
    """
    # Verificar status ANTES da exclusão
    response_antes = requests.get(f"http://localhost:8000/api/v1/animais/{matriz_id}")
    status_antes = response_antes.json()['status_reprodutivo']
    
    print(f"Status ANTES: {status_antes}")
    
    # Deletar o evento
    sucesso, mensagem = deletar_evento(evento_id)
    
    if not sucesso:
        print(f"❌ Falha: {mensagem}")
        return
    
    # Verificar status DEPOIS da exclusão
    response_depois = requests.get(f"http://localhost:8000/api/v1/animais/{matriz_id}")
    status_depois = response_depois.json()['status_reprodutivo']
    
    print(f"Status DEPOIS: {status_depois}")
    
    if status_antes != status_depois:
        print(f"✅ Status recalculado: {status_antes} → {status_depois}")
    else:
        print(f"ℹ️  Status permaneceu: {status_depois}")

# Uso
deletar_e_verificar_status(evento_id=45, matriz_id=102)
```

**Saída:**
```
Status ANTES: Vazia
Status DEPOIS: Lactante
✅ Status recalculado: Vazia → Lactante
```

---

### Exemplo 3: Deletar com Confirmação do Usuário

```python
def deletar_evento_com_confirmacao(evento_id: int):
    """
    Deleta um evento após mostrar informações e solicitar confirmação.
    """
    # Buscar dados do evento
    response = requests.get(f"http://localhost:8000/api/v1/eventos-reprodutivos/{evento_id}")
    
    if response.status_code != 200:
        print("❌ Evento não encontrado")
        return
    
    evento = response.json()
    
    # Mostrar informações
    print(f"\n{'='*60}")
    print(f"CONFIRMAR EXCLUSÃO DE EVENTO")
    print(f"{'='*60}\n")
    print(f"ID do Evento: {evento['evento_id']}")
    print(f"Tipo: {evento['tipo_evento']}")
    print(f"Data: {evento['data_evento']}")
    print(f"Matriz ID: {evento['matriz_id']}")
    print(f"\n⚠️  ATENÇÃO:")
    print(f"   • Esta operação é IRREVERSÍVEL")
    print(f"   • O status da matriz será RECALCULADO automaticamente\n")
    
    # Solicitar confirmação
    confirmacao = input("Digite 'CONFIRMAR' para deletar: ")
    
    if confirmacao != "CONFIRMAR":
        print("\n❌ Operação cancelada\n")
        return
    
    # Deletar
    sucesso, mensagem = deletar_evento(evento_id)
    print(f"\n{'✅' if sucesso else '❌'} {mensagem}\n")

# Uso
deletar_evento_com_confirmacao(45)
```

---

### Exemplo 4: Deletar Múltiplos Eventos

```python
def deletar_eventos_em_lote(evento_ids: list) -> dict:
    """
    Tenta deletar múltiplos eventos.
    
    Returns:
        Dicionário com resultados de sucesso e falha
    """
    resultados = {
        'sucesso': [],
        'falha': []
    }
    
    for evento_id in evento_ids:
        sucesso, mensagem = deletar_evento(evento_id)
        
        if sucesso:
            resultados['sucesso'].append(evento_id)
        else:
            resultados['falha'].append({
                'id': evento_id,
                'motivo': mensagem
            })
    
    return resultados

# Uso
resultado = deletar_eventos_em_lote([45, 46, 47])

print(f"✅ Sucesso: {len(resultado['sucesso'])} eventos deletados")
for evento_id in resultado['sucesso']:
    print(f"   - ID {evento_id}")

if resultado['falha']:
    print(f"\n❌ Falha: {len(resultado['falha'])} eventos não deletados")
    for item in resultado['falha']:
        print(f"   - ID {item['id']}: {item['motivo']}")
```

---

### Exemplo 5: Corrigir Lançamento Incorreto

```python
def corrigir_evento_incorreto(evento_id: int, matriz_id: int, evento_correto: dict):
    """
    Deleta um evento incorreto e cria o evento correto.
    """
    print(f"\n{'='*60}")
    print(f"CORRIGIR EVENTO INCORRETO")
    print(f"{'='*60}\n")
    
    # Deletar o evento incorreto
    print(f"1. Deletando evento incorreto (ID {evento_id})...")
    sucesso, mensagem = deletar_evento(evento_id)
    
    if not sucesso:
        print(f"   ❌ {mensagem}")
        return
    
    print(f"   ✅ Evento deletado")
    
    # Criar o evento correto
    print(f"\n2. Criando evento correto...")
    response = requests.post(
        "http://localhost:8000/api/v1/eventos-reprodutivos",
        json=evento_correto
    )
    
    if response.status_code == 201:
        novo_evento = response.json()
        print(f"   ✅ Evento criado (ID {novo_evento['evento_id']})")
        
        # Verificar status final
        response_matriz = requests.get(f"http://localhost:8000/api/v1/animais/{matriz_id}")
        status_final = response_matriz.json()['status_reprodutivo']
        print(f"\n3. Status final da matriz: {status_final}")
    else:
        print(f"   ❌ Erro ao criar evento: {response.json()['detail']}")
    
    print(f"\n{'='*60}\n")

# Uso
evento_correto = {
    "matriz_id": 102,
    "tipo_evento": "Parto",
    "data_evento": "2024-05-15",
    "total_nascidos": 12,
    "nascidos_vivos": 11
}

corrigir_evento_incorreto(
    evento_id=45,
    matriz_id=102,
    evento_correto=evento_correto
)
```

---

## 📊 Integração com Front-end

### Componente React - Botão de Exclusão com Recálculo

```jsx
import React, { useState } from 'react';

function BotaoDeletarEvento({ eventoId, matrizId, onSuccess }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    
    try {
      // Buscar status atual
      const matrizAntes = await fetch(`/api/v1/animais/${matrizId}`);
      const statusAntes = (await matrizAntes.json()).status_reprodutivo;
      
      // Deletar evento
      const response = await fetch(`/api/v1/eventos-reprodutivos/${eventoId}`, {
        method: 'DELETE'
      });

      if (response.status === 204) {
        // Buscar novo status
        const matrizDepois = await fetch(`/api/v1/animais/${matrizId}`);
        const statusDepois = (await matrizDepois.json()).status_reprodutivo;
        
        if (statusAntes !== statusDepois) {
          alert(
            `Evento deletado com sucesso!\n\n` +
            `Status recalculado:\n` +
            `${statusAntes} → ${statusDepois}`
          );
        } else {
          alert('Evento deletado com sucesso!');
        }
        
        onSuccess();
      } else if (response.status === 404) {
        alert('Evento não encontrado');
      } else {
        alert('Erro ao deletar evento');
      }
    } catch (error) {
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => setShowConfirm(true)}
        className="btn btn-danger"
        disabled={loading}
      >
        🗑️ Deletar Evento
      </button>

      {showConfirm && (
        <div className="modal">
          <div className="modal-content">
            <h3>⚠️ Confirmar Exclusão</h3>
            <p>Tem certeza que deseja deletar este evento?</p>
            <p className="info">
              ℹ️ O status reprodutivo da matriz será recalculado automaticamente.
            </p>
            
            <div className="modal-actions">
              <button
                onClick={handleDelete}
                className="btn btn-danger"
                disabled={loading}
              >
                {loading ? 'Deletando...' : 'Sim, Deletar'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BotaoDeletarEvento;
```

---

## 🔄 Cenários de Recálculo

### Cenário 1: Deletar Último Evento

**Situação Inicial:**
- Eventos: Desmame (01/06)
- Status: `Vazia`

**Ação:** Deletar o evento de Desmame

**Resultado:**
- Eventos: (nenhum)
- Novo Status: `Vazia` ✅

---

### Cenário 2: Deletar Evento Mais Recente

**Situação Inicial:**
- Eventos: Parto (01/05) → Desmame (01/06)
- Status: `Vazia`

**Ação:** Deletar o evento de Desmame

**Resultado:**
- Eventos: Parto (01/05)
- Novo Status: `Lactante` ✅

---

### Cenário 3: Deletar Evento Intermediário

**Situação Inicial:**
- Eventos: Cobertura (01/01) → Parto (01/05) → Desmame (01/06)
- Status: `Vazia`

**Ação:** Deletar o evento de Parto

**Resultado:**
- Eventos: Cobertura (01/01) → Desmame (01/06)
- Último evento: Desmame (01/06)
- Novo Status: `Vazia` ✅

---

### Cenário 4: Deletar Cobertura (Único Evento)

**Situação Inicial:**
- Eventos: Cobertura (01/01)
- Status: `Gestante`

**Ação:** Deletar o evento de Cobertura

**Resultado:**
- Eventos: (nenhum)
- Novo Status: `Vazia` ✅

---

## 🔒 Códigos de Status HTTP

| Código | Situação | Descrição |
| :--- | :--- | :--- |
| `204 No Content` | Sucesso | Evento deletado e status recalculado (sem body) |
| `404 Not Found` | Evento não existe | Nenhum evento com o ID informado |
| `500 Internal Server Error` | Erro no servidor | Erro inesperado |

---

## 🧪 Testes Unitários

O arquivo `tests/test_eventos_reprodutivos.py` contém 7 testes para o endpoint DELETE:

| Teste | Cenário |
| :--- | :--- |
| `test_deletar_evento_sucesso` | Exclusão bem-sucedida |
| `test_deletar_evento_inexistente` | Evento não encontrado (404) |
| `test_deletar_ultimo_evento_status_volta_vazia` | Sem eventos → Vazia |
| `test_deletar_evento_recalcula_baseado_em_anterior` | Recálculo baseado em evento anterior |
| `test_deletar_cobertura_unico_evento` | Deletar único evento → Vazia |
| `test_deletar_diagnostico_positivo_recalcula` | Recálculo após diagnóstico |
| `test_deletar_multiplos_eventos_sequencialmente` | Exclusões sequenciais |

**Executar os testes:**
```bash
pytest tests/test_eventos_reprodutivos.py -k "deletar" -v
```

---

## 💡 Casos de Uso Práticos

### 1. Corrigir Lançamento Duplicado

```python
# Deletar evento duplicado
deletar_evento(45)
```

### 2. Remover Evento Lançado na Data Errada

```python
# Deletar evento incorreto e criar novo
corrigir_evento_incorreto(45, 102, {
    "matriz_id": 102,
    "tipo_evento": "Parto",
    "data_evento": "2024-05-20",  # Data correta
    "total_nascidos": 12,
    "nascidos_vivos": 11
})
```

### 3. Limpar Histórico de Testes

```python
# Deletar todos os eventos de teste
eventos_teste = [45, 46, 47, 48]
deletar_eventos_em_lote(eventos_teste)
```

### 4. Reverter Lançamento Incorreto

```python
# Deletar o último evento (mais recente)
# O status voltará automaticamente para o estado anterior
deletar_evento(50)
```

---

## ⚠️ Boas Práticas

### 1. Sempre Confirmar com o Usuário

```javascript
function deletarEvento(id) {
  const confirmacao = confirm(
    'Tem certeza que deseja deletar este evento?\n' +
    'O status da matriz será recalculado automaticamente.'
  );
  
  if (!confirmacao) return;
  
  // Prosseguir com a exclusão
}
```

### 2. Mostrar Feedback do Recálculo

```python
# Mostrar ao usuário que o status foi recalculado
print(f"✅ Evento deletado")
print(f"ℹ️  Status recalculado: {status_antes} → {status_depois}")
```

### 3. Registrar Logs de Auditoria

```python
import logging

logging.info(
    f"EXCLUSÃO: Evento {evento_id} deletado. "
    f"Matriz {matriz_id}: {status_antes} → {status_depois}"
)
```

### 4. Validar Antes de Deletar

```python
# Verificar se o evento existe antes de tentar deletar
response = requests.get(f"/api/v1/eventos-reprodutivos/{evento_id}")
if response.status_code != 200:
    print("❌ Evento não encontrado")
    return
```

---

## 📝 Observações Finais

1. **Operação Irreversível:** Exclusão é permanente e não pode ser desfeita
2. **Recálculo Automático:** Status da matriz é sempre recalculado após exclusão
3. **Baseado no Último Evento:** Recálculo usa o evento mais recente por data
4. **Sem Eventos = Vazia:** Se não houver eventos, status volta para "Vazia"
5. **Sem Body na Resposta:** Status 204 não retorna conteúdo
6. **Integridade Garantida:** Status sempre reflete o histórico de eventos

---

**Elaborado por:** Manus AI  
**Data:** Janeiro de 2026
