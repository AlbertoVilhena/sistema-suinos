-- Criar banco de dados se não existir
CREATE DATABASE IF NOT EXISTS gestao_suinos;
USE gestao_suinos;

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Inserir usuário de teste (senha: admin123)
-- Hash gerado com bcrypt
INSERT INTO usuarios (nome, email, senha) VALUES 
('Admin', 'admin@granja.com', '$2a$10$YourHashedPasswordHere')
ON DUPLICATE KEY UPDATE email=email;

-- Nota: Para gerar o hash correto, use:
-- bcrypt.hash('admin123', 10) no Node.js
-- ou use a rota de registro do backend
