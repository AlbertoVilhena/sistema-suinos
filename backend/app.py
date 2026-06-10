"""
Sistema de Gestão de Suinocultura - Backend Completo
Flask API com autenticação JWT, CRUD completo e controle de roles
"""

import os
from datetime import datetime, date, timedelta
from flask import Flask, request, jsonify, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    JWTManager, jwt_required, create_access_token, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import func
from sqlalchemy.orm import joinedload, subqueryload

app = Flask(__name__)

# ============== CONFIGURATION ==============
database_url = os.environ.get('DATABASE_URL', 'sqlite:///suinocultura.db')
# Fix for older Render PostgreSQL URLs (postgres:// → postgresql://)
if database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)
# Use psycopg3 driver (compatible with Python 3.14+)
if database_url.startswith('postgresql://'):
    database_url = database_url.replace('postgresql://', 'postgresql+psycopg://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# pool_pre_ping: verifica se a conexão está viva antes de usar (resolve SSL closed unexpectedly do Neon)
# pool_recycle: descarta conexões com mais de 4 min (Neon fecha idle após ~5 min)
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 240,
    'pool_size': 5,
    'max_overflow': 5,
    'pool_timeout': 30,
}
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'suinocultura-secret-2024-mude-em-producao')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

db = SQLAlchemy(app)
jwt = JWTManager(app)

# ============== CORS MANUAL (sem Flask-CORS) ==============
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        resp = make_response("", 204)
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        resp.headers["Access-Control-Max-Age"] = "3600"
        return resp

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response

# ============== MODELS ==============

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    senha_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='operador')  # admin, gerente, operador, visualizador
    ativo = db.Column(db.Boolean, default=True)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'email': self.email,
            'role': self.role,
            'ativo': self.ativo,
            'criado_em': self.criado_em.isoformat()
        }


class Lote(db.Model):
    __tablename__ = 'lotes'
    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(50), unique=True, nullable=False)
    data_entrada = db.Column(db.Date, nullable=False)
    quantidade_inicial = db.Column(db.Integer, nullable=False)
    quantidade_atual = db.Column(db.Integer, nullable=False)
    peso_medio_entrada = db.Column(db.Float)
    fase = db.Column(db.String(30))  # maternidade, creche, crescimento, terminacao
    status = db.Column(db.String(20), default='ativo')  # ativo, encerrado, vendido
    observacoes = db.Column(db.Text)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))

    animais = db.relationship('Animal', backref='lote', lazy=True, cascade='all, delete-orphan')
    vacinacoes = db.relationship('Vacinacao', backref='lote', lazy=True, cascade='all, delete-orphan')
    alimentacoes = db.relationship('Alimentacao', backref='lote', lazy=True, cascade='all, delete-orphan')
    reproducoes = db.relationship('Reproducao', backref='lote', lazy=True)
    financeiros = db.relationship('Financeiro', backref='lote', lazy=True)
    pesagens = db.relationship('Pesagem', backref='lote', lazy=True, cascade='all, delete-orphan', order_by='Pesagem.data')

    def to_dict(self):
        return {
            'id': self.id,
            'numero': self.numero,
            'data_entrada': self.data_entrada.isoformat() if self.data_entrada else None,
            'quantidade_inicial': self.quantidade_inicial,
            'quantidade_atual': self.quantidade_atual,
            'peso_medio_entrada': self.peso_medio_entrada,
            'fase': self.fase,
            'status': self.status,
            'observacoes': self.observacoes,
            'criado_em': self.criado_em.isoformat()
        }


class Animal(db.Model):
    __tablename__ = 'animais'
    id = db.Column(db.Integer, primary_key=True)
    lote_id = db.Column(db.Integer, db.ForeignKey('lotes.id'))
    brinco = db.Column(db.String(50))
    sexo = db.Column(db.String(10))  # macho, femea
    raca = db.Column(db.String(50))
    data_nascimento = db.Column(db.Date)
    peso_entrada = db.Column(db.Float)
    peso_atual = db.Column(db.Float)
    status = db.Column(db.String(20), default='ativo')  # ativo, morto, vendido, transferido
    origem = db.Column(db.String(20), default='comprado')  # nascido, comprado
    custo_aquisicao = db.Column(db.Float, default=0)
    observacoes = db.Column(db.Text)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'lote_id': self.lote_id,
            'lote_numero': self.lote.numero if self.lote else None,
            'brinco': self.brinco,
            'sexo': self.sexo,
            'raca': self.raca,
            'data_nascimento': self.data_nascimento.isoformat() if self.data_nascimento else None,
            'peso_entrada': self.peso_entrada,
            'peso_atual': self.peso_atual,
            'status': self.status,
            'origem': self.origem,
            'custo_aquisicao': self.custo_aquisicao or 0,
            'observacoes': self.observacoes,
            'criado_em': self.criado_em.isoformat()
        }


class Vacinacao(db.Model):
    __tablename__ = 'vacinacoes'
    id = db.Column(db.Integer, primary_key=True)
    lote_id = db.Column(db.Integer, db.ForeignKey('lotes.id'))
    animal_id = db.Column(db.Integer, db.ForeignKey('animais.id'), nullable=True)
    plantel_brinco = db.Column(db.String(50))
    vacina = db.Column(db.String(100), nullable=False)
    data = db.Column(db.Date, nullable=False)
    dose = db.Column(db.String(50))
    marca_fabricante = db.Column(db.String(100))
    lote_vacina = db.Column(db.String(50))   # lote do fabricante/embalagem
    responsavel = db.Column(db.String(100))
    custo = db.Column(db.Float, default=0)
    observacoes = db.Column(db.Text)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'lote_id': self.lote_id,
            'lote_numero': self.lote.numero if self.lote else None,
            'animal_id': self.animal_id,
            'plantel_brinco': self.plantel_brinco,
            'vacina': self.vacina,
            'data': self.data.isoformat() if self.data else None,
            'dose': self.dose,
            'marca_fabricante': self.marca_fabricante,
            'lote_vacina': self.lote_vacina,
            'responsavel': self.responsavel,
            'custo': self.custo or 0,
            'observacoes': self.observacoes,
            'criado_em': self.criado_em.isoformat()
        }


class Reproducao(db.Model):
    __tablename__ = 'reproducoes'
    id = db.Column(db.Integer, primary_key=True)
    femea_brinco = db.Column(db.String(50))
    macho_brinco = db.Column(db.String(50))
    data_cobertura = db.Column(db.Date)
    data_parto_previsto = db.Column(db.Date)
    data_parto_real = db.Column(db.Date)
    quantidade_nascidos = db.Column(db.Integer)
    quantidade_vivos = db.Column(db.Integer)
    status = db.Column(db.String(20), default='gestacao')  # gestacao, parto, desmame, encerrado
    observacoes = db.Column(db.Text)
    lote_id = db.Column(db.Integer, db.ForeignKey('lotes.id'), nullable=True)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'femea_brinco': self.femea_brinco,
            'macho_brinco': self.macho_brinco,
            'data_cobertura': self.data_cobertura.isoformat() if self.data_cobertura else None,
            'data_parto_previsto': self.data_parto_previsto.isoformat() if self.data_parto_previsto else None,
            'data_parto_real': self.data_parto_real.isoformat() if self.data_parto_real else None,
            'quantidade_nascidos': self.quantidade_nascidos,
            'quantidade_vivos': self.quantidade_vivos,
            'status': self.status,
            'observacoes': self.observacoes,
            'lote_id': self.lote_id,
            'lote_numero': self.lote.numero if self.lote else None,
            'criado_em': self.criado_em.isoformat()
        }


class Alimentacao(db.Model):
    __tablename__ = 'alimentacoes'
    id = db.Column(db.Integer, primary_key=True)
    lote_id = db.Column(db.Integer, db.ForeignKey('lotes.id'), nullable=True)
    plantel_grupo = db.Column(db.String(20))  # matrizes, reprodutores, geral
    plantel_brinco = db.Column(db.String(50))  # controle individual de animal do plantel
    formulacao_id = db.Column(db.Integer, db.ForeignKey('formulacoes.id'), nullable=True)
    data = db.Column(db.Date, nullable=False)
    racao_tipo = db.Column(db.String(100))
    quantidade_kg = db.Column(db.Float, nullable=False)
    custo_unitario = db.Column(db.Float)
    observacoes = db.Column(db.Text)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    formulacao_ref = db.relationship('Formulacao', foreign_keys=[formulacao_id], lazy='select')

    def to_dict(self):
        custo_total = (self.quantidade_kg * self.custo_unitario) if self.custo_unitario else 0
        return {
            'id': self.id,
            'formulacao_id': self.formulacao_id,
            'formulacao_nome': self.formulacao_ref.nome if self.formulacao_ref else None,
            'lote_id': self.lote_id,
            'lote_numero': self.lote.numero if self.lote else None,
            'plantel_grupo': self.plantel_grupo,
            'plantel_brinco': self.plantel_brinco,
            'data': self.data.isoformat() if self.data else None,
            'racao_tipo': self.racao_tipo,
            'quantidade_kg': self.quantidade_kg,
            'custo_unitario': self.custo_unitario,
            'custo_total': custo_total,
            'observacoes': self.observacoes,
            'criado_em': self.criado_em.isoformat()
        }


class Financeiro(db.Model):
    __tablename__ = 'financeiros'
    id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(20), nullable=False)  # receita, despesa
    categoria = db.Column(db.String(100))
    descricao = db.Column(db.String(200), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    data = db.Column(db.Date, nullable=False)
    lote_id = db.Column(db.Integer, db.ForeignKey('lotes.id'), nullable=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'tipo': self.tipo,
            'categoria': self.categoria,
            'descricao': self.descricao,
            'valor': self.valor,
            'data': self.data.isoformat() if self.data else None,
            'lote_id': self.lote_id,
            'lote_numero': self.lote.numero if self.lote else None,
            'usuario_id': self.usuario_id,
            'criado_em': self.criado_em.isoformat()
        }


class Ingrediente(db.Model):
    __tablename__ = 'ingredientes'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    unidade = db.Column(db.String(20), default='kg')
    estoque_kg = db.Column(db.Float, default=0)
    custo_por_kg = db.Column(db.Float, default=0)
    ativo = db.Column(db.Boolean, default=True)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'unidade': self.unidade,
            'estoque_kg': self.estoque_kg or 0,
            'custo_por_kg': self.custo_por_kg or 0,
            'ativo': self.ativo,
            'criado_em': self.criado_em.isoformat()
        }


class Formulacao(db.Model):
    __tablename__ = 'formulacoes'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.Text)
    fase = db.Column(db.String(30))
    ativa = db.Column(db.Boolean, default=True)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    itens = db.relationship('FormulacaoItem', backref='formulacao', lazy=True, cascade='all, delete-orphan')

    def calcular_custo_por_kg(self):
        # Usa o relacionamento pré-carregado — sem query extra por ingrediente
        total = 0
        for i in self.itens:
            ing = i.ingrediente_ref
            preco_atual = (ing.custo_por_kg or 0) if ing else (i.custo_unitario or 0)
            total += (i.percentagem / 100) * preco_atual
        return round(total, 4)

    def to_dict(self):
        itens = [i.to_dict() for i in self.itens]
        return {
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'fase': self.fase,
            'ativa': self.ativa,
            'custo_por_kg': self.calcular_custo_por_kg(),
            'total_percentagem': round(sum(i.percentagem for i in self.itens), 2),
            'itens': itens,
            'criado_em': self.criado_em.isoformat()
        }


class FormulacaoItem(db.Model):
    __tablename__ = 'formulacao_itens'
    id = db.Column(db.Integer, primary_key=True)
    formulacao_id = db.Column(db.Integer, db.ForeignKey('formulacoes.id'), nullable=False)
    ingrediente_id = db.Column(db.Integer, db.ForeignKey('ingredientes.id'), nullable=False)
    percentagem = db.Column(db.Float, nullable=False)
    custo_unitario = db.Column(db.Float, default=0)  # snapshot do custo na criação
    ingrediente_ref = db.relationship('Ingrediente', foreign_keys=[ingrediente_id], lazy='select')

    def to_dict(self):
        ing = self.ingrediente_ref
        # Usa preço atual do ingrediente; custo_unitario é apenas o snapshot histórico
        preco_atual = (ing.custo_por_kg or 0) if ing else (self.custo_unitario or 0)
        return {
            'id': self.id,
            'formulacao_id': self.formulacao_id,
            'ingrediente_id': self.ingrediente_id,
            'ingrediente_nome': ing.nome if ing else None,
            'ingrediente_unidade': ing.unidade if ing else 'kg',
            'estoque_disponivel': ing.estoque_kg if ing else 0,
            'percentagem': self.percentagem,
            'custo_unitario': preco_atual,           # preço atual (para exibição)
            'custo_unitario_salvo': self.custo_unitario or 0,  # snapshot histórico
            'custo_proporcional': round((self.percentagem / 100) * preco_atual, 4)
        }



