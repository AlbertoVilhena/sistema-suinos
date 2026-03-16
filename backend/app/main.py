"""
Aplicação principal FastAPI - Sistema de Gestão de Suínos
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import animais, eventos_reprodutivos
from app.database import engine, Base

# Criar as tabelas no banco de dados (apenas para desenvolvimento)
# Em produção, use Alembic para migrations
# Base.metadata.create_all(bind=engine)

# Criar a aplicação FastAPI
app = FastAPI(
    title="API - Sistema de Gestão de Suínos",
    description="API RESTful para gerenciamento completo de uma granja de suínos",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especifique os domínios permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(animais.router, prefix="/api/v1")
app.include_router(eventos_reprodutivos.router, prefix="/api/v1")


@app.get("/")
def root():
    """Endpoint raiz da API."""
    return {
        "message": "API - Sistema de Gestão de Suínos",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Endpoint para verificação de saúde da API."""
    return {"status": "healthy"}
