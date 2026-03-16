"""
Script de exemplo para usar o endpoint GET /animais/{id}
"""
import requests
from datetime import datetime
from typing import Optional, Dict

# URL base da API
BASE_URL = "http://localhost:8000/api/v1"


def obter_animal(animal_id: int) -> Optional[Dict]:
    """
    Obtém os dados completos de um animal.
    
    Args:
        animal_id: ID do animal
        
    Returns:
        Dicionário com dados do animal ou None se não encontrado
    """
    url = f"{BASE_URL}/animais/{animal_id}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            print(f"❌ Animal com ID {animal_id} não encontrado")
        else:
            print(f"❌ Erro HTTP: {e}")
        return None
    
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro de conexão: {e}")
        return None


def exibir_ficha_completa(animal_id: int):
    """
    Exibe a ficha completa de um animal com formatação.
    """
    animal = obter_animal(animal_id)
    
    if not animal:
        return
    
    print(f"\n{'='*70}")
    print(f"FICHA DO ANIMAL - ID: {animal_id}")
    print(f"{'='*70}\n")
    
    # Informações básicas
    print("📋 INFORMAÇÕES BÁSICAS")
    print(f"   🏷️  Identificação: {animal['identificacao_principal']}")
    print(f"   🐷 Sexo: {animal['sexo']}")
    print(f"   📅 Data de Nascimento: {animal['data_nascimento']}")
    
    # Calcular idade
    nascimento = datetime.strptime(animal['data_nascimento'], '%Y-%m-%d')
    idade_dias = (datetime.now() - nascimento).days
    idade_meses = idade_dias // 30
    print(f"   🎂 Idade: {idade_dias} dias (~{idade_meses} meses)")
    
    # Informações zootécnicas
    print(f"\n📊 INFORMAÇÕES ZOOTÉCNICAS")
    print(f"   ⚖️  Peso ao Nascer: {animal.get('peso_nascimento', 'Não informado')} kg")
    print(f"   🧬 Raça: {animal.get('raca', 'Não informada')}")
    print(f"   📦 Lote: {animal.get('lote_id', 'Sem lote')}")
    print(f"   💚 Status de Vida: {animal['status_vida']}")
    
    # Informações reprodutivas (apenas para fêmeas)
    if animal['sexo'] == 'Fêmea':
        print(f"\n🔄 INFORMAÇÕES REPRODUTIVAS")
        status = animal['status_reprodutivo']
        
        # Emoji baseado no status
        status_emoji = {
            'Gestante': '🤰',
            'Lactante': '🍼',
            'Vazia': '⭕',
            'Cio': '🔥',
            'Não Aplicável': '➖'
        }
        
        print(f"   {status_emoji.get(status, '❓')} Status: {status}")
    
    # Genealogia
    if animal.get('mae_id') or animal.get('pai_id'):
        print(f"\n👨‍👩‍👧 GENEALOGIA")
        if animal.get('mae_id'):
            print(f"   👩 Mãe: ID {animal['mae_id']}")
        if animal.get('pai_id'):
            print(f"   👨 Pai: ID {animal['pai_id']}")
    
    # Auditoria
    print(f"\n📝 AUDITORIA")
    print(f"   ➕ Criado em: {animal.get('created_at', 'N/A')}")
    print(f"   ✏️  Atualizado em: {animal.get('updated_at', 'N/A')}")
    
    print(f"\n{'='*70}\n")


def verificar_status_reprodutivo(matriz_id: int):
    """
    Verifica e exibe o status reprodutivo de uma matriz.
    """
    animal = obter_animal(matriz_id)
    
    if not animal:
        return
    
    if animal['sexo'] != 'Fêmea':
        print(f"⚠️  Animal {matriz_id} não é uma fêmea")
        return
    
    status = animal['status_reprodutivo']
    
    print(f"\n{'='*60}")
    print(f"STATUS REPRODUTIVO - Matriz {animal['identificacao_principal']}")
    print(f"{'='*60}\n")
    
    # Mensagens baseadas no status
    mensagens = {
        'Gestante': '🤰 A matriz está gestante. Aguardando parto.',
        'Lactante': '🍼 A matriz está lactante. Leitões em amamentação.',
        'Vazia': '⭕ A matriz está vazia. Pronta para nova cobertura.',
        'Cio': '🔥 A matriz está no cio. Momento ideal para cobertura.',
        'Não Aplicável': '➖ Status reprodutivo não aplicável.'
    }
    
    print(f"Status Atual: {status}")
    print(f"{mensagens.get(status, '❓ Status desconhecido')}")
    print(f"\n{'='*60}\n")


def comparar_animais(animal_ids: list):
    """
    Compara múltiplos animais lado a lado.
    """
    print(f"\n{'='*80}")
    print(f"COMPARAÇÃO DE ANIMAIS")
    print(f"{'='*80}\n")
    
    animais = []
    for animal_id in animal_ids:
        animal = obter_animal(animal_id)
        if animal:
            animais.append(animal)
    
    if not animais:
        print("❌ Nenhum animal encontrado")
        return
    
    # Cabeçalho
    print(f"{'Campo':<20}", end="")
    for animal in animais:
        print(f"{animal['identificacao_principal']:<20}", end="")
    print()
    print("-" * (20 + 20 * len(animais)))
    
    # Comparar campos
    campos = [
        ('Sexo', 'sexo'),
        ('Raça', 'raca'),
        ('Status Vida', 'status_vida'),
        ('Status Reprodutivo', 'status_reprodutivo')
    ]
    
    for label, campo in campos:
        print(f"{label:<20}", end="")
        for animal in animais:
            valor = animal.get(campo, 'N/A')
            print(f"{str(valor):<20}", end="")
        print()
    
    print(f"\n{'='*80}\n")


