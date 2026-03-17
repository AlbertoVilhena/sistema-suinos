const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function insertUser() {
  const pool = mysql.createPool({
    host: 'maglev.proxy.rlwy.net',
    user: 'root',
    password: 'uSujHNkMtejraoIQIcUcTsIGOgYfFLcN',
    database: 'railway',
    port: 42262,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    const connection = await pool.getConnection();
    
    // Criar tabela se não existir
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Tabela de usuários criada/verificada');
    
    // Gerar hash da senha
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('✅ Hash da senha gerado');
    
    // Inserir usuário
    try {
      await connection.execute(
        'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
        ['Admin', 'admin@granja.com', hashedPassword]
      );
      console.log('✅ Usuário admin@granja.com inserido com sucesso!');
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.log('⚠️ Usuário já existe, atualizando senha...');
        await connection.execute(
          'UPDATE usuarios SET senha = ? WHERE email = ?',
          [hashedPassword, 'admin@granja.com']
        );
        console.log('✅ Senha atualizada com sucesso!');
      } else {
        throw err;
      }
    }
    
    // Verificar usuário
    const [rows] = await connection.execute(
      'SELECT id, nome, email FROM usuarios WHERE email = ?',
      ['admin@granja.com']
    );
    
    console.log('✅ Usuário verificado:', rows[0]);
    
    connection.release();
    pool.end();
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

insertUser();