class Plantel(db.Model):
    __tablename__ = 'plantel'
    id = db.Column(db.Integer, primary_key=True)
    brinco = db.Column(db.String(50), unique=True, nullable=False)
    tipo = db.Column(db.String(20), nullable=False)  # matriz, reprodutor
    nome = db.Column(db.String(100))
    raca = db.Column(db.String(50))
    data_nascimento = db.Column(db.Date)
    peso_atual = db.Column(db.Float)
    status = db.Column(db.String(20), default='ativo')  # ativo, descartado, morto
    origem = db.Column(db.String(20), default='comprado')  # nascido, comprado
    custo_aquisicao = db.Column(db.Float, default=0)
    observacoes = db.Column(db.Text)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        total_partos = 0
        if self.tipo == 'matriz':
            total_partos = Reproducao.query.filter(
                Reproducao.femea_brinco == self.brinco,
                Reproducao.status == 'parto'
            ).count()
        idade_meses = None
        if self.data_nascimento:
            idade_meses = (date.today() - self.data_nascimento).days // 30
        return {
            'id': self.id,
            'brinco': self.brinco,
            'tipo': self.tipo,
            'nome': self.nome or '',
            'raca': self.raca or '',
            'data_nascimento': self.data_nascimento.isoformat() if self.data_nascimento else None,
            'idade_meses': idade_meses,
            'peso_atual': self.peso_atual,
            'status': self.status,
            'origem': self.origem,
            'custo_aquisicao': self.custo_aquisicao or 0,
            'observacoes': self.observacoes or '',
            'total_partos': total_partos,
            'criado_em': self.criado_em.isoformat()
        }


class Pesagem(db.Model):
    __tablename__ = 'pesagens'
    id = db.Column(db.Integer, primary_key=True)
    lote_id = db.Column(db.Integer, db.ForeignKey('lotes.id'), nullable=False)
    data = db.Column(db.Date, nullable=False)
    peso_medio = db.Column(db.Float, nullable=False)
    total_animais = db.Column(db.Integer)
    observacoes = db.Column(db.Text)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'lote_id': self.lote_id,
            'data': self.data.isoformat() if self.data else None,
            'peso_medio': self.peso_medio,
            'total_animais': self.total_animais,
            'observacoes': self.observacoes,
            'criado_em': self.criado_em.isoformat()
        }


class Estoque(db.Model):
    __tablename__ = 'estoque'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    categoria = db.Column(db.String(30), default='outro')  # racao, medicamento, vacina, outro
    unidade = db.Column(db.String(20), default='kg')
    quantidade = db.Column(db.Float, default=0)
    custo_unitario = db.Column(db.Float, default=0)
    estoque_minimo = db.Column(db.Float, default=0)
    observacoes = db.Column(db.Text)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    atualizado_em = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'categoria': self.categoria,
            'unidade': self.unidade,
            'quantidade': round(self.quantidade, 3),
            'custo_unitario': self.custo_unitario,
            'custo_total': round(self.quantidade * self.custo_unitario, 2),
            'estoque_minimo': self.estoque_minimo,
            'abaixo_minimo': self.quantidade < self.estoque_minimo,
            'observacoes': self.observacoes,
            'criado_em': self.criado_em.isoformat(),
            'atualizado_em': self.atualizado_em.isoformat() if self.atualizado_em else None
        }

class PlanoVacinacao(db.Model):
    __tablename__ = 'planos_vacinacao'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.Text)
    tipo_destino = db.Column(db.String(20), default='lote')  # lote, plantel
    fase_lote = db.Column(db.String(30))  # maternidade, creche, crescimento, terminacao
    ativo = db.Column(db.Boolean, default=True)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    itens = db.relationship('PlanoVacinacaoItem', backref='plano', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'tipo_destino': self.tipo_destino,
            'fase_lote': self.fase_lote,
            'ativo': self.ativo,
            'itens': [i.to_dict() for i in sorted(self.itens, key=lambda x: x.dias_apos_entrada)],
            'criado_em': self.criado_em.isoformat()
        }


class PlanoVacinacaoItem(db.Model):
    __tablename__ = 'plano_vacinacao_itens'
    id = db.Column(db.Integer, primary_key=True)
    plano_id = db.Column(db.Integer, db.ForeignKey('planos_vacinacao.id'), nullable=False)
    vacina = db.Column(db.String(100), nullable=False)
    dias_apos_entrada = db.Column(db.Integer, nullable=False, default=0)
    dose = db.Column(db.String(50))
    observacoes = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'plano_id': self.plano_id,
            'vacina': self.vacina,
            'dias_apos_entrada': self.dias_apos_entrada,
            'dose': self.dose,
            'observacoes': self.observacoes,
        }


class AplicacaoPlano(db.Model):
    __tablename__ = 'aplicacoes_plano'
    id = db.Column(db.Integer, primary_key=True)
    plano_id = db.Column(db.Integer, db.ForeignKey('planos_vacinacao.id'), nullable=False)
    lote_id = db.Column(db.Integer, db.ForeignKey('lotes.id'), nullable=True)
    plantel_grupo = db.Column(db.String(20))  # matrizes, reprodutores, geral
    data_inicio = db.Column(db.Date, nullable=False)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        plano = PlanoVacinacao.query.get(self.plano_id)
        lote = Lote.query.get(self.lote_id) if self.lote_id else None
        return {
            'id': self.id,
            'plano_id': self.plano_id,
            'plano_nome': plano.nome if plano else None,
            'lote_id': self.lote_id,
            'lote_numero': lote.numero if lote else None,
            'plantel_grupo': self.plantel_grupo,
            'data_inicio': self.data_inicio.isoformat() if self.data_inicio else None,
            'criado_em': self.criado_em.isoformat()
        }


# ============== HELPERS ==============

def to_int(val, default=None):
    try:
        return int(val) if val not in (None, '', 'null') else default
    except (ValueError, TypeError):
        return default

def to_float(val, default=None):
    try:
        return float(val) if val not in (None, '', 'null') else default
    except (ValueError, TypeError):
        return default

def get_current_user():
    uid = get_jwt_identity()
    return Usuario.query.get(int(uid))

def can_write(role):
    return role in ['admin', 'gerente', 'operador']

def can_edit(role):
    return role in ['admin', 'gerente']

def is_admin(role):
    return role == 'admin'

def can_gestao(role):
    return role in ['admin', 'gerente']

@app.errorhandler(Exception)
def handle_exception(e):
    import traceback
    traceback.print_exc()
    return jsonify({'error': str(e)}), 500


# ============== AUTH ROUTES ==============

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    senha = data.get('senha') or ''

    user = Usuario.query.filter_by(email=email, ativo=True).first()
    if not user or not check_password_hash(user.senha_hash, senha):
        return jsonify({'error': 'Email ou senha inválidos'}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'usuario': user.to_dict()})


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def me():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404
    return jsonify(user.to_dict())


# ============== USUARIOS ROUTES ==============

@app.route('/api/usuarios', methods=['GET'])
@jwt_required()
def get_usuarios():
    u = get_current_user()
    if u.role not in ['admin', 'gerente']:
        return jsonify({'error': 'Permissão negada'}), 403
    return jsonify([x.to_dict() for x in Usuario.query.all()])


@app.route('/api/usuarios', methods=['POST'])
@jwt_required()
def create_usuario():
    u = get_current_user()
    if not is_admin(u.role):
        return jsonify({'error': 'Apenas admins podem criar usuários'}), 403

    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    if not email or not data.get('nome') or not data.get('senha'):
        return jsonify({'error': 'Nome, email e senha são obrigatórios'}), 400
    if Usuario.query.filter_by(email=email).first():
        return jsonify({'error': 'Email já cadastrado'}), 400

    novo = Usuario(
        nome=data['nome'],
        email=email,
        senha_hash=generate_password_hash(data['senha']),
        role=data.get('role', 'operador'),
        ativo=data.get('ativo', True)
    )
    db.session.add(novo)
    db.session.commit()
    return jsonify(novo.to_dict()), 201


@app.route('/api/usuarios/<int:uid>', methods=['PUT'])
@jwt_required()
def update_usuario(uid):
    current = get_current_user()
    if not is_admin(current.role) and current.id != uid:
        return jsonify({'error': 'Permissão negada'}), 403

    user = Usuario.query.get_or_404(uid)
    data = request.get_json()

    if 'nome' in data:
        user.nome = data['nome']
    if 'email' in data:
        user.email = data['email'].strip().lower()
    if data.get('senha'):
        user.senha_hash = generate_password_hash(data['senha'])
    if 'role' in data and is_admin(current.role):
        user.role = data['role']
    if 'ativo' in data and is_admin(current.role):
        user.ativo = data['ativo']

    db.session.commit()
    return jsonify(user.to_dict())


@app.route('/api/usuarios/<int:uid>', methods=['DELETE'])
@jwt_required()
def delete_usuario(uid):
    current = get_current_user()
    if not is_admin(current.role):
        return jsonify({'error': 'Apenas admins podem excluir usuários'}), 403
    if current.id == uid:
        return jsonify({'error': 'Não é possível excluir o próprio usuário'}), 400

    user = Usuario.query.get_or_404(uid)
    user.ativo = False
    db.session.commit()
    return jsonify({'message': 'Usuário desativado com sucesso'})


# ============== LOTES ROUTES ==============

@app.route('/api/lotes', methods=['GET'])
@jwt_required()
def get_lotes():
    lotes = Lote.query.order_by(Lote.criado_em.desc()).all()
    return jsonify([l.to_dict() for l in lotes])


@app.route('/api/lotes/<int:lid>', methods=['GET'])
@jwt_required()
def get_lote(lid):
    lote = Lote.query.get_or_404(lid)
    data = lote.to_dict()
    data['total_animais'] = Animal.query.filter_by(lote_id=lid, status='ativo').count()
    data['total_vacinacoes'] = Vacinacao.query.filter_by(lote_id=lid).count()
    data['total_alimentacoes'] = Alimentacao.query.filter_by(lote_id=lid).count()
    return jsonify(data)


@app.route('/api/lotes', methods=['POST'])
@jwt_required()
def create_lote():
    try:
        u = get_current_user()
        if not can_write(u.role):
            return jsonify({'error': 'Permissão negada'}), 403

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Body JSON inválido'}), 400
        if not data.get('numero') or not data.get('data_entrada') or not data.get('quantidade_inicial'):
            return jsonify({'error': 'Número, data de entrada e quantidade inicial são obrigatórios'}), 400
        if Lote.query.filter_by(numero=data['numero']).first():
            return jsonify({'error': 'Número de lote já existe'}), 400

        qtd = to_int(data.get('quantidade_inicial'))
        if not qtd:
            return jsonify({'error': 'Quantidade inicial inválida'}), 400

        data_entrada = data.get('data_entrada', '')
        # Aceita YYYY-MM-DD ou DD/MM/YYYY
        if '/' in data_entrada:
            data_entrada_date = datetime.strptime(data_entrada, '%d/%m/%Y').date()
        else:
            data_entrada_date = datetime.strptime(data_entrada, '%Y-%m-%d').date()

        lote = Lote(
            numero=data['numero'],
            data_entrada=data_entrada_date,
            quantidade_inicial=qtd,
            quantidade_atual=to_int(data.get('quantidade_atual'), qtd),
            peso_medio_entrada=to_float(data.get('peso_medio_entrada')),
            fase=data.get('fase') or None,
            status=data.get('status', 'ativo'),
            observacoes=data.get('observacoes') or None,
            usuario_id=u.id
        )
        db.session.add(lote)
        db.session.commit()
        return jsonify(lote.to_dict()), 201
    except Exception as e:
        import traceback
        db.session.rollback()
        print('ERRO create_lote:', traceback.format_exc())
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500


@app.route('/api/lotes/<int:lid>', methods=['PUT'])
@jwt_required()
def update_lote(lid):
    u = get_current_user()
    if not can_edit(u.role):
        return jsonify({'error': 'Permissão negada'}), 403

    lote = Lote.query.get_or_404(lid)
    data = request.get_json()

    for f in ['numero', 'quantidade_atual', 'peso_medio_entrada', 'fase', 'status', 'observacoes']:
        if f in data:
            setattr(lote, f, data[f])
    if 'data_entrada' in data:
        lote.data_entrada = datetime.strptime(data['data_entrada'], '%Y-%m-%d').date()

    db.session.commit()
    return jsonify(lote.to_dict())


@app.route('/api/lotes/<int:lid>', methods=['DELETE'])
@jwt_required()
def delete_lote(lid):
    u = get_current_user()
    if not is_admin(u.role):
        return jsonify({'error': 'Apenas admins podem excluir lotes'}), 403

    lote = Lote.query.get_or_404(lid)
    db.session.delete(lote)
    db.session.commit()
    return jsonify({'message': 'Lote excluído com sucesso'})


# ============== ANIMAIS ROUTES ==============

@app.route('/api/animais', methods=['GET'])
@jwt_required()
def get_animais():
    lote_id = request.args.get('lote_id')
    q = Animal.query.options(joinedload(Animal.lote))
    if lote_id:
        q = q.filter_by(lote_id=lote_id)
    return jsonify([a.to_dict() for a in q.order_by(Animal.criado_em.desc()).all()])


