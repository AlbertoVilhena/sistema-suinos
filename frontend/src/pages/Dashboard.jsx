import React from 'react';
import { FaPig, FaHeartbeat, FaLeaf, FaDollarSign } from 'react-icons/fa';

export default function Dashboard() {
  const stats = [
    { icon: FaPig, label: 'Total de Animais', value: '1.250', color: 'bg-blue-500' },
    { icon: FaHeartbeat, label: 'Matrizes Ativas', value: '85', color: 'bg-green-500' },
    { icon: FaLeaf, label: 'Rações em Estoque', value: '45 ton', color: 'bg-yellow-500' },
    { icon: FaDollarSign, label: 'Faturamento Mês', value: 'R$ 125.000', color: 'bg-purple-500' },
  ];

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h2>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow-lg p-6">
            <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center text-white mb-4`}>
              <stat.icon className="text-2xl" />
            </div>
            <p className="text-gray-600 text-sm">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Seção de Ações Rápidas */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition">
            ➕ Novo Animal
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition">
            📊 Gerar Relatório
          </button>
          <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition">
            💉 Registrar Vacinação
          </button>
        </div>
      </div>

      {/* Gráfico Placeholder */}
      <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Evolução do Rebanho</h3>
        <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
          Gráfico de evolução (integração com dados reais)
        </div>
      </div>
    </div>
  );
}
