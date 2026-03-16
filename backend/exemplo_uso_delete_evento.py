"""
Script de exemplo para usar o endpoint DELETE /eventos-reprodutivos/{id}
"""
import requests
from typing import Tuple, List, Dict

# URL base da API
BASE_URL = "http://localhost:8000/api/v1"


def deletar_evento(evento_id: int) -> Tuple[bool, str]:
    """
    Deleta um evento reprodutivo com tratamento completo de erros.
    
    Args:
        evento_id: ID do evento a ser deletado
        
    Returns:
        (sucesso, mensagem)
    """
    url = f"{BASE_URL}/eventos-reprodutivos/{evento_id}"
    
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


def obter_evento(evento_id: int) -> Tuple[bool, Dict]:
    """
    Busca informações de um evento.
    
    Returns:
        (existe, dados_do_evento)
    """
    url = f"{BASE_URL}/eventos-reprodutivos/{evento_id}"
    
    try:
        response = requests.get(url)
        
        if response.status_code == 200:
            return True, response.json()
        else:
            return False, {}
    
    except requests.exceptions.RequestException:
        return False, {}


def obter_status_matriz(matriz_id: int) -> str:
    """
    Busca o status reprodutivo atual de uma matriz.
    
    Returns:
        Status reprodutivo ou "Desconhecido"
    """
    url = f"{BASE_URL}/animais/{matriz_id}"
    
    try:
        response = requests.get(url)
        
        if response.status_code == 200:
            return response.json()['status_reprodutivo']
        else:
            return "Desconhecido"
    
    except requests.exceptions.RequestException:
        return "Desconhecido"


def deletar_e_verificar_status(evento_id: int, matriz_id: int):
    """
    Deleta um evento e mostra o status antes e depois do recálculo.
    """
    print(f"\n{'='*60}")
    print(f"DELETAR EVENTO COM VERIFICAÇÃO DE STATUS")
    print(f"{'='*60}\n")
    
    # Verificar status ANTES da exclusão
    print(f"1. Verificando status atual da matriz...")
    status_antes = obter_status_matriz(matriz_id)
    print(f"   Status ANTES: {status_antes}\n")
    
    # Deletar o evento
    print(f"2. Deletando evento ID {evento_id}...")
    sucesso, mensagem = deletar_evento(evento_id)
    
    if not sucesso:
        print(f"   ❌ Falha: {mensagem}\n")
        print(f"{'='*60}\n")
        return
    
    print(f"   ✅ {mensagem}\n")
    
    # Verificar status DEPOIS da exclusão
    print(f"3. Verificando status recalculado...")
    status_depois = obter_status_matriz(matriz_id)
    print(f"   Status DEPOIS: {status_depois}\n")
    
    # Comparar
    if status_antes != status_depois:
        print(f"✅ Status recalculado: {status_antes} → {status_depois}")
    else:
        print(f"ℹ️  Status permaneceu: {status_depois}")
    
    print(f"\n{'='*60}\n")


