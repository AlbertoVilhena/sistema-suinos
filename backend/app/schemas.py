"""
Schemas Pydantic para validação de dados da API.
"""
from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import Optional
from decimal import Decimal
from app.models import SexoEnum, StatusVidaEnum, StatusReprodutivoEnum


class AnimalBase(BaseModel):
    """Schema base para Animal."""
    identificacao_principal: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Identificador único do animal (brinco, RFID, tatuagem)"
    )
    sexo: SexoEnum = Field(..., description="Sexo do animal")
    data_nascimento: date = Field(..., description="Data de nascimento do animal")
    peso_nascimento: Optional[Decimal] = Field(
        None,
        ge=0,
        le=999.99,
        decimal_places=2,
        description="Peso ao nascer em kg"
    )
    raca: Optional[str] = Field(None, max_length=50, description="Raça do animal")
    lote_id: Optional[int] = Field(None, gt=0, description="ID do lote ao qual pertence")
    mae_id: Optional[int] = Field(None, gt=0, description="ID da mãe")
    pai_id: Optional[int] = Field(None, gt=0, description="ID do pai")
    status_vida: StatusVidaEnum = Field(
        default=StatusVidaEnum.ATIVO,
        description="Status de vida do animal"
    )

    @field_validator('data_nascimento')
    @classmethod
    def validar_data_nascimento(cls, v: date) -> date:
        """Valida que a data de nascimento não é futura."""
        if v > date.today():
            raise ValueError('A data de nascimento não pode ser no futuro')
        return v

    @field_validator('peso_nascimento')
    @classmethod
    def validar_peso_nascimento(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        """Valida que o peso de nascimento é razoável."""
        if v is not None and (v < 0.5 or v > 5.0):
            raise ValueError('Peso de nascimento deve estar entre 0.5kg e 5.0kg')
        return v


class AnimalCreate(AnimalBase):
    """
    Schema para criação de um novo animal.
    Herda todos os campos de AnimalBase.
    """
    pass


class AnimalUpdate(BaseModel):
    """
    Schema para atualização de um animal.
    Todos os campos são opcionais.
    """
    identificacao_principal: Optional[str] = Field(None, min_length=1, max_length=50)
    sexo: Optional[SexoEnum] = None
    data_nascimento: Optional[date] = None
    peso_nascimento: Optional[Decimal] = Field(None, ge=0, le=999.99)
    raca: Optional[str] = Field(None, max_length=50)
    lote_id: Optional[int] = Field(None, gt=0)
    mae_id: Optional[int] = Field(None, gt=0)
    pai_id: Optional[int] = Field(None, gt=0)
    status_vida: Optional[StatusVidaEnum] = None
    status_reprodutivo: Optional[StatusReprodutivoEnum] = None


class AnimalResponse(AnimalBase):
    """
    Schema para resposta da API ao retornar um animal.
    Inclui campos adicionais gerados pelo banco.
    """
    animal_id: int
    status_reprodutivo: StatusReprodutivoEnum
    created_at: Optional[date] = None
    updated_at: Optional[date] = None

    class Config:
        from_attributes = True  # Permite criar a partir de modelos ORM


class AnimalListItem(BaseModel):
    """
    Schema simplificado para listagem de animais.
    Contém apenas os campos essenciais.
    """
    animal_id: int
    identificacao_principal: str
    sexo: SexoEnum
    data_nascimento: date
    lote_id: Optional[int]
    status_vida: StatusVidaEnum
    status_reprodutivo: StatusReprodutivoEnum

    class Config:
        from_attributes = True


class PaginatedAnimalResponse(BaseModel):
    """Schema para resposta paginada de listagem de animais."""
    pagination: dict
    data: list[AnimalListItem]


class ErrorResponse(BaseModel):
    """Schema para respostas de erro."""
    detail: str


# ============================================
# Schemas para Eventos Reprodutivos
# ============================================

from enum import Enum


class TipoEventoEnum(str, Enum):
    """Enum para tipos de eventos reprodutivos."""
    COBERTURA = "Cobertura"
    DIAGNOSTICO = "Diagnóstico"
    PARTO = "Parto"
    DESMAME = "Desmame"


class ResultadoDiagnosticoEnum(str, Enum):
    """Enum para resultado de diagnóstico de gestação."""
    POSITIVO = "Positivo"
    NEGATIVO = "Negativo"


class EventoReprodutivoBase(BaseModel):
    """Schema base para Evento Reprodutivo."""
    matriz_id: int = Field(..., gt=0, description="ID da matriz (fêmea)")
    tipo_evento: TipoEventoEnum = Field(..., description="Tipo de evento reprodutivo")
    data_evento: date = Field(..., description="Data em que o evento ocorreu")
    reprodutor_id: Optional[int] = Field(None, gt=0, description="ID do reprodutor (para Cobertura)")
    resultado_diagnostico: Optional[ResultadoDiagnosticoEnum] = Field(
        None,
        description="Resultado do diagnóstico (para Diagnóstico)"
    )
    total_nascidos: Optional[int] = Field(None, ge=0, description="Total de leitões nascidos (para Parto)")
    nascidos_vivos: Optional[int] = Field(None, ge=0, description="Leitões nascidos vivos (para Parto)")

    @field_validator('data_evento')
    @classmethod
    def validar_data_evento(cls, v: date) -> date:
        """Valida que a data do evento não é futura."""
        if v > date.today():
            raise ValueError('A data do evento não pode ser no futuro')
        return v

    @field_validator('nascidos_vivos')
    @classmethod
    def validar_nascidos_vivos(cls, v: Optional[int], info) -> Optional[int]:
        """Valida que nascidos vivos não é maior que total nascidos."""
        if v is not None:
            total = info.data.get('total_nascidos')
            if total is not None and v > total:
                raise ValueError('Nascidos vivos não pode ser maior que total nascidos')
        return v


class EventoReprodutivoCreate(EventoReprodutivoBase):
    """
    Schema para criação de um novo evento reprodutivo.
    Validações condicionais são feitas no endpoint.
    """
    pass


class EventoReprodutivoUpdate(BaseModel):
    """
    Schema para atualização de um evento reprodutivo.
    Todos os campos são opcionais.
    """
    tipo_evento: Optional[TipoEventoEnum] = None
    data_evento: Optional[date] = None
    reprodutor_id: Optional[int] = Field(None, gt=0)
    resultado_diagnostico: Optional[ResultadoDiagnosticoEnum] = None
    total_nascidos: Optional[int] = Field(None, ge=0)
    nascidos_vivos: Optional[int] = Field(None, ge=0)


class EventoReprodutivoResponse(EventoReprodutivoBase):
    """
    Schema para resposta da API ao retornar um evento reprodutivo.
    Inclui campos adicionais gerados pelo banco.
    """
    evento_id: int
    created_at: Optional[date] = None
    updated_at: Optional[date] = None

    class Config:
        from_attributes = True


class EventoReprodutivoListItem(BaseModel):
    """
    Schema simplificado para listagem de eventos.
    """
    evento_id: int
    tipo_evento: TipoEventoEnum
    data_evento: date
    matriz_id: int

    class Config:
        from_attributes = True
