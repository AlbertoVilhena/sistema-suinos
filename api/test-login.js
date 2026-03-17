const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testLogin() {
  try {
    console.log('🔍 Testando conexão com banco de dados...');
    console.log('Host:', process.env.DB_HOST);
    console.log('User:', process.env.DB_USER);
    console.log('Database:', process.env.DB_NAME);
    console.log('Port:', process.env.DB_PORT);

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log('✅ Conexão estabelecida!');

    // Check if users table exists
    const [tables] = await connection.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'",
      [process.env.DB_NAME]
    );

    if (tables.length === 0) {
      console.log('❌ Tabela "users" não existe!');
      console.log('Criando tabela...');
      
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Tabela criada!');
    } else {
      console.log('✅ Tabela "users" existe!');
    }

    // Check users
    const [users] = await connection.query('SELECT * FROM users');
    console.log('📊 Usuários no banco:', users.length);
    users.forEach(user => {
      console.log(`  - ${user.email}`);
    });

    // Test login
    if (users.length > 0) {
      const user = users[0];
      const passwordMatch = await bcrypt.compare('admin123', user.password);
      console.log(`\n🔐 Teste de senha para ${user.email}:`);
      console.log(`   Senha correta: ${passwordMatch}`);
    }

    await connection.end();
    console.log('\n✅ Teste concluído!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

testLogin();
