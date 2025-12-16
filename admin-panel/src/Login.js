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

      if (user.role !== 'admin') {
        setError('Unauthorized access! Only administrators may enter.');
        return;
      }

      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminName', user.username);
      
      onLogin();

    } catch (err) {
      setError('Login failed. Please check your credentials.');
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