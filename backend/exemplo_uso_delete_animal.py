"""
Script de exemplo para usar o endpoint DELETE /animais/{id}
"""
import requests
from typing import Tuple, List, Dict

# URL base da API
BASE_URL = "http://localhost:8000/api/v1"


def deletar_animal(animal_id: int) -> Tuple[bool, str]:
    """
    Deleta um animal com tratamento completo de erros.
    
    Args:
        animal_id: ID do animal a ser deletado
        
    Returns:
        (sucesso, mensagem)
    """
    url = f"{BASE_URL}/animais/{animal_id}"
    
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


def verificar_se_existe(animal_id: int) -> Tuple[bool, Dict]:
    """
    Verifica se um animal existe antes de tentar deletá-lo.
    
    Returns:
        (existe, dados_do_animal)
    """
    url = f"{BASE_URL}/animais/{animal_id}"
    
    try:
        response = requests.get(url)
        
        if response.status_code == 200:
            return True, response.json()
        else:
            return False, {}
    
    except requests.exceptions.RequestException:
        return False, {}


def deletar_com_confirmacao(animal_id: int):
    """
    Deleta um animal após mostrar informações e solicitar confirmação.
    """
    print(f"\n{'='*60}")
    print(f"DELETAR ANIMAL - ID: {animal_id}")
    print(f"{'='*60}\n")
    
    # Verificar se o animal existe
    existe, animal = verificar_se_existe(animal_id)
    
    if not existe:
        print("❌ Animal não encontrado")
        return
    
    # Mostrar informações do animal
    print("📋 INFORMAÇÕES DO ANIMAL:")
    print(f"   Identificação: {animal.get('identificacao_principal', 'N/A')}")
    print(f"   Sexo: {animal.get('sexo', 'N/A')}")
    print(f"   Data de Nascimento: {animal.get('data_nascimento', 'N/A')}")
    print(f"   Raça: {animal.get('raca', 'N/A')}")
    print(f"   Status: {animal.get('status_vida', 'N/A')}")
    
    print(f"\n⚠️  ATENÇÃO:")
    print(f"   • Esta operação é IRREVERSÍVEL!")
    print(f"   • Considere marcar como 'Morto' em vez de deletar")
    print(f"   • A exclusão preserva histórico e rastreabilidade\n")
    
    # Solicitar confirmação
    confirmacao = input("Digite 'CONFIRMAR' para deletar: ")
    
    if confirmacao != "CONFIRMAR":
        print("\n❌ Operação cancelada\n")
        print(f"{'='*60}\n")
        return
    
    # Deletar
    sucesso, mensagem = deletar_animal(animal_id)
    
    if sucesso:
        print(f"\n✅ {mensagem}\n")
    else:
        print(f"\n❌ Falha na exclusão:")
        print(f"   {mensagem}\n")
    
    print(f"{'='*60}\n")


def marcar_como_morto_alternativa(animal_id: int) -> Tuple[bool, str]:
    """
    Alternativa à exclusão: marca o animal como morto.
    Mantém o histórico e rastreabilidade.
    """
    url = f"{BASE_URL}/animais/{animal_id}"
    payload = {"status_vida": "Morto"}
    
    try:
        response = requests.put(url, json=payload)
        
        if response.status_code == 200:
            animal = response.json()
            return True, f"Animal {animal['identificacao_principal']} marcado como morto"
        elif response.status_code == 404:
            return False, "Animal não encontrado"
        else:
            return False, f"Erro ao atualizar: {response.json().get('detail', 'Erro desconhecido')}"
    
    except requests.exceptions.RequestException as e:
        return False, f"Erro de conexão: {e}"


