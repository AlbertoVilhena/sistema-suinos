"""
Script de exemplo para usar o endpoint PUT /eventos-reprodutivos/{id}
"""
import requests
from typing import Tuple, Dict

# URL base da API
BASE_URL = "http://localhost:8000/api/v1"


def atualizar_evento(evento_id: int, **campos) -> Tuple[bool, str, Dict]:
    """
    Atualiza um evento reprodutivo com os campos fornecidos.
    
    Args:
        evento_id: ID do evento a ser atualizado
        **campos: Campos a serem atualizados (kwargs)
        
    Returns:
        (sucesso, mensagem, evento_atualizado)
    """
    url = f"{BASE_URL}/eventos-reprodutivos/{evento_id}"
    
    try:
        response = requests.put(url, json=campos)
        
        if response.status_code == 200:
            evento = response.json()
            return True, "Evento atualizado com sucesso", evento
        elif response.status_code == 404:
            return False, "Evento não encontrado", {}
        elif response.status_code == 400:
            return False, f"Campos obrigatórios ausentes: {response.json()['detail']}", {}
        elif response.status_code == 422:
            return False, f"Erro de validação: {response.json()['detail']}", {}
        else:
            return False, f"Erro HTTP {response.status_code}", {}
    
    except requests.exceptions.RequestException as e:
        return False, f"Erro de conexão: {e}", {}


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


def corrigir_dados_parto(evento_id: int, total_nascidos: int, nascidos_vivos: int):
    """
    Corrige os dados de um evento de parto.
    """
    print(f"\n{'='*60}")
    print(f"CORRIGIR DADOS DE PARTO")
    print(f"{'='*60}\n")
    
    print(f"Evento ID: {evento_id}")
    print(f"Novos valores:")
    print(f"  • Total nascidos: {total_nascidos}")
    print(f"  • Nascidos vivos: {nascidos_vivos}\n")
    
    sucesso, mensagem, evento = atualizar_evento(
        evento_id,
        total_nascidos=total_nascidos,
        nascidos_vivos=nascidos_vivos
    )
    
    if sucesso:
        print(f"✅ {mensagem}")
        print(f"\nDados atualizados:")
        print(f"  • Total nascidos: {evento['total_nascidos']}")
        print(f"  • Nascidos vivos: {evento['nascidos_vivos']}")
    else:
        print(f"❌ {mensagem}")
    
    print(f"\n{'='*60}\n")


def corrigir_data_evento(evento_id: int, matriz_id: int, nova_data: str):
    """
    Corrige a data de um evento e verifica se o status da matriz foi recalculado.
    """
    print(f"\n{'='*60}")
    print(f"CORRIGIR DATA DO EVENTO")
    print(f"{'='*60}\n")
    
    # Verificar status ANTES
    status_antes = obter_status_matriz(matriz_id)
    print(f"Status atual da matriz: {status_antes}\n")
    
    print(f"Atualizando data para: {nova_data}...")
    
    # Atualizar data
    sucesso, mensagem, evento = atualizar_evento(evento_id, data_evento=nova_data)
    
    if not sucesso:
        print(f"❌ {mensagem}\n")
        print(f"{'='*60}\n")
        return
    
    print(f"✅ Data atualizada com sucesso\n")
    
    # Verificar status DEPOIS
    status_depois = obter_status_matriz(matriz_id)
    print(f"Status após atualização: {status_depois}\n")
    
    # Comparar
    if status_antes != status_depois:
        print(f"⚠️  Status recalculado: {status_antes} → {status_depois}")
    else:
        print(f"ℹ️  Status permaneceu: {status_depois}")
    
    print(f"\n{'='*60}\n")


