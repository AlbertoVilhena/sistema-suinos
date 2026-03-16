"""
Router para endpoints relacionados a eventos reprodutivos.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List

from app.database import get_db
from app.models import Animal, EventoReprodutivo, SexoEnum, StatusReprodutivoEnum
from app.schemas import (
    EventoReprodutivoCreate,
    EventoReprodutivoResponse,
    EventoReprodutivoUpdate,
    EventoReprodutivoListItem,
    TipoEventoEnum,
    ResultadoDiagnosticoEnum,
    ErrorResponse
)

router = APIRouter(
    prefix="/eventos-reprodutivos",
    tags=["Eventos Reprodutivos"],
    responses={404: {"model": ErrorResponse}}
)


def atualizar_status_matriz(db: Session, matriz_id: int, tipo_evento: TipoEventoEnum, 
                            resultado_diagnostico: str = None):
    """
    Atualiza o status reprodutivo da matriz com base no tipo de evento.
    
    Regras de negócio:
    - Cobertura: status -> Gestante
    - Parto: status -> Lactante
    - Desmame: status -> Vazia
    - Diagnóstico Negativo: status -> Vazia
    - Diagnóstico Positivo: status -> Gestante
    """
    matriz = db.query(Animal).filter(Animal.animal_id == matriz_id).first()
    
    if not matriz:
        return
    
    if tipo_evento == TipoEventoEnum.COBERTURA:
        matriz.status_reprodutivo = StatusReprodutivoEnum.GESTANTE
    
    elif tipo_evento == TipoEventoEnum.PARTO:
        matriz.status_reprodutivo = StatusReprodutivoEnum.LACTANTE
    
    elif tipo_evento == TipoEventoEnum.DESMAME:
        matriz.status_reprodutivo = StatusReprodutivoEnum.VAZIA
    
    elif tipo_evento == TipoEventoEnum.DIAGNOSTICO:
        if resultado_diagnostico == ResultadoDiagnosticoEnum.POSITIVO:
            matriz.status_reprodutivo = StatusReprodutivoEnum.GESTANTE
        elif resultado_diagnostico == ResultadoDiagnosticoEnum.NEGATIVO:
            matriz.status_reprodutivo = StatusReprodutivoEnum.VAZIA
    
    db.commit()


@router.post(
    "",
    response_model=EventoReprodutivoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar um novo evento reprodutivo",
    description="Cria um novo evento reprodutivo e atualiza automaticamente o status da matriz.",
    responses={
        201: {
            "description": "Evento criado com sucesso",
            "model": EventoReprodutivoResponse
        },
        400: {
            "description": "Dados inválidos no payload",
            "model": ErrorResponse
        },
        404: {
            "description": "Matriz ou reprodutor não encontrado",
            "model": ErrorResponse
        },
        422: {
            "description": "Regras de negócio violadas",
            "model": ErrorResponse
        }
    }
)
def criar_evento_reprodutivo(
    evento_data: EventoReprodutivoCreate,
    db: Session = Depends(get_db)
):
    """
    Cria um novo evento reprodutivo no sistema.

    **Validações realizadas:**
    - Matriz deve existir e ser fêmea
    - Data do evento não pode ser futura
    - Campos condicionais obrigatórios baseados no tipo de evento:
      - Cobertura: requer `reprodutor_id`
      - Diagnóstico: requer `resultado_diagnostico`
      - Parto: requer `total_nascidos` e `nascidos_vivos`
    - Reprodutor deve existir e ser macho (se informado)
    - Nascidos vivos não pode ser maior que total nascidos

    **Regras de negócio automáticas:**
    - Cobertura: atualiza status da matriz para "Gestante"
    - Parto: atualiza status da matriz para "Lactante"
    - Desmame: atualiza status da matriz para "Vazia"
    - Diagnóstico Positivo: atualiza status para "Gestante"
    - Diagnóstico Negativo: atualiza status para "Vazia"
    """

    # Validação 1: Verificar se a matriz existe e é fêmea
    matriz = db.query(Animal).filter(Animal.animal_id == evento_data.matriz_id).first()
    
    if not matriz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Matriz com ID {evento_data.matriz_id} não encontrada"
        )
    
    if matriz.sexo != SexoEnum.FEMEA:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A matriz deve ser do sexo feminino"
        )

    # Validação 2: Validações condicionais baseadas no tipo de evento
    
    # Para COBERTURA: reprodutor_id é obrigatório
    if evento_data.tipo_evento == TipoEventoEnum.COBERTURA:
        if not evento_data.reprodutor_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O campo 'reprodutor_id' é obrigatório para eventos de Cobertura"
            )
        
        # Verificar se o reprodutor existe e é macho
        reprodutor = db.query(Animal).filter(Animal.animal_id == evento_data.reprodutor_id).first()
        if not reprodutor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Reprodutor com ID {evento_data.reprodutor_id} não encontrado"
            )
        
        if reprodutor.sexo != SexoEnum.MACHO:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="O reprodutor deve ser do sexo masculino"
            )
    
    # Para DIAGNÓSTICO: resultado_diagnostico é obrigatório
    elif evento_data.tipo_evento == TipoEventoEnum.DIAGNOSTICO:
        if not evento_data.resultado_diagnostico:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O campo 'resultado_diagnostico' é obrigatório para eventos de Diagnóstico"
            )
    
    # Para PARTO: total_nascidos e nascidos_vivos são obrigatórios
    elif evento_data.tipo_evento == TipoEventoEnum.PARTO:
        if evento_data.total_nascidos is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O campo 'total_nascidos' é obrigatório para eventos de Parto"
            )
        
        if evento_data.nascidos_vivos is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O campo 'nascidos_vivos' é obrigatório para eventos de Parto"
            )
        
        # Validar que nascidos_vivos <= total_nascidos
        if evento_data.nascidos_vivos > evento_data.total_nascidos:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="O número de nascidos vivos não pode ser maior que o total de nascidos"
            )

    # Criar o novo evento reprodutivo
    novo_evento = EventoReprodutivo(
        matriz_id=evento_data.matriz_id,
        tipo_evento=evento_data.tipo_evento.value,
        data_evento=evento_data.data_evento,
        reprodutor_id=evento_data.reprodutor_id,
        resultado_diagnostico=evento_data.resultado_diagnostico.value if evento_data.resultado_diagnostico else None,
        total_nascidos=evento_data.total_nascidos,
        nascidos_vivos=evento_data.nascidos_vivos
    )

    try:
        db.add(novo_evento)
        db.commit()
        db.refresh(novo_evento)
        
        # Atualizar o status reprodutivo da matriz
        atualizar_status_matriz(
            db, 
            evento_data.matriz_id, 
            evento_data.tipo_evento,
            evento_data.resultado_diagnostico
        )
        
        return novo_evento

    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Erro de integridade ao criar o evento reprodutivo"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar evento reprodutivo: {str(e)}"
        )


@router.get(
    "/matriz/{matriz_id}",
    response_model=List[EventoReprodutivoListItem],
    summary="Listar eventos de uma matriz",
    description="Retorna o histórico de eventos reprodutivos de uma matriz específica."
)
def listar_eventos_matriz(
    matriz_id: int,
    db: Session = Depends(get_db)
):
    """
    Lista todos os eventos reprodutivos de uma matriz, ordenados do mais recente para o mais antigo.

    **Parâmetros de URL:**
    - **matriz_id**: ID da matriz cujos eventos serão listados
    """
    
    # Verificar se a matriz existe
    matriz = db.query(Animal).filter(Animal.animal_id == matriz_id).first()
    if not matriz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Matriz com ID {matriz_id} não encontrada"
        )
    
    # Buscar todos os eventos da matriz
    eventos = db.query(EventoReprodutivo).filter(
        EventoReprodutivo.matriz_id == matriz_id
    ).order_by(EventoReprodutivo.data_evento.desc()).all()
    
    return eventos


@router.get(
    "/{evento_id}",
    response_model=EventoReprodutivoResponse,
    summary="Obter um evento reprodutivo específico",
    description="Retorna os detalhes completos de um evento reprodutivo pelo ID."
)
def obter_evento(evento_id: int, db: Session = Depends(get_db)):
    """
    Retorna os dados completos de um evento reprodutivo específico.

    **Parâmetros de URL:**
    - **evento_id**: ID do evento a ser recuperado
    """
    evento = db.query(EventoReprodutivo).filter(
        EventoReprodutivo.evento_id == evento_id
    ).first()

    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evento reprodutivo com ID {evento_id} não encontrado"
        )

    return evento


@router.delete(
    "/{evento_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deletar um evento reprodutivo",
    description="Remove um evento e recalcula o status da matriz baseado no evento anterior."
)
def deletar_evento(evento_id: int, db: Session = Depends(get_db)):
    """
    Deleta um evento reprodutivo e recalcula o status da matriz.

    **Atenção:** Esta operação é destrutiva. O status da matriz será recalculado
    com base no evento anterior mais recente.
    """
    
    # Buscar o evento a ser deletado
    evento = db.query(EventoReprodutivo).filter(
        EventoReprodutivo.evento_id == evento_id
    ).first()
    
    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evento reprodutivo com ID {evento_id} não encontrado"
        )
    
    matriz_id = evento.matriz_id
    
    try:
        # Deletar o evento
        db.delete(evento)
        db.commit()
        
        # Recalcular o status da matriz baseado no evento anterior
        evento_anterior = db.query(EventoReprodutivo).filter(
            EventoReprodutivo.matriz_id == matriz_id
        ).order_by(EventoReprodutivo.data_evento.desc()).first()
        
        if evento_anterior:
            # Atualizar status baseado no evento anterior
            atualizar_status_matriz(
                db,
                matriz_id,
                TipoEventoEnum(evento_anterior.tipo_evento),
                evento_anterior.resultado_diagnostico
            )
        else:
            # Se não há eventos anteriores, definir como Vazia
            matriz = db.query(Animal).filter(Animal.animal_id == matriz_id).first()
            if matriz:
                matriz.status_reprodutivo = StatusReprodutivoEnum.VAZIA
                db.commit()
        
        return None
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao deletar evento: {str(e)}"
        )


@router.delete(
    "/{evento_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deletar um evento reprodutivo",
    description="Remove um evento reprodutivo e recalcula o status da matriz baseado no último evento restante.",
    responses={
        204: {
            "description": "Evento deletado com sucesso e status da matriz recalculado"
        },
        404: {
            "description": "Evento não encontrado",
            "model": ErrorResponse
        }
    }
)
def deletar_evento_reprodutivo(evento_id: int, db: Session = Depends(get_db)):
    """
    Deleta um evento reprodutivo do sistema.

    **Lógica de Recálculo Automático:**
    Após deletar o evento, o sistema busca o último evento restante da matriz
    e atualiza o status reprodutivo baseado nele:
    
    - Se não houver mais eventos: status -> "Vazia"
    - Se o último evento for Cobertura: status -> "Gestante"
    - Se o último evento for Parto: status -> "Lactante"
    - Se o último evento for Desmame: status -> "Vazia"
    - Se o último evento for Diagnóstico Positivo: status -> "Gestante"
    - Se o último evento for Diagnóstico Negativo: status -> "Vazia"

    **Exemplo de uso:**
    ```
    DELETE /api/v1/eventos-reprodutivos/45
    ```

    **Atenção:** Esta operação é destrutiva e irreversível.

    **Parâmetros de URL:**
    - **evento_id**: ID do evento a ser deletado
    """

    # Buscar o evento
    evento = db.query(EventoReprodutivo).filter(
        EventoReprodutivo.evento_id == evento_id
    ).first()

    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evento reprodutivo com ID {evento_id} não encontrado"
        )

    # Guardar o ID da matriz antes de deletar
    matriz_id = evento.matriz_id

    try:
        # Deletar o evento
        db.delete(evento)
        db.commit()

        # Recalcular o status da matriz baseado no último evento restante
        recalcular_status_matriz(db, matriz_id)

        return None  # 204 No Content não retorna body

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao deletar evento: {str(e)}"
        )


def recalcular_status_matriz(db: Session, matriz_id: int):
    """
    Recalcula o status reprodutivo da matriz baseado no último evento registrado.
    
    Esta função é chamada após a exclusão de um evento para garantir que
    o status da matriz reflita corretamente o histórico de eventos.
    
    Args:
        db: Sessão do banco de dados
        matriz_id: ID da matriz a ter o status recalculado
    """
    # Buscar a matriz
    matriz = db.query(Animal).filter(Animal.animal_id == matriz_id).first()
    
    if not matriz:
        return
    
    # Buscar o último evento da matriz (mais recente)
    ultimo_evento = db.query(EventoReprodutivo).filter(
        EventoReprodutivo.matriz_id == matriz_id
    ).order_by(EventoReprodutivo.data_evento.desc()).first()
    
    # Se não houver mais eventos, status volta para "Vazia"
    if not ultimo_evento:
        matriz.status_reprodutivo = StatusReprodutivoEnum.VAZIA
        db.commit()
        return
    
    # Atualizar status baseado no tipo do último evento
    if ultimo_evento.tipo_evento == TipoEventoEnum.COBERTURA:
        matriz.status_reprodutivo = StatusReprodutivoEnum.GESTANTE
    
    elif ultimo_evento.tipo_evento == TipoEventoEnum.PARTO:
        matriz.status_reprodutivo = StatusReprodutivoEnum.LACTANTE
    
    elif ultimo_evento.tipo_evento == TipoEventoEnum.DESMAME:
        matriz.status_reprodutivo = StatusReprodutivoEnum.VAZIA
    
    elif ultimo_evento.tipo_evento == TipoEventoEnum.DIAGNOSTICO:
        if ultimo_evento.resultado_diagnostico == ResultadoDiagnosticoEnum.POSITIVO:
            matriz.status_reprodutivo = StatusReprodutivoEnum.GESTANTE
        else:
            matriz.status_reprodutivo = StatusReprodutivoEnum.VAZIA
    
    db.commit()



@router.put(
    "/{evento_id}",
    response_model=EventoReprodutivoResponse,
    summary="Atualizar um evento reprodutivo",
    description="Atualiza os dados de um evento reprodutivo existente e recalcula o status da matriz.",
    responses={
        200: {
            "description": "Evento atualizado com sucesso",
            "model": EventoReprodutivoResponse
        },
        404: {
            "description": "Evento não encontrado",
            "model": ErrorResponse
        },
        400: {
            "description": "Campos obrigatórios ausentes",
            "model": ErrorResponse
        },
        422: {
            "description": "Regras de negócio violadas",
            "model": ErrorResponse
        }
    }
)
def atualizar_evento_reprodutivo(
    evento_id: int,
    evento_data: EventoReprodutivoUpdate,
    db: Session = Depends(get_db)
):
    """
    Atualiza os dados de um evento reprodutivo existente.

    **Atualização Parcial:** Apenas os campos informados no payload serão atualizados.
    Os demais campos permanecerão com seus valores atuais.

    **Lógica de Recálculo Automático:**
    Após atualizar o evento, o sistema recalcula o status reprodutivo da matriz
    baseado no último evento (mais recente por data):
    
    - Se o evento atualizado for o mais recente: status baseado nele
    - Se não for o mais recente: status baseado no último evento
    - Tipos de evento e seus status:
      * Cobertura → "Gestante"
      * Parto → "Lactante"
      * Desmame → "Vazia"
      * Diagnóstico Positivo → "Gestante"
      * Diagnóstico Negativo → "Vazia"

    **Validações Implementadas:**
    1. Evento deve existir
    2. Matriz deve existir (se alterada)
    3. Matriz deve ser fêmea (se alterada)
    4. Reprodutor deve existir (se tipo for Cobertura)
    5. Campos obrigatórios conforme tipo de evento
    6. Nascidos vivos ≤ Total nascidos (se tipo for Parto)
    7. Resultado de diagnóstico obrigatório (se tipo for Diagnóstico)

    **Exemplo de uso:**
    ```
    PUT /api/v1/eventos-reprodutivos/45
    {
      "data_evento": "2024-05-20",
      "total_nascidos": 13,
      "nascidos_vivos": 12
    }
    ```

    **Parâmetros de URL:**
    - **evento_id**: ID do evento a ser atualizado

    **Campos Atualizáveis:**
    - matriz_id (int, opcional)
    - tipo_evento (string, opcional)
    - data_evento (date, opcional)
    - reprodutor_id (int, opcional)
    - total_nascidos (int, opcional)
    - nascidos_vivos (int, opcional)
    - resultado_diagnostico (string, opcional)
    - observacoes (string, opcional)
    """

    # Buscar o evento existente
    evento = db.query(EventoReprodutivo).filter(
        EventoReprodutivo.evento_id == evento_id
    ).first()

    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evento reprodutivo com ID {evento_id} não encontrado"
        )

    # Guardar valores atuais para comparação
    matriz_id_original = evento.matriz_id
    tipo_evento_original = evento.tipo_evento

    # Atualizar campos informados
    update_data = evento_data.model_dump(exclude_unset=True)

    # Se a matriz foi alterada, validar
    if 'matriz_id' in update_data and update_data['matriz_id'] != matriz_id_original:
        nova_matriz = db.query(Animal).filter(
            Animal.animal_id == update_data['matriz_id']
        ).first()

        if not nova_matriz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Matriz com ID {update_data['matriz_id']} não encontrada"
            )

        if nova_matriz.sexo != SexoEnum.FEMEA:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A matriz deve ser do sexo feminino"
            )

    # Determinar o tipo de evento (novo ou atual)
    tipo_evento_final = update_data.get('tipo_evento', tipo_evento_original)

    # Validações específicas por tipo de evento
    if tipo_evento_final == TipoEventoEnum.COBERTURA:
        # Reprodutor é obrigatório
        reprodutor_id = update_data.get('reprodutor_id', evento.reprodutor_id)
        
        if not reprodutor_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Campo 'reprodutor_id' é obrigatório para eventos de Cobertura"
            )

        # Validar se o reprodutor existe
        reprodutor = db.query(Animal).filter(Animal.animal_id == reprodutor_id).first()
        if not reprodutor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Reprodutor com ID {reprodutor_id} não encontrado"
            )

    elif tipo_evento_final == TipoEventoEnum.PARTO:
        # Total nascidos e nascidos vivos são obrigatórios
        total_nascidos = update_data.get('total_nascidos', evento.total_nascidos)
        nascidos_vivos = update_data.get('nascidos_vivos', evento.nascidos_vivos)

        if total_nascidos is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Campo 'total_nascidos' é obrigatório para eventos de Parto"
            )

        if nascidos_vivos is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Campo 'nascidos_vivos' é obrigatório para eventos de Parto"
            )

        # Validar que nascidos vivos não pode ser maior que total nascidos
        if nascidos_vivos > total_nascidos:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Nascidos vivos ({nascidos_vivos}) não pode ser maior que total nascidos ({total_nascidos})"
            )

    elif tipo_evento_final == TipoEventoEnum.DIAGNOSTICO:
        # Resultado do diagnóstico é obrigatório
        resultado = update_data.get('resultado_diagnostico', evento.resultado_diagnostico)
        
        if not resultado:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Campo 'resultado_diagnostico' é obrigatório para eventos de Diagnóstico"
            )

    # Aplicar as atualizações
    for field, value in update_data.items():
        setattr(evento, field, value)

    try:
        db.commit()
        db.refresh(evento)

        # Recalcular o status da matriz
        # Se a matriz foi alterada, recalcular ambas
        if 'matriz_id' in update_data and update_data['matriz_id'] != matriz_id_original:
            recalcular_status_matriz(db, matriz_id_original)  # Matriz antiga
            recalcular_status_matriz(db, evento.matriz_id)    # Matriz nova
        else:
            recalcular_status_matriz(db, evento.matriz_id)

        return evento

    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Erro de integridade: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar evento: {str(e)}"
        )
