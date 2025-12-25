import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import Sidebar from './Sidebar';
import PendingRecipes from './PendingRecipes';
import './App.css';
import Recipes from './Recipes';
import Users from './Users';
import Ingredients from './Ingredients';
import Suggestions from './Suggestions';
import Reviews from './Reviews';
import DeletedAccounts from './DeletedAccounts';

function App() {
  // Başlangıçta localStorage'dan okuyoruz
  const [token, setToken] = useState(localStorage.getItem('adminToken'));

  useEffect(() => {
    // Token state'i değiştiğinde localStorage'ı senkronize et
    if (token) {
      localStorage.setItem('adminToken', token);
    } else {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminName'); // Çıkışta ismi de silelim
    }
  }, [token]);

  // --- KRİTİK DÜZELTME BURADA ---
  const handleLogin = (tokenFromLogin) => {
    // Eğer Login.js parametre göndermeyi unutursa, localStorage'dan bakmayı dene
    const finalToken = tokenFromLogin || localStorage.getItem('adminToken');
    setToken(finalToken);
  };

  const handleLogout = () => {
    setToken(null);
  };

  if (!token) {
    // Login componentine handleLogin'i gönderiyoruz
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="app-container" style={{ display: 'flex' }}>
        {/* Sol Menü */}
        <Sidebar onLogout={handleLogout} />

        {/* Sağ İçerik Alanı */}
        <div className="main-content" style={{ flex: 1, marginLeft: '250px', padding: '20px', backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pending-recipes" element={<PendingRecipes />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/users" element={<Users />} />
            <Route path="/ingredients" element={<Ingredients />} />
            <Route path="/suggestions" element={<Suggestions />} />
            <Route path="/reviews" element={<Reviews/>} />
            <Route path="/deleted-accounts" element={<DeletedAccounts />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;