import requests
import json
import random
from flask import Flask, request, jsonify

# Configuração do Flask para webhook
app = Flask(__name__)

# Substitua com suas credenciais da API OMIE
APP_KEY = "5199183134145"
APP_SECRET = "9b83545828121421d99e592799c75d57"

# URL da API OMIE para criar uma conta no CRM
OMIE_API_URL = "https://app.omie.com.br/api/v1/crm/contas/"

# Token de verificação do Webhook (use um valor seguro e configure no Meta)
VERIFY_TOKEN = "seu_token_de_verificacao_frame"

# Endpoint para verificação do Webhook no Meta
@app.route("/webhook", methods=["GET"])
def verificar_webhook():
    mode = request.args.get("hub.mode")
    token = request.args.get("hub.verify_token")
    challenge = request.args.get("hub.challenge")
    
    if not mode or not token or not challenge:
        print("❌ Erro: Parâmetros inválidos na solicitação do Meta")
        return "Erro na verificação - Parâmetros ausentes", 400
    
    if mode == "subscribe" and token == VERIFY_TOKEN:
        print("✅ Webhook verificado com sucesso!")
        return challenge, 200
    else:
        print(f"❌ Falha na verificação do Webhook - Token recebido: {token}")
        return "Erro na verificação - Token incorreto", 403

# Webhook para receber mensagens do WhatsApp, Instagram e Facebook
@app.route("/webhook", methods=["POST"])
def receber_mensagem():
    data = request.json
    
    # Verifica se há uma mensagem recebida
    if "messages" in data:
        for mensagem in data["messages"]:
            nome = mensagem.get("sender", {}).get("name", "Desconhecido")
            telefone = mensagem.get("sender", {}).get("phone", "Não informado")
            texto = mensagem.get("text", {}).get("body", "Sem mensagem")
            
            print(f"📩 Nova mensagem de {nome} ({telefone}): {texto}")
            
            # Enviar lead para OMIE
            cadastrar_lead_omie(nome, telefone, texto)
    
    return jsonify({"status": "ok"}), 200

# Função para cadastrar lead no OMIE
def cadastrar_lead_omie(nome, telefone, mensagem):
    codigo_integracao = str(random.randint(100000, 999999))
    nome_unico = f"{nome} {codigo_integracao}"
    
    payload = {
        "call": "IncluirConta",
        "app_key": APP_KEY,
        "app_secret": APP_SECRET,
        "param": [{
            "identificacao": {
                "cCodInt": codigo_integracao,
                "cNome": nome_unico,
                "cObs": mensagem,
                "dDtReg": "10/03/2025",
                "dDtValid": "21/08/2025"
            },
            "telefone_email": {
                "cNumTel": telefone
            }
        }]
    }
    
    response = requests.post(OMIE_API_URL, json=payload)
    
    if response.status_code == 200:
        print("✅ Lead cadastrado no OMIE com sucesso!")
    else:
        print("❌ Erro ao cadastrar lead no OMIE!", response.text)

# Inicia o servidor Flask
import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  # Usa a porta do ambiente do Render
    app.run(host="0.0.0.0", port=port, debug=True)

