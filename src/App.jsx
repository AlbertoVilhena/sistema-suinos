import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Animais from './pages/Animais';
import Reproducao from './pages/Reproducao';
import Nutricao from './pages/Nutricao';
import Financeiro from './pages/Financeiro';
import Configuracoes from './pages/Configuracoes';

function App() {
  const token = localStorage.getItem('token');

  return (
    <Router>
      {token ? (
        <div className="flex">
          <Sidebar />
          <div className="flex-1">
            <Header />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/animais" element={<Animais />} />
              <Route path="/reproducao" element={<Reproducao />} />
              <Route path="/nutricao" element={<Nutricao />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Routes>
          </div>
        </div>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;