def alterar_resultado_diagnostico(evento_id: int, matriz_id: int, novo_resultado: str):
    """
    Altera o resultado de um diagnóstico (Positivo/Negativo).
    """
    print(f"\n{'='*60}")
    print(f"ALTERAR RESULTADO DE DIAGNÓSTICO")
    print(f"{'='*60}\n")
    
    # Status atual
    status_atual = obter_status_matriz(matriz_id)
    print(f"Status atual da matriz: {status_atual}\n")
    
    print(f"Alterando resultado para: {novo_resultado}...")
    
    # Atualizar resultado
    sucesso, mensagem, evento = atualizar_evento(
        evento_id,
        resultado_diagnostico=novo_resultado
    )
    
    if sucesso:
        print(f"✅ Resultado alterado com sucesso\n")
        
        # Novo status
        novo_status = obter_status_matriz(matriz_id)
        print(f"Novo status da matriz: {novo_status}\n")
        
        # Resumo
        print(f"📊 RESUMO:")
        print(f"   Status antes: {status_atual}")
        print(f"   Status depois: {novo_status}")
        
        if novo_resultado == "Positivo":
            print(f"   Diagnóstico Positivo → Status: Gestante")
        else:
            print(f"   Diagnóstico Negativo → Status: Vazia")
    else:
        print(f"❌ {mensagem}")
    
    print(f"\n{'='*60}\n")


def adicionar_observacoes(evento_id: int, observacoes: str):
    """
    Adiciona ou atualiza as observações de um evento.
    """
    print(f"\n{'='*60}")
    print(f"ADICIONAR OBSERVAÇÕES")
    print(f"{'='*60}\n")
    
    print(f"Evento ID: {evento_id}")
    print(f"Observações:\n\"{observacoes}\"\n")
    
    sucesso, mensagem, evento = atualizar_evento(evento_id, observacoes=observacoes)
    
    if sucesso:
        print(f"✅ Observações adicionadas com sucesso")
    else:
        print(f"❌ {mensagem}")
    
    print(f"\n{'='*60}\n")


def atualizar_evento_completo(evento_id: int, **campos):
    """
    Atualiza múltiplos campos de um evento simultaneamente.
    """
    print(f"\n{'='*60}")
    print(f"ATUALIZAR MÚLTIPLOS CAMPOS")
    print(f"{'='*60}\n")
    
    print(f"Evento ID: {evento_id}")
    print(f"\nCampos a atualizar:")
    for campo, valor in campos.items():
        print(f"  • {campo}: {valor}")
    print()
    
    sucesso, mensagem, evento = atualizar_evento(evento_id, **campos)
    
    if sucesso:
        print(f"✅ Evento atualizado com sucesso!\n")
        print(f"Dados atualizados:")
        for campo in campos.keys():
            valor = evento.get(campo)
            print(f"  • {campo}: {valor}")
    else:
        print(f"❌ {mensagem}")
    
    print(f"\n{'='*60}\n")


def alterar_tipo_evento(evento_id: int, matriz_id: int, novo_tipo: str, **campos_adicionais):
    """
    Altera o tipo de um evento e adiciona campos obrigatórios.
    """
    print(f"\n{'='*60}")
    print(f"ALTERAR TIPO DE EVENTO")
    print(f"{'='*60}\n")
    
    # Status atual
    status_antes = obter_status_matriz(matriz_id)
    print(f"Status atual: {status_antes}\n")
    
    print(f"Alterando tipo para: {novo_tipo}")
    
    # Preparar payload
    payload = {"tipo_evento": novo_tipo}
    payload.update(campos_adicionais)
    
    if campos_adicionais:
        print(f"Campos adicionais:")
        for campo, valor in campos_adicionais.items():
            print(f"  • {campo}: {valor}")
    print()
    
    # Atualizar
    sucesso, mensagem, evento = atualizar_evento(evento_id, **payload)
    
    if sucesso:
        print(f"✅ Tipo alterado com sucesso\n")
        
        # Novo status
        status_depois = obter_status_matriz(matriz_id)
        print(f"Novo status: {status_depois}\n")
        
        if status_antes != status_depois:
            print(f"⚠️  Status recalculado: {status_antes} → {status_depois}")
    else:
        print(f"❌ {mensagem}")
    
    print(f"\n{'='*60}\n")


