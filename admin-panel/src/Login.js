import React, { useState } from 'react';
import api from './api';
import './Login.css'; 

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', { email, password });
      
      const { token, user } = response.data;

      // KONTROL: Sadece Adminler girebilir!
      if (user.role !== 'admin') {
        setError('Yetkisiz giriş! Sadece yöneticiler girebilir.');
        return;
      }

      // Token'ı tarayıcı hafızasına kaydet
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminName', user.username);
      
      onLogin(); // App.js'e haber ver (Sayfayı değiştir)

    } catch (err) {
      setError('Giriş başarısız. Bilgileri kontrol edin.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Admin Panel Girişi</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <input 
            type="email" 
            placeholder="Admin E-posta" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Şifre" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <button type="submit">Giriş Yap</button>
        </form>
      </div>
    </div>
  );
}

export default Login;