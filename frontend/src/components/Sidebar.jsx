import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaHog, FaHeartbeat, FaLeaf, FaDollarSign, FaCog } from 'react-icons/fa';

export default function Sidebar() {
  const menuItems = [
    { icon: FaHome, label: 'Dashboard', path: '/' },
    { icon: FaHog, label: 'Animais', path: '/animais' },
    { icon: FaHeartbeat, label: 'Reprodução', path: '/reproducao' },
    { icon: FaLeaf, label: 'Nutrição', path: '/nutricao' },
    { icon: FaDollarSign, label: 'Financeiro', path: '/financeiro' },
    { icon: FaCog, label: 'Configurações', path: '/configuracoes' },
  ];

  return (
    <aside className="w-64 bg-gray-800 text-white min-h-screen p-4">
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-700 transition"
          >
            <item.icon className="text-xl" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