def deletar_com_confirmacao(evento_id: int):
    """
    Deleta um evento após mostrar informações e solicitar confirmação.
    """
    print(f"\n{'='*60}")
    print(f"DELETAR EVENTO - ID: {evento_id}")
    print(f"{'='*60}\n")
    
    # Verificar se o evento existe
    existe, evento = obter_evento(evento_id)
    
    if not existe:
        print("❌ Evento não encontrado\n")
        print(f"{'='*60}\n")
        return
    
    # Mostrar informações do evento
    print("📋 INFORMAÇÕES DO EVENTO:")
    print(f"   ID: {evento.get('evento_id', 'N/A')}")
    print(f"   Tipo: {evento.get('tipo_evento', 'N/A')}")
    print(f"   Data: {evento.get('data_evento', 'N/A')}")
    print(f"   Matriz ID: {evento.get('matriz_id', 'N/A')}")
    
    # Mostrar status atual da matriz
    matriz_id = evento.get('matriz_id')
    if matriz_id:
        status_atual = obter_status_matriz(matriz_id)
        print(f"\n   Status atual da matriz: {status_atual}")
    
    print(f"\n⚠️  ATENÇÃO:")
    print(f"   • Esta operação é IRREVERSÍVEL!")
    print(f"   • O status da matriz será RECALCULADO automaticamente\n")
    
    # Solicitar confirmação
    confirmacao = input("Digite 'CONFIRMAR' para deletar: ")
    
    if confirmacao != "CONFIRMAR":
        print("\n❌ Operação cancelada\n")
        print(f"{'='*60}\n")
        return
    
    # Deletar e verificar recálculo
    if matriz_id:
        deletar_e_verificar_status(evento_id, matriz_id)
    else:
        sucesso, mensagem = deletar_evento(evento_id)
        print(f"\n{'✅' if sucesso else '❌'} {mensagem}\n")
        print(f"{'='*60}\n")


def deletar_eventos_em_lote(evento_ids: List[int]) -> Dict:
    """
    Tenta deletar múltiplos eventos.
    
    Returns:
        Dicionário com resultados de sucesso e falha
    """
    print(f"\n{'='*60}")
    print(f"DELETAR EVENTOS EM LOTE")
    print(f"{'='*60}\n")
    
    print(f"Total de eventos a deletar: {len(evento_ids)}\n")
    
    resultados = {
        'sucesso': [],
        'falha': []
    }
    
    for i, evento_id in enumerate(evento_ids, 1):
        print(f"[{i}/{len(evento_ids)}] Deletando evento ID {evento_id}...", end=" ")
        
        sucesso, mensagem = deletar_evento(evento_id)
        
        if sucesso:
            print("✅")
            resultados['sucesso'].append(evento_id)
        else:
            print(f"❌")
            resultados['falha'].append({
                'id': evento_id,
                'motivo': mensagem
            })
    
    print(f"\n{'='*60}")
    print(f"RESULTADO:")
    print(f"{'='*60}\n")
    
    print(f"✅ Sucesso: {len(resultados['sucesso'])} eventos deletados")
    for evento_id in resultados['sucesso']:
        print(f"   - ID {evento_id}")
    
    if resultados['falha']:
        print(f"\n❌ Falha: {len(resultados['falha'])} eventos não deletados")
        for item in resultados['falha']:
            print(f"   - ID {item['id']}: {item['motivo']}")
    
    print(f"\n{'='*60}\n")
    
    return resultados


def corrigir_evento_incorreto(evento_id: int, matriz_id: int, evento_correto: dict):
    """
    Deleta um evento incorreto e cria o evento correto.
    """
    print(f"\n{'='*60}")
    print(f"CORRIGIR EVENTO INCORRETO")
    print(f"{'='*60}\n")
    
    # Verificar status antes
    status_antes = obter_status_matriz(matriz_id)
    print(f"Status atual da matriz: {status_antes}\n")
    
    # Deletar o evento incorreto
    print(f"1. Deletando evento incorreto (ID {evento_id})...")
    sucesso, mensagem = deletar_evento(evento_id)
    
    if not sucesso:
        print(f"   ❌ {mensagem}\n")
        print(f"{'='*60}\n")
        return
    
    print(f"   ✅ Evento deletado\n")
    
    # Verificar status após exclusão
    status_apos_delete = obter_status_matriz(matriz_id)
    print(f"   Status após exclusão: {status_apos_delete}\n")
    
    # Criar o evento correto
    print(f"2. Criando evento correto...")
    response = requests.post(
        f"{BASE_URL}/eventos-reprodutivos",
        json=evento_correto
    )
    
    if response.status_code == 201:
        novo_evento = response.json()
        print(f"   ✅ Evento criado (ID {novo_evento['evento_id']})\n")
        
        # Verificar status final
        status_final = obter_status_matriz(matriz_id)
        print(f"3. Status final da matriz: {status_final}\n")
        
        # Resumo
        print(f"📊 RESUMO:")
        print(f"   Status inicial: {status_antes}")
        print(f"   Status após delete: {status_apos_delete}")
        print(f"   Status final: {status_final}")
    else:
        print(f"   ❌ Erro ao criar evento: {response.json().get('detail', 'Erro desconhecido')}\n")
    
    print(f"\n{'='*60}\n")


