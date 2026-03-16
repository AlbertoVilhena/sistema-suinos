import React, { useState } from 'react';
import { FaHome, FaHog, FaHeartbeat, FaLeaf, FaDollarSign, FaCog, FaBars, FaTimes } from 'react-icons/fa';
import { Link } from 'react-router-dom';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { icon: FaHome, label: 'Dashboard', path: '/' },
    { icon: FaHog, label: 'Animais', path: '/animais' },
    { icon: FaHeartbeat, label: 'Reprodução', path: '/reproducao' },
    { icon: FaLeaf, label: 'Nutrição', path: '/nutricao' },
    { icon: FaDollarSign, label: 'Financeiro', path: '/financeiro' },
    { icon: FaCog, label: 'Configurações', path: '/configuracoes' },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-green-600 text-white rounded"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
      </button>

      {/* Sidebar */}
      <div
        className={`${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:static left-0 top-0 w-64 h-screen bg-green-700 text-white transition-transform duration-300 z-40`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-green-600">
          <h1 className="text-2xl font-bold">🐷 Suínos</h1>
          <p className="text-sm text-green-200">Gestão de Granja</p>
        </div>

        {/* Menu */}
        <nav className="p-4">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-green-600 transition-colors mb-2"
              onClick={() => setIsOpen(false)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-green-600">
          <button
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}
            className="w-full px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
