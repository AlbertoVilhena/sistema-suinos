# Guia de Uso - Endpoint DELETE /animais/{id}

**Projeto:** Sistema de Gestão de Suínos - API FastAPI  
**Data:** Janeiro de 2026  
**Elaborado por:** Manus AI

---

## 📋 Visão Geral

O endpoint `DELETE /animais/{id}` remove permanentemente um animal do sistema. A exclusão é **destrutiva e irreversível**, portanto, validações rigorosas são aplicadas para evitar perda de dados importantes.

**⚠️ IMPORTANTE:** Em vez de deletar, considere alterar o `status_vida` para "Morto" ou "Vendido" para manter o histórico e rastreabilidade.

---

## 🎯 Informações do Endpoint

**URL:** `DELETE /api/v1/animais/{animal_id}`

**Método HTTP:** `DELETE`

**Autenticação:** Obrigatória (JWT - a ser implementado)

**Parâmetros de URL:**
- `animal_id` (integer, obrigatório) - ID do animal a ser deletado

**Código de Sucesso:** `204 No Content` (sem body na resposta)

---

## 💻 Código de Implementação

O endpoint está implementado em `app/routers/animais.py`:

```python
@router.delete(
    "/{animal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deletar um animal",
    description="Remove um animal do sistema. Verifica dependências antes da exclusão."
)
def deletar_animal(animal_id: int, db: Session = Depends(get_db)):
    # Buscar o animal
    animal = db.query(Animal).filter(Animal.animal_id == animal_id).first()
    
    if not animal:
        raise HTTPException(status_code=404, detail="Animal não encontrado")
    
    # Validar dependências...
    # Deletar se não houver dependências
    
    db.delete(animal)
    db.commit()
    return None
```

---

## 🔒 Validações de Dependências

O endpoint verifica **5 tipos de dependências** antes de permitir a exclusão:

### 1. Animal é Mãe de Outros Animais

**Validação:** Verifica se existem animais com `mae_id` igual ao ID do animal sendo deletado.

**Erro:** `409 Conflict`

**Mensagem:**
```json
{
  "detail": "Não é possível deletar: animal é mãe de 3 outro(s) animal(is). Considere alterar o status_vida para 'Morto' em vez de deletar."
}
```

---

### 2. Animal é Pai de Outros Animais

**Validação:** Verifica se existem animais com `pai_id` igual ao ID do animal sendo deletado.

**Erro:** `409 Conflict`

**Mensagem:**
```json
{
  "detail": "Não é possível deletar: animal é pai de 5 outro(s) animal(is). Considere alterar o status_vida para 'Morto' em vez de deletar."
}
```

---

### 3. Animal Possui Eventos Reprodutivos (Matriz)

**Validação:** Verifica se existem eventos reprodutivos com `matriz_id` igual ao ID do animal.

**Erro:** `409 Conflict`

**Mensagem:**
```json
{
  "detail": "Não é possível deletar: animal possui 7 evento(s) reprodutivo(s) registrado(s). Delete os eventos primeiro ou altere o status_vida para 'Morto'."
}
```

---

### 4. Animal é Reprodutor em Eventos

**Validação:** Verifica se existem eventos reprodutivos com `reprodutor_id` igual ao ID do animal.

**Erro:** `409 Conflict`

**Mensagem:**
```json
{
  "detail": "Não é possível deletar: animal é reprodutor em 12 evento(s). Delete os eventos primeiro ou altere o status_vida para 'Morto'."
}
```

---

### 5. Animal Possui Pesagens Registradas

**Validação:** Verifica se existem pesagens com `animal_id` igual ao ID do animal.

**Erro:** `409 Conflict`

**Mensagem:**
```json
{
  "detail": "Não é possível deletar: animal possui 15 pesagem(ns) registrada(s). Delete as pesagens primeiro ou altere o status_vida para 'Morto'."
}
```

---

## 🧪 Exemplos de Uso

### Exemplo 1: Deletar Animal Sem Dependências (Sucesso)

```bash
curl -X DELETE "http://localhost:8000/api/v1/animais/150"
```

**Resposta (204 No Content):**
```
(sem body)
```

**Observação:** O código 204 indica sucesso, mas não retorna nenhum conteúdo no body.

