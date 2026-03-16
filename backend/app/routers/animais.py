"""
Router para endpoints relacionados a animais.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List

from app.database import get_db
from app.models import Animal, Lote, SexoEnum
from app.schemas import (
    AnimalCreate,
    AnimalResponse,
    AnimalUpdate,
    AnimalListItem,
    PaginatedAnimalResponse,
    ErrorResponse
)

router = APIRouter(
    prefix="/animais",
    tags=["Animais"],
    responses={404: {"model": ErrorResponse}}
)


@router.post(
    "",
    response_model=AnimalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar um novo animal",
    description="Cria um novo registro de animal no sistema com validação completa dos dados.",
    responses={
        201: {
            "description": "Animal criado com sucesso",
            "model": AnimalResponse
        },
        400: {
            "description": "Dados inválidos no payload",
            "model": ErrorResponse
        },
        404: {
            "description": "Lote, mãe ou pai não encontrado",
            "model": ErrorResponse
        },
        409: {
            "description": "Já existe um animal com esta identificação",
            "model": ErrorResponse
        }
    }
)
def criar_animal(
    animal_data: AnimalCreate,
    db: Session = Depends(get_db)
):
    """
    Cria um novo animal no sistema.

    **Validações realizadas:**
    - Identificação única (não pode haver duplicatas)
    - Data de nascimento não pode ser futura
    - Peso de nascimento deve estar entre 0.5kg e 5.0kg
    - Lote, mãe e pai devem existir (se informados)
    - Mãe deve ser fêmea
    - Pai deve ser macho

    **Regras de negócio:**
    - Status reprodutivo inicial é "Não Aplicável"
    - Status de vida inicial é "Ativo"
    """

    # Validação 1: Verificar se a identificação já existe
    animal_existente = db.query(Animal).filter(
        Animal.identificacao_principal == animal_data.identificacao_principal
    ).first()

    if animal_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe um animal com a identificação '{animal_data.identificacao_principal}'"
        )

    # Validação 2: Verificar se o lote existe (se informado)
    if animal_data.lote_id:
        lote = db.query(Lote).filter(Lote.lote_id == animal_data.lote_id).first()
        if not lote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Lote com ID {animal_data.lote_id} não encontrado"
            )

    # Validação 3: Verificar se a mãe existe e é fêmea (se informada)
    if animal_data.mae_id:
        mae = db.query(Animal).filter(Animal.animal_id == animal_data.mae_id).first()
        if not mae:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Mãe com ID {animal_data.mae_id} não encontrada"
            )
        if mae.sexo != SexoEnum.FEMEA:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A mãe deve ser do sexo feminino"
            )

    # Validação 4: Verificar se o pai existe e é macho (se informado)
    if animal_data.pai_id:
        pai = db.query(Animal).filter(Animal.animal_id == animal_data.pai_id).first()
        if not pai:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pai com ID {animal_data.pai_id} não encontrado"
            )
        if pai.sexo != SexoEnum.MACHO:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="O pai deve ser do sexo masculino"
            )

    # Criar o novo animal
    novo_animal = Animal(
        identificacao_principal=animal_data.identificacao_principal,
        sexo=animal_data.sexo,
        data_nascimento=animal_data.data_nascimento,
        peso_nascimento=animal_data.peso_nascimento,
        raca=animal_data.raca,
        lote_id=animal_data.lote_id,
        mae_id=animal_data.mae_id,
        pai_id=animal_data.pai_id,
        status_vida=animal_data.status_vida
    )

    try:
        db.add(novo_animal)
        db.commit()
        db.refresh(novo_animal)
        return novo_animal

    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Erro de integridade ao criar o animal. Verifique os dados informados."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar animal: {str(e)}"
        )


@router.get(
    "",
    response_model=PaginatedAnimalResponse,
    summary="Listar animais",
    description="Retorna uma lista paginada de animais com suporte a filtros."
)
def listar_animais(
    page: int = 1,
    limit: int = 20,
    sexo: str = None,
    lote_id: int = None,
    status_vida: str = None,
    db: Session = Depends(get_db)
):
    """
    Lista animais com paginação e filtros opcionais.

    **Parâmetros de query:**
    - **page**: Número da página (padrão: 1)
    - **limit**: Itens por página (padrão: 20, máximo: 100)
    - **sexo**: Filtrar por sexo ("Macho" ou "Fêmea")
    - **lote_id**: Filtrar por ID do lote
    - **status_vida**: Filtrar por status ("Ativo", "Vendido", "Morto")
    """

    # Limitar o número máximo de itens por página
    if limit > 100:
        limit = 100

    # Construir a query base
    query = db.query(Animal)

    # Aplicar filtros
    if sexo:
        query = query.filter(Animal.sexo == sexo)
    if lote_id:
        query = query.filter(Animal.lote_id == lote_id)
    if status_vida:
        query = query.filter(Animal.status_vida == status_vida)

    # Contar o total de itens
    total_items = query.count()

    # Calcular paginação
    total_pages = (total_items + limit - 1) // limit
    offset = (page - 1) * limit

    # Buscar os animais da página atual
    animais = query.offset(offset).limit(limit).all()

    return {
        "pagination": {
            "total_items": total_items,
            "total_pages": total_pages,
            "current_page": page,
            "limit": limit
        },
        "data": animais
    }


@router.get(
    "/{animal_id}",
    response_model=AnimalResponse,
    summary="Obter um animal específico",
    description="Retorna os detalhes completos de um animal pelo ID."
)
def obter_animal(animal_id: int, db: Session = Depends(get_db)):
    """
    Retorna os dados completos de um animal específico.

    **Parâmetros de URL:**
    - **animal_id**: ID do animal a ser recuperado
    """
    animal = db.query(Animal).filter(Animal.animal_id == animal_id).first()

    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Animal com ID {animal_id} não encontrado"
        )

    return animal


@router.put(
    "/{animal_id}",
    response_model=AnimalResponse,
    summary="Atualizar um animal",
    description="Atualiza os dados de um animal existente. Campos não informados não serão alterados.",
    responses={
        200: {
            "description": "Animal atualizado com sucesso",
            "model": AnimalResponse
        },
        400: {
            "description": "Dados inválidos no payload",
            "model": ErrorResponse
        },
        404: {
            "description": "Animal não encontrado",
            "model": ErrorResponse
        },
        422: {
            "description": "Regras de negócio violadas",
            "model": ErrorResponse
        }
    }
)
def atualizar_animal(
    animal_id: int,
    animal_data: AnimalUpdate,
    db: Session = Depends(get_db)
):
    """
    Atualiza os dados de um animal existente.

    **Validações realizadas:**
    - Animal deve existir
    - Identificação deve ser única (se alterada)
    - Data de nascimento não pode ser futura
    - Peso de nascimento deve estar entre 0.5kg e 5.0kg
    - Mãe deve existir e ser fêmea (se informada)
    - Pai deve existir e ser macho (se informado)
    - Lote deve existir (se informado)
    - Status reprodutivo só pode ser alterado manualmente para fêmeas
    - Não é possível alterar o sexo de um animal

    **Campos atualizáveis:**
    - identificacao_principal
    - data_nascimento
    - peso_nascimento
    - raca
    - lote_id
    - status_vida
    - status_reprodutivo (apenas para fêmeas, com restrições)
    - mae_id
    - pai_id

    **Campos NÃO atualizáveis:**
    - animal_id (chave primária)
    - sexo (não pode ser alterado após criação)
    - created_at (timestamp de criação)
    """

    # Buscar o animal existente
    animal = db.query(Animal).filter(Animal.animal_id == animal_id).first()

    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Animal com ID {animal_id} não encontrado"
        )

    # Validação 1: Verificar se identificação é única (se foi alterada)
    if animal_data.identificacao_principal is not None:
        if animal_data.identificacao_principal != animal.identificacao_principal:
            animal_existente = db.query(Animal).filter(
                Animal.identificacao_principal == animal_data.identificacao_principal,
                Animal.animal_id != animal_id
            ).first()

            if animal_existente:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Já existe um animal com a identificação '{animal_data.identificacao_principal}'"
                )

    # Validação 2: Verificar se a mãe existe e é fêmea (se informada)
    if animal_data.mae_id is not None:
        mae = db.query(Animal).filter(Animal.animal_id == animal_data.mae_id).first()
        if not mae:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Mãe com ID {animal_data.mae_id} não encontrada"
            )
        if mae.sexo != SexoEnum.FEMEA:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A mãe deve ser do sexo feminino"
            )

    # Validação 3: Verificar se o pai existe e é macho (se informado)
    if animal_data.pai_id is not None:
        pai = db.query(Animal).filter(Animal.animal_id == animal_data.pai_id).first()
        if not pai:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pai com ID {animal_data.pai_id} não encontrado"
            )
        if pai.sexo != SexoEnum.MACHO:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="O pai deve ser do sexo masculino"
            )

    # Validação 4: Verificar se o lote existe (se informado)
    if animal_data.lote_id is not None:
        lote = db.query(Lote).filter(Lote.lote_id == animal_data.lote_id).first()
        if not lote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Lote com ID {animal_data.lote_id} não encontrado"
            )

    # Validação 5: Status reprodutivo só pode ser alterado para fêmeas
    if animal_data.status_reprodutivo is not None:
        if animal.sexo != SexoEnum.FEMEA:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Status reprodutivo só pode ser definido para fêmeas"
            )
        
        # Aviso: Alterar status reprodutivo manualmente pode causar inconsistências
        # O ideal é que o status seja atualizado apenas via eventos reprodutivos
        # Mas permitimos a alteração manual para correções

    # Atualizar apenas os campos que foram informados
    update_data = animal_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(animal, field, value)

    try:
        db.commit()
        db.refresh(animal)
        return animal

    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Erro de integridade ao atualizar o animal"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar animal: {str(e)}"
        )


@router.delete(
    "/{animal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deletar um animal",
    description="Remove um animal do sistema. Verifica dependências antes da exclusão.",
    responses={
        204: {
            "description": "Animal deletado com sucesso"
        },
        404: {
            "description": "Animal não encontrado",
            "model": ErrorResponse
        },
        409: {
            "description": "Animal possui dependências e não pode ser deletado",
            "model": ErrorResponse
        }
    }
)
def deletar_animal(animal_id: int, db: Session = Depends(get_db)):
    """
    Deleta um animal do sistema.

    **Validações realizadas:**
    - Animal deve existir
    - Animal não pode ter filhos (como mãe ou pai)
    - Animal não pode ter eventos reprodutivos registrados
    - Animal não pode ter pesagens registradas

    **Atenção:** Esta operação é destrutiva e irreversível.

    **Alternativa:** Em vez de deletar, considere alterar o `status_vida` para "Morto" ou "Vendido".

    **Parâmetros de URL:**
    - **animal_id**: ID do animal a ser deletado
    """

    # Buscar o animal
    animal = db.query(Animal).filter(Animal.animal_id == animal_id).first()

    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Animal com ID {animal_id} não encontrado"
        )

    # Validação 1: Verificar se o animal tem filhos (como mãe)
    if animal.sexo == SexoEnum.FEMEA:
        filhos_como_mae = db.query(Animal).filter(Animal.mae_id == animal_id).count()
        if filhos_como_mae > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Não é possível deletar: animal é mãe de {filhos_como_mae} outro(s) animal(is). "
                       f"Considere alterar o status_vida para 'Morto' em vez de deletar."
            )

    # Validação 2: Verificar se o animal tem filhos (como pai)
    if animal.sexo == SexoEnum.MACHO:
        filhos_como_pai = db.query(Animal).filter(Animal.pai_id == animal_id).count()
        if filhos_como_pai > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Não é possível deletar: animal é pai de {filhos_como_pai} outro(s) animal(is). "
                       f"Considere alterar o status_vida para 'Morto' em vez de deletar."
            )

    # Validação 3: Verificar se o animal tem eventos reprodutivos
    if animal.sexo == SexoEnum.FEMEA:
        eventos = db.query(EventoReprodutivo).filter(
            EventoReprodutivo.matriz_id == animal_id
        ).count()
        
        if eventos > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Não é possível deletar: animal possui {eventos} evento(s) reprodutivo(s) registrado(s). "
                       f"Delete os eventos primeiro ou altere o status_vida para 'Morto'."
            )

    # Validação 4: Verificar se o animal é reprodutor em eventos
    eventos_como_reprodutor = db.query(EventoReprodutivo).filter(
        EventoReprodutivo.reprodutor_id == animal_id
    ).count()
    
    if eventos_como_reprodutor > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Não é possível deletar: animal é reprodutor em {eventos_como_reprodutor} evento(s). "
                   f"Delete os eventos primeiro ou altere o status_vida para 'Morto'."
        )

    # Validação 5: Verificar se o animal tem pesagens registradas
    pesagens = db.query(Pesagem).filter(Pesagem.animal_id == animal_id).count()
    
    if pesagens > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Não é possível deletar: animal possui {pesagens} pesagem(ns) registrada(s). "
                   f"Delete as pesagens primeiro ou altere o status_vida para 'Morto'."
        )

    # Se passou por todas as validações, pode deletar
    try:
        db.delete(animal)
        db.commit()
        return None  # 204 No Content não retorna body

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao deletar animal: {str(e)}"
        )
