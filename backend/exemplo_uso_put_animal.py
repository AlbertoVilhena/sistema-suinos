"""
Script de exemplo para usar o endpoint PUT /animais/{id}
"""
import requests
from typing import Dict, Tuple, List

# URL base da API
BASE_URL = "http://localhost:8000/api/v1"


def atualizar_animal(animal_id: int, updates: dict) -> Tuple[bool, Dict]:
    """
    Atualiza um animal com tratamento de erros completo.
    
    Args:
        animal_id: ID do animal
        updates: Dicionário com os campos a serem atualizados
        
    Returns:
        (sucesso, resultado_ou_erro)
    """
    url = f"{BASE_URL}/animais/{animal_id}"
    
    try:
        response = requests.put(url, json=updates)
        
        if response.status_code == 200:
            return True, response.json()
        elif response.status_code == 404:
            return False, {"erro": "Animal não encontrado"}
        elif response.status_code == 409:
            return False, {"erro": "Identificação duplicada"}
        elif response.status_code == 422:
            return False, {"erro": f"Validação falhou: {response.json()['detail']}"}
        else:
            return False, {"erro": f"Erro HTTP {response.status_code}"}
    
    except requests.exceptions.RequestException as e:
        return False, {"erro": f"Erro de conexão: {e}"}


def atualizar_identificacao(animal_id: int, nova_identificacao: str):
    """
    Atualiza a identificação de um animal.
    """
    print(f"\n{'='*60}")
    print(f"ATUALIZAR IDENTIFICAÇÃO - Animal ID: {animal_id}")
    print(f"{'='*60}\n")
    
    updates = {
        "identificacao_principal": nova_identificacao
    }
    
    sucesso, resultado = atualizar_animal(animal_id, updates)
    
    if sucesso:
        print(f"✅ Identificação atualizada com sucesso!")
        print(f"   Nova identificação: {resultado['identificacao_principal']}")
    else:
        print(f"❌ Falha na atualização: {resultado['erro']}")
    
    print(f"\n{'='*60}\n")


def atualizar_raca(animal_id: int, nova_raca: str):
    """
    Atualiza a raça de um animal.
    """
    print(f"\n{'='*60}")
    print(f"ATUALIZAR RAÇA - Animal ID: {animal_id}")
    print(f"{'='*60}\n")
    
    updates = {
        "raca": nova_raca
    }
    
    sucesso, resultado = atualizar_animal(animal_id, updates)
    
    if sucesso:
        print(f"✅ Raça atualizada com sucesso!")
        print(f"   Animal: {resultado['identificacao_principal']}")
        print(f"   Nova raça: {resultado['raca']}")
    else:
        print(f"❌ Falha na atualização: {resultado['erro']}")
    
    print(f"\n{'='*60}\n")


def atualizar_status_vida(animal_id: int, novo_status: str):
    """
    Atualiza o status de vida de um animal.
    """
    print(f"\n{'='*60}")
    print(f"ATUALIZAR STATUS DE VIDA - Animal ID: {animal_id}")
    print(f"{'='*60}\n")
    
    # Validar status
    status_validos = ["Ativo", "Vendido", "Morto"]
    if novo_status not in status_validos:
        print(f"❌ Status inválido. Use: {', '.join(status_validos)}")
        return
    
    updates = {
        "status_vida": novo_status
    }
    
    sucesso, resultado = atualizar_animal(animal_id, updates)
    
    if sucesso:
        print(f"✅ Status de vida atualizado com sucesso!")
        print(f"   Animal: {resultado['identificacao_principal']}")
        print(f"   Novo status: {resultado['status_vida']}")
    else:
        print(f"❌ Falha na atualização: {resultado['erro']}")
    
    print(f"\n{'='*60}\n")


def corrigir_status_reprodutivo(matriz_id: int, novo_status: str):
    """
    Corrige manualmente o status reprodutivo de uma matriz.
    
    ⚠️ ATENÇÃO: Use apenas para correções. O status deve ser atualizado
    automaticamente via eventos reprodutivos.
    """
    print(f"\n{'='*60}")
    print(f"CORRIGIR STATUS REPRODUTIVO - Matriz ID: {matriz_id}")
    print(f"{'='*60}\n")
    print("⚠️  ATENÇÃO: Alteração manual pode causar inconsistências!")
    print("    Recomenda-se usar eventos reprodutivos.\n")
    
    # Validar status
    status_validos = ["Gestante", "Lactante", "Vazia", "Cio", "Não Aplicável"]
    if novo_status not in status_validos:
        print(f"❌ Status inválido. Use: {', '.join(status_validos)}")
        return
    
    updates = {
        "status_reprodutivo": novo_status
    }
    
    sucesso, resultado = atualizar_animal(matriz_id, updates)
    
    if sucesso:
        print(f"✅ Status reprodutivo corrigido!")
        print(f"   Matriz: {resultado['identificacao_principal']}")
        print(f"   Novo status: {resultado['status_reprodutivo']}")
    else:
        print(f"❌ Falha na correção: {resultado['erro']}")
    
    print(f"\n{'='*60}\n")