@app.route('/api/animais', methods=['POST'])
@jwt_required()
def create_animal():
    u = get_current_user()
    if not can_write(u.role):
        return jsonify({'error': 'Permissão negada'}), 403

    data = request.get_json()
    animal = Animal(
        lote_id=to_int(data.get('lote_id')),
        brinco=data.get('brinco'),
        sexo=data.get('sexo'),
        raca=data.get('raca'),
        data_nascimento=datetime.strptime(data['data_nascimento'], '%Y-%m-%d').date() if data.get('data_nascimento') else None,
        peso_entrada=to_float(data.get('peso_entrada')),
        peso_atual=to_float(data.get('peso_atual')) or to_float(data.get('peso_entrada')),
        status=data.get('status', 'ativo'),
        origem=data.get('origem', 'comprado'),
        custo_aquisicao=to_float(data.get('custo_aquisicao'), 0),
        observacoes=data.get('observacoes')
    )
    db.session.add(animal)
    db.session.commit()
    return jsonify(animal.to_dict()), 201


@app.route('/api/animais/<int:aid>', methods=['PUT'])
@jwt_required()
def update_animal(aid):
    u = get_current_user()
    if not can_write(u.role):
        return jsonify({'error': 'Permissão negada'}), 403

    animal = Animal.query.get_or_404(aid)
    data = request.get_json()

    status_anterior = animal.status
    for f in ['brinco', 'sexo', 'raca', 'peso_entrada', 'peso_atual', 'status', 'origem', 'custo_aquisicao', 'observacoes', 'lote_id']:
        if f in data:
            setattr(animal, f, data[f])
    if data.get('data_nascimento'):
        animal.data_nascimento = datetime.strptime(data['data_nascimento'], '%Y-%m-%d').date()

    # Ao marcar animal como morto/vendido/transferido, decrementa quantidade_atual do lote
    novo_status = data.get('status')
    if novo_status and novo_status != status_anterior and novo_status in ('morto', 'vendido', 'transferido') and status_anterior == 'ativo':
        lote = Lote.query.get(animal.lote_id) if animal.lote_id else None
        if lote and lote.quantidade_atual > 0:
            lote.quantidade_atual -= 1
    # Ao reativar animal que estava morto/vendido, incrementa quantidade_atual
    elif novo_status and novo_status == 'ativo' and status_anterior in ('morto', 'vendido', 'transferido'):
        lote = Lote.query.get(animal.lote_id) if animal.lote_id else None
        if lote:
            lote.quantidade_atual += 1

    db.session.commit()
    return jsonify(animal.to_dict())


@app.route('/api/animais/<int:aid>', methods=['DELETE'])
@jwt_required()
def delete_animal(aid):
    u = get_current_user()
    if not can_edit(u.role):
        return jsonify({'error': 'Permissão negada'}), 403

    animal = Animal.query.get_or_404(aid)
    db.session.delete(animal)
    db.session.commit()
    return jsonify({'message': 'Animal excluído com sucesso'})


# ============== VACINACOES ROUTES ==============

@app.route('/api/vacinacoes', methods=['GET'])
@jwt_required()
def get_vacinacoes():
    lote_id = request.args.get('lote_id')
    q = Vacinacao.query.options(joinedload(Vacinacao.lote))
    if lote_id:
        q = q.filter_by(lote_id=lote_id)
    return jsonify([v.to_dict() for v in q.order_by(Vacinacao.data.desc()).all()])


@app.route('/api/vacinacoes', methods=['POST'])
@jwt_required()
def create_vacinacao():
    u = get_current_user()
    if not can_write(u.role):
        return jsonify({'error': 'Permissão negada'}), 403

    data = request.get_json()
    if not data.get('vacina') or not data.get('data'):
        return jsonify({'error': 'Vacina e data são obrigatórios'}), 400
    if not data.get('lote_id') and not data.get('plantel_brinco'):
        return jsonify({'error': 'Selecione um lote ou um animal do plantel'}), 400

    vac = Vacinacao(
        lote_id=to_int(data.get('lote_id')),
        animal_id=to_int(data.get('animal_id')),
        plantel_brinco=data.get('plantel_brinco') or None,
        vacina=data['vacina'],
        data=datetime.strptime(data['data'], '%Y-%m-%d').date(),
        dose=data.get('dose'),
        marca_fabricante=data.get('marca_fabricante'),
        lote_vacina=data.get('lote_vacina'),
        responsavel=data.get('responsavel'),
        custo=to_float(data.get('custo'), 0),
        observacoes=data.get('observacoes')
    )
    db.session.add(vac)
    db.session.commit()
    return jsonify(vac.to_dict()), 201


@app.route('/api/vacinacoes/<int:vid>', methods=['PUT'])
@jwt_required()
def update_vacinacao(vid):
    u = get_current_user()
    if not can_write(u.role):
        return jsonify({'error': 'Permissão negada'}), 403

    vac = Vacinacao.query.get_or_404(vid)
    data = request.get_json()

    for f in ['vacina', 'dose', 'marca_fabricante', 'lote_vacina', 'responsavel', 'custo', 'observacoes', 'lote_id', 'animal_id', 'plantel_brinco']:
        if f in data:
            setattr(vac, f, data[f] if data[f] != '' else None)
    if 'data' in data:
        vac.data = datetime.strptime(data['data'], '%Y-%m-%d').date()

    db.session.commit()
    return jsonify(vac.to_dict())


@app.route('/api/vacinacoes/<int:vid>', methods=['DELETE'])
@jwt_required()
def delete_vacinacao(vid):
    u = get_current_user()
    if not can_edit(u.role):
        return jsonify({'error': 'Permissão negada'}), 403

    vac = Vacinacao.query.get_or_404(vid)
    db.session.delete(vac)
    db.session.commit()
    return jsonify({'message': 'Vacinação excluída com sucesso'})


# ============== RELATORIO VACINACAO ==============

@app.route('/api/relatorio-vacinacao', methods=['GET'])
@jwt_required()
def relatorio_vacinacao():
    vacinacoes = Vacinacao.query.order_by(Vacinacao.data.desc()).all()

    # Agrupado por vacina
    por_vacina = {}
    for v in vacinacoes:
        key = v.vacina
        if key not in por_vacina:
            por_vacina[key] = {'vacina': key, 'total_doses': 0, 'custo_total': 0, 'registros': []}
        por_vacina[key]['total_doses'] += 1
        por_vacina[key]['custo_total'] += v.custo or 0
        por_vacina[key]['registros'].append(v.to_dict())

    # Agrupado por lote
    por_lote = {}
    for v in vacinacoes:
        if not v.lote_id:
            continue
        lote = Lote.query.get(v.lote_id)
        key = v.lote_id
        if key not in por_lote:
            por_lote[key] = {'lote_id': v.lote_id, 'lote_numero': lote.numero if lote else '-',
                             'total_doses': 0, 'custo_total': 0, 'vacinas': []}
        por_lote[key]['total_doses'] += 1
        por_lote[key]['custo_total'] += v.custo or 0
        if v.vacina not in por_lote[key]['vacinas']:
            por_lote[key]['vacinas'].append(v.vacina)

    # Agrupado por plantel
    por_plantel = {}
    for v in vacinacoes:
        if not v.plantel_brinco:
            continue
        key = v.plantel_brinco
        if key not in por_plantel:
            por_plantel[key] = {'brinco': key, 'total_doses': 0, 'custo_total': 0, 'registros': []}
        por_plantel[key]['total_doses'] += 1
        por_plantel[key]['custo_total'] += v.custo or 0
        por_plantel[key]['registros'].append(v.to_dict())

    # Agenda pendente
    hoje = date.today()
    pendentes = []
    aplicacoes = AplicacaoPlano.query.all()
    for ap in aplicacoes:
        plano = PlanoVacinacao.query.get(ap.plano_id)
        if not plano or not plano.ativo:
            continue
        lote = Lote.query.get(ap.lote_id) if ap.lote_id else None
        for item in plano.itens:
            data_prevista = ap.data_inicio + timedelta(days=item.dias_apos_entrada)
            if data_prevista > hoje:
                continue
            ja_aplicada = Vacinacao.query.filter(
                Vacinacao.lote_id == ap.lote_id if ap.lote_id else Vacinacao.plantel_brinco.isnot(None),
                Vacinacao.vacina == item.vacina,
                Vacinacao.data >= data_prevista - timedelta(days=5),
                Vacinacao.data <= data_prevista + timedelta(days=5)
            ).first() is not None
            if not ja_aplicada:
                pendentes.append({
                    'vacina': item.vacina, 'dose': item.dose,
                    'data_prevista': data_prevista.isoformat(),
                    'dias_atraso': (hoje - data_prevista).days,
                    'lote_numero': lote.numero if lote else None,
                    'plantel_grupo': ap.plantel_grupo,
                    'plano_nome': plano.nome,
                })

    return jsonify({
        'total_doses': len(vacinacoes),
        'custo_total': round(sum(v.custo or 0 for v in vacinacoes), 2),
        'por_vacina': sorted(por_vacina.values(), key=lambda x: -x['total_doses']),
        'por_lote': sorted(por_lote.values(), key=lambda x: -x['total_doses']),
        'por_plantel': sorted(por_plantel.values(), key=lambda x: -x['total_doses']),
        'pendentes_atrasadas': sorted(pendentes, key=lambda x: x['data_prevista']),
        'historico': [v.to_dict() for v in vacinacoes],
    })


# ============== PLANO VACINACAO ROUTES ==============

@app.route('/api/planos-vacinacao', methods=['GET'])
@jwt_required()
def get_planos_vacinacao():
    planos = PlanoVacinacao.query.order_by(PlanoVacinacao.nome).all()
    return jsonify([p.to_dict() for p in planos])


