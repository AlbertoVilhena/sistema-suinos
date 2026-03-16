import React, { useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch } from 'react-icons/fa';

export default function Animais() {
  const [animais] = useState([
    { id: 1, identificacao: 'BR-2026-001', sexo: 'Fêmea', status: 'Ativo', peso: '150kg' },
    { id: 2, identificacao: 'BR-2026-002', sexo: 'Macho', status: 'Ativo', peso: '180kg' },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAnimais = animais.filter(a =>
    a.identificacao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Gerenciamento de Animais</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition"
        >
          <FaPlus /> Novo Animal
        </button>
      </div>

      {/* Barra de Busca */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por identificação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
          />
        </div>
      </div>

      {/* Formulário de Novo Animal */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Cadastrar Novo Animal</h3>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Identificação (ex: BR-2026-001)"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
            />
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500">
              <option>Selecione o Sexo</option>
              <option>Macho</option>
              <option>Fêmea</option>
            </select>
            <input
              type="date"
              placeholder="Data de Nascimento"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
            />
            <input
              type="number"
              placeholder="Peso (kg)"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
            />
            <button
              type="submit"
              className="md:col-span-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              Salvar Animal
            </button>
          </form>
        </div>
      )}

      {/* Tabela de Animais */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-gray-700 font-bold">Identificação</th>
              <th className="px-6 py-3 text-left text-gray-700 font-bold">Sexo</th>
              <th className="px-6 py-3 text-left text-gray-700 font-bold">Status</th>
              <th className="px-6 py-3 text-left text-gray-700 font-bold">Peso</th>
              <th className="px-6 py-3 text-center text-gray-700 font-bold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredAnimais.map((animal) => (
              <tr key={animal.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3">{animal.identificacao}</td>
                <td className="px-6 py-3">{animal.sexo}</td>
                <td className="px-6 py-3">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                    {animal.status}
                  </span>
                </td>
                <td className="px-6 py-3">{animal.peso}</td>
                <td className="px-6 py-3 flex justify-center gap-2">
                  <button className="text-blue-600 hover:text-blue-800">
                    <FaEdit />
                  </button>
                  <button className="text-red-600 hover:text-red-800">
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