def corrigir_evento_interativo(evento_id: int):
    """
    Interface interativa para corrigir um evento.
    """
    print(f"\n{'='*60}")
    print(f"CORRIGIR EVENTO - ID: {evento_id}")
    print(f"{'='*60}\n")
    
    # Buscar evento atual
    response = requests.get(f"{BASE_URL}/eventos-reprodutivos/{evento_id}")
    
    if response.status_code != 200:
        print("❌ Evento não encontrado\n")
        return
    
    evento = response.json()
    
    # Mostrar dados atuais
    print("📋 DADOS ATUAIS:")
    print(f"   Tipo: {evento['tipo_evento']}")
    print(f"   Data: {evento['data_evento']}")
    print(f"   Matriz ID: {evento['matriz_id']}")
    
    if evento.get('total_nascidos'):
        print(f"   Total nascidos: {evento['total_nascidos']}")
        print(f"   Nascidos vivos: {evento['nascidos_vivos']}")
    
    if evento.get('resultado_diagnostico'):
        print(f"   Resultado: {evento['resultado_diagnostico']}")
    
    if evento.get('observacoes'):
        print(f"   Observações: {evento['observacoes']}")
    
    print(f"\n{'='*60}\n")
    
    # Menu de opções
    print("O que deseja corrigir?")
    print("1. Data do evento")
    print("2. Número de leitões (Parto)")
    print("3. Resultado do diagnóstico")
    print("4. Observações")
    print("5. Múltiplos campos")
    print("0. Cancelar")
    
    opcao = input("\nEscolha uma opção: ")
    
    if opcao == "0":
        print("\n❌ Operação cancelada\n")
        return
    
    elif opcao == "1":
        nova_data = input("\nNova data (YYYY-MM-DD): ")
        matriz_id = evento['matriz_id']
        corrigir_data_evento(evento_id, matriz_id, nova_data)
    
    elif opcao == "2":
        total = int(input("\nTotal nascidos: "))
        vivos = int(input("Nascidos vivos: "))
        corrigir_dados_parto(evento_id, total, vivos)
    
    elif opcao == "3":
        resultado = input("\nResultado (Positivo/Negativo): ")
        matriz_id = evento['matriz_id']
        alterar_resultado_diagnostico(evento_id, matriz_id, resultado)
    
    elif opcao == "4":
        observacoes = input("\nObservações: ")
        adicionar_observacoes(evento_id, observacoes)
    
    elif opcao == "5":
        campos = {}
        
        if input("\nAlterar data? (s/n): ").lower() == 's':
            campos['data_evento'] = input("  Nova data (YYYY-MM-DD): ")
        
        if evento['tipo_evento'] == 'Parto':
            if input("\nAlterar número de leitões? (s/n): ").lower() == 's':
                campos['total_nascidos'] = int(input("  Total nascidos: "))
                campos['nascidos_vivos'] = int(input("  Nascidos vivos: "))
        
        if input("\nAdicionar/alterar observações? (s/n): ").lower() == 's':
            campos['observacoes'] = input("  Observações: ")
        
        if campos:
            atualizar_evento_completo(evento_id, **campos)
        else:
            print("\n❌ Nenhum campo selecionado\n")
    
    else:
        print("\n❌ Opção inválida\n")