def obter_ficha_completa_com_historico(animal_id: int):
    """
    Obtém ficha do animal + histórico reprodutivo (se for fêmea).
    """
    animal = obter_animal(animal_id)
    
    if not animal:
        return
    
    # Exibir ficha básica
    exibir_ficha_completa(animal_id)
    
    # Se for fêmea, buscar histórico reprodutivo
    if animal['sexo'] == 'Fêmea':
        print(f"{'='*70}")
        print(f"HISTÓRICO REPRODUTIVO")
        print(f"{'='*70}\n")
        
        try:
            eventos_response = requests.get(
                f"{BASE_URL}/eventos-reprodutivos/matriz/{animal_id}"
            )
            
            if eventos_response.status_code == 200:
                eventos = eventos_response.json()
                
                if eventos:
                    for i, evento in enumerate(eventos, 1):
                        tipo = evento['tipo_evento']
                        data = evento['data_evento']
                        
                        icones = {
                            'Cobertura': '🐷',
                            'Diagnóstico': '🔬',
                            'Parto': '👶',
                            'Desmame': '🍼'
                        }
                        
                        icone = icones.get(tipo, '📌')
                        print(f"{i}. {icone} {data} - {tipo}")
                else:
                    print("📋 Nenhum evento reprodutivo registrado")
            else:
                print("⚠️  Não foi possível obter histórico reprodutivo")
        
        except Exception as e:
            print(f"❌ Erro ao buscar histórico: {e}")
        
        print(f"\n{'='*70}\n")


def listar_descendentes(mae_id: int):
    """
    Lista todos os descendentes de uma matriz.
    Nota: Requer endpoint de listagem com filtro por mae_id.
    """
    print(f"\n{'='*60}")
    print(f"DESCENDENTES DA MATRIZ ID: {mae_id}")
    print(f"{'='*60}\n")
    
    # Buscar animais filtrando por mae_id
    # Nota: Este exemplo assume que o endpoint GET /animais suporta filtro por mae_id
    # Se não suportar, seria necessário buscar todos e filtrar localmente
    
    try:
        response = requests.get(f"{BASE_URL}/animais?mae_id={mae_id}")
        
        if response.status_code == 200:
            data = response.json()
            animais = data.get('data', [])
            
            if animais:
                print(f"Total de descendentes: {len(animais)}\n")
                for animal in animais:
                    print(f"   🐷 {animal['identificacao_principal']} - "
                          f"{animal['sexo']} - {animal['status_vida']}")
            else:
                print("📋 Nenhum descendente registrado")
        else:
            print("⚠️  Endpoint não suporta filtro por mae_id")
    
    except Exception as e:
        print(f"❌ Erro: {e}")
    
    print(f"\n{'='*60}\n")


def gerar_resumo_dashboard(animal_id: int) -> Dict:
    """
    Gera um resumo dos dados do animal para exibição em dashboard.
    """
    animal = obter_animal(animal_id)
    
    if not animal:
        return {}
    
    # Calcular idade
    nascimento = datetime.strptime(animal['data_nascimento'], '%Y-%m-%d')
    idade_dias = (datetime.now() - nascimento).days
    
    resumo = {
        'id': animal['animal_id'],
        'identificacao': animal['identificacao_principal'],
        'sexo': animal['sexo'],
        'idade_dias': idade_dias,
        'idade_meses': idade_dias // 30,
        'raca': animal.get('raca', 'Não informada'),
        'status_vida': animal['status_vida'],
        'status_reprodutivo': animal.get('status_reprodutivo'),
        'tem_mae': animal.get('mae_id') is not None,
        'tem_pai': animal.get('pai_id') is not None,
        'em_lote': animal.get('lote_id') is not None
    }
    
    return resumo


# ============================================
# EXEMPLOS DE USO
# ============================================

if __name__ == "__main__":
    print("\n🐷 SISTEMA DE GESTÃO DE SUÍNOS - EXEMPLOS DE USO DO ENDPOINT GET /animais/{id}\n")
    
    # Exemplo 1: Exibir ficha completa
    print("=" * 80)
    print("Exemplo 1: Exibir ficha completa de um animal")
    print("=" * 80)
    exibir_ficha_completa(102)
    
    # Exemplo 2: Verificar status reprodutivo
    print("\n" + "=" * 80)
    print("Exemplo 2: Verificar status reprodutivo de uma matriz")
    print("=" * 80)
    verificar_status_reprodutivo(102)
    
    # Exemplo 3: Comparar múltiplos animais
    print("\n" + "=" * 80)
    print("Exemplo 3: Comparar múltiplos animais")
    print("=" * 80)
    comparar_animais([102, 103, 104])
    
    # Exemplo 4: Ficha completa com histórico reprodutivo
    print("\n" + "=" * 80)
    print("Exemplo 4: Ficha completa com histórico reprodutivo")
    print("=" * 80)
    obter_ficha_completa_com_historico(102)
    
    # Exemplo 5: Gerar resumo para dashboard
    print("\n" + "=" * 80)
    print("Exemplo 5: Gerar resumo para dashboard")
    print("=" * 80)
    resumo = gerar_resumo_dashboard(102)
    if resumo:
        print("\n📊 Resumo gerado:")
        for chave, valor in resumo.items():
            print(f"   {chave}: {valor}")
        print()
    
    print("\n✅ Exemplos concluídos!\n")