---

### Exemplo 2: Tentar Deletar Animal Inexistente

```bash
curl -X DELETE "http://localhost:8000/api/v1/animais/99999"
```

**Resposta (404 Not Found):**
```json
{
  "detail": "Animal com ID 99999 não encontrado"
}
```

---

### Exemplo 3: Tentar Deletar Matriz com Filhos

```bash
curl -X DELETE "http://localhost:8000/api/v1/animais/102"
```

**Resposta (409 Conflict):**
```json
{
  "detail": "Não é possível deletar: animal é mãe de 8 outro(s) animal(is). Considere alterar o status_vida para 'Morto' em vez de deletar."
}
```

---

### Exemplo 4: Tentar Deletar Matriz com Eventos

```bash
curl -X DELETE "http://localhost:8000/api/v1/animais/102"
```

**Resposta (409 Conflict):**
```json
{
  "detail": "Não é possível deletar: animal possui 5 evento(s) reprodutivo(s) registrado(s). Delete os eventos primeiro ou altere o status_vida para 'Morto'."
}
```

---

## 🎨 Exemplos em Python

### Exemplo 1: Deletar Animal com Tratamento de Erros

```python
import requests

def deletar_animal(animal_id: int) -> tuple[bool, str]:
    """
    Deleta um animal com tratamento completo de erros.
    
    Returns:
        (sucesso, mensagem)
    """
    url = f"http://localhost:8000/api/v1/animais/{animal_id}"
    
    try:
        response = requests.delete(url)
        
        if response.status_code == 204:
            return True, "Animal deletado com sucesso"
        elif response.status_code == 404:
            return False, "Animal não encontrado"
        elif response.status_code == 409:
            return False, response.json()['detail']
        else:
            return False, f"Erro HTTP {response.status_code}"
    
    except requests.exceptions.RequestException as e:
        return False, f"Erro de conexão: {e}"

# Uso
sucesso, mensagem = deletar_animal(150)
if sucesso:
    print(f"✅ {mensagem}")
else:
    print(f"❌ {mensagem}")
```

---

### Exemplo 2: Verificar Dependências Antes de Deletar

```python
def pode_deletar_animal(animal_id: int) -> tuple[bool, str]:
    """
    Verifica se um animal pode ser deletado sem tentar deletá-lo.
    
    Returns:
        (pode_deletar, motivo)
    """
    # Buscar o animal
    response = requests.get(f"http://localhost:8000/api/v1/animais/{animal_id}")
    
    if response.status_code != 200:
        return False, "Animal não encontrado"
    
    animal = response.json()
    
    # Verificar se tem filhos (simplificado - requer endpoint de listagem)
    # Na prática, você precisaria consultar a API para verificar
    
    # Verificar se tem eventos reprodutivos
    if animal['sexo'] == 'Fêmea':
        eventos_response = requests.get(
            f"http://localhost:8000/api/v1/eventos-reprodutivos/matriz/{animal_id}"
        )
        if eventos_response.status_code == 200:
            eventos = eventos_response.json()
            if len(eventos) > 0:
                return False, f"Animal possui {len(eventos)} evento(s) reprodutivo(s)"
    
    return True, "Animal pode ser deletado"

# Uso
pode, motivo = pode_deletar_animal(102)
if pode:
    print(f"✅ {motivo}")
    # Prosseguir com a exclusão
else:
    print(f"❌ {motivo}")
```

---

### Exemplo 3: Alternativa - Marcar como Morto em Vez de Deletar

```python
def marcar_como_morto(animal_id: int) -> tuple[bool, str]:
    """
    Em vez de deletar, marca o animal como morto.
    Mantém o histórico e rastreabilidade.
    """
    payload = {
        "status_vida": "Morto"
    }
    
    response = requests.put(
        f"http://localhost:8000/api/v1/animais/{animal_id}",
        json=payload
    )
    
    if response.status_code == 200:
        animal = response.json()
        return True, f"Animal {animal['identificacao_principal']} marcado como morto"
    else:
        return False, "Erro ao atualizar animal"

# Uso - RECOMENDADO em vez de deletar
sucesso, mensagem = marcar_como_morto(102)
print(f"{'✅' if sucesso else '❌'} {mensagem}")
```