def listar_e_deletar_eventos_matriz(matriz_id: int):
    """
    Lista todos os eventos de uma matriz e permite deletar seletivamente.
    """
    print(f"\n{'='*60}")
    print(f"LISTAR E DELETAR EVENTOS - Matriz ID: {matriz_id}")
    print(f"{'='*60}\n")
    
    # Listar eventos
    response = requests.get(f"{BASE_URL}/eventos-reprodutivos/matriz/{matriz_id}")
    
    if response.status_code != 200:
        print("❌ Erro ao listar eventos\n")
        return
    
    eventos = response.json()
    
    if not eventos:
        print("ℹ️  Nenhum evento encontrado para esta matriz\n")
        return
    
    # Mostrar status atual
    status_atual = obter_status_matriz(matriz_id)
    print(f"Status atual da matriz: {status_atual}\n")
    
    # Mostrar eventos
    print(f"📋 EVENTOS REGISTRADOS ({len(eventos)}):\n")
    for i, evento in enumerate(eventos, 1):
        print(f"{i}. ID: {evento['evento_id']}")
        print(f"   Tipo: {evento['tipo_evento']}")
        print(f"   Data: {evento['data_evento']}")
        if evento.get('resultado_diagnostico'):
            print(f"   Resultado: {evento['resultado_diagnostico']}")
        print()
    
    # Perguntar qual deletar
    escolha = input("Digite o número do evento para deletar (ou 0 para cancelar): ")
    
    try:
        indice = int(escolha) - 1
        
        if indice == -1:
            print("\n❌ Operação cancelada\n")
            return
        
        if 0 <= indice < len(eventos):
            evento_id = eventos[indice]['evento_id']
            deletar_e_verificar_status(evento_id, matriz_id)
        else:
            print("\n❌ Número inválido\n")
    
    except ValueError:
        print("\n❌ Entrada inválida\n")


def menu_interativo():
    """
    Menu interativo para testar o endpoint DELETE.
    """
    while True:
        print(f"\n{'='*60}")
        print(f"MENU - ENDPOINT DELETE /eventos-reprodutivos/{{id}}")
        print(f"{'='*60}\n")
        
        print("1. Deletar evento com verificação de status")
        print("2. Deletar evento com confirmação")
        print("3. Deletar evento (sem confirmação)")
        print("4. Deletar múltiplos eventos")
        print("5. Corrigir evento incorreto")
        print("6. Listar e deletar eventos de uma matriz")
        print("0. Sair")
        
        opcao = input("\nEscolha uma opção: ")
        
        if opcao == "0":
            print("\n👋 Até logo!\n")
            break
        
        elif opcao == "1":
            evento_id = int(input("\nDigite o ID do evento: "))
            matriz_id = int(input("Digite o ID da matriz: "))
            deletar_e_verificar_status(evento_id, matriz_id)
        
        elif opcao == "2":
            evento_id = int(input("\nDigite o ID do evento: "))
            deletar_com_confirmacao(evento_id)
        
        elif opcao == "3":
            evento_id = int(input("\nDigite o ID do evento: "))
            sucesso, mensagem = deletar_evento(evento_id)
            print(f"\n{'✅' if sucesso else '❌'} {mensagem}\n")
        
        elif opcao == "4":
            ids_str = input("\nDigite os IDs separados por vírgula (ex: 45,46,47): ")
            evento_ids = [int(id.strip()) for id in ids_str.split(",")]
            deletar_eventos_em_lote(evento_ids)
        
        elif opcao == "5":
            evento_id = int(input("\nDigite o ID do evento incorreto: "))
            matriz_id = int(input("Digite o ID da matriz: "))
            
            print("\nDados do evento correto:")
            tipo = input("  Tipo (Cobertura/Parto/Desmame/Diagnóstico): ")
            data = input("  Data (YYYY-MM-DD): ")
            
            evento_correto = {
                "matriz_id": matriz_id,
                "tipo_evento": tipo,
                "data_evento": data
            }
            
            # Campos adicionais conforme o tipo
            if tipo == "Parto":
                evento_correto["total_nascidos"] = int(input("  Total nascidos: "))
                evento_correto["nascidos_vivos"] = int(input("  Nascidos vivos: "))
            elif tipo == "Cobertura":
                evento_correto["reprodutor_id"] = int(input("  ID do reprodutor: "))
            elif tipo == "Diagnóstico":
                evento_correto["resultado_diagnostico"] = input("  Resultado (Positivo/Negativo): ")
            
            corrigir_evento_incorreto(evento_id, matriz_id, evento_correto)
        
        elif opcao == "6":
            matriz_id = int(input("\nDigite o ID da matriz: "))
            listar_e_deletar_eventos_matriz(matriz_id)
        
        else:
            print("\n❌ Opção inválida\n")