def menu_principal():
    """
    Menu principal interativo.
    """
    while True:
        print(f"\n{'='*60}")
        print(f"MENU - ENDPOINT PUT /eventos-reprodutivos/{{id}}")
        print(f"{'='*60}\n")
        
        print("1. Corrigir dados de parto")
        print("2. Corrigir data do evento")
        print("3. Alterar resultado de diagnóstico")
        print("4. Adicionar observações")
        print("5. Atualizar múltiplos campos")
        print("6. Alterar tipo de evento")
        print("7. Corrigir evento (interativo)")
        print("0. Sair")
        
        opcao = input("\nEscolha uma opção: ")
        
        if opcao == "0":
            print("\n👋 Até logo!\n")
            break
        
        elif opcao == "1":
            evento_id = int(input("\nID do evento: "))
            total = int(input("Total nascidos: "))
            vivos = int(input("Nascidos vivos: "))
            corrigir_dados_parto(evento_id, total, vivos)
        
        elif opcao == "2":
            evento_id = int(input("\nID do evento: "))
            matriz_id = int(input("ID da matriz: "))
            nova_data = input("Nova data (YYYY-MM-DD): ")
            corrigir_data_evento(evento_id, matriz_id, nova_data)
        
        elif opcao == "3":
            evento_id = int(input("\nID do evento: "))
            matriz_id = int(input("ID da matriz: "))
            resultado = input("Resultado (Positivo/Negativo): ")
            alterar_resultado_diagnostico(evento_id, matriz_id, resultado)
        
        elif opcao == "4":
            evento_id = int(input("\nID do evento: "))
            observacoes = input("Observações: ")
            adicionar_observacoes(evento_id, observacoes)
        
        elif opcao == "5":
            evento_id = int(input("\nID do evento: "))
            
            campos = {}
            print("\nDigite os campos a atualizar (Enter para pular):")
            
            data = input("  Data (YYYY-MM-DD): ")
            if data:
                campos['data_evento'] = data
            
            total = input("  Total nascidos: ")
            if total:
                campos['total_nascidos'] = int(total)
            
            vivos = input("  Nascidos vivos: ")
            if vivos:
                campos['nascidos_vivos'] = int(vivos)
            
            obs = input("  Observações: ")
            if obs:
                campos['observacoes'] = obs
            
            if campos:
                atualizar_evento_completo(evento_id, **campos)
            else:
                print("\n❌ Nenhum campo informado\n")
        
        elif opcao == "6":
            evento_id = int(input("\nID do evento: "))
            matriz_id = int(input("ID da matriz: "))
            tipo = input("Novo tipo (Cobertura/Parto/Desmame/Diagnóstico): ")
            
            campos_adicionais = {}
            
            if tipo == "Cobertura":
                campos_adicionais['reprodutor_id'] = int(input("ID do reprodutor: "))
            elif tipo == "Parto":
                campos_adicionais['total_nascidos'] = int(input("Total nascidos: "))
                campos_adicionais['nascidos_vivos'] = int(input("Nascidos vivos: "))
            elif tipo == "Diagnóstico":
                campos_adicionais['resultado_diagnostico'] = input("Resultado (Positivo/Negativo): ")
            
            alterar_tipo_evento(evento_id, matriz_id, tipo, **campos_adicionais)
        
        elif opcao == "7":
            evento_id = int(input("\nID do evento: "))
            corrigir_evento_interativo(evento_id)
        
        else:
            print("\n❌ Opção inválida\n")


# ============================================
# EXEMPLOS DE USO
# ============================================

if __name__ == "__main__":
    print("\n🐷 SISTEMA DE GESTÃO DE SUÍNOS - EXEMPLOS DE USO DO ENDPOINT PUT /eventos-reprodutivos/{id}\n")
    
    # Exemplo 1: Corrigir dados de parto
    print("=" * 80)
    print("Exemplo 1: Corrigir dados de parto")
    print("=" * 80)
    # corrigir_dados_parto(evento_id=45, total_nascidos=13, nascidos_vivos=12)  # Descomente para testar
    print("(Descomentado no código)\n")
    
    # Exemplo 2: Corrigir data do evento
    print("=" * 80)
    print("Exemplo 2: Corrigir data do evento")
    print("=" * 80)
    # corrigir_data_evento(evento_id=46, matriz_id=102, nova_data="2024-06-20")  # Descomente para testar
    print("(Descomentado no código)\n")
    
    # Exemplo 3: Alterar resultado de diagnóstico
    print("=" * 80)
    print("Exemplo 3: Alterar resultado de diagnóstico")
    print("=" * 80)
    # alterar_resultado_diagnostico(evento_id=47, matriz_id=102, novo_resultado="Negativo")  # Descomente para testar
    print("(Descomentado no código)\n")
    
    # Exemplo 4: Adicionar observações
    print("=" * 80)
    print("Exemplo 4: Adicionar observações")
    print("=" * 80)
    # adicionar_observacoes(evento_id=48, observacoes="Leitões desmamados com peso médio de 7.2kg")  # Descomente para testar
    print("(Descomentado no código)\n")
    
    # Exemplo 5: Atualizar múltiplos campos
    print("=" * 80)
    print("Exemplo 5: Atualizar múltiplos campos")
    print("=" * 80)
    # atualizar_evento_completo(
    #     evento_id=45,
    #     total_nascidos=14,
    #     nascidos_vivos=13,
    #     observacoes="Parto assistido. Todos os leitões saudáveis."
    # )  # Descomente para testar
    print("(Descomentado no código)\n")
    
    print("=" * 80)
    print("✅ Exemplos concluídos!")
    print("=" * 80)
    print("\n💡 Para usar o menu interativo, descomente a linha abaixo:\n")
    print("# menu_principal()\n")
    
    # Descomentar para usar o menu interativo
    # menu_principal()
