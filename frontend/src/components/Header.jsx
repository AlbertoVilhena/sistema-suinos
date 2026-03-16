import React from 'react';
import { FaSignOutAlt, FaUser } from 'react-icons/fa';

export default function Header() {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <header className="bg-green-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">🐷 Sistema de Gestão de Suínos</h1>
          <p className="text-sm text-green-100">Controle completo da sua granja</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FaUser className="text-xl" />
            <span>Usuário</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition"
          >
            <FaSignOutAlt />
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
