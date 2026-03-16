"""
Script de exemplo para usar o endpoint GET /eventos-reprodutivos/matriz/{id}
"""
import requests
from datetime import datetime
from typing import List, Dict

# URL base da API
BASE_URL = "http://localhost:8000/api/v1"


def obter_historico_matriz(matriz_id: int) -> List[Dict]:
    """
    Obtém o histórico completo de eventos reprodutivos de uma matriz.
    
    Args:
        matriz_id: ID da matriz
        
    Returns:
        Lista de eventos ordenados do mais recente para o mais antigo
    """
    url = f"{BASE_URL}/eventos-reprodutivos/matriz/{matriz_id}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            print(f"❌ Matriz com ID {matriz_id} não encontrada")
        else:
            print(f"❌ Erro HTTP: {e}")
        return []
    
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro de conexão: {e}")
        return []


def exibir_ficha_reprodutiva(matriz_id: int):
    """
    Exibe a ficha reprodutiva completa de uma matriz.
    """
    print(f"\n{'='*60}")
    print(f"FICHA REPRODUTIVA - MATRIZ ID: {matriz_id}")
    print(f"{'='*60}\n")
    
    # Buscar dados da matriz
    try:
        matriz_response = requests.get(f"{BASE_URL}/animais/{matriz_id}")
        matriz_response.raise_for_status()
        matriz = matriz_response.json()
        
        print(f"Identificação: {matriz['identificacao_principal']}")
        print(f"Raça: {matriz.get('raca', 'Não informada')}")
        print(f"Data de Nascimento: {matriz['data_nascimento']}")
        print(f"Status Atual: {matriz['status_reprodutivo']}")
        print(f"\n{'-'*60}\n")
        
    except requests.exceptions.RequestException:
        print("⚠️ Não foi possível obter dados da matriz\n")
    
    # Buscar histórico de eventos
    eventos = obter_historico_matriz(matriz_id)
    
    if not eventos:
        print("📋 Nenhum evento reprodutivo registrado para esta matriz.\n")
        return
    
    print(f"📋 HISTÓRICO DE EVENTOS ({len(eventos)} eventos):\n")
    
    for i, evento in enumerate(eventos, 1):
        tipo = evento['tipo_evento']
        data = evento['data_evento']
        
        # Ícones para cada tipo de evento
        icones = {
            'Cobertura': '🐷',
            'Diagnóstico': '🔬',
            'Parto': '👶',
            'Desmame': '🍼'
        }
        
        icone = icones.get(tipo, '📌')
        print(f"{i}. {icone} {data} - {tipo}")
    
    print(f"\n{'='*60}\n")


def calcular_metricas_produtividade(matriz_id: int):
    """
    Calcula métricas de produtividade baseadas no histórico.
    """
    eventos = obter_historico_matriz(matriz_id)
    
    if not eventos:
        print("❌ Não há eventos suficientes para calcular métricas.\n")
        return
    
    print(f"\n{'='*60}")
    print(f"MÉTRICAS DE PRODUTIVIDADE - MATRIZ ID: {matriz_id}")
    print(f"{'='*60}\n")
    
    # Contar eventos por tipo
    contagem = {}
    for evento in eventos:
        tipo = evento['tipo_evento']
        contagem[tipo] = contagem.get(tipo, 0) + 1
    
    print("📊 Contagem de Eventos:")
    for tipo, qtd in contagem.items():
        print(f"   {tipo}: {qtd}")
    
    # Calcular intervalo entre partos
    partos = [e for e in eventos if e['tipo_evento'] == 'Parto']
    
    if len(partos) >= 2:
        print(f"\n🐷 Partos Registrados: {len(partos)}")
        
        intervalos = []
        for i in range(len(partos) - 1):
            data1 = datetime.strptime(partos[i]['data_evento'], '%Y-%m-%d')
            data2 = datetime.strptime(partos[i+1]['data_evento'], '%Y-%m-%d')
            intervalo_dias = abs((data1 - data2).days)
            intervalos.append(intervalo_dias)
        
        intervalo_medio = sum(intervalos) / len(intervalos)
        print(f"   Intervalo médio entre partos: {intervalo_medio:.1f} dias")
    
    print(f"\n{'='*60}\n")


def listar_ultimos_eventos(matriz_id: int, limite: int = 5):
    """
    Lista os últimos N eventos de uma matriz.
    """
    eventos = obter_historico_matriz(matriz_id)
    
    if not eventos:
        print(f"❌ Nenhum evento encontrado para a matriz {matriz_id}\n")
        return
    
    print(f"\n📋 Últimos {min(limite, len(eventos))} eventos da matriz {matriz_id}:\n")
    
    for evento in eventos[:limite]:
        print(f"   {evento['data_evento']} - {evento['tipo_evento']}")
    
    print()


def comparar_matrizes(matriz_ids: List[int]):
    """
    Compara o histórico de múltiplas matrizes.
    """
    print(f"\n{'='*60}")
    print(f"COMPARAÇÃO DE MATRIZES")
    print(f"{'='*60}\n")
    
    for matriz_id in matriz_ids:
        eventos = obter_historico_matriz(matriz_id)
        partos = [e for e in eventos if e['tipo_evento'] == 'Parto']
        
        print(f"Matriz {matriz_id}:")
        print(f"   Total de eventos: {len(eventos)}")
        print(f"   Partos: {len(partos)}")
        print()


# ============================================
# EXEMPLOS DE USO
# ============================================

if __name__ == "__main__":
    print("\n🐷 SISTEMA DE GESTÃO DE SUÍNOS - EXEMPLOS DE USO\n")
    
    # Exemplo 1: Exibir ficha reprodutiva completa
    print("Exemplo 1: Exibir ficha reprodutiva completa")
    exibir_ficha_reprodutiva(102)
    
    # Exemplo 2: Calcular métricas de produtividade
    print("\nExemplo 2: Calcular métricas de produtividade")
    calcular_metricas_produtividade(102)
    
    # Exemplo 3: Listar últimos 3 eventos
    print("\nExemplo 3: Listar últimos 3 eventos")
    listar_ultimos_eventos(102, limite=3)
    
    # Exemplo 4: Comparar múltiplas matrizes
    print("\nExemplo 4: Comparar múltiplas matrizes")
    comparar_matrizes([102, 103, 104])
    
    print("\n✅ Exemplos concluídos!\n")