def adicionar_genealogia(animal_id: int, mae_id: int = None, pai_id: int = None):
    """
    Adiciona ou atualiza informações de genealogia.
    """
    print(f"\n{'='*60}")
    print(f"ADICIONAR GENEALOGIA - Animal ID: {animal_id}")
    print(f"{'='*60}\n")
    
    updates = {}
    if mae_id is not None:
        updates["mae_id"] = mae_id
    if pai_id is not None:
        updates["pai_id"] = pai_id
    
    if not updates:
        print("❌ Nenhuma informação de genealogia fornecida")
        return
    
    sucesso, resultado = atualizar_animal(animal_id, updates)
    
    if sucesso:
        print(f"✅ Genealogia atualizada com sucesso!")
        print(f"   Animal: {resultado['identificacao_principal']}")
        if mae_id:
            print(f"   Mãe: ID {resultado.get('mae_id', 'N/A')}")
        if pai_id:
            print(f"   Pai: ID {resultado.get('pai_id', 'N/A')}")
    else:
        print(f"❌ Falha na atualização: {resultado['erro']}")
    
    print(f"\n{'='*60}\n")


def atualizar_multiplos_campos(animal_id: int, updates: dict):
    """
    Atualiza múltiplos campos de um animal de uma vez.
    """
    print(f"\n{'='*60}")
    print(f"ATUALIZAR MÚLTIPLOS CAMPOS - Animal ID: {animal_id}")
    print(f"{'='*60}\n")
    
    print(f"Campos a serem atualizados:")
    for campo, valor in updates.items():
        print(f"   {campo}: {valor}")
    print()
    
    sucesso, resultado = atualizar_animal(animal_id, updates)
    
    if sucesso:
        print(f"✅ Animal atualizado com sucesso!")
        print(f"   Animal: {resultado['identificacao_principal']}")
        print(f"\n   Campos atualizados:")
        for campo in updates.keys():
            print(f"   {campo}: {resultado.get(campo)}")
    else:
        print(f"❌ Falha na atualização: {resultado['erro']}")
    
    print(f"\n{'='*60}\n")


def marcar_animais_como_vendidos(animal_ids: List[int]):
    """
    Marca múltiplos animais como vendidos.
    """
    print(f"\n{'='*60}")
    print(f"MARCAR ANIMAIS COMO VENDIDOS")
    print(f"{'='*60}\n")
    
    resultados = {
        'sucesso': [],
        'falha': []
    }
    
    for animal_id in animal_ids:
        sucesso, resultado = atualizar_animal(animal_id, {"status_vida": "Vendido"})
        
        if sucesso:
            resultados['sucesso'].append({
                'id': animal_id,
                'identificacao': resultado['identificacao_principal']
            })
        else:
            resultados['falha'].append({
                'id': animal_id,
                'erro': resultado['erro']
            })
    
    print(f"✅ Sucesso: {len(resultados['sucesso'])} animais marcados como vendidos")
    for item in resultados['sucesso']:
        print(f"   - ID {item['id']}: {item['identificacao']}")
    
    if resultados['falha']:
        print(f"\n❌ Falha: {len(resultados['falha'])} animais não foram atualizados")
        for item in resultados['falha']:
            print(f"   - ID {item['id']}: {item['erro']}")
    
    print(f"\n{'='*60}\n")
    
    return resultados


def atualizar_com_validacao_previa(animal_id: int, updates: dict):
    """
    Atualiza um animal após validar os dados localmente.
    """
    print(f"\n{'='*60}")
    print(f"ATUALIZAR COM VALIDAÇÃO PRÉVIA - Animal ID: {animal_id}")
    print(f"{'='*60}\n")
    
    # Validações locais
    erros = []
    
    if 'peso_nascimento' in updates:
        peso = updates['peso_nascimento']
        if peso < 0.5 or peso > 5.0:
            erros.append("Peso de nascimento deve estar entre 0.5kg e 5.0kg")
    
    if 'data_nascimento' in updates:
        from datetime import datetime
        try:
            data = datetime.strptime(updates['data_nascimento'], '%Y-%m-%d')
            if data > datetime.now():
                erros.append("Data de nascimento não pode ser futura")
        except ValueError:
            erros.append("Formato de data inválido (use YYYY-MM-DD)")
    
    if 'status_vida' in updates:
        if updates['status_vida'] not in ["Ativo", "Vendido", "Morto"]:
            erros.append("Status de vida inválido")
    
    if erros:
        print("❌ Validação falhou:")
        for erro in erros:
            print(f"   - {erro}")
        print(f"\n{'='*60}\n")
        return False, {"erro": "Validação local falhou"}
    
    print("✅ Validação local passou")
    print("   Enviando para o servidor...\n")
    
    sucesso, resultado = atualizar_animal(animal_id, updates)
    
    if sucesso:
        print(f"✅ Animal atualizado com sucesso!")
        print(f"   Animal: {resultado['identificacao_principal']}")
    else:
        print(f"❌ Falha na atualização: {resultado['erro']}")
    
    print(f"\n{'='*60}\n")
    
    return sucesso, resultado


