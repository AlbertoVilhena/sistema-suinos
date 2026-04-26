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
        lote = Lote.query.get(self.lote_id) if self.lote_id else None
        return {
            'id': self.id,
            'lote_id': self.lote_id,
            'lote_numero': lote.numero if lote else None,
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
        lote = Lote.query.get(self.lote_id) if self.lote_id else None
        return {
            'id': self.id,
            'lote_id': self.lote_id,
            'lote_numero': lote.numero if lote else None,
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
        lote = Lote.query.get(self.lote_id) if self.lote_id else None
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
            'lote_numero': lote.numero if lote else None,
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

    def to_dict(self):
        lote = Lote.query.get(self.lote_id) if self.lote_id else None
        custo_total = (self.quantidade_kg * self.custo_unitario) if self.custo_unitario else 0
        formulacao = Formulacao.query.get(self.formulacao_id) if self.formulacao_id else None
        return {
            'id': self.id,
            'formulacao_id': self.formulacao_id,
            'formulacao_nome': formulacao.nome if formulacao else None,
            'lote_id': self.lote_id,
            'lote_numero': lote.numero if lote else None,
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
        lote = Lote.query.get(self.lote_id) if self.lote_id else None
        return {
            'id': self.id,
            'tipo': self.tipo,
            'categoria': self.categoria,
            'descricao': self.descricao,
            'valor': self.valor,
            'data': self.data.isoformat() if self.data else None,
            'lote_id': self.lote_id,
            'lote_numero': lote.numero if lote else None,
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
        # Sempre usa o preço atual do ingrediente para refletir cotações atualizadas
        total = 0
        for i in self.itens:
            ing = Ingrediente.query.get(i.ingrediente_id)
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

    def to_dict(self):
        ing = Ingrediente.query.get(self.ingrediente_id)
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
    q = Animal.query
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

    for f in ['brinco', 'sexo', 'raca', 'peso_entrada', 'peso_atual', 'status', 'origem', 'custo_aquisicao', 'observacoes', 'lote_id']:
        if f in data:
            setattr(animal, f, data[f])
    if data.get('data_nascimento'):
        animal.data_nascimento = datetime.strptime(data['data_nascimento'], '%Y-%m-%d').date()

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
    q = Vacinacao.query
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
    reproducoes = Reproducao.query.order_by(Reproducao.data_cobertura.desc()).all()
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
    q = Alimentacao.query
    if lote_id:
        q = q.filter_by(lote_id=lote_id)
    return jsonify([a.to_dict() for a in q.order_by(Alimentacao.data.desc()).all()])


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
    """Retorna resumo de consumo de ração por animal individual do plantel."""
    alims = Alimentacao.query.filter(Alimentacao.plantel_brinco.isnot(None)).all()
    por_animal = {}
    for a in alims:
        b = a.plantel_brinco
        if b not in por_animal:
            plantel = Plantel.query.filter_by(brinco=b).first()
            por_animal[b] = {
                'brinco': b,
                'nome': plantel.nome if plantel else '',
                'tipo': plantel.tipo if plantel else '',
                'fase': get_fase_reprodutiva(b) if plantel and plantel.tipo == 'matriz' else None,
                'total_kg': 0,
                'custo_total': 0,
                'registros': 0,
                'ultimo_registro': None,
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
    return jsonify([f.to_dict() for f in q.order_by(Financeiro.data.desc()).all()])


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
    return jsonify([f.to_dict() for f in Formulacao.query.order_by(Formulacao.nome).all()])


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
    despesas = db.session.query(func.sum(Financeiro.valor)).filter_by(tipo='despesa').scalar() or 0

    partos_previstos = Reproducao.query.filter(
        Reproducao.data_parto_previsto >= hoje,
        Reproducao.data_parto_previsto <= em_30_dias,
        Reproducao.status == 'gestacao'
    ).count()

    custo_racao = db.session.query(
        func.sum(Alimentacao.quantidade_kg * Alimentacao.custo_unitario)
    ).filter(Alimentacao.data >= ultimo_mes).scalar() or 0

    lotes_recentes = Lote.query.order_by(Lote.criado_em.desc()).limit(5).all()

    return jsonify({
        'total_lotes_ativos': total_lotes_ativos,
        'total_animais': total_animais,
        'total_vacinacoes': total_vacinacoes,
        'receitas': receitas,
        'despesas': despesas,
        'saldo': receitas - despesas,
        'partos_previstos_30dias': partos_previstos,
        'custo_racao_30dias': custo_racao,
        'lotes_recentes': [l.to_dict() for l in lotes_recentes]
    })


# ============== RELATORIOS ==============

@app.route('/api/relatorios/lotes', methods=['GET'])
@jwt_required()
def relatorio_lotes():
    u = get_current_user()
    if not can_gestao(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    lotes = Lote.query.all()
    result = []
    for lote in lotes:
        mortalidade = lote.quantidade_inicial - lote.quantidade_atual
        taxa_mort = (mortalidade / lote.quantidade_inicial * 100) if lote.quantidade_inicial else 0
        custo_alim = sum((a.quantidade_kg * (a.custo_unitario or 0)) for a in lote.alimentacoes)
        custo_sanidade = sum((v.custo or 0) for v in lote.vacinacoes)
        animais_lote = Animal.query.filter_by(lote_id=lote.id).all()
        custo_aquisicao = sum((a.custo_aquisicao or 0) for a in animais_lote)
        custo_total = custo_alim + custo_sanidade + custo_aquisicao
        qtd_atual = lote.quantidade_atual or 1
        # Receitas vinculadas ao lote (ex: venda de animais)
        receita_lote = db.session.query(func.sum(Financeiro.valor)).filter_by(
            lote_id=lote.id, tipo='receita'
        ).scalar() or 0
        # Despesas financeiras adicionais vinculadas ao lote
        despesa_fin_lote = db.session.query(func.sum(Financeiro.valor)).filter_by(
            lote_id=lote.id, tipo='despesa'
        ).scalar() or 0
        custo_total_com_fin = custo_total + despesa_fin_lote
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
    custo_racao = db.session.query(
        func.sum(Alimentacao.quantidade_kg * Alimentacao.custo_unitario)
    ).scalar() or 0
    custo_sanidade = db.session.query(func.sum(Vacinacao.custo)).scalar() or 0
    custo_aquisicao = db.session.query(func.sum(Animal.custo_aquisicao)).scalar() or 0
    total_operacional = custo_racao + custo_sanidade + custo_aquisicao

    rec_cat = db.session.query(
        Financeiro.categoria, func.sum(Financeiro.valor).label('total')
    ).filter_by(tipo='receita').group_by(Financeiro.categoria).all()

    desp_cat = db.session.query(
        Financeiro.categoria, func.sum(Financeiro.valor).label('total')
    ).filter_by(tipo='despesa').group_by(Financeiro.categoria).all()

    # Resultado por lote
    lotes = Lote.query.all()
    resultado_por_lote = []
    for lote in lotes:
        rec_l = db.session.query(func.sum(Financeiro.valor)).filter_by(lote_id=lote.id, tipo='receita').scalar() or 0
        desp_l = db.session.query(func.sum(Financeiro.valor)).filter_by(lote_id=lote.id, tipo='despesa').scalar() or 0
        custo_alim_l = sum((a.quantidade_kg * (a.custo_unitario or 0)) for a in lote.alimentacoes)
        custo_san_l = sum((v.custo or 0) for v in lote.vacinacoes)
        animais_l = Animal.query.filter_by(lote_id=lote.id).all()
        custo_aq_l = sum((a.custo_aquisicao or 0) for a in animais_l)
        custo_total_l = desp_l + custo_alim_l + custo_san_l + custo_aq_l
        resultado_por_lote.append({
            'lote_id': lote.id,
            'lote_numero': lote.numero,
            'status': lote.status,
            'receita': round(rec_l, 2),
            'custo_total': round(custo_total_l, 2),
            'resultado': round(rec_l - custo_total_l, 2),
        })

    return jsonify({
        'total_receitas': round(total_rec, 2),
        'total_despesas': round(total_desp, 2),
        'saldo': round(total_rec - total_desp, 2),
        'lucro': round(total_rec - total_desp, 2),
        'custos_operacionais': {
            'custo_racao': round(custo_racao, 2),
            'custo_sanidade': round(custo_sanidade, 2),
            'custo_aquisicao_animais': round(custo_aquisicao, 2),
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
        return jsonify({'status': 'ok', 'version': '2.1.0', 'tables': tables})
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
    return jsonify([p.to_dict() for p in q.order_by(Plantel.brinco).all()])

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
    data = request.get_json()
    if not data.get('lote_id') or not data.get('peso_medio') or not data.get('data'):
        return jsonify({'error': 'lote_id, peso_medio e data são obrigatórios'}), 400
    try:
        data_obj = date.fromisoformat(data['data'])
    except Exception:
        return jsonify({'error': 'Data inválida'}), 400
    p = Pesagem(
        lote_id=int(data['lote_id']),
        data=data_obj,
        peso_medio=float(data['peso_medio']),
        total_animais=to_int(data.get('total_animais')),
        observacoes=data.get('observacoes')
    )
    db.session.add(p)
    db.session.commit()
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
        # Migrations: adiciona colunas novas em tabelas existentes (idempotente)
        migrations = [
            "ALTER TABLE alimentacoes ADD COLUMN IF NOT EXISTS plantel_grupo VARCHAR(20)",
            "ALTER TABLE alimentacoes ADD COLUMN IF NOT EXISTS plantel_brinco VARCHAR(50)",
            "ALTER TABLE vacinacoes ADD COLUMN IF NOT EXISTS plantel_brinco VARCHAR(50)",
            "ALTER TABLE vacinacoes ADD COLUMN IF NOT EXISTS custo FLOAT DEFAULT 0",
            "ALTER TABLE vacinacoes ADD COLUMN IF NOT EXISTS marca_fabricante VARCHAR(100)",
            "ALTER TABLE vacinacoes ADD COLUMN IF NOT EXISTS lote_vacina VARCHAR(50)",
        ]
        for sql in migrations:
            try:
                db.session.execute(db.text(sql))
            except Exception as e:
                print(f'Migration skip: {e}')
        db.session.commit()

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
        alimentacoes = Alimentacao.query.filter_by(lote_id=lote.id).all()
        vacinacoes = Vacinacao.query.filter_by(lote_id=lote.id).all()

        qtd = len(animais)
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
            # Sem pesagens: usar peso_atual dos animais individuais
            pesos = [a.peso_atual for a in animais if a.peso_atual]
            peso_medio = sum(pesos) / len(pesos) if pesos else 0
            ganho_total = peso_medio - peso_medio_entrada
            ganho_diario = round(ganho_total / max(dias_producao, 1), 3)

        # Custos
        custo_racao = sum((a.quantidade_kg or 0) * (a.custo_unitario or 0) for a in alimentacoes)
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