---

### Exemplo 4: Deletar com Confirmação do Usuário

```python
def deletar_com_confirmacao(animal_id: int):
    """
    Deleta um animal após confirmação do usuário.
    """
    # Buscar dados do animal
    response = requests.get(f"http://localhost:8000/api/v1/animais/{animal_id}")
    
    if response.status_code != 200:
        print("❌ Animal não encontrado")
        return
    
    animal = response.json()
    
    # Mostrar informações
    print(f"\n{'='*60}")
    print(f"CONFIRMAR EXCLUSÃO")
    print(f"{'='*60}\n")
    print(f"Animal: {animal['identificacao_principal']}")
    print(f"Sexo: {animal['sexo']}")
    print(f"Data de Nascimento: {animal['data_nascimento']}")
    print(f"\n⚠️  ATENÇÃO: Esta operação é IRREVERSÍVEL!")
    print(f"⚠️  Considere marcar como 'Morto' em vez de deletar.\n")
    
    # Solicitar confirmação
    confirmacao = input("Digite 'CONFIRMAR' para deletar: ")
    
    if confirmacao != "CONFIRMAR":
        print("❌ Operação cancelada")
        return
    
    # Deletar
    sucesso, mensagem = deletar_animal(animal_id)
    print(f"{'✅' if sucesso else '❌'} {mensagem}")

# Uso
deletar_com_confirmacao(150)
```

---

### Exemplo 5: Deletar em Lote (com Validação)

```python
def deletar_animais_em_lote(animal_ids: list) -> dict:
    """
    Tenta deletar múltiplos animais.
    
    Returns:
        Dicionário com resultados de sucesso e falha
    """
    resultados = {
        'sucesso': [],
        'falha': []
    }
    
    for animal_id in animal_ids:
        sucesso, mensagem = deletar_animal(animal_id)
        
        if sucesso:
            resultados['sucesso'].append(animal_id)
        else:
            resultados['falha'].append({
                'id': animal_id,
                'motivo': mensagem
            })
    
    return resultados

# Uso
resultado = deletar_animais_em_lote([150, 151, 152, 153])

print(f"✅ Sucesso: {len(resultado['sucesso'])} animais deletados")
for animal_id in resultado['sucesso']:
    print(f"   - ID {animal_id}")

if resultado['falha']:
    print(f"\n❌ Falha: {len(resultado['falha'])} animais não deletados")
    for item in resultado['falha']:
        print(f"   - ID {item['id']}: {item['motivo']}")
```

---

## 📊 Integração com Front-end

### Componente React - Botão de Exclusão com Confirmação

