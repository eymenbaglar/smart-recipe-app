import React, { useState } from 'react';
import api from './api';
import './Login.css'; 

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("1. Butona basıldı. İşlem başlıyor..."); // LOG 1

    try {
      console.log("2. API isteği gönderiliyor:", { email, password }); // LOG 2
      
      const response = await api.post('/auth/login', { email, password });
      
      console.log("3. Sunucudan cevap geldi:", response); // LOG 3
      
      const { token, user } = response.data;

      if (user.role !== 'admin') {
        console.warn("4. Yetkisiz giriş denemesi!"); // LOG 4
        setError('Unauthorized access! Only administrators may enter.');
        return;
      }

      console.log("5. Token LocalStorage'a yazılıyor..."); // LOG 5
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminName', user.username);
      
      // onLogin fonksiyonu var mı diye kontrol edelim, yoksa patlamasın
      if (onLogin && typeof onLogin === 'function') {
         console.log("6. onLogin() çalıştırılıyor"); 
         onLogin(token);
      }

      console.log("7. Sayfa yenileniyor..."); // LOG 7
      // Reload yerine href kullanalım, daha garanti yönlendirir:
      window.location.href = "/"; 

    } catch (err) {
      console.error("HATA OLUŞTU:", err); // HATA LOGU
      // Hatayı detaylı görelim
      if (err.response) {
        console.log("Sunucu Hatası Detayı:", err.response.data);
        setError(err.response.data.message || 'Login failed.');
      } else {
        setError('Login failed. Connection error?');
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Admin Panel Login</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <input 
            type="email" 
            placeholder="Admin E-mail" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <button type="submit">Log In</button>
        </form>
      </div>
    </div>
  );
}

export default Login;