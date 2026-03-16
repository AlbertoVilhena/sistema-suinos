import React, { useState } from 'react';
import { FaPlus, FaHeartbeat } from 'react-icons/fa';

export default function Reproducao() {
  const [eventos, setEventos] = useState([
    { id: 1, matriz: 'BR-2026-001', tipo: 'Cobertura', data: '2026-03-10', status: 'Gestante' },
    { id: 2, matriz: 'BR-2026-003', tipo: 'Parto', data: '2026-02-15', nascidos: 12 },
  ]);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Gestão Reprodutiva</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition"
        >
          <FaPlus /> Novo Evento
        </button>
      </div>

      {/* Formulário de Novo Evento */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Registrar Evento Reprodutivo</h3>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="ID da Matriz"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
            />
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500">
              <option>Selecione o Tipo de Evento</option>
              <option>Cobertura</option>
              <option>Diagnóstico</option>
              <option>Parto</option>
              <option>Desmame</option>
            </select>
            <input
              type="date"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
            />
            <input
              type="number"
              placeholder="Total Nascidos (para Parto)"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
            />
            <button
              type="submit"
              className="md:col-span-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              Registrar Evento
            </button>
          </form>
        </div>
      )}

      {/* Tabela de Eventos */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-gray-700 font-bold">Matriz</th>
              <th className="px-6 py-3 text-left text-gray-700 font-bold">Tipo de Evento</th>
              <th className="px-6 py-3 text-left text-gray-700 font-bold">Data</th>
              <th className="px-6 py-3 text-left text-gray-700 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((evento) => (
              <tr key={evento.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3">{evento.matriz}</td>
                <td className="px-6 py-3 flex items-center gap-2">
                  <FaHeartbeat className="text-red-500" />
                  {evento.tipo}
                </td>
                <td className="px-6 py-3">{evento.data}</td>
                <td className="px-6 py-3">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {evento.status || evento.nascidos + ' nascidos'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
