import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHog } from 'react-icons/fa';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Simulação de login (substitua com chamada real à API)
      if (email && password) {
        localStorage.setItem('token', 'fake-token-123');
        navigate('/');
      } else {
        setError('Preencha todos os campos');
      }
    } catch (err) {
      setError('Erro ao fazer login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <FaPig className="text-6xl text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800">Sistema de Gestão</h1>
          <p className="text-gray-600">Gerenciamento de Suínos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-bold mb-2">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            Entrar
          </button>
        </form>

        <p className="text-center text-gray-600 mt-4 text-sm">
          Demonstração: Use qualquer email e senha
        </p>
      </div>
    </div>
  );
}
