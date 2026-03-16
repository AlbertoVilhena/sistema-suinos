const bcrypt = require('bcryptjs');
const pool = require('./db');

async function seedDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // Criar tabela de usuários
    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Gerar hash da senha
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Inserir usuário de teste
    await connection.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE email=email',
      ['Admin', 'admin@granja.com', hashedPassword]
    );

    console.log('✅ Banco de dados inicializado com sucesso!');
    console.log('Usuário de teste criado:');
    console.log('  Email: admin@granja.com');
    console.log('  Senha: admin123');

    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    process.exit(1);
  }
}

seedDatabase();