# ============================================
# EXEMPLOS DE USO
# ============================================

if __name__ == "__main__":
    print("\n🐷 SISTEMA DE GESTÃO DE SUÍNOS - EXEMPLOS DE USO DO ENDPOINT DELETE /eventos-reprodutivos/{id}\n")
    
    # Exemplo 1: Deletar evento simples
    print("=" * 80)
    print("Exemplo 1: Deletar evento sem verificação")
    print("=" * 80)
    sucesso, mensagem = deletar_evento(45)
    print(f"{'✅' if sucesso else '❌'} {mensagem}\n")
    
    # Exemplo 2: Tentar deletar evento inexistente
    print("=" * 80)
    print("Exemplo 2: Tentar deletar evento inexistente")
    print("=" * 80)
    sucesso, mensagem = deletar_evento(99999)
    print(f"{'✅' if sucesso else '❌'} {mensagem}\n")
    
    # Exemplo 3: Deletar com verificação de status
    print("=" * 80)
    print("Exemplo 3: Deletar com verificação de recálculo de status")
    print("=" * 80)
    # deletar_e_verificar_status(evento_id=45, matriz_id=102)  # Descomente para testar
    print("(Descomentado no código)\n")
    
    # Exemplo 4: Deletar com confirmação
    print("=" * 80)
    print("Exemplo 4: Deletar com confirmação do usuário")
    print("=" * 80)
    # deletar_com_confirmacao(45)  # Descomente para testar
    print("(Descomentado no código)\n")
    
    # Exemplo 5: Deletar em lote
    print("=" * 80)
    print("Exemplo 5: Deletar múltiplos eventos")
    print("=" * 80)
    # deletar_eventos_em_lote([45, 46, 47])  # Descomente para testar
    print("(Descomentado no código)\n")
    
    # Exemplo 6: Corrigir evento incorreto
    print("=" * 80)
    print("Exemplo 6: Corrigir evento incorreto")
    print("=" * 80)
    # evento_correto = {
    #     "matriz_id": 102,
    #     "tipo_evento": "Parto",
    #     "data_evento": "2024-05-15",
    #     "total_nascidos": 12,
    #     "nascidos_vivos": 11
    # }
    # corrigir_evento_incorreto(45, 102, evento_correto)  # Descomente para testar
    print("(Descomentado no código)\n")
    
    print("=" * 80)
    print("✅ Exemplos concluídos!")
    print("=" * 80)
    print("\n💡 Para usar o menu interativo, descomente a linha abaixo:\n")
    print("# menu_interativo()\n")
    
    # Descomentar para usar o menu interativo
    # menu_interativo()