```jsx
import React, { useState } from 'react';

function BotaoDeletarAnimal({ animalId, animalNome, onSuccess }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/v1/animais/${animalId}`, {
        method: 'DELETE'
      });

      if (response.status === 204) {
        alert('Animal deletado com sucesso!');
        onSuccess();
      } else if (response.status === 409) {
        const error = await response.json();
        alert(`Não é possível deletar:\n${error.detail}`);
      } else if (response.status === 404) {
        alert('Animal não encontrado');
      } else {
        alert('Erro ao deletar animal');
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
        🗑️ Deletar
      </button>

      {showConfirm && (
        <div className="modal">
          <div className="modal-content">
            <h3>⚠️ Confirmar Exclusão</h3>
            <p>Tem certeza que deseja deletar <strong>{animalNome}</strong>?</p>
            <p className="warning">Esta operação é IRREVERSÍVEL!</p>
            <p className="suggestion">
              💡 Sugestão: Considere marcar como "Morto" em vez de deletar.
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

export default BotaoDeletarAnimal;
```

---

## ⚠️ Boas Práticas

### 1. Preferir Soft Delete

Em vez de deletar permanentemente, considere implementar "soft delete":

```python
# ❌ Ruim: Deletar permanentemente
DELETE /api/v1/animais/102

# ✅ Bom: Marcar como morto (soft delete)
PUT /api/v1/animais/102
{
  "status_vida": "Morto"
}
```

**Vantagens do Soft Delete:**
- Mantém histórico completo
- Preserva integridade referencial
- Permite "desfazer" a operação
- Facilita auditorias e relatórios

---

### 2. Sempre Confirmar com o Usuário

```javascript
function deletarAnimal(id) {
  const confirmacao = confirm(
    'Tem certeza que deseja deletar este animal?\n' +
    'Esta operação é IRREVERSÍVEL!\n\n' +
    'Considere marcar como "Morto" em vez de deletar.'
  );
  
  if (!confirmacao) return;
  
  // Prosseguir com a exclusão
}
```

---

### 3. Registrar Logs de Auditoria

```python
import logging

def deletar_animal_com_log(animal_id: int, usuario_id: int):
    # Buscar dados do animal antes de deletar
    animal = obter_animal(animal_id)
    
    # Registrar log
    logging.info(
        f"EXCLUSÃO: Animal {animal['identificacao_principal']} "
        f"(ID: {animal_id}) deletado por usuário {usuario_id}"
    )
    
    # Deletar
    sucesso, mensagem = deletar_animal(animal_id)
    
    return sucesso, mensagem
```

---

### 4. Implementar Permissões

```python
# Apenas administradores devem poder deletar animais
@router.delete("/{animal_id}")
def deletar_animal(
    animal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Apenas administradores podem deletar animais"
        )
    
    # Prosseguir com a exclusão...
```

---

## 🔒 Códigos de Status HTTP

| Código | Situação | Descrição |
| :--- | :--- | :--- |
| `204 No Content` | Sucesso | Animal deletado com sucesso (sem body) |
| `404 Not Found` | Animal não existe | Nenhum animal com o ID informado |
| `409 Conflict` | Possui dependências | Animal tem filhos, eventos ou pesagens |
| `403 Forbidden` | Sem permissão | Usuário não tem permissão (quando implementado) |
| `500 Internal Server Error` | Erro no servidor | Erro inesperado |

---

## 🧪 Testes Unitários

O arquivo `tests/test_animais.py` contém 7 testes para o endpoint DELETE:

| Teste | Cenário |
| :--- | :--- |
| `test_deletar_animal_sucesso` | Exclusão bem-sucedida |
| `test_deletar_animal_inexistente` | Animal não encontrado (404) |
| `test_deletar_animal_com_filhos_como_mae` | Mãe com filhos (409) |
| `test_deletar_animal_com_filhos_como_pai` | Pai com filhos (409) |
| `test_deletar_matriz_com_eventos` | Matriz com eventos (409) |
| `test_deletar_reprodutor_usado_em_eventos` | Reprodutor em eventos (409) |
| `test_deletar_animal_sem_dependencias` | Exclusão sem dependências |

**Executar os testes:**
```bash
pytest tests/test_animais.py -k "deletar" -v
```

---

## 💡 Alternativas à Exclusão

### 1. Soft Delete com Campo `deleted_at`

Adicionar um campo `deleted_at` ao modelo:

```python
class Animal(Base):
    # ... campos existentes ...
    deleted_at = Column(DateTime, nullable=True)

# Filtrar animais não deletados
animais_ativos = db.query(Animal).filter(Animal.deleted_at.is_(None)).all()
```

---

### 2. Usar Status de Vida

Já implementado no sistema:

```python
# Marcar como morto
PUT /api/v1/animais/102
{
  "status_vida": "Morto"
}

# Filtrar apenas animais ativos
GET /api/v1/animais?status_vida=Ativo
```

---

### 3. Arquivamento

Mover para uma tabela de arquivo:

```python
# Criar tabela de arquivo
class AnimalArquivado(Base):
    # ... mesmos campos de Animal ...
    data_arquivamento = Column(DateTime)
    motivo_arquivamento = Column(String)
```

---

## 📝 Observações Finais

1. **Operação Irreversível:** Exclusão é permanente e não pode ser desfeita
2. **Validações Rigorosas:** 5 tipos de dependências são verificadas
3. **Alternativa Recomendada:** Use `status_vida = "Morto"` em vez de deletar
4. **Integridade Referencial:** Protege contra perda de dados relacionados
5. **Sem Body na Resposta:** Status 204 não retorna conteúdo
6. **Permissões:** Considere restringir a operação apenas para administradores

---

**Elaborado por:** Manus AI  
**Data:** Janeiro de 2026
