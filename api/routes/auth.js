const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const router = express.Router();

// Middleware para verificar token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const connection = await pool.getConnection();
    const [users] = await connection.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    connection.release();

    if (users.length === 0) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Logout (apenas para confirmar no frontend)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout realizado com sucesso' });
});

// Verificar token
router.get('/verify', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
