"""
Testes para os endpoints de eventos reprodutivos.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.models import Animal, EventoReprodutivo

# Configurar banco de dados de teste em memória
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_eventos.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Criar as tabelas
Base.metadata.create_all(bind=engine)


def override_get_db():
    """Override da dependência de banco de dados para usar o banco de teste."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture
def criar_matriz():
    """Fixture para criar uma matriz de teste."""
    payload = {
        "identificacao_principal": "MATRIZ-TEST-001",
        "sexo": "Fêmea",
        "data_nascimento": "2024-01-15",
        "status_vida": "Ativo"
    }
    response = client.post("/api/v1/animais", json=payload)
    return response.json()


@pytest.fixture
def criar_reprodutor():
    """Fixture para criar um reprodutor de teste."""
    payload = {
        "identificacao_principal": "REPRODUTOR-TEST-001",
        "sexo": "Macho",
        "data_nascimento": "2023-06-10",
        "status_vida": "Ativo"
    }
    response = client.post("/api/v1/animais", json=payload)
    return response.json()


def test_criar_evento_cobertura_sucesso(criar_matriz, criar_reprodutor):
    """Testa a criação de um evento de cobertura com dados válidos."""
    matriz_id = criar_matriz["animal_id"]
    reprodutor_id = criar_reprodutor["animal_id"]
    
    payload = {
        "matriz_id": matriz_id,
        "tipo_evento": "Cobertura",
        "data_evento": "2025-06-01",
        "reprodutor_id": reprodutor_id
    }

    response = client.post("/api/v1/eventos-reprodutivos", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["tipo_evento"] == "Cobertura"
    assert data["matriz_id"] == matriz_id
    assert data["reprodutor_id"] == reprodutor_id
    assert "evento_id" in data
    
    # Verificar se o status da matriz foi atualizado
    matriz_response = client.get(f"/api/v1/animais/{matriz_id}")
    assert matriz_response.json()["status_reprodutivo"] == "Gestante"


def test_criar_evento_cobertura_sem_reprodutor(criar_matriz):
    """Testa a validação de reprodutor obrigatório para cobertura."""
    matriz_id = criar_matriz["animal_id"]
    
    payload = {
        "matriz_id": matriz_id,
        "tipo_evento": "Cobertura",
        "data_evento": "2025-06-01"
        # reprodutor_id ausente
    }

    response = client.post("/api/v1/eventos-reprodutivos", json=payload)
    assert response.status_code == 400
    assert "reprodutor_id" in response.json()["detail"]


def test_criar_evento_parto_sucesso(criar_matriz):
    """Testa a criação de um evento de parto com dados válidos."""
    matriz_id = criar_matriz["animal_id"]
    
    payload = {
        "matriz_id": matriz_id,
        "tipo_evento": "Parto",
        "data_evento": "2025-09-15",
        "total_nascidos": 14,
        "nascidos_vivos": 12
    }

    response = client.post("/api/v1/eventos-reprodutivos", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["tipo_evento"] == "Parto"
    assert data["total_nascidos"] == 14
    assert data["nascidos_vivos"] == 12
    
    # Verificar se o status da matriz foi atualizado
    matriz_response = client.get(f"/api/v1/animais/{matriz_id}")
    assert matriz_response.json()["status_reprodutivo"] == "Lactante"


def test_criar_evento_parto_nascidos_vivos_maior(criar_matriz):
    """Testa a validação de nascidos vivos maior que total nascidos."""
    matriz_id = criar_matriz["animal_id"]
    
    payload = {
        "matriz_id": matriz_id,
        "tipo_evento": "Parto",
        "data_evento": "2025-09-15",
        "total_nascidos": 10,
        "nascidos_vivos": 15  # Maior que total
    }

    response = client.post("/api/v1/eventos-reprodutivos", json=payload)
    assert response.status_code == 422
    assert "nascidos vivos" in response.json()["detail"].lower()


def test_criar_evento_diagnostico_positivo(criar_matriz):
    """Testa a criação de um evento de diagnóstico positivo."""
    matriz_id = criar_matriz["animal_id"]
    
    payload = {
        "matriz_id": matriz_id,
        "tipo_evento": "Diagnóstico",
        "data_evento": "2025-06-20",
        "resultado_diagnostico": "Positivo"
    }

    response = client.post("/api/v1/eventos-reprodutivos", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["resultado_diagnostico"] == "Positivo"
    
    # Verificar se o status da matriz foi atualizado para Gestante
    matriz_response = client.get(f"/api/v1/animais/{matriz_id}")
    assert matriz_response.json()["status_reprodutivo"] == "Gestante"


def test_criar_evento_diagnostico_negativo(criar_matriz):
    """Testa a criação de um evento de diagnóstico negativo."""
    matriz_id = criar_matriz["animal_id"]
    
    payload = {
        "matriz_id": matriz_id,
        "tipo_evento": "Diagnóstico",
        "data_evento": "2025-06-20",
        "resultado_diagnostico": "Negativo"
    }

    response = client.post("/api/v1/eventos-reprodutivos", json=payload)

    assert response.status_code == 201
    
    # Verificar se o status da matriz foi atualizado para Vazia
    matriz_response = client.get(f"/api/v1/animais/{matriz_id}")
    assert matriz_response.json()["status_reprodutivo"] == "Vazia"


def test_criar_evento_desmame_sucesso(criar_matriz):
    """Testa a criação de um evento de desmame."""
    matriz_id = criar_matriz["animal_id"]
    
    payload = {
        "matriz_id": matriz_id,
        "tipo_evento": "Desmame",
        "data_evento": "2025-10-20"
    }

    response = client.post("/api/v1/eventos-reprodutivos", json=payload)

    assert response.status_code == 201
    
    # Verificar se o status da matriz foi atualizado para Vazia
    matriz_response = client.get(f"/api/v1/animais/{matriz_id}")
    assert matriz_response.json()["status_reprodutivo"] == "Vazia"


def test_criar_evento_matriz_inexistente():
    """Testa a tentativa de criar evento para matriz inexistente."""
    payload = {
        "matriz_id": 99999,
        "tipo_evento": "Desmame",
        "data_evento": "2025-10-20"
    }

    response = client.post("/api/v1/eventos-reprodutivos", json=payload)
    assert response.status_code == 404
    assert "não encontrada" in response.json()["detail"]


def test_criar_evento_matriz_macho():
    """Testa a validação de que a matriz deve ser fêmea."""
    # Criar um animal macho
    payload_macho = {
        "identificacao_principal": "MACHO-TEST-001",
        "sexo": "Macho",
        "data_nascimento": "2024-01-15",
        "status_vida": "Ativo"
    }
    macho_response = client.post("/api/v1/animais", json=payload_macho)
    macho_id = macho_response.json()["animal_id"]
    
    # Tentar criar evento para o macho
    payload_evento = {
        "matriz_id": macho_id,
        "tipo_evento": "Desmame",
        "data_evento": "2025-10-20"
    }

    response = client.post("/api/v1/eventos-reprodutivos", json=payload_evento)
    assert response.status_code == 422
    assert "feminino" in response.json()["detail"]


def test_listar_eventos_matriz(criar_matriz, criar_reprodutor):
    """Testa a listagem de eventos de uma matriz."""
    matriz_id = criar_matriz["animal_id"]
    reprodutor_id = criar_reprodutor["animal_id"]
    
    # Criar múltiplos eventos
    eventos = [
        {
            "matriz_id": matriz_id,
            "tipo_evento": "Cobertura",
            "data_evento": "2025-06-01",
            "reprodutor_id": reprodutor_id
        },
        {
            "matriz_id": matriz_id,
            "tipo_evento": "Parto",
            "data_evento": "2025-09-15",
            "total_nascidos": 14,
            "nascidos_vivos": 12
        }
    ]
    
    for evento in eventos:
        client.post("/api/v1/eventos-reprodutivos", json=evento)
    
    # Listar eventos
    response = client.get(f"/api/v1/eventos-reprodutivos/matriz/{matriz_id}")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    assert isinstance(data, list)


def test_deletar_evento_recalcula_status(criar_matriz, criar_reprodutor):
    """Testa que deletar um evento recalcula o status da matriz."""
    matriz_id = criar_matriz["animal_id"]
    reprodutor_id = criar_reprodutor["animal_id"]
    
    # Criar evento de cobertura
    payload1 = {
        "matriz_id": matriz_id,
        "tipo_evento": "Cobertura",
        "data_evento": "2025-06-01",
        "reprodutor_id": reprodutor_id
    }
    response1 = client.post("/api/v1/eventos-reprodutivos", json=payload1)
    evento1_id = response1.json()["evento_id"]
    
    # Criar evento de parto
    payload2 = {
        "matriz_id": matriz_id,
        "tipo_evento": "Parto",
        "data_evento": "2025-09-15",
        "total_nascidos": 14,
        "nascidos_vivos": 12
    }
    response2 = client.post("/api/v1/eventos-reprodutivos", json=payload2)
    evento2_id = response2.json()["evento_id"]
    
    # Status deve ser Lactante
    matriz_response = client.get(f"/api/v1/animais/{matriz_id}")
    assert matriz_response.json()["status_reprodutivo"] == "Lactante"
    
    # Deletar o evento de parto
    delete_response = client.delete(f"/api/v1/eventos-reprodutivos/{evento2_id}")
    assert delete_response.status_code == 204
    
    # Status deve voltar para Gestante (baseado no evento de cobertura)
    matriz_response = client.get(f"/api/v1/animais/{matriz_id}")
    assert matriz_response.json()["status_reprodutivo"] == "Gestante"



# ============================================
# Testes Adicionais para DELETE /eventos-reprodutivos/{id}
# ============================================

def test_deletar_evento_inexistente():
    """Testa a tentativa de deletar um evento que não existe."""
    response = client.delete("/api/v1/eventos-reprodutivos/99999")
    
    assert response.status_code == 404
    assert "não encontrado" in response.json()["detail"]


def test_deletar_ultimo_evento_status_volta_vazia(criar_matriz):
    """Testa que ao deletar o último evento, o status volta para 'Vazia'."""
    matriz_id = criar_matriz["animal_id"]
    
    # Criar um evento de desmame
    payload_evento = {
        "matriz_id": matriz_id,
        "tipo_evento": "Desmame",
        "data_evento": "2024-06-01"
    }
    response_evento = client.post("/api/v1/eventos-reprodutivos", json=payload_evento)
    evento_id = response_evento.json()["evento_id"]
    
    # Verificar que o status é "Vazia"
    response_matriz = client.get(f"/api/v1/animais/{matriz_id}")
    assert response_matriz.json()["status_reprodutivo"] == "Vazia"
    
    # Deletar o evento
    client.delete(f"/api/v1/eventos-reprodutivos/{evento_id}")
    
    # Verificar que o status continua "Vazia" (sem eventos)
    response_matriz = client.get(f"/api/v1/animais/{matriz_id}")
    assert response_matriz.json()["status_reprodutivo"] == "Vazia"


def test_deletar_evento_recalcula_baseado_em_anterior(criar_matriz):
    """Testa que ao deletar um evento, o status é recalculado baseado no evento anterior."""
    matriz_id = criar_matriz["animal_id"]
    
    # Criar evento 1: Parto (status -> Lactante)
    payload_evento1 = {
        "matriz_id": matriz_id,
        "tipo_evento": "Parto",
        "data_evento": "2024-05-01",
        "total_nascidos": 10,
        "nascidos_vivos": 9
    }
    client.post("/api/v1/eventos-reprodutivos", json=payload_evento1)
    
    # Criar evento 2: Desmame (status -> Vazia)
    payload_evento2 = {
        "matriz_id": matriz_id,
        "tipo_evento": "Desmame",
        "data_evento": "2024-06-15"
    }
    response_evento2 = client.post("/api/v1/eventos-reprodutivos", json=payload_evento2)
    evento2_id = response_evento2.json()["evento_id"]
    
    # Verificar que o status é "Vazia"
    response_matriz = client.get(f"/api/v1/animais/{matriz_id}")
    assert response_matriz.json()["status_reprodutivo"] == "Vazia"
    
    # Deletar o evento 2 (Desmame)
    client.delete(f"/api/v1/eventos-reprodutivos/{evento2_id}")
    
    # Verificar que o status voltou para "Lactante" (baseado no evento 1)
    response_matriz = client.get(f"/api/v1/animais/{matriz_id}")
    assert response_matriz.json()["status_reprodutivo"] == "Lactante"


def test_deletar_cobertura_unico_evento(criar_matriz, criar_reprodutor):
    """Testa que ao deletar uma cobertura (único evento), status volta para Vazia."""
    matriz_id = criar_matriz["animal_id"]
    reprodutor_id = criar_reprodutor["animal_id"]
    
    # Criar evento de cobertura (status -> Gestante)
    payload_evento = {
        "matriz_id": matriz_id,
        "tipo_evento": "Cobertura",
        "data_evento": "2024-01-15",
        "reprodutor_id": reprodutor_id
    }
    response_evento = client.post("/api/v1/eventos-reprodutivos", json=payload_evento)
    evento_id = response_evento.json()["evento_id"]
    
    # Verificar que o status é "Gestante"
    response_matriz = client.get(f"/api/v1/animais/{matriz_id}")
    assert response_matriz.json()["status_reprodutivo"] == "Gestante"
    
    # Deletar o evento
    client.delete(f"/api/v1/eventos-reprodutivos/{evento_id}")
    
    # Verificar que o status voltou para "Vazia" (sem eventos)
    response_matriz = client.get(f"/api/v1/animais/{matriz_id}")
    assert response_matriz.json()["status_reprodutivo"] == "Vazia"


def test_deletar_diagnostico_positivo_recalcula(criar_matriz):
    """Testa recálculo após deletar diagnóstico positivo."""
    matriz_id = criar_matriz["animal_id"]
    
    # Criar evento de diagnóstico positivo (status -> Gestante)
    payload_evento = {
        "matriz_id": matriz_id,
        "tipo_evento": "Diagnóstico",
        "data_evento": "2024-02-01",
        "resultado_diagnostico": "Positivo"
    }
    response_evento = client.post("/api/v1/eventos-reprodutivos", json=payload_evento)
    evento_id = response_evento.json()["evento_id"]
    
    # Verificar que o status é "Gestante"
    response_matriz = client.get(f"/api/v1/animais/{matriz_id}")
    assert response_matriz.json()["status_reprodutivo"] == "Gestante"
    
    # Deletar o evento
    client.delete(f"/api/v1/eventos-reprodutivos/{evento_id}")
    
    # Verificar que o status voltou para "Vazia"
    response_matriz = client.get(f"/api/v1/animais/{matriz_id}")
    assert response_matriz.json()["status_reprodutivo"] == "Vazia"


def test_deletar_multiplos_eventos_sequencialmente(criar_matriz):
    """Testa a exclusão de múltiplos eventos em sequência."""
    matriz_id = criar_matriz["animal_id"]
    
    # Criar 2 eventos
    eventos_ids = []
    
    # Evento 1: Parto
    payload1 = {
        "matriz_id": matriz_id,
        "tipo_evento": "Parto",
        "data_evento": "2024-05-01",
        "total_nascidos": 10,
        "nascidos_vivos": 9
    }
    response1 = client.post("/api/v1/eventos-reprodutivos", json=payload1)
    eventos_ids.append(response1.json()["evento_id"])
    
    # Evento 2: Desmame
    payload2 = {
        "matriz_id": matriz_id,
        "tipo_evento": "Desmame",
        "data_evento": "2024-06-15"
    }
    response2 = client.post("/api/v1/eventos-reprodutivos", json=payload2)
    eventos_ids.append(response2.json()["evento_id"])
    
    # Deletar evento 2 (Desmame)
    response_delete1 = client.delete(f"/api/v1/eventos-reprodutivos/{eventos_ids[1]}")
    assert response_delete1.status_code == 204
    
    # Status deve ser "Lactante" (baseado no evento 1)
    response_matriz = client.get(f"/api/v1/animais/{matriz_id}")
    assert response_matriz.json()["status_reprodutivo"] == "Lactante"
    
    # Deletar evento 1 (Parto)
    response_delete2 = client.delete(f"/api/v1/eventos-reprodutivos/{eventos_ids[0]}")
    assert response_delete2.status_code == 204
    
    # Status deve ser "Vazia" (sem eventos)
    response_matriz = client.get(f"/api/v1/animais/{matriz_id}")
    assert response_matriz.json()["status_reprodutivo"] == "Vazia"



# ============================================
# Testes para PUT /eventos-reprodutivos/{id}
# ============================================

def test_atualizar_evento_sucesso(criar_matriz):
    """Testa a atualização de um evento reprodutivo."""
    matriz_id = criar_matriz["animal_id"]
    
    # Criar um evento
    payload_criar = {
        "matriz_id": matriz_id,
        "tipo_evento": "Parto",
        "data_evento": "2024-05-01",
        "total_nascidos": 10,
        "nascidos_vivos": 9
    }
    response_criar = client.post("/api/v1/eventos-reprodutivos", json=payload_criar)
    evento_id = response_criar.json()["evento_id"]
    
    # Atualizar o evento
    payload_atualizar = {
        "total_nascidos": 12,
        "nascidos_vivos": 11
    }
    response = client.put(f"/api/v1/eventos-reprodutivos/{evento_id}", json=payload_atualizar)
    
    assert response.status_code == 200
    data = response.json()
    assert data["total_nascidos"] == 12
    assert data["nascidos_vivos"] == 11
    assert data["tipo_evento"] == "Parto"  # Não alterado


def test_atualizar_evento_inexistente():
    """Testa a tentativa de atualizar um evento que não existe."""
    payload = {
        "data_evento": "2024-06-01"
    }
    response = client.put("/api/v1/eventos-reprodutivos/99999", json=payload)
    
    assert response.status_code == 404
    assert "não encontrado" in response.json()["detail"]


def test_atualizar_data_evento(criar_matriz):
    """Testa a atualização da data de um evento."""
    matriz_id = criar_matriz["animal_id"]
    
    # Criar evento
    payload_criar = {
        "matriz_id": matriz_id,
        "tipo_evento": "Desmame",
        "data_evento": "2024-06-01"
    }
    response_criar = client.post("/api/v1/eventos-reprodutivos", json=payload_criar)
    evento_id = response_criar.json()["evento_id"]
    
    # Atualizar data
    payload_atualizar = {
        "data_evento": "2024-06-15"
    }
    response = client.put(f"/api/v1/eventos-reprodutivos/{evento_id}", json=payload_atualizar)
    
    assert response.status_code == 200
    assert response.json()["data_evento"] == "2024-06-15"


def test_atualizar_tipo_evento_recalcula_status(criar_matriz, criar_reprodutor):
    """Testa que alterar o tipo de evento recalcula o status da matriz."""
    matriz_id = criar_matriz["animal_id"]
    reprodutor_id = criar_reprodutor["animal_id"]
    
    # Criar evento de Desmame (status -> Vazia)
    payload_criar = {
        "matriz_id": matriz_id,
        "tipo_evento": "Desmame",
        "data_evento": "2024-06-01"
    }
    response_criar = client.post("/api/v1/eventos-reprodutivos", json=payload_criar)
    evento_id = response_criar.json()["evento_id"]
    
    # Verificar status
    response_matriz = client.get(f"/api/v1/animais/{matriz_id}")
    assert response_matriz.json()["status_reprodutivo"] == "Vazia"
    
    # Alterar para Cobertura (status -> Gestante)
    payload_atualizar = {
        "tipo_evento": "Cobertura",
        "reprodutor_id": reprodutor_id
    }
    response = client.put(f"/api/v1/eventos-reprodutivos/{evento_id}", json=payload_atualizar)
    
    assert response.status_code == 200
    
    # Verificar que o status foi recalculado
    response_matriz = client.get(f"/api/v1/animais/{matriz_id}")
    assert response_matriz.json()["status_reprodutivo"] == "Gestante"


def test_atualizar_parto_nascidos_vivos_maior_que_total(criar_matriz):
    """Testa a validação de nascidos vivos maior que total nascidos."""
    matriz_id = criar_matriz["animal_id"]
    
    # Criar evento de Parto
    payload_criar = {
        "matriz_id": matriz_id,
        "tipo_evento": "Parto",
        "data_evento": "2024-05-01",
        "total_nascidos": 10,
        "nascidos_vivos": 9
    }
    response_criar = client.post("/api/v1/eventos-reprodutivos", json=payload_criar)
    evento_id = response_criar.json()["evento_id"]
    
    # Tentar atualizar com nascidos vivos maior que total
    payload_atualizar = {
        "nascidos_vivos": 15
    }
    response = client.put(f"/api/v1/eventos-reprodutivos/{evento_id}", json=payload_atualizar)
    
    assert response.status_code == 422
    assert "nascidos vivos" in response.json()["detail"].lower()


def test_atualizar_para_cobertura_sem_reprodutor(criar_matriz):
    """Testa a validação de reprodutor obrigatório ao alterar para Cobertura."""
    matriz_id = criar_matriz["animal_id"]
    
    # Criar evento de Desmame
    payload_criar = {
        "matriz_id": matriz_id,
        "tipo_evento": "Desmame",
        "data_evento": "2024-06-01"
    }
    response_criar = client.post("/api/v1/eventos-reprodutivos", json=payload_criar)
    evento_id = response_criar.json()["evento_id"]
    
    # Tentar alterar para Cobertura sem informar reprodutor
    payload_atualizar = {
        "tipo_evento": "Cobertura"
    }
    response = client.put(f"/api/v1/eventos-reprodutivos/{evento_id}", json=payload_atualizar)
    
    assert response.status_code == 400
    assert "reprodutor_id" in response.json()["detail"]


def test_atualizar_diagnostico_resultado(criar_matriz):
    """Testa a atualização do resultado de um diagnóstico."""
    matriz_id = criar_matriz["animal_id"]
    
    # Criar evento de Diagnóstico Positivo
    payload_criar = {
        "matriz_id": matriz_id,
        "tipo_evento": "Diagnóstico",
        "data_evento": "2024-02-01",
        "resultado_diagnostico": "Positivo"
    }
    response_criar = client.post("/api/v1/eventos-reprodutivos", json=payload_criar)
    evento_id = response_criar.json()["evento_id"]
    
    # Verificar status (Gestante)
    response_matriz = client.get(f"/api/v1/animais/{matriz_id}")
    assert response_matriz.json()["status_reprodutivo"] == "Gestante"
    
    # Alterar para Negativo
    payload_atualizar = {
        "resultado_diagnostico": "Negativo"
    }
    response = client.put(f"/api/v1/eventos-reprodutivos/{evento_id}", json=payload_atualizar)
    
    assert response.status_code == 200
    assert response.json()["resultado_diagnostico"] == "Negativo"
    
    # Verificar que o status foi recalculado (Vazia)
    response_matriz = client.get(f"/api/v1/animais/{matriz_id}")
    assert response_matriz.json()["status_reprodutivo"] == "Vazia"


def test_atualizar_observacoes(criar_matriz):
    """Testa a atualização das observações de um evento."""
    matriz_id = criar_matriz["animal_id"]
    
    # Criar evento
    payload_criar = {
        "matriz_id": matriz_id,
        "tipo_evento": "Desmame",
        "data_evento": "2024-06-01"
    }
    response_criar = client.post("/api/v1/eventos-reprodutivos", json=payload_criar)
    evento_id = response_criar.json()["evento_id"]
    
    # Adicionar observações
    payload_atualizar = {
        "observacoes": "Leitões desmamados com bom peso médio"
    }
    response = client.put(f"/api/v1/eventos-reprodutivos/{evento_id}", json=payload_atualizar)
    
    assert response.status_code == 200
    assert response.json()["observacoes"] == "Leitões desmamados com bom peso médio"


def test_atualizar_multiplos_campos(criar_matriz, criar_reprodutor):
    """Testa a atualização de múltiplos campos simultaneamente."""
    matriz_id = criar_matriz["animal_id"]
    reprodutor_id = criar_reprodutor["animal_id"]
    
    # Criar evento de Cobertura
    payload_criar = {
        "matriz_id": matriz_id,
        "tipo_evento": "Cobertura",
        "data_evento": "2024-01-15",
        "reprodutor_id": reprodutor_id
    }
    response_criar = client.post("/api/v1/eventos-reprodutivos", json=payload_criar)
    evento_id = response_criar.json()["evento_id"]
    
    # Atualizar múltiplos campos
    payload_atualizar = {
        "data_evento": "2024-01-20",
        "observacoes": "Cobertura realizada pela manhã"
    }
    response = client.put(f"/api/v1/eventos-reprodutivos/{evento_id}", json=payload_atualizar)
    
    assert response.status_code == 200
    data = response.json()
    assert data["data_evento"] == "2024-01-20"
    assert data["observacoes"] == "Cobertura realizada pela manhã"
    assert data["reprodutor_id"] == reprodutor_id  # Não alterado


def test_atualizar_evento_mais_recente_recalcula_status(criar_matriz):
    """Testa que atualizar o evento mais recente recalcula o status corretamente."""
    matriz_id = criar_matriz["animal_id"]
    
    # Criar evento 1: Parto
    payload1 = {
        "matriz_id": matriz_id,
        "tipo_evento": "Parto",
        "data_evento": "2024-05-01",
        "total_nascidos": 10,
        "nascidos_vivos": 9
    }
    client.post("/api/v1/eventos-reprodutivos", json=payload1)
    
    # Criar evento 2: Desmame (mais recente)
    payload2 = {
        "matriz_id": matriz_id,
        "tipo_evento": "Desmame",
        "data_evento": "2024-06-15"
    }
    response2 = client.post("/api/v1/eventos-reprodutivos", json=payload2)
    evento2_id = response2.json()["evento_id"]
    
    # Status deve ser Vazia
    response_matriz = client.get(f"/api/v1/animais/{matriz_id}")
    assert response_matriz.json()["status_reprodutivo"] == "Vazia"
    
    # Alterar a data do Desmame para ANTES do Parto
    payload_atualizar = {
        "data_evento": "2024-04-01"
    }
    response = client.put(f"/api/v1/eventos-reprodutivos/{evento2_id}", json=payload_atualizar)
    
    assert response.status_code == 200
    
    # Agora o Parto é o evento mais recente, status deve ser Lactante
    response_matriz = client.get(f"/api/v1/animais/{matriz_id}")
    assert response_matriz.json()["status_reprodutivo"] == "Lactante"
