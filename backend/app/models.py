"""
Modelos SQLAlchemy para as tabelas do banco de dados.
"""
from sqlalchemy import Column, Integer, String, Date, Decimal, Enum, ForeignKey, TIMESTAMP, func
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class SexoEnum(str, enum.Enum):
    """Enum para o sexo do animal."""
    MACHO = "Macho"
    FEMEA = "Fêmea"


class StatusVidaEnum(str, enum.Enum):
    """Enum para o status de vida do animal."""
    ATIVO = "Ativo"
    VENDIDO = "Vendido"
    MORTO = "Morto"


class StatusReprodutivoEnum(str, enum.Enum):
    """Enum para o status reprodutivo do animal."""
    GESTANTE = "Gestante"
    LACTANTE = "Lactante"
    CIO = "Cio"
    VAZIA = "Vazia"
    NAO_APLICAVEL = "Não Aplicável"


class Animal(Base):
    """
    Modelo para a tabela 'animais'.
    Representa um animal individual na granja.
    """
    __tablename__ = "animais"

    animal_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    identificacao_principal = Column(String(50), unique=True, nullable=False, index=True)
    lote_id = Column(Integer, ForeignKey("lotes.lote_id"), nullable=True)
    sexo = Column(Enum(SexoEnum), nullable=False)
    data_nascimento = Column(Date, nullable=False)
    peso_nascimento = Column(Decimal(5, 2), nullable=True)
    raca = Column(String(50), nullable=True)
    mae_id = Column(Integer, ForeignKey("animais.animal_id"), nullable=True)
    pai_id = Column(Integer, ForeignKey("animais.animal_id"), nullable=True)
    status_vida = Column(Enum(StatusVidaEnum), nullable=False, default=StatusVidaEnum.ATIVO)
    status_reprodutivo = Column(
        Enum(StatusReprodutivoEnum),
        nullable=False,
        default=StatusReprodutivoEnum.NAO_APLICAVEL
    )
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relacionamentos
    lote = relationship("Lote", back_populates="animais")
    mae = relationship("Animal", remote_side=[animal_id], foreign_keys=[mae_id])
    pai = relationship("Animal", remote_side=[animal_id], foreign_keys=[pai_id])
    pesagens = relationship("Pesagem", back_populates="animal", cascade="all, delete-orphan")
    eventos_reprodutivos = relationship(
        "EventoReprodutivo",
        back_populates="matriz",
        foreign_keys="EventoReprodutivo.matriz_id",
        cascade="all, delete-orphan"
    )


class Lote(Base):
    """
    Modelo para a tabela 'lotes'.
    Representa um grupo de animais.
    """
    __tablename__ = "lotes"

    lote_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome_lote = Column(String(100), unique=True, nullable=False)
    tipo_lote = Column(Enum("Creche", "Recria", "Terminação", name="tipo_lote_enum"), nullable=False)
    data_entrada = Column(Date, nullable=False)
    data_saida = Column(Date, nullable=True)
    status = Column(Enum("Ativo", "Inativo", name="status_lote_enum"), nullable=False, default="Ativo")
    observacoes = Column(String(500), nullable=True)

    # Relacionamentos
    animais = relationship("Animal", back_populates="lote")


class Pesagem(Base):
    """
    Modelo para a tabela 'pesagens'.
    Registra o histórico de pesagens dos animais.
    """
    __tablename__ = "pesagens"

    pesagem_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    animal_id = Column(Integer, ForeignKey("animais.animal_id", ondelete="CASCADE"), nullable=True)
    lote_id = Column(Integer, ForeignKey("lotes.lote_id", ondelete="CASCADE"), nullable=True)
    data_pesagem = Column(Date, nullable=False)
    peso_kg = Column(Decimal(6, 2), nullable=False)
    gpd_calculado = Column(Decimal(5, 3), nullable=True)

    # Relacionamentos
    animal = relationship("Animal", back_populates="pesagens")


class EventoReprodutivo(Base):
    """
    Modelo para a tabela 'eventos_reprodutivos'.
    Registra eventos do ciclo reprodutivo das matrizes.
    """
    __tablename__ = "eventos_reprodutivos"

    evento_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    matriz_id = Column(Integer, ForeignKey("animais.animal_id", ondelete="CASCADE"), nullable=False)
    tipo_evento = Column(
        Enum("Cobertura", "Diagnóstico", "Parto", "Desmame", name="tipo_evento_enum"),
        nullable=False
    )
    data_evento = Column(Date, nullable=False)
    reprodutor_id = Column(Integer, ForeignKey("animais.animal_id", ondelete="SET NULL"), nullable=True)
    resultado_diagnostico = Column(Enum("Positivo", "Negativo", name="resultado_diagnostico_enum"), nullable=True)
    total_nascidos = Column(Integer, nullable=True)
    nascidos_vivos = Column(Integer, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relacionamentos
    matriz = relationship("Animal", back_populates="eventos_reprodutivos", foreign_keys=[matriz_id])
    reprodutor = relationship("Animal", foreign_keys=[reprodutor_id])