@app.route('/api/planos-vacinacao', methods=['POST'])
@jwt_required()
def create_plano_vacinacao():
    u = get_current_user()
    if not can_write(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    data = request.get_json()
    if not data.get('nome'):
        return jsonify({'error': 'Nome é obrigatório'}), 400

    plano = PlanoVacinacao(
        nome=data['nome'],
        descricao=data.get('descricao'),
        tipo_destino=data.get('tipo_destino', 'lote'),
        fase_lote=data.get('fase_lote') or None,
        ativo=data.get('ativo', True)
    )
    db.session.add(plano)
    db.session.flush()

    for item in data.get('itens', []):
        pi = PlanoVacinacaoItem(
            plano_id=plano.id,
            vacina=item['vacina'],
            dias_apos_entrada=to_int(item.get('dias_apos_entrada'), 0),
            dose=item.get('dose'),
            observacoes=item.get('observacoes')
        )
        db.session.add(pi)

    db.session.commit()
    return jsonify(plano.to_dict()), 201


@app.route('/api/planos-vacinacao/<int:pid>', methods=['PUT'])
@jwt_required()
def update_plano_vacinacao(pid):
    u = get_current_user()
    if not can_write(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    plano = PlanoVacinacao.query.get_or_404(pid)
    data = request.get_json()

    for f in ['nome', 'descricao', 'tipo_destino', 'fase_lote', 'ativo']:
        if f in data:
            setattr(plano, f, data[f] if data[f] != '' else None)

    if 'itens' in data:
        PlanoVacinacaoItem.query.filter_by(plano_id=pid).delete()
        for item in data['itens']:
            pi = PlanoVacinacaoItem(
                plano_id=pid,
                vacina=item['vacina'],
                dias_apos_entrada=to_int(item.get('dias_apos_entrada'), 0),
                dose=item.get('dose'),
                observacoes=item.get('observacoes')
            )
            db.session.add(pi)

    db.session.commit()
    return jsonify(plano.to_dict())


@app.route('/api/planos-vacinacao/<int:pid>', methods=['DELETE'])
@jwt_required()
def delete_plano_vacinacao(pid):
    u = get_current_user()
    if not can_edit(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    plano = PlanoVacinacao.query.get_or_404(pid)
    db.session.delete(plano)
    db.session.commit()
    return jsonify({'message': 'Plano excluído'})


@app.route('/api/aplicacoes-plano', methods=['GET'])
@jwt_required()
def get_aplicacoes_plano():
    aplicacoes = AplicacaoPlano.query.order_by(AplicacaoPlano.data_inicio.desc()).all()
    return jsonify([a.to_dict() for a in aplicacoes])


@app.route('/api/aplicacoes-plano', methods=['POST'])
@jwt_required()
def create_aplicacao_plano():
    u = get_current_user()
    if not can_write(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    data = request.get_json()
    if not data.get('plano_id') or not data.get('data_inicio'):
        return jsonify({'error': 'Plano e data de início são obrigatórios'}), 400
    if not data.get('lote_id') and not data.get('plantel_grupo'):
        return jsonify({'error': 'Selecione um lote ou grupo do plantel'}), 400

    ap = AplicacaoPlano(
        plano_id=to_int(data['plano_id']),
        lote_id=to_int(data.get('lote_id')),
        plantel_grupo=data.get('plantel_grupo') or None,
        data_inicio=datetime.strptime(data['data_inicio'], '%Y-%m-%d').date()
    )
    db.session.add(ap)
    db.session.commit()
    return jsonify(ap.to_dict()), 201


@app.route('/api/aplicacoes-plano/<int:aid>', methods=['DELETE'])
@jwt_required()
def delete_aplicacao_plano(aid):
    u = get_current_user()
    if not can_edit(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    ap = AplicacaoPlano.query.get_or_404(aid)
    db.session.delete(ap)
    db.session.commit()
    return jsonify({'message': 'Aplicação removida'})


@app.route('/api/agenda-vacinacao', methods=['GET'])
@jwt_required()
def get_agenda_vacinacao():
    hoje = date.today()
    completa = request.args.get('completa', 'false').lower() == 'true'
    aplicacoes = AplicacaoPlano.query.all()
    agenda = []

    for ap in aplicacoes:
        plano = PlanoVacinacao.query.get(ap.plano_id)
        if not plano or not plano.ativo:
            continue
        lote = Lote.query.get(ap.lote_id) if ap.lote_id else None

        for item in plano.itens:
            data_prevista = ap.data_inicio + timedelta(days=item.dias_apos_entrada)
            dias_diff = (data_prevista - hoje).days

            # Verifica se já foi aplicada (vacina no mesmo lote/plantel próxima à data)
            ja_aplicada = False
            if ap.lote_id:
                ja_aplicada = Vacinacao.query.filter(
                    Vacinacao.lote_id == ap.lote_id,
                    Vacinacao.vacina == item.vacina,
                    Vacinacao.data >= data_prevista - timedelta(days=5),
                    Vacinacao.data <= data_prevista + timedelta(days=5)
                ).first() is not None
            elif ap.plantel_grupo:
                ja_aplicada = Vacinacao.query.filter(
                    Vacinacao.plantel_brinco.isnot(None),
                    Vacinacao.vacina == item.vacina,
                    Vacinacao.data >= data_prevista - timedelta(days=5),
                    Vacinacao.data <= data_prevista + timedelta(days=5)
                ).first() is not None

            if ja_aplicada:
                status = 'aplicada'
            elif dias_diff < 0:
                status = 'atrasada'
            elif dias_diff <= 7:
                status = 'proxima'
            else:
                status = 'futura'

            # Modo completo (PDF): inclui futuras. Modo normal: só atrasadas e próximas
            if completa:
                incluir = status != 'aplicada'
            else:
                incluir = status in ('atrasada', 'proxima')

            if incluir:
                agenda.append({
                    'aplicacao_id': ap.id,
                    'plano_id': plano.id,
                    'plano_nome': plano.nome,
                    'item_id': item.id,
                    'vacina': item.vacina,
                    'dose': item.dose,
                    'dias_apos_entrada': item.dias_apos_entrada,
                    'data_prevista': data_prevista.isoformat(),
                    'dias_diff': dias_diff,
                    'status': status,
                    'lote_id': ap.lote_id,
                    'lote_numero': lote.numero if lote else None,
                    'plantel_grupo': ap.plantel_grupo,
                    'observacoes': item.observacoes,
                })

    agenda.sort(key=lambda x: x['data_prevista'])
    return jsonify(agenda)


# ============== REPRODUCAO ROUTES ==============

@app.route('/api/reproducoes', methods=['GET'])
@jwt_required()
def get_reproducoes():
    reproducoes = Reproducao.query.options(joinedload(Reproducao.lote)).order_by(Reproducao.data_cobertura.desc()).all()
    return jsonify([r.to_dict() for r in reproducoes])


@app.route('/api/reproducoes', methods=['POST'])
@jwt_required()
def create_reproducao():
    u = get_current_user()
    if not can_write(u.role):
        return jsonify({'error': 'Permissão negada'}), 403

    data = request.get_json()
    data_cobertura = datetime.strptime(data['data_cobertura'], '%Y-%m-%d').date() if data.get('data_cobertura') else None
    # Gestação suína = ~114 dias
    parto_previsto = (data_cobertura + timedelta(days=114)) if data_cobertura else None

    rep = Reproducao(
        femea_brinco=data.get('femea_brinco'),
        macho_brinco=data.get('macho_brinco'),
        data_cobertura=data_cobertura,
        data_parto_previsto=datetime.strptime(data['data_parto_previsto'], '%Y-%m-%d').date() if data.get('data_parto_previsto') else parto_previsto,
        data_parto_real=datetime.strptime(data['data_parto_real'], '%Y-%m-%d').date() if data.get('data_parto_real') else None,
        quantidade_nascidos=to_int(data.get('quantidade_nascidos')),
        quantidade_vivos=to_int(data.get('quantidade_vivos')),
        status=data.get('status', 'gestacao'),
        observacoes=data.get('observacoes') or None,
        lote_id=to_int(data.get('lote_id'))
    )
    db.session.add(rep)
    db.session.commit()
    return jsonify(rep.to_dict()), 201


@app.route('/api/reproducoes/<int:rid>', methods=['PUT'])
@jwt_required()
def update_reproducao(rid):
    u = get_current_user()
    if not can_write(u.role):
        return jsonify({'error': 'Permissão negada'}), 403

    rep = Reproducao.query.get_or_404(rid)
    data = request.get_json()

    for f in ['femea_brinco', 'macho_brinco', 'status']:
        if f in data:
            setattr(rep, f, data[f] or None)
    for f in ['observacoes']:
        if f in data:
            setattr(rep, f, data[f] or None)
    for f in ['quantidade_nascidos', 'quantidade_vivos', 'lote_id']:
        if f in data:
            setattr(rep, f, to_int(data[f]))
    # Atualizar datas
    if 'data_cobertura' in data and data['data_cobertura']:
        dc = datetime.strptime(data['data_cobertura'], '%Y-%m-%d').date()
        rep.data_cobertura = dc
        if not data.get('data_parto_previsto'):
            rep.data_parto_previsto = dc + timedelta(days=114)
    if 'data_parto_previsto' in data and data['data_parto_previsto']:
        rep.data_parto_previsto = datetime.strptime(data['data_parto_previsto'], '%Y-%m-%d').date()
    if 'data_parto_real' in data and data['data_parto_real']:
        rep.data_parto_real = datetime.strptime(data['data_parto_real'], '%Y-%m-%d').date()

    db.session.commit()
    return jsonify(rep.to_dict())


@app.route('/api/reproducoes/<int:rid>', methods=['DELETE'])
@jwt_required()
def delete_reproducao(rid):
    u = get_current_user()
    if not can_edit(u.role):
        return jsonify({'error': 'Permissão negada'}), 403

    rep = Reproducao.query.get_or_404(rid)
    db.session.delete(rep)
    db.session.commit()
    return jsonify({'message': 'Registro excluído com sucesso'})


# ============== ALIMENTACAO ROUTES ==============

@app.route('/api/alimentacoes', methods=['GET'])
@jwt_required()
def get_alimentacoes():
    lote_id = request.args.get('lote_id')
    limit  = min(int(request.args.get('limit', 300)), 2000)
    offset = int(request.args.get('offset', 0))

    q = Alimentacao.query.options(
        joinedload(Alimentacao.lote),
        joinedload(Alimentacao.formulacao_ref)
    )
    if lote_id:
        q = q.filter_by(lote_id=lote_id)

    q = q.order_by(Alimentacao.data.desc())
    total = q.count()
    items = q.limit(limit).offset(offset).all()

    response = jsonify([a.to_dict() for a in items])
    response.headers['X-Total-Count'] = str(total)
    response.headers['X-Limit'] = str(limit)
    response.headers['X-Offset'] = str(offset)
    response.headers['Access-Control-Expose-Headers'] = 'X-Total-Count, X-Limit, X-Offset'
    return response


@app.route('/api/alimentacoes', methods=['POST'])
@jwt_required()
def create_alimentacao():
    u = get_current_user()
    if not can_write(u.role):
        return jsonify({'error': 'Permissão negada'}), 403

    data = request.get_json()
    if not data.get('data') or not data.get('quantidade_kg'):
        return jsonify({'error': 'Data e quantidade são obrigatórios'}), 400
    if not data.get('lote_id') and not data.get('plantel_grupo') and not data.get('plantel_brinco'):
        return jsonify({'error': 'Selecione um lote, um grupo do plantel ou um animal individual'}), 400

    formulacao_id = to_int(data.get('formulacao_id'))
    custo_unitario = to_float(data.get('custo_unitario'))
    # Se selecionou uma formulação e não informou custo, usa o custo calculado da fórmula
    if formulacao_id and custo_unitario is None:
        f = Formulacao.query.get(formulacao_id)
        if f:
            custo_unitario = f.calcular_custo_por_kg()

    alim = Alimentacao(
        lote_id=to_int(data.get('lote_id')),
        plantel_grupo=data.get('plantel_grupo') or None,
        plantel_brinco=data.get('plantel_brinco') or None,
        formulacao_id=formulacao_id,
        data=datetime.strptime(data['data'], '%Y-%m-%d').date(),
        racao_tipo=data.get('racao_tipo'),
        quantidade_kg=to_float(data.get('quantidade_kg')),
        custo_unitario=custo_unitario,
        observacoes=data.get('observacoes')
    )
    db.session.add(alim)
    db.session.commit()
    return jsonify(alim.to_dict()), 201


@app.route('/api/alimentacoes/<int:aid>', methods=['PUT'])
@jwt_required()
def update_alimentacao(aid):
    u = get_current_user()
    if not can_write(u.role):
        return jsonify({'error': 'Permissão negada'}), 403

    alim = Alimentacao.query.get_or_404(aid)
    data = request.get_json()

    for f in ['racao_tipo', 'quantidade_kg', 'custo_unitario', 'observacoes', 'lote_id', 'plantel_grupo', 'plantel_brinco']:
        if f in data:
            setattr(alim, f, data[f] if data[f] != '' else None)
    if 'data' in data:
        alim.data = datetime.strptime(data['data'], '%Y-%m-%d').date()

    db.session.commit()
    return jsonify(alim.to_dict())


@app.route('/api/alimentacoes/<int:aid>', methods=['DELETE'])
@jwt_required()
def delete_alimentacao(aid):
    u = get_current_user()
    if not can_edit(u.role):
        return jsonify({'error': 'Permissão negada'}), 403

    alim = Alimentacao.query.get_or_404(aid)
    db.session.delete(alim)
    db.session.commit()
    return jsonify({'message': 'Registro excluído com sucesso'})


def get_fase_reprodutiva(brinco):
    """Determina a fase reprodutiva atual de uma matriz pelo brinco."""
    today = date.today()
    repro = Reproducao.query.filter_by(femea_brinco=brinco).order_by(Reproducao.id.desc()).first()
    if not repro:
        return 'vazia'
    if repro.status == 'gestacao':
        if repro.data_parto_previsto:
            dias_para_parto = (repro.data_parto_previsto - today).days
            if dias_para_parto <= 10:
                return 'pre_parto'
        return 'gestacao'
    if repro.status in ('parto', 'desmame'):
        if repro.data_parto_real:
            dias_apos_parto = (today - repro.data_parto_real).days
            if dias_apos_parto <= 35:
                return 'lactacao'
    return 'vazia'


@app.route('/api/alimentacoes/consumo-individual', methods=['GET'])
@jwt_required()
def consumo_individual_plantel():
    """Retorna resumo de consumo por animal individual — 3 queries fixas independente do volume."""
    alims = Alimentacao.query.filter(Alimentacao.plantel_brinco.isnot(None)).all()
    if not alims:
        return jsonify([])

    unique_brincos = list({a.plantel_brinco for a in alims})

    # 1 query para todos os animais necessários
    plantel_map = {p.brinco: p for p in Plantel.query.filter(Plantel.brinco.in_(unique_brincos)).all()}

    # 1 query para a última reprodução de cada brinco
    sub = db.session.query(
        Reproducao.femea_brinco,
        func.max(Reproducao.id).label('max_id')
    ).filter(Reproducao.femea_brinco.in_(unique_brincos)).group_by(Reproducao.femea_brinco).subquery()
    repros = db.session.query(Reproducao).join(sub, Reproducao.id == sub.c.max_id).all()
    repro_map = {r.femea_brinco: r for r in repros}

    today = date.today()
    def fase_rapida(repro):
        if not repro: return 'vazia'
        if repro.status == 'gestacao':
            if repro.data_parto_previsto and (repro.data_parto_previsto - today).days <= 10:
                return 'pre_parto'
            return 'gestacao'
        if repro.status in ('parto', 'desmame'):
            if repro.data_parto_real and (today - repro.data_parto_real).days <= 35:
                return 'lactacao'
        return 'vazia'

    por_animal = {}
    for a in alims:
        b = a.plantel_brinco
        if b not in por_animal:
            p = plantel_map.get(b)
            por_animal[b] = {
                'brinco': b,
                'nome': p.nome if p else '',
                'tipo': p.tipo if p else '',
                'fase': fase_rapida(repro_map.get(b)) if p and p.tipo == 'matriz' else None,
                'total_kg': 0, 'custo_total': 0, 'registros': 0, 'ultimo_registro': None,
            }
        por_animal[b]['total_kg'] += (a.quantidade_kg or 0)
        por_animal[b]['custo_total'] += ((a.quantidade_kg or 0) * (a.custo_unitario or 0))
        por_animal[b]['registros'] += 1
        data_str = a.data.isoformat() if a.data else None
        if data_str and (por_animal[b]['ultimo_registro'] is None or data_str > por_animal[b]['ultimo_registro']):
            por_animal[b]['ultimo_registro'] = data_str

    resultado = sorted(por_animal.values(), key=lambda x: x['brinco'])
    for r in resultado:
        r['total_kg'] = round(r['total_kg'], 2)
        r['custo_total'] = round(r['custo_total'], 2)
    return jsonify(resultado)


# ============== FINANCEIRO ROUTES ==============

@app.route('/api/financeiro', methods=['GET'])
@jwt_required()
def get_financeiro():
    u = get_current_user()
    if not can_gestao(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    tipo = request.args.get('tipo')
    lote_id = request.args.get('lote_id')
    q = Financeiro.query
    if tipo:
        q = q.filter_by(tipo=tipo)
    if lote_id:
        q = q.filter_by(lote_id=lote_id)
    return jsonify([f.to_dict() for f in q.options(joinedload(Financeiro.lote)).order_by(Financeiro.data.desc()).all()])


@app.route('/api/financeiro', methods=['POST'])
@jwt_required()
def create_financeiro():
    u = get_current_user()
    if not can_gestao(u.role):
        return jsonify({'error': 'Permissão negada'}), 403

    data = request.get_json()
    if not data.get('tipo') or not data.get('descricao') or not data.get('valor') or not data.get('data'):
        return jsonify({'error': 'Tipo, descrição, valor e data são obrigatórios'}), 400

    fin = Financeiro(
        tipo=data['tipo'],
        categoria=data.get('categoria'),
        descricao=data['descricao'],
        valor=to_float(data.get('valor')),
        data=datetime.strptime(data['data'], '%Y-%m-%d').date(),
        lote_id=to_int(data.get('lote_id')),
        usuario_id=u.id
    )
    db.session.add(fin)
    db.session.commit()
    # Atualizar estoque se vinculado
    insumo_id = to_int(data.get('insumo_id'))
    insumo_qtd = to_float(data.get('insumo_quantidade'))
    if insumo_id and insumo_qtd and insumo_qtd > 0:
        item_est = Estoque.query.get(insumo_id)
        if item_est:
            item_est.quantidade += insumo_qtd
            if fin.valor and insumo_qtd:
                item_est.custo_unitario = round(fin.valor / insumo_qtd, 4)
            item_est.atualizado_em = datetime.utcnow()
            db.session.commit()
    # Marcar lote como vendido se receita de venda de animais
    if fin.tipo == 'receita' and fin.lote_id and fin.categoria in ('Venda de Animais', 'Venda de Leitoes'):
        lote = Lote.query.get(fin.lote_id)
        if lote and lote.status != 'vendido':
            lote.status = 'vendido'
            db.session.commit()
    return jsonify(fin.to_dict()), 201


@app.route('/api/financeiro/<int:fid>', methods=['PUT'])
@jwt_required()
def update_financeiro(fid):
    u = get_current_user()
    if not can_gestao(u.role):
        return jsonify({'error': 'Permissão negada'}), 403

    fin = Financeiro.query.get_or_404(fid)
    data = request.get_json()

    for f in ['tipo', 'categoria', 'descricao', 'lote_id']:
        if f in data:
            setattr(fin, f, data[f])
    if 'valor' in data:
        fin.valor = to_float(data.get('valor'))
    if 'data' in data:
        fin.data = datetime.strptime(data['data'], '%Y-%m-%d').date()

    db.session.commit()

    # Atualizar estoque se vinculado
    insumo_id = to_int(data.get('insumo_id'))
    insumo_qtd = to_float(data.get('insumo_quantidade'))
    if insumo_id and insumo_qtd and insumo_qtd > 0:
        item_est = Estoque.query.get(insumo_id)
        if item_est:
            item_est.quantidade = round(item_est.quantidade + insumo_qtd, 3)
            if fin.valor and insumo_qtd:
                item_est.custo_unitario = round(fin.valor / insumo_qtd, 4)
            item_est.atualizado_em = datetime.utcnow()
            db.session.commit()
    # Marcar lote como vendido se receita de venda de animais
    if fin.tipo == 'receita' and fin.lote_id and fin.categoria in ('Venda de Animais', 'Venda de Leitoes'):
        lote = Lote.query.get(fin.lote_id)
        if lote and lote.status != 'vendido':
            lote.status = 'vendido'
            db.session.commit()

    return jsonify(fin.to_dict())


@app.route('/api/financeiro/<int:fid>', methods=['DELETE'])
@jwt_required()
def delete_financeiro(fid):
    u = get_current_user()
    if not can_edit(u.role):
        return jsonify({'error': 'Permissão negada'}), 403

    fin = Financeiro.query.get_or_404(fid)
    db.session.delete(fin)
    db.session.commit()
    return jsonify({'message': 'Registro excluído com sucesso'})


# ============== INGREDIENTES ROUTES ==============

@app.route('/api/ingredientes', methods=['GET'])
@jwt_required()
def get_ingredientes():
    return jsonify([i.to_dict() for i in Ingrediente.query.order_by(Ingrediente.nome).all()])


@app.route('/api/ingredientes', methods=['POST'])
@jwt_required()
def create_ingrediente():
    u = get_current_user()
    if not can_edit(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    data = request.get_json()
    if not data.get('nome'):
        return jsonify({'error': 'Nome é obrigatório'}), 400
    ing = Ingrediente(
        nome=data['nome'],
        unidade=data.get('unidade', 'kg'),
        estoque_kg=to_float(data.get('estoque_kg'), 0),
        custo_por_kg=to_float(data.get('custo_por_kg'), 0),
        ativo=data.get('ativo', True)
    )
    db.session.add(ing)
    db.session.commit()
    return jsonify(ing.to_dict()), 201


@app.route('/api/ingredientes/<int:iid>', methods=['PUT'])
@jwt_required()
def update_ingrediente(iid):
    u = get_current_user()
    if not can_edit(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    ing = Ingrediente.query.get_or_404(iid)
    data = request.get_json()
    for f in ['nome', 'unidade', 'estoque_kg', 'custo_por_kg', 'ativo']:
        if f in data:
            setattr(ing, f, data[f])
    db.session.commit()
    return jsonify(ing.to_dict())


@app.route('/api/ingredientes/<int:iid>', methods=['DELETE'])
@jwt_required()
def delete_ingrediente(iid):
    u = get_current_user()
    if not is_admin(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    ing = Ingrediente.query.get_or_404(iid)
    db.session.delete(ing)
    db.session.commit()
    return jsonify({'message': 'Ingrediente excluído'})


# ============== FORMULACOES ROUTES ==============

@app.route('/api/formulacoes', methods=['GET'])
@jwt_required()
def get_formulacoes():
    u = get_current_user()
    if not can_gestao(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    return jsonify([f.to_dict() for f in Formulacao.query.options(
        subqueryload(Formulacao.itens).subqueryload(FormulacaoItem.ingrediente_ref)
    ).order_by(Formulacao.nome).all()])


@app.route('/api/formulacoes', methods=['POST'])
@jwt_required()
def create_formulacao():
    u = get_current_user()
    if not can_gestao(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    data = request.get_json()
    if not data.get('nome'):
        return jsonify({'error': 'Nome é obrigatório'}), 400

    form = Formulacao(
        nome=data['nome'],
        descricao=data.get('descricao'),
        fase=data.get('fase'),
        ativa=data.get('ativa', True)
    )
    db.session.add(form)
    db.session.flush()  # get id before adding items

    for item in data.get('itens', []):
        ing = Ingrediente.query.get(item.get('ingrediente_id'))
        fi = FormulacaoItem(
            formulacao_id=form.id,
            ingrediente_id=item['ingrediente_id'],
            percentagem=to_float(item.get('percentagem'), 0),
            custo_unitario=ing.custo_por_kg if ing else to_float(item.get('custo_unitario'), 0)
        )
        db.session.add(fi)

    db.session.commit()
    return jsonify(form.to_dict()), 201


@app.route('/api/formulacoes/<int:fid>', methods=['PUT'])
@jwt_required()
def update_formulacao(fid):
    u = get_current_user()
    if not can_gestao(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    form = Formulacao.query.get_or_404(fid)
    data = request.get_json()

    for f in ['nome', 'descricao', 'fase', 'ativa']:
        if f in data:
            setattr(form, f, data[f])

    if 'itens' in data:
        # Replaces all items
        FormulacaoItem.query.filter_by(formulacao_id=fid).delete()
        for item in data['itens']:
            ing = Ingrediente.query.get(item.get('ingrediente_id'))
            fi = FormulacaoItem(
                formulacao_id=fid,
                ingrediente_id=item['ingrediente_id'],
                percentagem=to_float(item.get('percentagem'), 0),
                custo_unitario=ing.custo_por_kg if ing else to_float(item.get('custo_unitario'), 0)
            )
            db.session.add(fi)

    db.session.commit()
    return jsonify(form.to_dict())


@app.route('/api/formulacoes/<int:fid>', methods=['DELETE'])
@jwt_required()
def delete_formulacao(fid):
    u = get_current_user()
    if not can_gestao(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    form = Formulacao.query.get_or_404(fid)
    db.session.delete(form)
    db.session.commit()
    return jsonify({'message': 'Formulação excluída'})


@app.route('/api/formulacoes/<int:fid>/produzir', methods=['POST'])
@jwt_required()
def produzir_formulacao(fid):
    u = get_current_user()
    if not can_write(u.role):
        return jsonify({'error': 'Permissão negada'}), 403

    formulacao = Formulacao.query.get_or_404(fid)
    data = request.get_json()

    quantidade_kg = to_float(data.get('quantidade_kg'))
    if not quantidade_kg or quantidade_kg <= 0:
        return jsonify({'error': 'Quantidade inválida'}), 400
    if not data.get('data'):
        return jsonify({'error': 'Data é obrigatória'}), 400
    if not data.get('lote_id') and not data.get('plantel_grupo'):
        return jsonify({'error': 'Selecione um lote ou grupo do plantel'}), 400

    # Calcula custo/kg com preços atuais dos ingredientes
    custo_atual_por_kg = 0
    for item in formulacao.itens:
        ing = Ingrediente.query.get(item.ingrediente_id)
        if ing:
            custo_atual_por_kg += (item.percentagem / 100) * (ing.custo_por_kg or 0)

    # Cria registro de Alimentação
    alim = Alimentacao(
        lote_id=to_int(data.get('lote_id')),
        plantel_grupo=data.get('plantel_grupo') or None,
        formulacao_id=fid,
        data=datetime.strptime(data['data'], '%Y-%m-%d').date(),
        racao_tipo=formulacao.nome,
        quantidade_kg=quantidade_kg,
        custo_unitario=round(custo_atual_por_kg, 4),
        observacoes=data.get('observacoes') or f'Produção via formulação: {formulacao.nome}'
    )
    db.session.add(alim)

    # Deduz estoque de ingredientes se solicitado
    if data.get('deduzir_estoque'):
        for item in formulacao.itens:
            ing = Ingrediente.query.get(item.ingrediente_id)
            if ing:
                qty_necessaria = quantidade_kg * (item.percentagem / 100)
                ing.estoque_kg = max(0, (ing.estoque_kg or 0) - qty_necessaria)

    db.session.commit()
    return jsonify(alim.to_dict()), 201


# ============== DASHBOARD ==============

@app.route('/api/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    hoje = date.today()
    em_30_dias = hoje + timedelta(days=30)
    ultimo_mes = hoje - timedelta(days=30)

    total_lotes_ativos = Lote.query.filter_by(status='ativo').count()
    total_animais = Animal.query.filter_by(status='ativo').count()
    total_vacinacoes = Vacinacao.query.count()

    receitas = db.session.query(func.sum(Financeiro.valor)).filter_by(tipo='receita').scalar() or 0
    despesas_fin = db.session.query(func.sum(Financeiro.valor)).filter_by(tipo='despesa').scalar() or 0

    # Custos operacionais dos outros módulos
    # Usa Python para calcular custo de ração com fallback na formulação
    # (custo_unitario pode ser NULL se o usuário não informou preço ao registrar)
    alims_all = Alimentacao.query.options(joinedload(Alimentacao.formulacao_ref)).all()
    custo_racao_total = 0
    custo_racao_30d = 0
    for a in alims_all:
        qty = a.quantidade_kg or 0
        cost = a.custo_unitario
        if cost is None and a.formulacao_ref:
            cost = a.formulacao_ref.calcular_custo_por_kg()
        custo_racao_total += qty * (cost or 0)
        if a.data and a.data >= ultimo_mes:
            custo_racao_30d += qty * (cost or 0)

    custo_sanidade = db.session.query(func.sum(func.coalesce(Vacinacao.custo, 0))).scalar() or 0
    # Aquisição: animais de lote + matrizes/barrão do plantel
    custo_aquisicao_lote = db.session.query(func.sum(func.coalesce(Animal.custo_aquisicao, 0))).scalar() or 0
    custo_aquisicao_plantel = db.session.query(func.sum(func.coalesce(Plantel.custo_aquisicao, 0))).scalar() or 0
    custo_aquisicao = custo_aquisicao_lote + custo_aquisicao_plantel
    total_operacional = custo_racao_total + custo_sanidade + custo_aquisicao

    total_despesas = despesas_fin + total_operacional
    saldo = receitas - total_despesas

    partos_previstos = Reproducao.query.filter(
        Reproducao.data_parto_previsto >= hoje,
        Reproducao.data_parto_previsto <= em_30_dias,
        Reproducao.status == 'gestacao'
    ).count()

    lotes_recentes = Lote.query.order_by(Lote.criado_em.desc()).limit(5).all()

    return jsonify({
        'total_lotes_ativos': total_lotes_ativos,
        'total_animais': total_animais,
        'total_vacinacoes': total_vacinacoes,
        'receitas': round(receitas, 2),
        'despesas': round(total_despesas, 2),
        'despesas_financeiro': round(despesas_fin, 2),
        'total_operacional': round(total_operacional, 2),
        'saldo': round(saldo, 2),
        'partos_previstos_30dias': partos_previstos,
        'custo_racao_30dias': round(custo_racao_30d, 2),
        'lotes_recentes': [l.to_dict() for l in lotes_recentes]
    })


# ============== RELATORIOS ==============

# GMD esperado por fase (referência suinocultura intensiva BR)
GMD_REFERENCIA = {
    'maternidade': {'min': 0.18, 'ideal': 0.25, 'label': 'Maternidade'},
    'creche':      {'min': 0.35, 'ideal': 0.50, 'label': 'Creche'},
    'crescimento': {'min': 0.55, 'ideal': 0.70, 'label': 'Crescimento'},
    'terminacao':  {'min': 0.75, 'ideal': 0.90, 'label': 'Terminação'},
}

def calcular_gmd_lote(lote):
    """Calcula GMD do lote com base nas pesagens registradas."""
    pesagens = sorted(lote.pesagens, key=lambda p: p.data)
    hoje = date.today()
    dias_producao = (hoje - lote.data_entrada).days if lote.data_entrada else 0

    peso_entrada = lote.peso_medio_entrada or 0

    if len(pesagens) >= 2:
        dias = (pesagens[-1].data - pesagens[0].data).days
        ganho = pesagens[-1].peso_medio - pesagens[0].peso_medio
        gmd = round(ganho / max(dias, 1), 3)
        peso_atual = pesagens[-1].peso_medio
        data_ref = pesagens[-1].data
        fonte = 'pesagens'
        n_pesagens = len(pesagens)
    elif len(pesagens) == 1:
        dias = (pesagens[0].data - lote.data_entrada).days if lote.data_entrada else 0
        ganho = pesagens[0].peso_medio - peso_entrada
        gmd = round(ganho / max(dias, 1), 3)
        peso_atual = pesagens[0].peso_medio
        data_ref = pesagens[0].data
        fonte = 'pesagem_unica'
        n_pesagens = 1
    else:
        # Sem pesagens — tenta usar peso_atual dos animais individuais
        animais = [a for a in lote.animais if a.status == 'ativo' and a.peso_atual]
        if animais:
            pesos = [a.peso_atual for a in animais]
            peso_atual = sum(pesos) / len(pesos)
            ganho = peso_atual - peso_entrada
            gmd = round(ganho / max(dias_producao, 1), 3) if dias_producao > 0 else None
            data_ref = None
            fonte = 'peso_animal'
            n_pesagens = 0
        else:
            return None  # Sem dados suficientes

    # Comparar com referência da fase
    fase = (lote.fase or '').lower()
    ref = GMD_REFERENCIA.get(fase)

    if gmd is None or gmd <= 0:
        status = 'sem_dados'
        alerta = None
        pct_ideal = None
    elif ref:
        pct_ideal = round((gmd / ref['ideal']) * 100, 1)
        if gmd >= ref['min']:
            status = 'ok'
            alerta = None
        elif gmd >= ref['min'] * 0.70:
            status = 'alerta'
            alerta = f"GMD abaixo do mínimo para {ref['label']} (mín: {ref['min']} kg/dia)"
        else:
            status = 'critico'
            alerta = f"GMD CRÍTICO para {ref['label']} — {gmd:.3f} kg/dia (mín: {ref['min']} kg/dia)"
    else:
        pct_ideal = None
        status = 'ok'
        alerta = None

    # Histórico de GMD por intervalo entre pesagens
    historico = []
    for i in range(len(pesagens) - 1, -1, -1):  # mais recente primeiro
        p = pesagens[i]
        p_ant = pesagens[i - 1] if i > 0 else None
        if p_ant:
            d = (p.data - p_ant.data).days
            g = round((p.peso_medio - p_ant.peso_medio) / max(d, 1), 3)
        elif lote.data_entrada:
            d = (p.data - lote.data_entrada).days
            g = round((p.peso_medio - peso_entrada) / max(d, 1), 3)
        else:
            g = None
        historico.append({
            'data': p.data.isoformat(),
            'peso_medio': p.peso_medio,
            'total_animais': p.total_animais,
            'gmd_intervalo': g,
            'dias_intervalo': d if p_ant or lote.data_entrada else None,
        })

    return {
        'lote_id': lote.id,
        'numero': lote.numero,
        'fase': lote.fase or '-',
        'status': lote.status,
        'data_entrada': lote.data_entrada.isoformat() if lote.data_entrada else None,
        'dias_producao': dias_producao,
        'peso_entrada': peso_entrada,
        'peso_atual': round(peso_atual, 2),
        'gmd': gmd,
        'n_pesagens': n_pesagens,
        'fonte': fonte,
        'status_gmd': status,
        'alerta': alerta,
        'pct_ideal': pct_ideal,
        'ref_min': ref['min'] if ref else None,
        'ref_ideal': ref['ideal'] if ref else None,
        'ref_label': ref['label'] if ref else None,
        'historico_pesagens': historico,
    }


@app.route('/api/relatorios/gmd', methods=['GET'])
@jwt_required()
def relatorio_gmd():
    u = get_current_user()
    if not can_gestao(u.role):
        return jsonify({'error': 'Permissão negada'}), 403

    lotes = Lote.query.options(
        subqueryload(Lote.pesagens),
        subqueryload(Lote.animais),
    ).all()

    resultado = []
    sem_dados = []
    alertas_criticos = 0
    alertas_atencao = 0

    for lote in lotes:
        dados = calcular_gmd_lote(lote)
        if dados:
            resultado.append(dados)
            if dados['status_gmd'] == 'critico':
                alertas_criticos += 1
            elif dados['status_gmd'] == 'alerta':
                alertas_atencao += 1
        else:
            sem_dados.append({
                'lote_id': lote.id,
                'numero': lote.numero,
                'fase': lote.fase or '-',
                'status': lote.status,
                'motivo': 'Sem pesagens e sem peso registrado nos animais',
            })

    # Ordena: crítico → alerta → ok → sem_dados
    ordem = {'critico': 0, 'alerta': 1, 'ok': 2, 'sem_dados': 3}
    resultado.sort(key=lambda x: (ordem.get(x['status_gmd'], 4), x['numero']))

    return jsonify({
        'lotes': resultado,
        'sem_dados': sem_dados,
        'resumo': {
            'total_lotes': len(resultado) + len(sem_dados),
            'com_dados': len(resultado),
            'alertas_criticos': alertas_criticos,
            'alertas_atencao': alertas_atencao,
            'ok': len([l for l in resultado if l['status_gmd'] == 'ok']),
        },
        'referencias': GMD_REFERENCIA,
    })

@app.route('/api/relatorios/lotes', methods=['GET'])
@jwt_required()
def relatorio_lotes():
    u = get_current_user()
    if not can_gestao(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    # Carrega tudo com eager loading — evita N+1 queries por lote
    lotes = Lote.query.options(
        subqueryload(Lote.alimentacoes).joinedload(Alimentacao.formulacao_ref),
        subqueryload(Lote.vacinacoes),
        subqueryload(Lote.animais),
    ).all()

    # Receitas e despesas por lote em 2 queries agregadas
    lote_ids = [l.id for l in lotes]
    rec_rows = db.session.query(
        Financeiro.lote_id, func.sum(Financeiro.valor)
    ).filter(Financeiro.lote_id.in_(lote_ids), Financeiro.tipo == 'receita').group_by(Financeiro.lote_id).all()
    desp_rows = db.session.query(
        Financeiro.lote_id, func.sum(Financeiro.valor)
    ).filter(Financeiro.lote_id.in_(lote_ids), Financeiro.tipo == 'despesa').group_by(Financeiro.lote_id).all()
    receita_map = {r[0]: r[1] or 0 for r in rec_rows}
    despesa_map = {r[0]: r[1] or 0 for r in desp_rows}

    result = []
    for lote in lotes:
        # Mortalidade: usa contagem real de animais com status='morto' OU diferença inicial-atual
        mortos_registrados = sum(1 for a in lote.animais if a.status == 'morto')
        mortalidade_batch = max(0, lote.quantidade_inicial - lote.quantidade_atual)
        mortalidade = max(mortos_registrados, mortalidade_batch)
        taxa_mort = (mortalidade / lote.quantidade_inicial * 100) if lote.quantidade_inicial else 0
        custo_alim = sum(
            (a.quantidade_kg or 0) * (a.custo_unitario if a.custo_unitario is not None else (a.formulacao_ref.calcular_custo_por_kg() if a.formulacao_ref else 0))
            for a in lote.alimentacoes
        )
        custo_sanidade = sum((v.custo or 0) for v in lote.vacinacoes)
        custo_aquisicao = sum((a.custo_aquisicao or 0) for a in lote.animais)
        custo_total = custo_alim + custo_sanidade + custo_aquisicao
        qtd_atual = lote.quantidade_atual or 1
        receita_lote = receita_map.get(lote.id, 0)
        despesa_fin_lote = despesa_map.get(lote.id, 0)
        custo_total_com_fin = custo_total + despesa_fin_lote
        # (receita e despesa já carregados via aggregation acima)
        resultado_lote = receita_lote - custo_total_com_fin
        result.append({
            **lote.to_dict(),
            'mortalidade': mortalidade,
            'taxa_mortalidade': round(taxa_mort, 2),
            'custo_racao': round(custo_alim, 2),
            'custo_sanidade': round(custo_sanidade, 2),
            'custo_aquisicao_animais': round(custo_aquisicao, 2),
            'total_operacional': round(custo_total_com_fin, 2),
            'custo_por_animal': round(custo_total_com_fin / qtd_atual, 2) if qtd_atual else 0,
            'peso_medio_saida': lote.peso_medio_entrada or 0,
            'receita_lote': round(receita_lote, 2),
            'resultado_lote': round(resultado_lote, 2),
        })
    return jsonify(result)


@app.route('/api/relatorios/financeiro', methods=['GET'])
@jwt_required()
def relatorio_financeiro():
    u = get_current_user()
    if not can_gestao(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    total_rec = db.session.query(func.sum(Financeiro.valor)).filter_by(tipo='receita').scalar() or 0
    total_desp = db.session.query(func.sum(Financeiro.valor)).filter_by(tipo='despesa').scalar() or 0

    # Custos operacionais (fora do módulo financeiro)
    # Usa Python para custo de ração com fallback na formulação quando custo_unitario é NULL
    alims_rel = Alimentacao.query.options(joinedload(Alimentacao.formulacao_ref)).all()
    custo_racao = 0
    for a in alims_rel:
        qty = a.quantidade_kg or 0
        cost = a.custo_unitario
        if cost is None and a.formulacao_ref:
            cost = a.formulacao_ref.calcular_custo_por_kg()
        custo_racao += qty * (cost or 0)

    custo_sanidade = db.session.query(func.sum(func.coalesce(Vacinacao.custo, 0))).scalar() or 0
    # Aquisição: animais de lote + matrizes/barrão do plantel
    custo_aquisicao_lote = db.session.query(func.sum(func.coalesce(Animal.custo_aquisicao, 0))).scalar() or 0
    custo_aquisicao_plantel = db.session.query(func.sum(func.coalesce(Plantel.custo_aquisicao, 0))).scalar() or 0
    custo_aquisicao = custo_aquisicao_lote + custo_aquisicao_plantel
    total_operacional = custo_racao + custo_sanidade + custo_aquisicao

    rec_cat = db.session.query(
        Financeiro.categoria, func.sum(Financeiro.valor).label('total')
    ).filter_by(tipo='receita').group_by(Financeiro.categoria).all()

    desp_cat = db.session.query(
        Financeiro.categoria, func.sum(Financeiro.valor).label('total')
    ).filter_by(tipo='despesa').group_by(Financeiro.categoria).all()

    # Resultado por lote — tudo agregado em 3 queries, sem loop com queries
    lotes = Lote.query.options(
        subqueryload(Lote.alimentacoes).joinedload(Alimentacao.formulacao_ref),
        subqueryload(Lote.vacinacoes),
        subqueryload(Lote.animais),
    ).all()
    lids = [l.id for l in lotes]
    rec_por_lote = {r[0]: r[1] or 0 for r in db.session.query(
        Financeiro.lote_id, func.sum(Financeiro.valor)
    ).filter(Financeiro.lote_id.in_(lids), Financeiro.tipo == 'receita').group_by(Financeiro.lote_id).all()}
    desp_por_lote = {r[0]: r[1] or 0 for r in db.session.query(
        Financeiro.lote_id, func.sum(Financeiro.valor)
    ).filter(Financeiro.lote_id.in_(lids), Financeiro.tipo == 'despesa').group_by(Financeiro.lote_id).all()}

    resultado_por_lote = []
    for lote in lotes:
        rec_l = rec_por_lote.get(lote.id, 0)
        desp_l = desp_por_lote.get(lote.id, 0)
        custo_alim_l = sum(
            (a.quantidade_kg or 0) * (a.custo_unitario if a.custo_unitario is not None else (a.formulacao_ref.calcular_custo_por_kg() if a.formulacao_ref else 0))
            for a in lote.alimentacoes
        )
        custo_san_l = sum((v.custo or 0) for v in lote.vacinacoes)
        custo_aq_l = sum((a.custo_aquisicao or 0) for a in lote.animais)
        custo_total_l = desp_l + custo_alim_l + custo_san_l + custo_aq_l
        resultado_por_lote.append({
            'lote_id': lote.id,
            'lote_numero': lote.numero,
            'status': lote.status,
            'receita': round(rec_l, 2),
            'custo_total': round(custo_total_l, 2),
            'resultado': round(rec_l - custo_total_l, 2),
        })

    total_custos = total_desp + total_operacional
    saldo_real = total_rec - total_custos

    return jsonify({
        'total_receitas': round(total_rec, 2),
        'total_despesas': round(total_desp, 2),
        'total_custos': round(total_custos, 2),
        'saldo': round(saldo_real, 2),
        'lucro': round(saldo_real, 2),
        'custos_operacionais': {
            'custo_racao': round(custo_racao, 2),
            'custo_sanidade': round(custo_sanidade, 2),
            'custo_aquisicao_animais': round(custo_aquisicao_lote, 2),
            'custo_aquisicao_plantel': round(custo_aquisicao_plantel, 2),
            'custo_aquisicao_total': round(custo_aquisicao, 2),
            'total_operacional': round(total_operacional, 2),
        },
        'custo_racao': round(custo_racao, 2),
        'custo_sanidade': round(custo_sanidade, 2),
        'custo_aquisicao_animais': round(custo_aquisicao, 2),
        'total_operacional': round(total_operacional, 2),
        'receitas_por_categoria': [{'categoria': r[0] or 'Outros', 'total': float(r[1])} for r in rec_cat],
        'despesas_por_categoria': [{'categoria': d[0] or 'Outros', 'total': float(d[1])} for d in desp_cat],
        'resultado_por_lote': resultado_por_lote,
    })


# ============== LEGACY / WEBHOOK ==============

@app.route('/lotes', methods=['GET'])
def get_lotes_legacy():
    lotes = Lote.query.order_by(Lote.criado_em.desc()).all()
    return jsonify([l.to_dict() for l in lotes])


@app.route('/webhook', methods=['POST'])
def webhook():
    return jsonify({'status': 'ok'})


@app.route('/health', methods=['GET'])
def health():
    try:
        tables = {
            'usuarios': Usuario.query.count(),
            'lotes': Lote.query.count(),
            'animais': Animal.query.count(),
            'ingredientes': Ingrediente.query.count(),
            'formulacoes': Formulacao.query.count(),
        }
        return jsonify({'status': 'ok', 'version': '2.2.0', 'tables': tables})
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)}), 500


@app.route('/api/debug/lote', methods=['POST'])
def debug_lote():
    """Endpoint sem JWT para testar insert de lote."""
    try:
        data = request.get_json()
        return jsonify({
            'received': data,
            'numero': data.get('numero'),
            'data_entrada': data.get('data_entrada'),
            'quantidade_inicial': data.get('quantidade_inicial'),
            'tipos': {k: type(v).__name__ for k, v in (data or {}).items()}
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500



# ============== ESTOQUE ==============

@app.route('/api/estoque', methods=['GET'])
@jwt_required()
def get_estoque():
    u = get_current_user()
    if not can_gestao(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    items = Estoque.query.order_by(Estoque.categoria, Estoque.nome).all()
    return jsonify([i.to_dict() for i in items])

@app.route('/api/estoque', methods=['POST'])
@jwt_required()
def create_estoque():
    u = get_current_user()
    if not can_gestao(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    data = request.get_json()
    if not data.get('nome'):
        return jsonify({'error': 'Nome é obrigatório'}), 400
    item = Estoque(
        nome=data['nome'],
        categoria=data.get('categoria', 'outro'),
        unidade=data.get('unidade', 'kg'),
        quantidade=to_float(data.get('quantidade'), 0),
        custo_unitario=to_float(data.get('custo_unitario'), 0),
        estoque_minimo=to_float(data.get('estoque_minimo'), 0),
        observacoes=data.get('observacoes')
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201

@app.route('/api/estoque/<int:eid>', methods=['PUT'])
@jwt_required()
def update_estoque(eid):
    u = get_current_user()
    if not can_gestao(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    item = Estoque.query.get_or_404(eid)
    data = request.get_json()
    for f in ['nome', 'categoria', 'unidade', 'observacoes']:
        if f in data:
            setattr(item, f, data[f])
    for f in ['quantidade', 'custo_unitario', 'estoque_minimo']:
        if f in data:
            setattr(item, f, to_float(data.get(f), 0))
    item.atualizado_em = datetime.utcnow()
    db.session.commit()
    return jsonify(item.to_dict())

@app.route('/api/estoque/<int:eid>', methods=['DELETE'])
@jwt_required()
def delete_estoque(eid):
    u = get_current_user()
    if not can_edit(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    item = Estoque.query.get_or_404(eid)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'ok': True})

@app.route('/api/estoque/<int:eid>/entrada', methods=['POST'])
@jwt_required()
def entrada_estoque(eid):
    u = get_current_user()
    if not can_gestao(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    item = Estoque.query.get_or_404(eid)
    data = request.get_json()
    qtd = to_float(data.get('quantidade'), 0)
    custo = to_float(data.get('custo_unitario'))
    item.quantidade = round(item.quantidade + qtd, 3)
    if custo is not None and custo > 0:
        item.custo_unitario = custo
    item.atualizado_em = datetime.utcnow()
    db.session.commit()
    return jsonify(item.to_dict())

# ============== ANIMAIS EM LOTE ==============

@app.route('/api/lotes/<int:lid>/criar-animais', methods=['POST'])
@jwt_required()
def criar_animais_lote(lid):
    u = get_current_user()
    if not can_write(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    lote = Lote.query.get_or_404(lid)
    data = request.get_json()
    quantidade = to_int(data.get('quantidade'), 0)
    if not quantidade or quantidade <= 0 or quantidade > 500:
        return jsonify({'error': 'Quantidade deve ser entre 1 e 500'}), 400
    sexo = data.get('sexo', 'macho')
    raca = data.get('raca', '')
    peso_entrada = to_float(data.get('peso_entrada'))
    origem = data.get('origem', 'nascido')
    custo_aquisicao = to_float(data.get('custo_aquisicao'), 0)
    prefixo = data.get('prefixo_brinco') or f'L{lid}-'
    num_ini = to_int(data.get('numero_inicial'), 1)
    animais_criados = []
    for i in range(quantidade):
        num = num_ini + i
        animal = Animal(
            lote_id=lid,
            brinco=f'{prefixo}{num:03d}',
            sexo=sexo,
            raca=raca or None,
            peso_entrada=peso_entrada,
            peso_atual=peso_entrada,
            status='ativo',
            origem=origem,
            custo_aquisicao=custo_aquisicao
        )
        db.session.add(animal)
        animais_criados.append(animal.brinco)
    db.session.commit()
    return jsonify({'criados': len(animais_criados), 'brincos': animais_criados[:10]}), 201

# ============== PLANTEL ==============

@app.route('/api/plantel', methods=['GET'])
@jwt_required()
def get_plantel():
    tipo = request.args.get('tipo')
    q = Plantel.query
    if tipo:
        q = q.filter_by(tipo=tipo)
    animais = q.order_by(Plantel.brinco).all()

    # Batch load partos count para todas as matrizes em 1 query
    brincos_matrizes = [a.brinco for a in animais if a.tipo == 'matriz']
    partos_map = {}
    if brincos_matrizes:
        rows = db.session.query(
            Reproducao.femea_brinco,
            func.count(Reproducao.id).label('total')
        ).filter(
            Reproducao.femea_brinco.in_(brincos_matrizes),
            Reproducao.status == 'parto'
        ).group_by(Reproducao.femea_brinco).all()
        partos_map = {r.femea_brinco: r.total for r in rows}

    result = []
    for p in animais:
        d = p.to_dict()
        if p.tipo == 'matriz':
            d['total_partos'] = partos_map.get(p.brinco, 0)
        result.append(d)
    return jsonify(result)

@app.route('/api/plantel', methods=['POST'])
@jwt_required()
def create_plantel():
    u = get_current_user()
    if not can_write(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    data = request.get_json()
    if not data.get('brinco'):
        return jsonify({'error': 'Brinco é obrigatório'}), 400
    if data.get('tipo') not in ['matriz', 'reprodutor']:
        return jsonify({'error': 'Tipo deve ser matriz ou reprodutor'}), 400
    if Plantel.query.filter_by(brinco=data['brinco']).first():
        return jsonify({'error': f"Brinco '{data['brinco']}' já cadastrado no plantel"}), 400
    p = Plantel(
        brinco=data['brinco'],
        tipo=data['tipo'],
        nome=data.get('nome') or None,
        raca=data.get('raca') or None,
        data_nascimento=date.fromisoformat(data['data_nascimento']) if data.get('data_nascimento') else None,
        peso_atual=to_float(data.get('peso_atual')),
        status=data.get('status', 'ativo'),
        origem=data.get('origem', 'comprado'),
        custo_aquisicao=to_float(data.get('custo_aquisicao'), 0),
        observacoes=data.get('observacoes') or None
    )
    db.session.add(p)
    db.session.commit()
    return jsonify(p.to_dict()), 201

@app.route('/api/plantel/<int:pid>', methods=['PUT'])
@jwt_required()
def update_plantel(pid):
    u = get_current_user()
    if not can_write(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    p = Plantel.query.get_or_404(pid)
    data = request.get_json()
    for f in ['brinco', 'tipo', 'nome', 'raca', 'status', 'origem', 'observacoes']:
        if f in data:
            setattr(p, f, data[f] or None)
    if 'data_nascimento' in data:
        p.data_nascimento = date.fromisoformat(data['data_nascimento']) if data['data_nascimento'] else None
    if 'peso_atual' in data:
        p.peso_atual = to_float(data['peso_atual'])
    if 'custo_aquisicao' in data:
        p.custo_aquisicao = to_float(data.get('custo_aquisicao'), 0)
    db.session.commit()
    return jsonify(p.to_dict())

@app.route('/api/plantel/<int:pid>', methods=['DELETE'])
@jwt_required()
def delete_plantel(pid):
    u = get_current_user()
    if not can_edit(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    p = Plantel.query.get_or_404(pid)
    db.session.delete(p)
    db.session.commit()
    return jsonify({'ok': True})


# ============== PESAGENS ==============

@app.route('/api/pesagens', methods=['GET'])
@jwt_required()
def get_pesagens():
    lote_id = request.args.get('lote_id')
    q = Pesagem.query
    if lote_id:
        q = q.filter_by(lote_id=lote_id)
    return jsonify([p.to_dict() for p in q.order_by(Pesagem.data.desc()).all()])

@app.route('/api/pesagens', methods=['POST'])
@jwt_required()
def create_pesagem():
    u = get_current_user()
    if not can_write(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    data = request.get_json(force=True, silent=True)
    if not data:
        return jsonify({'error': 'JSON inválido ou body vazio'}), 400
    lote_id = data.get('lote_id')
    peso_medio = data.get('peso_medio')
    data_str = data.get('data')
    if not lote_id or not peso_medio or not data_str:
        return jsonify({'error': f'Campos obrigatórios ausentes: lote_id={lote_id}, peso_medio={peso_medio}, data={data_str}'}), 400
    try:
        data_obj = date.fromisoformat(str(data_str))
    except Exception as e:
        return jsonify({'error': f'Data inválida: {data_str} — {e}'}), 400
    try:
        p = Pesagem(
            lote_id=int(lote_id),
            data=data_obj,
            peso_medio=float(peso_medio),
            total_animais=to_int(data.get('total_animais')),
            observacoes=data.get('observacoes')
        )
        db.session.add(p)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao salvar pesagem: {str(e)}'}), 500
    return jsonify(p.to_dict()), 201

@app.route('/api/pesagens/<int:pid>', methods=['DELETE'])
@jwt_required()
def delete_pesagem(pid):
    u = get_current_user()
    if not can_edit(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    p = Pesagem.query.get_or_404(pid)
    db.session.delete(p)
    db.session.commit()
    return jsonify({'ok': True})


# ============== INIT ==============

def init_db():
    with app.app_context():
        db.create_all()
        # Migrations: cada ALTER TABLE é executado em conexão independente
        # para evitar que uma falha aborte as subsequentes (comportamento PostgreSQL)
        migrations = [
            # --- Schema fixes ---
            "ALTER TABLE alimentacoes ALTER COLUMN lote_id DROP NOT NULL",
            "ALTER TABLE alimentacoes ADD COLUMN IF NOT EXISTS plantel_grupo VARCHAR(20)",
            "ALTER TABLE alimentacoes ADD COLUMN IF NOT EXISTS plantel_brinco VARCHAR(50)",
            "ALTER TABLE vacinacoes ADD COLUMN IF NOT EXISTS plantel_brinco VARCHAR(50)",
            "ALTER TABLE vacinacoes ADD COLUMN IF NOT EXISTS custo FLOAT DEFAULT 0",
            "ALTER TABLE vacinacoes ADD COLUMN IF NOT EXISTS marca_fabricante VARCHAR(100)",
            "ALTER TABLE vacinacoes ADD COLUMN IF NOT EXISTS lote_vacina VARCHAR(50)",
            # --- Performance indexes ---
            "CREATE INDEX IF NOT EXISTS idx_animais_lote_id ON animais(lote_id)",
            "CREATE INDEX IF NOT EXISTS idx_animais_status ON animais(status)",
            "CREATE INDEX IF NOT EXISTS idx_vacinacoes_lote_id ON vacinacoes(lote_id)",
            "CREATE INDEX IF NOT EXISTS idx_vacinacoes_data ON vacinacoes(data)",
            "CREATE INDEX IF NOT EXISTS idx_vacinacoes_plantel_brinco ON vacinacoes(plantel_brinco)",
            "CREATE INDEX IF NOT EXISTS idx_alimentacoes_lote_id ON alimentacoes(lote_id)",
            "CREATE INDEX IF NOT EXISTS idx_alimentacoes_data ON alimentacoes(data)",
            "CREATE INDEX IF NOT EXISTS idx_alimentacoes_plantel_grupo ON alimentacoes(plantel_grupo)",
            "CREATE INDEX IF NOT EXISTS idx_alimentacoes_plantel_brinco ON alimentacoes(plantel_brinco)",
            "CREATE INDEX IF NOT EXISTS idx_reproducoes_femea_brinco ON reproducoes(femea_brinco)",
            "CREATE INDEX IF NOT EXISTS idx_reproducoes_lote_id ON reproducoes(lote_id)",
            "CREATE INDEX IF NOT EXISTS idx_financeiros_lote_id ON financeiros(lote_id)",
            "CREATE INDEX IF NOT EXISTS idx_financeiros_tipo ON financeiros(tipo)",
            "CREATE INDEX IF NOT EXISTS idx_financeiros_categoria ON financeiros(categoria)",
            "CREATE INDEX IF NOT EXISTS idx_formulacao_itens_formulacao_id ON formulacao_itens(formulacao_id)",
            "CREATE INDEX IF NOT EXISTS idx_formulacao_itens_ingrediente_id ON formulacao_itens(ingrediente_id)",
            "CREATE INDEX IF NOT EXISTS idx_pesagens_lote_id ON pesagens(lote_id)",
        ]
        with db.engine.connect() as conn:
            for sql in migrations:
                try:
                    conn.execute(db.text(sql))
                    conn.commit()
                    print(f'Migration OK: {sql[:60]}')
                except Exception as e:
                    conn.rollback()
                    print(f'Migration skip: {e}')

        if Usuario.query.count() == 0:
            admin = Usuario(
                nome='Administrador',
                email='admin@granja.com',
                senha_hash=generate_password_hash('admin123'),
                role='admin',
                ativo=True
            )
            db.session.add(admin)
            db.session.commit()
            print('==> Admin criado: admin@granja.com / admin123')
            print('==> IMPORTANTE: Troque a senha após o primeiro login!')


init_db()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_DEBUG', 'false').lower() == 'true')

# ============== ANÁLISE IA — VENDA ==============

@app.route('/api/analise/venda', methods=['GET'])
@jwt_required()
def analise_venda():
    """Análise inteligente do momento ideal de venda por lote"""
    u = get_current_user()
    if not can_gestao(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    lotes = Lote.query.filter_by(status='ativo').all()
    resultado = []

    for lote in lotes:
        animais = Animal.query.filter_by(lote_id=lote.id, status='ativo').all()
        alimentacoes = Alimentacao.query.options(joinedload(Alimentacao.formulacao_ref)).filter_by(lote_id=lote.id).all()
        vacinacoes = Vacinacao.query.filter_by(lote_id=lote.id).all()

        # Usa animais individuais se registrados, senão usa quantidade_atual do lote
        qtd = len(animais) if animais else (lote.quantidade_atual or 0)
        if qtd == 0:
            continue

        dias_producao = (date.today() - lote.data_entrada).days if lote.data_entrada else 0

        # Usar pesagens do lote se disponíveis; caso contrário, peso_atual dos animais
        pesagens_lote = sorted(lote.pesagens, key=lambda p: p.data)
        tem_pesagens = len(pesagens_lote) >= 1

        pesos_entrada = [a.peso_entrada for a in animais if a.peso_entrada]
        peso_medio_entrada = sum(pesos_entrada) / len(pesos_entrada) if pesos_entrada else (lote.peso_medio_entrada or 0)

        if tem_pesagens:
            peso_medio = pesagens_lote[-1].peso_medio
            if len(pesagens_lote) >= 2:
                # Ganho calculado entre primeira e última pesagem
                dias_entre = (pesagens_lote[-1].data - pesagens_lote[0].data).days
                ganho_total = pesagens_lote[-1].peso_medio - pesagens_lote[0].peso_medio
                ganho_diario = round(ganho_total / max(dias_entre, 1), 3)
            else:
                # Só uma pesagem: comparar com entrada
                ganho_total = peso_medio - peso_medio_entrada
                ganho_diario = round(ganho_total / max(dias_producao, 1), 3)
        else:
            # Sem pesagens: usar peso_atual dos animais individuais (se existirem) ou peso_medio_entrada do lote
            pesos = [a.peso_atual for a in animais if a.peso_atual]
            if pesos:
                peso_medio = sum(pesos) / len(pesos)
            else:
                # Sem animais individuais: usar peso_medio_entrada como estimativa
                peso_medio = lote.peso_medio_entrada or 0
            ganho_total = peso_medio - peso_medio_entrada
            ganho_diario = round(ganho_total / max(dias_producao, 1), 3)

        # Custos (com fallback na formulação para custo_unitario NULL)
        custo_racao = sum(
            (a.quantidade_kg or 0) * (a.custo_unitario if a.custo_unitario is not None else (a.formulacao_ref.calcular_custo_por_kg() if a.formulacao_ref else 0))
            for a in alimentacoes
        )
        custo_sanidade = sum(v.custo or 0 for v in vacinacoes)
        custo_aquisicao = sum(a.custo_aquisicao or 0 for a in animais)
        custo_total = custo_racao + custo_sanidade + custo_aquisicao
        peso_total_kg = peso_medio * qtd
        custo_por_kg = round(custo_total / max(peso_total_kg, 1), 4)

        # Peso alvo (terminação = 110-120 kg)
        peso_alvo = 115
        sem_dados_ganho = ganho_diario <= 0 or (not tem_pesagens and peso_medio == 0)
        if sem_dados_ganho:
            dias_para_alvo = -1
            txt_estimativa = 'Registre pesagens periódicas para calcular o tempo estimado de abate.'
        else:
            dias_para_alvo = max(0, round((peso_alvo - peso_medio) / ganho_diario)) if peso_medio < peso_alvo else 0
            txt_estimativa = f'~{dias_para_alvo} dias para atingir {peso_alvo} kg.' if dias_para_alvo > 0 else 'Peso de abate atingido!'

        # Preço mínimo de venda
        preco_breakeven = round(custo_por_kg, 2)           # Só cobre custos
        preco_minimo = round(custo_por_kg * 1.15, 2)       # Margem 15%
        preco_recomendado = round(custo_por_kg * 1.25, 2)  # Margem 25%

        # Receita e lucro estimados pelo peso atual do lote
        receita_breakeven = round(preco_breakeven * peso_total_kg, 2)
        receita_minima = round(preco_minimo * peso_total_kg, 2)
        receita_recomendada = round(preco_recomendado * peso_total_kg, 2)
        lucro_minimo = round(receita_minima - custo_total, 2)
        lucro_recomendado = round(receita_recomendada - custo_total, 2)

        # ===== LÓGICA DE RECOMENDAÇÃO =====
        alertas = []
        if not tem_pesagens:
            alertas.append('Nenhuma pesagem registrada. Registre o peso atual do lote para ativar análise de ganho de peso.')

        if peso_medio >= 110:
            recomendacao = 'VENDER AGORA'
            icone = '🟢'
            cor = '#198754'
            justificativa = f'Peso médio ({peso_medio:.1f} kg) atingiu o ponto ótimo de abate (>110 kg). Venda imediata maximiza retorno.'
        elif peso_medio >= 95 and not sem_dados_ganho and ganho_diario < 0.4:
            recomendacao = 'VENDER EM BREVE'
            icone = '🟡'
            cor = '#ffc107'
            justificativa = f'Peso próximo do alvo ({peso_medio:.1f} kg) mas ganho diário baixo ({ganho_diario:.3f} kg/dia). Custo-benefício de esperar é baixo.'
        elif not sem_dados_ganho and peso_medio >= 85 and dias_para_alvo <= 30:
            recomendacao = f'AGUARDAR ~{dias_para_alvo} DIAS'
            icone = '🔵'
            cor = '#0d6efd'
            justificativa = f'Faltam ~{dias_para_alvo} dias para atingir {peso_alvo} kg. Ganho diário de {ganho_diario:.3f} kg/dia está adequado.'
        elif peso_medio < 60 or peso_medio == 0:
            recomendacao = 'FASE INICIAL'
            icone = '⚪'
            cor = '#6c757d'
            justificativa = f'Animais em fase inicial ({peso_medio:.1f} kg). {txt_estimativa}'
        else:
            if sem_dados_ganho:
                recomendacao = 'SEM DADOS'
                icone = '⚫'
                cor = '#6c757d'
                justificativa = f'Peso atual: {peso_medio:.1f} kg. {txt_estimativa}'
            else:
                recomendacao = f'AGUARDAR ~{dias_para_alvo} DIAS'
                icone = '🔵'
                cor = '#0d6efd'
                justificativa = f'Em desenvolvimento ({peso_medio:.1f} kg). {txt_estimativa} Ganho: {ganho_diario:.3f} kg/dia.'

        # Alertas automáticos
        if not sem_dados_ganho and ganho_diario < 0.2 and peso_medio < 100:
            alertas.append(f'Ganho diário baixo ({ganho_diario:.3f} kg/dia). Verificar alimentação e saúde do lote.')
        if custo_por_kg > 8:
            alertas.append(f'Custo por kg elevado (R$ {custo_por_kg:.2f}/kg). Revisar eficiência da ração.')
        taxa_mortalidade = ((lote.quantidade_inicial - qtd) / max(lote.quantidade_inicial, 1)) * 100
        if taxa_mortalidade > 5:
            alertas.append(f'Taxa de mortalidade alta ({taxa_mortalidade:.1f}%). Verificar sanidade do lote.')

        resultado.append({
            'lote_id': lote.id,
            'numero': lote.numero,
            'fase': lote.fase,
            'qtd_animais': qtd,
            'peso_medio_atual': round(peso_medio, 2),
            'peso_medio_entrada': round(peso_medio_entrada, 2),
            'ganho_diario_medio': ganho_diario,
            'dias_em_producao': dias_producao,
            'dias_para_peso_alvo': dias_para_alvo,
            'tem_pesagens': tem_pesagens,
            'total_pesagens': len(pesagens_lote),
            'custo_total': round(custo_total, 2),
            'custo_por_kg': custo_por_kg,
            'peso_total_kg': round(peso_total_kg, 1),
            'preco_breakeven': preco_breakeven,
            'preco_minimo_lucro': preco_minimo,
            'preco_recomendado': preco_recomendado,
            'receita_breakeven': receita_breakeven,
            'receita_minima': receita_minima,
            'receita_recomendada': receita_recomendada,
            'lucro_minimo': lucro_minimo,
            'lucro_recomendado': lucro_recomendado,
            'recomendacao': recomendacao,
            'icone_recomendacao': icone,
            'cor_recomendacao': cor,
            'justificativa': justificativa,
            'alertas': alertas
        })

    prontos = sum(1 for l in resultado if 'VENDER AGORA' in l['recomendacao'])
    aguardar = sum(1 for l in resultado if 'AGUARDAR' in l['recomendacao'])
    receita_potencial = sum(l['peso_medio_atual'] * l['qtd_animais'] * 5.5 for l in resultado)  # R$5,50/kg estimado

    return jsonify({
        'lotes': resultado,
        'resumo': {
            'total_lotes': len(resultado),
            'prontos_venda': prontos,
            'aguardar': aguardar,
            'receita_potencial': round(receita_potencial, 2)
        }
    })
