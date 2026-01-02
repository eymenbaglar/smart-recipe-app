import axios from 'axios';

//backend server URL
const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev';

//create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "ngrok-skip-browser-warning": "true" 
  }
});
//get admin token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;