import React, { useState, useEffect } from 'react';
import { FaHog, FaHeartbeat, FaLeaf, FaDollarSign } from 'react-icons/fa';

export default function Dashboard() {
  const [stats, setStats] = useState([
    { icon: FaHog, label: 'Total de Animais', value: '1.250', color: 'bg-blue-500' },
    { icon: FaHeartbeat, label: 'Matrizes Ativas', value: '245', color: 'bg-red-500' },
    { icon: FaLeaf, label: 'Consumo de Ração', value: '2.450 kg', color: 'bg-green-500' },
    { icon: FaDollarSign, label: 'Custo Total', value: 'R$ 12.500', color: 'bg-yellow-500' },
  ]);

  const [recentEvents, setRecentEvents] = useState([
    { id: 1, type: 'Parto', animal: 'MT-034', date: '2026-03-16', status: 'success' },
    { id: 2, type: 'Vacinação', animal: 'BR-2026-001', date: '2026-03-15', status: 'success' },
    { id: 3, type: 'Pesagem', animal: 'LR-045', date: '2026-03-14', status: 'pending' },
  ]);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-2">Bem-vindo ao Sistema de Gestão de Suínos</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
              <stat.icon className="text-white text-2xl" />
            </div>
            <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Events */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Eventos Recentes</h2>
        <div className="space-y-4">
          {recentEvents.map((event) => (
            <div key={event.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div>
                <p className="font-medium text-gray-800">{event.type}</p>
                <p className="text-sm text-gray-600">{event.animal}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{event.date}</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-1 ${
                  event.status === 'success' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {event.status === 'success' ? '✓ Concluído' : '⏳ Pendente'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <button className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors">
          ➕ Novo Animal
        </button>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors">
          📊 Gerar Relatório
        </button>
        <button className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors">
          ⚙️ Configurações
        </button>
      </div>
    </div>
  );
}
