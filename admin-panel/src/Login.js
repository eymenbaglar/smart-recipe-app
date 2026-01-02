import React, { useState } from 'react';
import api from './api';
import './Login.css'; 

function Login({ onLogin }) {
  //state for form inputs and error handling
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("1. Button clicked. Starting process..."); // debug log 1

    try {
      console.log("2. Sending API request:", { email, password }); // debug log 2
      
      // attempt to authenticate with the backend
      const response = await api.post('/auth/login', { email, password });
      
      console.log("3. Response received from server:", response); // debug log 3
      
      const { token, user } = response.data;

      //security check
      if (user.role !== 'admin') {
        console.warn("4. Unauthorized access attempt!"); // debug log 4
        setError('Unauthorized access! Only administrators may enter.');
        return;
      }

      console.log("5. Writing Token to LocalStorage..."); // debug log 5
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminName', user.username);
      
      // check if the onLogin function exists.
      if (onLogin && typeof onLogin === 'function') {
         console.log("6. Executing onLogin()..."); //debug log 6
         onLogin(token);
      }

      console.log("7. Refreshing page..."); // debug log 7
      // force a redirect/refresh to Dashboard
      window.location.href = "/"; 

    } catch (err) {
      console.error("ERROR OCCURRED:", err); 

      // display specific error messages
      if (err.response) {
        console.log("Server Error Details:", err.response.data);
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