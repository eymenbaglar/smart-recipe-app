import axios from 'axios';

// Backend adresin (Localhost)
const API_URL = 'https://electrothermal-zavier-unelastic.ngrok-free.dev';

const api = axios.create({
  baseURL: API_URL,
});

// Her isteğe otomatik Token ekle
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;