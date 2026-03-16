"""
Testes para os endpoints de animais.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.models import Animal, Lote

# Configurar banco de dados de teste em memória
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
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


def test_criar_animal_sucesso():
    """Testa a criação de um animal com dados válidos."""
    payload = {
        "identificacao_principal": "TEST-001",
        "sexo": "Fêmea",
        "data_nascimento": "2025-01-15",
        "peso_nascimento": 1.45,
        "raca": "Landrace",
        "status_vida": "Ativo"
    }

    response = client.post("/api/v1/animais", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["identificacao_principal"] == "TEST-001"
    assert data["sexo"] == "Fêmea"
    assert data["status_reprodutivo"] == "Não Aplicável"
    assert "animal_id" in data


def test_criar_animal_duplicado():
    """Testa a tentativa de criar um animal com identificação duplicada."""
    payload = {
        "identificacao_principal": "TEST-002",
        "sexo": "Macho",
        "data_nascimento": "2025-01-16",
        "status_vida": "Ativo"
    }

    # Primeira criação deve funcionar
    response1 = client.post("/api/v1/animais", json=payload)
    assert response1.status_code == 201

    # Segunda criação deve falhar (409 Conflict)
    response2 = client.post("/api/v1/animais", json=payload)
    assert response2.status_code == 409
    assert "Já existe um animal" in response2.json()["detail"]


def test_criar_animal_data_futura():
    """Testa a validação de data de nascimento futura."""
    payload = {
        "identificacao_principal": "TEST-003",
        "sexo": "Fêmea",
        "data_nascimento": "2030-01-01",  # Data futura
        "status_vida": "Ativo"
    }

    response = client.post("/api/v1/animais", json=payload)
    assert response.status_code == 422  # Unprocessable Entity


def test_criar_animal_peso_invalido():
    """Testa a validação de peso de nascimento inválido."""
    payload = {
        "identificacao_principal": "TEST-004",
        "sexo": "Macho",
        "data_nascimento": "2025-01-15",
        "peso_nascimento": 10.0,  # Peso muito alto
        "status_vida": "Ativo"
    }

    response = client.post("/api/v1/animais", json=payload)
    assert response.status_code == 422


def test_listar_animais():
    """Testa a listagem de animais."""
    response = client.get("/api/v1/animais")

    assert response.status_code == 200
    data = response.json()
    assert "pagination" in data
    assert "data" in data
    assert isinstance(data["data"], list)


def test_obter_animal_existente():
    """Testa a obtenção de um animal específico."""
    # Primeiro, criar um animal
    payload = {
        "identificacao_principal": "TEST-005",
        "sexo": "Fêmea",
        "data_nascimento": "2025-01-15",
        "status_vida": "Ativo"
    }
    create_response = client.post("/api/v1/animais", json=payload)
    animal_id = create_response.json()["animal_id"]

    # Agora, buscar o animal
    response = client.get(f"/api/v1/animais/{animal_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["animal_id"] == animal_id
    assert data["identificacao_principal"] == "TEST-005"


def test_obter_animal_inexistente():
    """Testa a busca de um animal que não existe."""
    response = client.get("/api/v1/animais/99999")

    assert response.status_code == 404
    assert "não encontrado" in response.json()["detail"]


# ============================================
# Testes para PUT /animais/{id}
# ============================================

def test_atualizar_animal_sucesso():
    """Testa a atualização de um animal com dados válidos."""
    # Criar um animal
    payload_criar = {
        "identificacao_principal": "TEST-UPDATE-001",
        "sexo": "Fêmea",
        "data_nascimento": "2024-06-15",
        "peso_nascimento": 1.5,
        "raca": "Landrace",
        "status_vida": "Ativo"
    }
    response_criar = client.post("/api/v1/animais", json=payload_criar)
    animal_id = response_criar.json()["animal_id"]

    # Atualizar o animal
    payload_atualizar = {
        "identificacao_principal": "TEST-UPDATE-001-MODIFICADO",
        "raca": "Duroc",
        "peso_nascimento": 1.8
    }
    response = client.put(f"/api/v1/animais/{animal_id}", json=payload_atualizar)

    assert response.status_code == 200
    data = response.json()
    assert data["identificacao_principal"] == "TEST-UPDATE-001-MODIFICADO"
    assert data["raca"] == "Duroc"
    assert data["peso_nascimento"] == 1.8
    # Campos não alterados devem permanecer iguais
    assert data["sexo"] == "Fêmea"
    assert data["data_nascimento"] == "2024-06-15"


def test_atualizar_animal_inexistente():
    """Testa a tentativa de atualizar um animal que não existe."""
    payload = {
        "identificacao_principal": "TESTE-INEXISTENTE"
    }
    response = client.put("/api/v1/animais/99999", json=payload)
    
    assert response.status_code == 404
    assert "não encontrado" in response.json()["detail"]


def test_atualizar_identificacao_duplicada():
    """Testa a validação de identificação duplicada ao atualizar."""
    # Criar dois animais
    payload1 = {
        "identificacao_principal": "ANIMAL-A",
        "sexo": "Macho",
        "data_nascimento": "2024-01-01",
        "status_vida": "Ativo"
    }
    payload2 = {
        "identificacao_principal": "ANIMAL-B",
        "sexo": "Fêmea",
        "data_nascimento": "2024-01-02",
        "status_vida": "Ativo"
    }
    
    response1 = client.post("/api/v1/animais", json=payload1)
    response2 = client.post("/api/v1/animais", json=payload2)
    
    animal2_id = response2.json()["animal_id"]
    
    # Tentar atualizar ANIMAL-B para ter a mesma identificação de ANIMAL-A
    payload_update = {
        "identificacao_principal": "ANIMAL-A"
    }
    response = client.put(f"/api/v1/animais/{animal2_id}", json=payload_update)
    
    assert response.status_code == 409
    assert "Já existe" in response.json()["detail"]


def test_atualizar_status_reprodutivo_femea():
    """Testa a atualização do status reprodutivo de uma fêmea."""
    # Criar uma fêmea
    payload = {
        "identificacao_principal": "FEMEA-STATUS-TEST",
        "sexo": "Fêmea",
        "data_nascimento": "2024-01-01",
        "status_vida": "Ativo"
    }
    response_criar = client.post("/api/v1/animais", json=payload)
    animal_id = response_criar.json()["animal_id"]
    
    # Atualizar status reprodutivo
    payload_update = {
        "status_reprodutivo": "Gestante"
    }
    response = client.put(f"/api/v1/animais/{animal_id}", json=payload_update)
    
    assert response.status_code == 200
    assert response.json()["status_reprodutivo"] == "Gestante"


def test_atualizar_status_reprodutivo_macho():
    """Testa que não é possível alterar status reprodutivo de macho."""
    # Criar um macho
    payload = {
        "identificacao_principal": "MACHO-STATUS-TEST",
        "sexo": "Macho",
        "data_nascimento": "2024-01-01",
        "status_vida": "Ativo"
    }
    response_criar = client.post("/api/v1/animais", json=payload)
    animal_id = response_criar.json()["animal_id"]
    
    # Tentar atualizar status reprodutivo
    payload_update = {
        "status_reprodutivo": "Gestante"
    }
    response = client.put(f"/api/v1/animais/{animal_id}", json=payload_update)
    
    assert response.status_code == 422
    assert "fêmeas" in response.json()["detail"]


def test_atualizar_status_vida():
    """Testa a atualização do status de vida."""
    # Criar um animal
    payload = {
        "identificacao_principal": "TEST-STATUS-VIDA",
        "sexo": "Macho",
        "data_nascimento": "2024-01-01",
        "status_vida": "Ativo"
    }
    response_criar = client.post("/api/v1/animais", json=payload)
    animal_id = response_criar.json()["animal_id"]
    
    # Atualizar para Vendido
    payload_update = {
        "status_vida": "Vendido"
    }
    response = client.put(f"/api/v1/animais/{animal_id}", json=payload_update)
    
    assert response.status_code == 200
    assert response.json()["status_vida"] == "Vendido"


def test_atualizar_apenas_um_campo():
    """Testa que é possível atualizar apenas um campo."""
    # Criar um animal
    payload = {
        "identificacao_principal": "TEST-CAMPO-UNICO",
        "sexo": "Fêmea",
        "data_nascimento": "2024-01-01",
        "raca": "Landrace",
        "peso_nascimento": 1.5,
        "status_vida": "Ativo"
    }
    response_criar = client.post("/api/v1/animais", json=payload)
    animal_id = response_criar.json()["animal_id"]
    
    # Atualizar apenas a raça
    payload_update = {
        "raca": "Duroc"
    }
    response = client.put(f"/api/v1/animais/{animal_id}", json=payload_update)
    
    assert response.status_code == 200
    data = response.json()
    assert data["raca"] == "Duroc"
    # Outros campos devem permanecer iguais
    assert data["identificacao_principal"] == "TEST-CAMPO-UNICO"
    assert data["peso_nascimento"] == 1.5
    assert data["data_nascimento"] == "2024-01-01"



# ============================================
# Testes para DELETE /animais/{id}
# ============================================

def test_deletar_animal_sucesso():
    """Testa a exclusão de um animal sem dependências."""
    # Criar um animal
    payload = {
        "identificacao_principal": "TEST-DELETE-001",
        "sexo": "Macho",
        "data_nascimento": "2024-01-01",
        "status_vida": "Ativo"
    }
    response_criar = client.post("/api/v1/animais", json=payload)
    animal_id = response_criar.json()["animal_id"]
    
    # Deletar o animal
    response = client.delete(f"/api/v1/animais/{animal_id}")
    
    assert response.status_code == 204
    
    # Verificar que o animal foi realmente deletado
    response_buscar = client.get(f"/api/v1/animais/{animal_id}")
    assert response_buscar.status_code == 404


def test_deletar_animal_inexistente():
    """Testa a tentativa de deletar um animal que não existe."""
    response = client.delete("/api/v1/animais/99999")
    
    assert response.status_code == 404
    assert "não encontrado" in response.json()["detail"]


def test_deletar_animal_com_filhos_como_mae():
    """Testa que não é possível deletar uma mãe que tem filhos."""
    # Criar uma mãe
    payload_mae = {
        "identificacao_principal": "MAE-COM-FILHOS",
        "sexo": "Fêmea",
        "data_nascimento": "2023-01-01",
        "status_vida": "Ativo"
    }
    response_mae = client.post("/api/v1/animais", json=payload_mae)
    mae_id = response_mae.json()["animal_id"]
    
    # Criar um filho
    payload_filho = {
        "identificacao_principal": "FILHO-DA-MAE",
        "sexo": "Macho",
        "data_nascimento": "2024-01-01",
        "mae_id": mae_id,
        "status_vida": "Ativo"
    }
    client.post("/api/v1/animais", json=payload_filho)
    
    # Tentar deletar a mãe
    response = client.delete(f"/api/v1/animais/{mae_id}")
    
    assert response.status_code == 409
    assert "mãe" in response.json()["detail"].lower()


def test_deletar_animal_com_filhos_como_pai():
    """Testa que não é possível deletar um pai que tem filhos."""
    # Criar um pai
    payload_pai = {
        "identificacao_principal": "PAI-COM-FILHOS",
        "sexo": "Macho",
        "data_nascimento": "2023-01-01",
        "status_vida": "Ativo"
    }
    response_pai = client.post("/api/v1/animais", json=payload_pai)
    pai_id = response_pai.json()["animal_id"]
    
    # Criar um filho
    payload_filho = {
        "identificacao_principal": "FILHO-DO-PAI",
        "sexo": "Fêmea",
        "data_nascimento": "2024-01-01",
        "pai_id": pai_id,
        "status_vida": "Ativo"
    }
    client.post("/api/v1/animais", json=payload_filho)
    
    # Tentar deletar o pai
    response = client.delete(f"/api/v1/animais/{pai_id}")
    
    assert response.status_code == 409
    assert "pai" in response.json()["detail"].lower()


def test_deletar_matriz_com_eventos():
    """Testa que não é possível deletar uma matriz com eventos reprodutivos."""
    # Criar uma matriz
    payload_matriz = {
        "identificacao_principal": "MATRIZ-COM-EVENTOS",
        "sexo": "Fêmea",
        "data_nascimento": "2023-01-01",
        "status_vida": "Ativo"
    }
    response_matriz = client.post("/api/v1/animais", json=payload_matriz)
    matriz_id = response_matriz.json()["animal_id"]
    
    # Criar um evento reprodutivo
    payload_evento = {
        "matriz_id": matriz_id,
        "tipo_evento": "Desmame",
        "data_evento": "2024-06-01"
    }
    client.post("/api/v1/eventos-reprodutivos", json=payload_evento)
    
    # Tentar deletar a matriz
    response = client.delete(f"/api/v1/animais/{matriz_id}")
    
    assert response.status_code == 409
    assert "evento" in response.json()["detail"].lower()


def test_deletar_reprodutor_usado_em_eventos():
    """Testa que não é possível deletar um reprodutor usado em eventos."""
    # Criar uma matriz e um reprodutor
    payload_matriz = {
        "identificacao_principal": "MATRIZ-PARA-EVENTO",
        "sexo": "Fêmea",
        "data_nascimento": "2023-01-01",
        "status_vida": "Ativo"
    }
    response_matriz = client.post("/api/v1/animais", json=payload_matriz)
    matriz_id = response_matriz.json()["animal_id"]
    
    payload_reprodutor = {
        "identificacao_principal": "REPRODUTOR-USADO",
        "sexo": "Macho",
        "data_nascimento": "2023-01-01",
        "status_vida": "Ativo"
    }
    response_reprodutor = client.post("/api/v1/animais", json=payload_reprodutor)
    reprodutor_id = response_reprodutor.json()["animal_id"]
    
    # Criar um evento de cobertura
    payload_evento = {
        "matriz_id": matriz_id,
        "tipo_evento": "Cobertura",
        "data_evento": "2024-01-15",
        "reprodutor_id": reprodutor_id
    }
    client.post("/api/v1/eventos-reprodutivos", json=payload_evento)
    
    # Tentar deletar o reprodutor
    response = client.delete(f"/api/v1/animais/{reprodutor_id}")
    
    assert response.status_code == 409
    assert "reprodutor" in response.json()["detail"].lower()


def test_deletar_animal_sem_dependencias():
    """Testa a exclusão bem-sucedida de um animal sem nenhuma dependência."""
    # Criar um animal simples
    payload = {
        "identificacao_principal": "ANIMAL-INDEPENDENTE",
        "sexo": "Macho",
        "data_nascimento": "2024-01-01",
        "status_vida": "Ativo"
    }
    response_criar = client.post("/api/v1/animais", json=payload)
    animal_id = response_criar.json()["animal_id"]
    
    # Deletar deve funcionar
    response = client.delete(f"/api/v1/animais/{animal_id}")
    assert response.status_code == 204
    
    # Confirmar que foi deletado
    response_buscar = client.get(f"/api/v1/animais/{animal_id}")
    assert response_buscar.status_code == 404