def comparar_delete_vs_soft_delete(animal_id: int):
    """
    Mostra a diferença entre deletar e marcar como morto.
    """
    print(f"\n{'='*60}")
    print(f"COMPARAÇÃO: DELETE vs SOFT DELETE")
    print(f"{'='*60}\n")
    
    # Verificar se o animal existe
    existe, animal = verificar_se_existe(animal_id)
    
    if not existe:
        print("❌ Animal não encontrado")
        return
    
    print(f"Animal: {animal['identificacao_principal']}\n")
    
    print("🔴 OPÇÃO 1: DELETE (Exclusão Permanente)")
    print("   Vantagens:")
    print("   • Remove completamente do banco de dados")
    print("   • Libera espaço")
    print("\n   Desvantagens:")
    print("   • ❌ Operação irreversível")
    print("   • ❌ Perde histórico completo")
    print("   • ❌ Quebra integridade referencial se houver dependências")
    print("   • ❌ Não pode ser usado em relatórios históricos")
    
    print("\n🟢 OPÇÃO 2: SOFT DELETE (Marcar como Morto)")
    print("   Vantagens:")
    print("   • ✅ Mantém histórico completo")
    print("   • ✅ Preserva integridade referencial")
    print("   • ✅ Pode ser usado em relatórios")
    print("   • ✅ Operação reversível")
    print("\n   Desvantagens:")
    print("   • Mantém registro no banco")
    
    print(f"\n💡 RECOMENDAÇÃO: Use SOFT DELETE (marcar como morto)\n")
    print(f"{'='*60}\n")


def deletar_animais_em_lote(animal_ids: List[int]) -> Dict:
    """
    Tenta deletar múltiplos animais.
    
    Returns:
        Dicionário com resultados de sucesso e falha
    """
    print(f"\n{'='*60}")
    print(f"DELETAR ANIMAIS EM LOTE")
    print(f"{'='*60}\n")
    
    print(f"Total de animais a deletar: {len(animal_ids)}\n")
    
    resultados = {
        'sucesso': [],
        'falha': []
    }
    
    for i, animal_id in enumerate(animal_ids, 1):
        print(f"[{i}/{len(animal_ids)}] Deletando animal ID {animal_id}...", end=" ")
        
        sucesso, mensagem = deletar_animal(animal_id)
        
        if sucesso:
            print("✅")
            resultados['sucesso'].append(animal_id)
        else:
            print(f"❌")
            resultados['falha'].append({
                'id': animal_id,
                'motivo': mensagem
            })
    
    print(f"\n{'='*60}")
    print(f"RESULTADO:")
    print(f"{'='*60}\n")
    
    print(f"✅ Sucesso: {len(resultados['sucesso'])} animais deletados")
    for animal_id in resultados['sucesso']:
        print(f"   - ID {animal_id}")
    
    if resultados['falha']:
        print(f"\n❌ Falha: {len(resultados['falha'])} animais não deletados")
        for item in resultados['falha']:
            print(f"   - ID {item['id']}: {item['motivo']}")
    
    print(f"\n{'='*60}\n")
    
    return resultados


def deletar_com_verificacao_dependencias(animal_id: int):
    """
    Verifica dependências antes de tentar deletar.
    """
    print(f"\n{'='*60}")
    print(f"VERIFICAR DEPENDÊNCIAS - Animal ID: {animal_id}")
    print(f"{'='*60}\n")
    
    # Verificar se o animal existe
    existe, animal = verificar_se_existe(animal_id)
    
    if not existe:
        print("❌ Animal não encontrado")
        return
    
    print(f"Animal: {animal['identificacao_principal']}\n")
    
    # Verificar eventos reprodutivos (se for fêmea)
    if animal['sexo'] == 'Fêmea':
        print("🔍 Verificando eventos reprodutivos...")
        eventos_response = requests.get(
            f"{BASE_URL}/eventos-reprodutivos/matriz/{animal_id}"
        )
        
        if eventos_response.status_code == 200:
            eventos = eventos_response.json()
            if len(eventos) > 0:
                print(f"   ❌ Possui {len(eventos)} evento(s) reprodutivo(s)")
                print(f"   Não é possível deletar\n")
                return
            else:
                print(f"   ✅ Sem eventos reprodutivos\n")
    
    # Se passou pelas verificações, tentar deletar
    print("✅ Verificações passaram. Tentando deletar...\n")
    
    sucesso, mensagem = deletar_animal(animal_id)
    
    if sucesso:
        print(f"✅ {mensagem}")
    else:
        print(f"❌ {mensagem}")
    
    print(f"\n{'='*60}\n")