def comparar_antes_depois(animal_id: int, updates: dict):
    """
    Mostra o estado do animal antes e depois da atualização.
    """
    print(f"\n{'='*60}")
    print(f"COMPARAÇÃO ANTES/DEPOIS - Animal ID: {animal_id}")
    print(f"{'='*60}\n")
    
    # Buscar estado atual
    response_antes = requests.get(f"{BASE_URL}/animais/{animal_id}")
    if response_antes.status_code != 200:
        print("❌ Animal não encontrado")
        return
    
    animal_antes = response_antes.json()
    
    print("📋 ANTES DA ATUALIZAÇÃO:")
    for campo in updates.keys():
        valor_antes = animal_antes.get(campo, 'N/A')
        print(f"   {campo}: {valor_antes}")
    
    # Atualizar
    sucesso, animal_depois = atualizar_animal(animal_id, updates)
    
    if not sucesso:
        print(f"\n❌ Falha na atualização: {animal_depois['erro']}")
        return
    
    print(f"\n📋 DEPOIS DA ATUALIZAÇÃO:")
    for campo in updates.keys():
        valor_depois = animal_depois.get(campo, 'N/A')
        print(f"   {campo}: {valor_depois}")
    
    print(f"\n{'='*60}\n")


# ============================================
# EXEMPLOS DE USO
# ============================================

if __name__ == "__main__":
    print("\n🐷 SISTEMA DE GESTÃO DE SUÍNOS - EXEMPLOS DE USO DO ENDPOINT PUT /animais/{id}\n")
    
    # Exemplo 1: Atualizar identificação
    print("=" * 80)
    print("Exemplo 1: Atualizar identificação de um animal")
    print("=" * 80)
    atualizar_identificacao(102, "MT-034-NOVO")
    
    # Exemplo 2: Atualizar raça
    print("\n" + "=" * 80)
    print("Exemplo 2: Atualizar raça de um animal")
    print("=" * 80)
    atualizar_raca(102, "Duroc")
    
    # Exemplo 3: Atualizar status de vida
    print("\n" + "=" * 80)
    print("Exemplo 3: Marcar animal como vendido")
    print("=" * 80)
    atualizar_status_vida(55, "Vendido")
    
    # Exemplo 4: Corrigir status reprodutivo
    print("\n" + "=" * 80)
    print("Exemplo 4: Corrigir status reprodutivo de uma matriz")
    print("=" * 80)
    corrigir_status_reprodutivo(102, "Vazia")
    
    # Exemplo 5: Adicionar genealogia
    print("\n" + "=" * 80)
    print("Exemplo 5: Adicionar informações de genealogia")
    print("=" * 80)
    adicionar_genealogia(150, mae_id=102, pai_id=55)
    
    # Exemplo 6: Atualizar múltiplos campos
    print("\n" + "=" * 80)
    print("Exemplo 6: Atualizar múltiplos campos de uma vez")
    print("=" * 80)
    atualizar_multiplos_campos(102, {
        "identificacao_principal": "MT-034-V2",
        "raca": "Duroc",
        "peso_nascimento": 1.65
    })
    
    # Exemplo 7: Marcar vários animais como vendidos
    print("\n" + "=" * 80)
    print("Exemplo 7: Marcar múltiplos animais como vendidos")
    print("=" * 80)
    marcar_animais_como_vendidos([101, 102, 103, 104])
    
    # Exemplo 8: Atualizar com validação prévia
    print("\n" + "=" * 80)
    print("Exemplo 8: Atualizar com validação prévia")
    print("=" * 80)
    atualizar_com_validacao_previa(102, {
        "peso_nascimento": 1.7,
        "raca": "Landrace"
    })
    
    # Exemplo 9: Comparar antes e depois
    print("\n" + "=" * 80)
    print("Exemplo 9: Comparar estado antes e depois da atualização")
    print("=" * 80)
    comparar_antes_depois(102, {
        "raca": "Pietrain",
        "peso_nascimento": 1.8
    })
    
    print("\n✅ Exemplos concluídos!\n")
