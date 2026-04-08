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
# Fix for older Render PostgreSQL URLs
if database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'suinocultura-secret-2024-mude-em-producao')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=8)

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
    vacina = db.Column(db.String(100), nullable=False)
    data = db.Column(db.Date, nullable=False)
    dose = db.Column(db.String(50))
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
            'vacina': self.vacina,
            'data': self.data.isoformat() if self.data else None,
            'dose': self.dose,
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
    lote_id = db.Column(db.Integer, db.ForeignKey('lotes.id'), nullable=False)
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
        return {
            'id': self.id,
            'formulacao_id': self.formulacao_id,
            'lote_id': self.lote_id,
            'lote_numero': lote.numero if lote else None,
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
        return round(sum((i.percentagem / 100) * (i.custo_unitario or 0) for i in self.itens), 4)

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
        return {
            'id': self.id,
            'formulacao_id': self.formulacao_id,
            'ingrediente_id': self.ingrediente_id,
            'ingrediente_nome': ing.nome if ing else None,
            'ingrediente_unidade': ing.unidade if ing else 'kg',
            'estoque_disponivel': ing.estoque_kg if ing else 0,
            'percentagem': self.percentagem,
            'custo_unitario': self.custo_unitario or 0,
            'custo_proporcional': round((self.percentagem / 100) * (self.custo_unitario or 0), 4)
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
    return Usuario.query.get(uid)

def can_write(role):
    return role in ['admin', 'gerente', 'operador']

def can_edit(role):
    return role in ['admin', 'gerente']

def is_admin(role):
    return role == 'admin'

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

    token = create_access_token(identity=user.id)
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
    if not data.get('vacina') or not data.get('data') or not data.get('lote_id'):
        return jsonify({'error': 'Vacina, data e lote são obrigatórios'}), 400

    vac = Vacinacao(
        lote_id=data['lote_id'],
        animal_id=to_int(data.get('animal_id')),
        vacina=data['vacina'],
        data=datetime.strptime(data['data'], '%Y-%m-%d').date(),
        dose=data.get('dose'),
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

    for f in ['vacina', 'dose', 'responsavel', 'custo', 'observacoes', 'lote_id', 'animal_id']:
        if f in data:
            setattr(vac, f, data[f])
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
        quantidade_nascidos=data.get('quantidade_nascidos'),
        quantidade_vivos=data.get('quantidade_vivos'),
        status=data.get('status', 'gestacao'),
        observacoes=data.get('observacoes'),
        lote_id=data.get('lote_id')
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

    for f in ['femea_brinco', 'macho_brinco', 'quantidade_nascidos', 'quantidade_vivos', 'status', 'observacoes', 'lote_id']:
        if f in data:
            setattr(rep, f, data[f])
    for df in ['data_cobertura', 'data_parto_previsto', 'data_parto_real']:
        if df in data and data[df]:
            setattr(rep, df, datetime.strptime(data[df], '%Y-%m-%d').date())

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
    if not data.get('lote_id') or not data.get('data') or not data.get('quantidade_kg'):
        return jsonify({'error': 'Lote, data e quantidade são obrigatórios'}), 400

    formulacao_id = to_int(data.get('formulacao_id'))
    custo_unitario = to_float(data.get('custo_unitario'))
    # Se selecionou uma formulação e não informou custo, usa o custo calculado da fórmula
    if formulacao_id and custo_unitario is None:
        f = Formulacao.query.get(formulacao_id)
        if f:
            custo_unitario = f.calcular_custo_por_kg()

    alim = Alimentacao(
        lote_id=data['lote_id'],
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

    for f in ['racao_tipo', 'quantidade_kg', 'custo_unitario', 'observacoes', 'lote_id']:
        if f in data:
            setattr(alim, f, data[f])
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


# ============== FINANCEIRO ROUTES ==============

@app.route('/api/financeiro', methods=['GET'])
@jwt_required()
def get_financeiro():
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
    if not can_write(u.role):
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
    return jsonify(fin.to_dict()), 201


@app.route('/api/financeiro/<int:fid>', methods=['PUT'])
@jwt_required()
def update_financeiro(fid):
    u = get_current_user()
    if not can_write(u.role):
        return jsonify({'error': 'Permissão negada'}), 403

    fin = Financeiro.query.get_or_404(fid)
    data = request.get_json()

    for f in ['tipo', 'categoria', 'descricao', 'valor', 'lote_id']:
        if f in data:
            setattr(fin, f, data[f])
    if 'data' in data:
        fin.data = datetime.strptime(data['data'], '%Y-%m-%d').date()

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
    return jsonify([f.to_dict() for f in Formulacao.query.order_by(Formulacao.nome).all()])


@app.route('/api/formulacoes', methods=['POST'])
@jwt_required()
def create_formulacao():
    u = get_current_user()
    if not can_edit(u.role):
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
    if not can_edit(u.role):
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
    if not can_edit(u.role):
        return jsonify({'error': 'Permissão negada'}), 403
    form = Formulacao.query.get_or_404(fid)
    db.session.delete(form)
    db.session.commit()
    return jsonify({'message': 'Formulação excluída'})


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
        result.append({
            **lote.to_dict(),
            'mortalidade': mortalidade,
            'taxa_mortalidade': round(taxa_mort, 2),
            'custo_total_alimentacao': round(custo_alim, 2),
            'custo_sanidade': round(custo_sanidade, 2),
            'custo_aquisicao_animais': round(custo_aquisicao, 2),
            'custo_total': round(custo_total, 2),
            'custo_por_animal': round(custo_total / qtd_atual, 2) if qtd_atual else 0,
        })
    return jsonify(result)


@app.route('/api/relatorios/financeiro', methods=['GET'])
@jwt_required()
def relatorio_financeiro():
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

    return jsonify({
        'total_receitas': total_rec,
        'total_despesas': total_desp,
        'lucro': total_rec - total_desp,
        'custo_racao': round(custo_racao, 2),
        'custo_sanidade': round(custo_sanidade, 2),
        'custo_aquisicao_animais': round(custo_aquisicao, 2),
        'total_operacional': round(total_operacional, 2),
        'receitas_por_categoria': [{'categoria': r[0] or 'Outros', 'total': float(r[1])} for r in rec_cat],
        'despesas_por_categoria': [{'categoria': d[0] or 'Outros', 'total': float(d[1])} for d in desp_cat]
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


# ============== INIT ==============

def init_db():
    with app.app_context():
        db.create_all()
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