def menu_interativo():
    """
    Menu interativo para testar o endpoint DELETE.
    """
    while True:
        print(f"\n{'='*60}")
        print(f"MENU - ENDPOINT DELETE /animais/{{id}}")
        print(f"{'='*60}\n")
        
        print("1. Deletar animal com confirmação")
        print("2. Deletar animal (sem confirmação)")
        print("3. Marcar como morto (alternativa recomendada)")
        print("4. Comparar DELETE vs SOFT DELETE")
        print("5. Deletar múltiplos animais")
        print("6. Deletar com verificação de dependências")
        print("0. Sair")
        
        opcao = input("\nEscolha uma opção: ")
        
        if opcao == "0":
            print("\n👋 Até logo!\n")
            break
        
        elif opcao == "1":
            animal_id = int(input("\nDigite o ID do animal: "))
            deletar_com_confirmacao(animal_id)
        
        elif opcao == "2":
            animal_id = int(input("\nDigite o ID do animal: "))
            sucesso, mensagem = deletar_animal(animal_id)
            print(f"\n{'✅' if sucesso else '❌'} {mensagem}\n")
        
        elif opcao == "3":
            animal_id = int(input("\nDigite o ID do animal: "))
            sucesso, mensagem = marcar_como_morto_alternativa(animal_id)
            print(f"\n{'✅' if sucesso else '❌'} {mensagem}\n")
        
        elif opcao == "4":
            animal_id = int(input("\nDigite o ID do animal: "))
            comparar_delete_vs_soft_delete(animal_id)
        
        elif opcao == "5":
            ids_str = input("\nDigite os IDs separados por vírgula (ex: 150,151,152): ")
            animal_ids = [int(id.strip()) for id in ids_str.split(",")]
            deletar_animais_em_lote(animal_ids)
        
        elif opcao == "6":
            animal_id = int(input("\nDigite o ID do animal: "))
            deletar_com_verificacao_dependencias(animal_id)
        
        else:
            print("\n❌ Opção inválida\n")


# ============================================
# EXEMPLOS DE USO
# ============================================

if __name__ == "__main__":
    print("\n🐷 SISTEMA DE GESTÃO DE SUÍNOS - EXEMPLOS DE USO DO ENDPOINT DELETE /animais/{id}\n")
    
    # Exemplo 1: Deletar animal simples
    print("=" * 80)
    print("Exemplo 1: Deletar animal sem dependências")
    print("=" * 80)
    sucesso, mensagem = deletar_animal(150)
    print(f"{'✅' if sucesso else '❌'} {mensagem}\n")
    
    # Exemplo 2: Tentar deletar animal inexistente
    print("=" * 80)
    print("Exemplo 2: Tentar deletar animal inexistente")
    print("=" * 80)
    sucesso, mensagem = deletar_animal(99999)
    print(f"{'✅' if sucesso else '❌'} {mensagem}\n")
    
    # Exemplo 3: Deletar com confirmação
    print("=" * 80)
    print("Exemplo 3: Deletar com confirmação do usuário")
    print("=" * 80)
    # deletar_com_confirmacao(151)  # Descomente para testar
    print("(Descomentado no código)\n")
    
    # Exemplo 4: Alternativa - Marcar como morto
    print("=" * 80)
    print("Exemplo 4: Marcar como morto (alternativa recomendada)")
    print("=" * 80)
    sucesso, mensagem = marcar_como_morto_alternativa(102)
    print(f"{'✅' if sucesso else '❌'} {mensagem}\n")
    
    # Exemplo 5: Comparar opções
    print("=" * 80)
    print("Exemplo 5: Comparar DELETE vs SOFT DELETE")
    print("=" * 80)
    comparar_delete_vs_soft_delete(102)
    
    # Exemplo 6: Deletar em lote
    print("=" * 80)
    print("Exemplo 6: Deletar múltiplos animais")
    print("=" * 80)
    # deletar_animais_em_lote([150, 151, 152])  # Descomente para testar
    print("(Descomentado no código)\n")
    
    # Exemplo 7: Verificar dependências
    print("=" * 80)
    print("Exemplo 7: Deletar com verificação de dependências")
    print("=" * 80)
    # deletar_com_verificacao_dependencias(102)  # Descomente para testar
    print("(Descomentado no código)\n")
    
    print("=" * 80)
    print("✅ Exemplos concluídos!")
    print("=" * 80)
    print("\n💡 Para usar o menu interativo, descomente a linha abaixo:\n")
    print("# menu_interativo()\n")
    
    # Descomentar para usar o menu interativo
    # menu_interativo()
