import React, { useEffect, useState } from 'react';

const API_URL = 'https://suinocultura-backend.onrender.com';

export default function App() {
  const [lotes, setLotes] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/lotes`)
      .then(res => res.json())
      .then(data => setLotes(data));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Sistema de Suinocultura</h1>
      <h2>Lotes</h2>
      <ul>
        {lotes.length > 0 ? lotes.map((lote, i) => (
          <li key={i}>{JSON.stringify(lote)}</li>
        )) : <li>Nenhum lote encontrado.</li>}
      </ul>
    </div>
  );
}
