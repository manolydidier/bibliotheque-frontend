import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // ESSENTIEL pour Sanctum
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tokenGuard');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Pour les requêtes CSRF si nécessaire (axios le fait automatiquement si withCredentials est true et que le cookie XSRF-TOKEN est présent)
  config.headers['X-Requested-With'] = 'XMLHttpRequest';

  return config;
});

// Fonction pour initialiser CSRF. Doit être appelée au démarrage de l'app.
export const initializeCSRF = async () => {
  try {
    await api.get('/sanctum/csrf-cookie');
  } catch (error) {
    console.error('CSRF initialization failed:', error);
  }
};

export default api;